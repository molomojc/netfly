/**
 * Turn an HLS stream into a single downloadable video file.
 *
 * The Movy playlists are fragmented MP4 (an EXT-X-MAP init segment followed by
 * .m4s fragments), so joining the init segment and every fragment produces a
 * valid fMP4 that VLC/browsers can play. MPEG-TS playlists are joined into a
 * .ts file instead.
 *
 * When the File System Access API is available (Chrome/Edge) bytes are streamed
 * straight to disk, so multi-gigabyte movies never sit in memory. Other
 * browsers collect the parts and save a Blob.
 */

const SEGMENT_CONCURRENCY = 3;

function absoluteUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function parseAttributes(line) {
  const attrs = {};
  const body = line.slice(line.indexOf(":") + 1);
  const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
  let match;
  while ((match = regex.exec(body))) {
    attrs[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return attrs;
}

function nextUri(lines, from) {
  for (let i = from; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    return line;
  }
  return null;
}

function pickVariant(text, base) {
  const lines = text.split(/\r?\n/);
  let best = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const attrs = parseAttributes(line);
    const bandwidth = parseInt(attrs.BANDWIDTH || "0", 10);
    const uri = nextUri(lines, i + 1);
    if (!uri) continue;
    if (!best || bandwidth > best.bandwidth) {
      best = { bandwidth, url: absoluteUrl(uri, base) };
    }
  }

  return best ? best.url : null;
}

function parseMediaPlaylist(text, base) {
  const lines = text.split(/\r?\n/);
  const segments = [];
  let mapUrl = null;
  let key = null;
  let mediaSequence = 0;
  let pendingByteRange = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXT-X-MEDIA-SEQUENCE:")) {
      mediaSequence = parseInt(line.split(":")[1], 10) || 0;
      continue;
    }

    if (line.startsWith("#EXT-X-MAP:")) {
      const attrs = parseAttributes(line);
      if (attrs.URI) mapUrl = absoluteUrl(attrs.URI, base);
      continue;
    }

    if (line.startsWith("#EXT-X-KEY:")) {
      const attrs = parseAttributes(line);
      const method = (attrs.METHOD || "NONE").toUpperCase();
      key =
        method === "NONE"
          ? null
          : {
              method,
              uri: attrs.URI ? absoluteUrl(attrs.URI, base) : null,
              iv: attrs.IV || null,
            };
      continue;
    }

    if (line.startsWith("#EXT-X-BYTERANGE:")) {
      const [length, offset] = line.split(":")[1].split("@");
      pendingByteRange = {
        length: parseInt(length, 10),
        offset: offset ? parseInt(offset, 10) : 0,
      };
      continue;
    }

    if (line.startsWith("#")) continue;

    segments.push({
      url: absoluteUrl(line, base),
      sequence: mediaSequence + segments.length,
      byteRange: pendingByteRange,
    });
    pendingByteRange = null;
  }

  return { segments, mapUrl, key };
}

function sequenceIV(sequence) {
  const iv = new Uint8Array(16);
  let value = Number(sequence) || 0;
  for (let i = 15; i >= 0 && value > 0; i -= 1) {
    iv[i] = value % 256;
    value = Math.floor(value / 256);
  }
  return iv;
}

function hexToBytes(hex) {
  const clean = hex.replace(/^0x/i, "");
  const bytes = new Uint8Array(Math.ceil(clean.length / 2));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes;
}

async function importAesKey(key) {
  if (!key.uri) throw new Error("This stream is encrypted but has no key URL");
  if (key.method !== "AES-128") {
    throw new Error(`This stream uses unsupported encryption (${key.method})`);
  }

  const res = await fetch(key.uri);
  if (!res.ok) throw new Error(`Encryption key request failed (HTTP ${res.status})`);

  return crypto.subtle.importKey(
    "raw",
    await res.arrayBuffer(),
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
}

function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to start the save before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

/**
 * Opens a sink before any network work so the file picker still runs inside the
 * click's user activation. Falls back to an in-memory Blob when the File System
 * Access API is missing or blocked.
 */
async function createSink(filename) {
  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Video",
            accept: { "video/mp4": [".mp4"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      return {
        streaming: true,
        write: (chunk) => writable.write(chunk),
        close: () => writable.close(),
        abort: () => writable.abort(),
      };
    } catch (err) {
      // The user cancelled the picker: let the caller ignore it.
      if (err && err.name === "AbortError") throw err;
      // Anything else (permissions, unsupported context): use a Blob instead.
    }
  }

  const parts = [];
  return {
    streaming: false,
    write: async (chunk) => {
      parts.push(chunk);
    },
    close: async () => {
      const blob = new Blob(parts, { type: "video/mp4" });
      saveBlob(blob, filename);
    },
    abort: async () => {},
  };
}

async function* orderedFetches(segments, fetchSegment) {
  const ready = new Map();
  let nextToStart = 0;
  let inFlight = 0;
  let failure = null;

  const pump = () => {
    while (inFlight < SEGMENT_CONCURRENCY && nextToStart < segments.length && !failure) {
      const index = nextToStart;
      nextToStart += 1;
      inFlight += 1;
      fetchSegment(index)
        .then((buffer) => {
          ready.set(index, buffer);
        })
        .catch((err) => {
          failure = err;
        })
        .finally(() => {
          inFlight -= 1;
        });
    }
  };

  pump();

  for (let i = 0; i < segments.length; i += 1) {
    while (!ready.has(i)) {
      if (failure) throw failure;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const buffer = ready.get(i);
    ready.delete(i);
    yield buffer;
    pump();
  }
}

async function readPlaylist(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Playlist request failed (HTTP ${res.status})`);
  return res.text();
}

/**
 * Download an HLS (or plain MP4) URL as one file.
 * @returns {Promise<{ segments: number }>}
 */
export async function downloadStream(url, { suggestedName = "video.mp4", onProgress, signal } = {}) {
  const filename = suggestedName.toLowerCase().endsWith(".mp4")
    ? suggestedName
    : `${suggestedName}.mp4`;

  // Must be the first await so the picker keeps the click's user activation.
  const sink = await createSink(filename);

  try {
    let decodedUrl = url;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {
      decodedUrl = url;
    }
    const isHls = /\.m3u8/i.test(url) || /\.m3u8/i.test(decodedUrl);

    if (!isHls) {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Video request failed (HTTP ${res.status})`);
      await sink.write(await res.arrayBuffer());
      onProgress?.({ done: 1, total: 1 });
      await sink.close();
      return { segments: 1 };
    }

    let playlistUrl = url;
    let text = await readPlaylist(playlistUrl, signal);

    if (text.includes("#EXT-X-STREAM-INF")) {
      const variant = pickVariant(text, playlistUrl);
      if (!variant) throw new Error("This playlist has no playable variant");
      playlistUrl = variant;
      text = await readPlaylist(playlistUrl, signal);
    }

    const { segments, mapUrl, key } = parseMediaPlaylist(text, playlistUrl);
    if (segments.length === 0) throw new Error("This playlist contains no segments");

    const aesKey = key ? await importAesKey(key) : null;

    const fetchSegment = async (index) => {
      const segment = segments[index];
      const headers = {};
      if (segment.byteRange) {
        const { offset, length } = segment.byteRange;
        headers.Range = `bytes=${offset}-${offset + length - 1}`;
      }

      const res = await fetch(segment.url, { headers, signal });
      if (!res.ok) throw new Error(`Segment ${index + 1} failed (HTTP ${res.status})`);

      let buffer = await res.arrayBuffer();
      if (segment.byteRange && buffer.byteLength > segment.byteRange.length) {
        buffer = buffer.slice(0, segment.byteRange.length);
      }

      if (aesKey) {
        const iv = key.iv ? hexToBytes(key.iv) : sequenceIV(segment.sequence);
        buffer = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, buffer);
      }

      return buffer;
    };

    if (mapUrl) {
      const res = await fetch(mapUrl, { signal });
      if (!res.ok) throw new Error(`Init segment request failed (HTTP ${res.status})`);
      await sink.write(await res.arrayBuffer());
    }

    let done = 0;
    for await (const buffer of orderedFetches(segments, fetchSegment)) {
      await sink.write(buffer);
      done += 1;
      onProgress?.({ done, total: segments.length });
    }

    await sink.close();
    return { segments: segments.length };
  } catch (err) {
    if (sink.abort) {
      try {
        await sink.abort();
      } catch {
        // Nothing else we can do with a failed writable.
      }
    }
    throw err;
  }
}
