/**
 * Movy ("Miner XIX") client extractor.
 *
 * framextv's own /api/stream endpoint now answers 401 ("Invalid or missing
 * client key") for everyone, including requests made from framextv.xyz itself.
 * The site works around this in the browser by calling Movy directly:
 *
 *   1. GET https://api.wecollege.net/seed?mediaId=<tmdbId>   -> { seed, ttlMs }
 *   2. GET https://api.wecollege.net/<city>/sources?mediaType=...&seed=...
 *      -> base64url ciphertext, decrypted client-side (ChaCha-like keystream)
 *   3. Each stream URL is wrapped in the frappe proxy, because the raw CDN
 *      hosts answer 403 without the Movy Referer/Origin.
 *
 * This module reproduces steps 1-3 in Node so FakeFlix can keep playing
 * Server 1 directly.
 */

const MOVY_API = process.env.MOVY_API_BASE || 'https://api.wecollege.net';
const MOVY_ORIGIN = 'https://www.movy.bz';
const MOVY_REFERER = 'https://www.movy.bz/';
const PROXY_BASE = process.env.MOVY_PROXY_BASE || 'https://frappe.hybrows.workers.dev';

const MOVY_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  Origin: MOVY_ORIGIN,
  Referer: MOVY_REFERER,
};

// City endpoints, in the same preference order framextv uses.
const CITIES = [
  { endpoint: 'miami', name: 'Miami', quality: '4K / 1080p' },
  { endpoint: 'atlanta', name: 'Atlanta', quality: '1080p' },
  { endpoint: 'dallas', name: 'Dallas', quality: '1080p' },
];

/* ------------------------------------------------------------------ */
/* Crypto helpers (ported 1:1 from framextv's bundle)                  */
/* ------------------------------------------------------------------ */

function murmur(input) {
  let t = BigInt(input) & 0xffffffffn;
  t ^= t >> 16n;
  t = (t * 2246822507n) & 0xffffffffn;
  t ^= t >> 13n;
  t = (t * 3266489909n) & 0xffffffffn;
  return Number((t ^ (t >> 16n)) & 0xffffffffn);
}

function rotl(value, amount) {
  const n = amount & 31;
  return n === 0 ? value >>> 0 : ((value << n) | (value >>> (32 - n))) >>> 0;
}

function fnv1a(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return murmur(hash);
}

function initState(seed, tmdbId) {
  const slots = new Uint32Array(61);
  const isSet = new Uint8Array(61);

  let acc = murmur(fnv1a(seed) ^ murmur((tmdbId ^ 2654435769) >>> 0));

  for (let i = 0; i < 8; i++) {
    const slot = acc % 61;
    acc = rotl((acc + 2654435769) >>> 0, 7 + (7 & i));
    slots[slot] = (acc ^ murmur(acc)) >>> 0;
    isSet[slot] = 1;
    acc = murmur((acc + slot) >>> 0);
  }

  return { slots, isSet, acc: murmur((2779096485 ^ acc) >>> 0) };
}

function nextWord(state, counter) {
  const { acc } = state;
  const slot = acc % 61;

  let mask = 0;
  let slotValue = 0;
  if (state.isSet[slot]) {
    mask = 4294967295;
    slotValue = state.slots[slot];
  }

  const mix = Math.imul(counter + 1, 2654435769) >>> 0;
  const mixedSlot = (slotValue ^ mix) >>> 0;
  const sum = ((((acc ^ mixedSlot) | (acc & mixedSlot & mask)) >>> 0) + acc) >>> 0;
  const next = murmur(
    ((rotl(sum, 31 & slot) ^ rotl(acc, 31 & (slot * 7))) >>> 0) + 2654435769
  );

  state.slots[slot] = next;
  state.isSet[slot] = 1;
  state.acc = next;
  return next;
}

function decryptPayload(ciphertext, seed, tmdbId) {
  const base64 = ciphertext.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Buffer.from(padded, 'base64');

  if (bytes.length <= 4) {
    throw new Error('Ciphertext too short');
  }

  const state = initState(seed, tmdbId);
  let counter = 0;

  for (let i = 0; i < bytes.length; ) {
    const word = nextWord(state, counter++);
    bytes[i] ^= word & 255;
    i++;
    if (i < bytes.length) {
      bytes[i] ^= (word >> 8) & 255;
      i++;
    }
    if (i < bytes.length) {
      bytes[i] ^= (word >> 16) & 255;
      i++;
    }
    if (i < bytes.length) {
      bytes[i] ^= (word >> 24) & 255;
      i++;
    }
  }

  // "mvm1"
  if (bytes[0] !== 109 || bytes[1] !== 118 || bytes[2] !== 109 || bytes[3] !== 49) {
    throw new Error('Decryption failed (bad magic prefix) - seed may have expired');
  }

  const json = new TextDecoder().decode(bytes.subarray(4));
  return JSON.parse(json);
}

/* ------------------------------------------------------------------ */
/* Seed cache                                                          */
/* ------------------------------------------------------------------ */

const seedCache = new Map(); // tmdbId -> { seed, expiresAt }

function parseTtl(payload) {
  const ttl = typeof payload?.ttlMs === 'number' ? payload.ttlMs : 30000;
  // Refresh a little early so an in-flight request never uses a dead seed.
  return Math.max(15000, ttl - 5000);
}

async function getSeed(tmdbId, signal) {
  const cached = seedCache.get(tmdbId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.seed;
  }

  const res = await fetch(`${MOVY_API}/seed?mediaId=${encodeURIComponent(tmdbId)}`, {
    headers: MOVY_HEADERS,
    signal,
  });

  if (!res.ok) {
    if (res.status === 429 && cached?.seed) {
      return cached.seed;
    }
    throw new Error(`Movy seed request failed with HTTP ${res.status}`);
  }

  const payload = await res.json();
  const seed = payload?.seed;
  if (!seed || typeof seed !== 'string') {
    throw new Error('Movy returned an invalid seed');
  }

  seedCache.set(tmdbId, { seed, expiresAt: Date.now() + parseTtl(payload) });
  return seed;
}

/* ------------------------------------------------------------------ */
/* Proxy wrapping                                                      */
/* ------------------------------------------------------------------ */

function proxyUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes(PROXY_BASE) || url.includes('/api/proxy')) return url;

  const params = new URLSearchParams({
    url,
    ref: MOVY_ORIGIN,
    referer: MOVY_REFERER,
    origin: MOVY_ORIGIN,
  });

  return `${PROXY_BASE}/?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

function normaliseSource(source, city) {
  const url = source?.url;
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  const clean = url.split('?')[0];
  const type = source.type || (clean.endsWith('.mp4') ? 'mp4' : 'hls');
  const quality =
    source.quality && source.quality !== 'auto'
      ? source.quality
      : city.quality;

  return {
    url: proxyUrl(url),
    quality,
    type,
    server: `Miner XIX (${city.name})`,
    skipProxy: true,
  };
}

async function extractFromCity(city, seed, tmdbId, mediaType, season, episode, signal) {
  const params = new URLSearchParams({
    mediaType,
    tmdbId,
    enc: '2',
    seed,
  });

  if (mediaType === 'tv') {
    params.set('seasonId', String(season));
    params.set('episodeId', String(episode));
  }

  const url = `${MOVY_API}/${city.endpoint}/sources?${params.toString()}`;
  const res = await fetch(url, { headers: MOVY_HEADERS, signal });

  if (!res.ok) {
    throw new Error(`${city.name} returned HTTP ${res.status}`);
  }

  const ciphertext = (await res.text()).trim();
  if (!ciphertext || ciphertext.length < 10) {
    throw new Error(`${city.name} returned an empty payload`);
  }

  const payload = decryptPayload(ciphertext, seed, parseInt(tmdbId, 10));

  const sources = Array.isArray(payload.sources)
    ? payload.sources.map((s) => normaliseSource(s, city)).filter(Boolean)
    : [];

  const subtitles = Array.isArray(payload.subtitles)
    ? payload.subtitles
        .filter((s) => s?.url && typeof s.url === 'string')
        .map((s) => ({
          url: proxyUrl(s.url),
          label: s.language || s.lang || 'English',
          language: s.lang || 'en',
          lang: s.lang || 'en',
          source: 'native',
          isDefault: (s.lang || '').toLowerCase() === 'en',
        }))
    : [];

  return {
    sources,
    subtitles,
    thumbnail: payload.thumbnail ? proxyUrl(payload.thumbnail) : null,
    playlist: payload.playlist ? proxyUrl(payload.playlist) : null,
  };
}

function sortSources(sources) {
  const score = (quality) => {
    const match = /(\d{3,4})p/.exec(quality || '');
    if (match) return parseInt(match[1], 10);
    if (/4k/i.test(quality || '')) return 2160;
    return 0;
  };

  return [...sources].sort((a, b) => {
    const byQuality = score(b.quality) - score(a.quality);
    if (byQuality !== 0) return byQuality;
    // HLS before MP4
    const rank = (s) => (s.type === 'hls' ? 0 : s.type === 'mp4' ? 1 : 2);
    return rank(a) - rank(b);
  });
}

/**
 * @param {object} options
 * @param {string} options.tmdbId
 * @param {'movie'|'tv'} [options.mediaType]
 * @param {number} [options.season]
 * @param {number} [options.episode]
 * @param {AbortSignal} [options.signal]
 */
export async function extractMovy({
  tmdbId,
  mediaType = 'movie',
  season = 1,
  episode = 1,
  signal,
}) {
  const id = String(tmdbId).trim();
  if (!id) throw new Error('Missing TMDB id');

  const seed = await getSeed(id, signal);

  const attempts = await Promise.allSettled(
    CITIES.map((city) =>
      extractFromCity(city, seed, id, mediaType, season, episode, signal)
    )
  );

  const sources = [];
  const subtitles = [];
  const seenSources = new Set();
  const seenSubtitles = new Set();
  const errors = [];

  let thumbnail = null;
  let playlist = null;

  attempts.forEach((attempt, index) => {
    const city = CITIES[index];
    if (attempt.status === 'rejected') {
      errors.push(`${city.name}: ${attempt.reason?.message || 'unknown error'}`);
      return;
    }

    const value = attempt.value;
    for (const source of value.sources) {
      if (seenSources.has(source.url)) continue;
      seenSources.add(source.url);
      sources.push(source);
    }
    for (const subtitle of value.subtitles) {
      if (seenSubtitles.has(subtitle.url)) continue;
      seenSubtitles.add(subtitle.url);
      subtitles.push(subtitle);
    }

    thumbnail = thumbnail || value.thumbnail;
    playlist = playlist || value.playlist;
  });

  if (sources.length === 0) {
    throw new Error(
      `No active Movy streams found${errors.length ? ` (${errors.join('; ')})` : ''}`
    );
  }

  // Several cities often expose the same qualities. Keep the first (highest
  // priority city) entry per quality so the player's quality menu stays clean.
  const byQuality = new Map();
  for (const source of sortSources(sources)) {
    const key = (source.quality || '').toLowerCase();
    if (!byQuality.has(key)) byQuality.set(key, source);
  }

  return {
    success: true,
    provider: 'miner',
    sources: [...byQuality.values()],
    subtitles,
    thumbnail,
    playlist,
    errors,
  };
}

export { decryptPayload as __testDecrypt, proxyUrl as __testProxy };
