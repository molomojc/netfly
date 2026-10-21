# m3u8 Extractor Microservice

Turns a `framextv.xyz` embed URL into direct, ad-free HLS streams for FakeFlix.

## Why this exists

framextv's public backend (`api.framextv.cc/api/stream`) used to return
playable sources, but it now answers every request with:

```json
{ "success": false, "error": "Unauthorized: Invalid or missing client key" }
```

…including requests made from `framextv.xyz` itself. The site works around
this in the browser by calling **Movy** ("Miner XIX") directly and decrypting
the response client-side. This service does the same thing in Node:

1. `GET https://api.wecollege.net/seed?mediaId=<tmdbId>` → `{ seed, ttlMs }`
2. `GET https://api.wecollege.net/<city>/sources?mediaType=...&seed=...`
   (`miami`, `atlanta`, `dallas`) → base64url ciphertext
3. Decrypt the payload (keystream keyed by `seed` + `tmdbId`), parse the JSON
4. Wrap every stream URL in the frappe proxy
   (`https://frappe.hybrows.workers.dev/?url=...`) because the raw CDNs
   return `403` without the Movy `Referer`/`Origin`.

Seeds are cached per title until shortly before their TTL expires.

## Quick Start

```bash
cd m3u8-extractor
npm install
npm start
# http://localhost:3001
```

## API

### Single extraction

```
GET /api/extract?url=https://framextv.xyz/embed/1058424
GET /api/extract?url=https://framextv.xyz/embed/1396/1/1
```

Response:

```json
{
  "success": true,
  "m3u8Url": "https://frappe.hybrows.workers.dev/?url=...",
  "quality": "1080p",
  "server": "Miner XIX (Miami)",
  "provider": "miner",
  "extractionMode": "movy-client",
  "sources": [
    {
      "quality": "1080p",
      "type": "hls",
      "server": "Miner XIX (Miami)",
      "url": "..."
    },
    {
      "quality": "720p",
      "type": "hls",
      "server": "Miner XIX (Miami)",
      "url": "..."
    }
  ],
  "subtitles": []
}
```

`sources` is sorted best-quality-first and de-duplicated per quality, so it can
be fed straight into a quality menu.

### Batch extraction

```
POST /api/extract/batch
Content-Type: application/json

{ "urls": ["https://framextv.xyz/embed/1", "https://framextv.xyz/embed/2"] }
```

Max 10 URLs per request.

### Health

```
GET /health
```

### Cache

```
POST /api/cache/clear
```

## Configuration

| Variable          | Default                              | Purpose           |
| ----------------- | ------------------------------------ | ----------------- |
| `PORT`            | `3001`                               | HTTP port         |
| `MOVY_API_BASE`   | `https://api.wecollege.net`          | Movy API host     |
| `MOVY_PROXY_BASE` | `https://frappe.hybrows.workers.dev` | Stream proxy host |

Cache: 10 minutes, max 1000 entries. Rate limit: 30 req/min per IP.

## FakeFlix integration

```bash
# Fakeflix/.env
REACT_APP_EXTRACTOR_URL=http://localhost:3001
REACT_APP_USE_DIRECT_STREAM=true
```

`PlayMovie.jsx` calls `/api/extract`, plays `m3u8Url` with `hls.js` +
`media-chrome`, and falls back to the original iframe if extraction fails.

## Deployment

```bash
docker build -t m3u8-extractor .
docker run -d -p 3001:3001 --restart unless-stopped m3u8-extractor
```

Then point `REACT_APP_EXTRACTOR_URL` at the hosted URL.

## Notes

- TV episodes use `seasonId` / `episodeId` (not `season` / `episode`) on the
  Movy endpoints.
- If `api.wecollege.net` changes its seed format, extraction will start
  failing with `Decryption failed (bad magic prefix)`; `movy.js` is the only
  file that needs updating.
