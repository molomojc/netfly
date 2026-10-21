import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { extractMovy } from './movy.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: false,
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Cache for extracted m3u8 URLs (10 min TTL, max 1000 entries)
const cache = new LRUCache({
  max: 1000,
  ttl: 10 * 60 * 1000, // 10 minutes
  updateAgeOnGet: true,
});

const FRAMEXTV_API = 'https://api.framextv.cc/api/stream';

// Allowed embed domains for security
const ALLOWED_DOMAINS = ['framextv.xyz'];

function validateEmbedUrl(embedUrl) {
  try {
    const url = new URL(embedUrl);
    return ALLOWED_DOMAINS.some(d => url.hostname.includes(d));
  } catch {
    return false;
  }
}

function parseFramextvUrl(embedUrl) {
  const url = new URL(embedUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // /embed/{tmdbId} or /embed/{tmdbId}/{season}/{episode}
  if (pathParts[0] === 'embed' && pathParts[1]) {
    const tmdbId = pathParts[1];
    const isTv = pathParts.length >= 4;
    const season = isTv ? parseInt(pathParts[2], 10) : null;
    const episode = isTv ? parseInt(pathParts[3], 10) : null;
    
    return { tmdbId, isTv, season, episode };
  }
  
  return null;
}

async function fetchFromLegacyBackend({ tmdbId, isTv, season, episode, embedUrl }) {
  const params = new URLSearchParams({
    type: isTv ? 'tv' : 'movie',
    id: tmdbId,
  });

  if (isTv && season && episode) {
    params.set('season', season.toString());
    params.set('episode', episode.toString());
  }

  const apiUrl = `${FRAMEXTV_API}?${params}`;
  console.log(`[API] Calling legacy backend: ${apiUrl}`);

  // Add proper timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://framextv.xyz/',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] Response:`, JSON.stringify(data).slice(0, 200));

    if (!data.success || !data.sources || data.sources.length === 0) {
      throw new Error(data.error || 'No working streams found');
    }

    // Prefer HLS (m3u8) sources over MP4 for better streaming support
    // Sort sources: HLS first, then by quality
    const hlsSources = data.sources.filter(s => s.type === 'hls' || s.url?.includes('.m3u8'));
    const mp4Sources = data.sources.filter(s => s.type === 'mp4' || s.url?.includes('.mp4'));
    const otherSources = data.sources.filter(s => !hlsSources.includes(s) && !mp4Sources.includes(s));

    // Prefer HLS, then others
    const sortedSources = [...hlsSources, ...otherSources, ...mp4Sources];
    const source = sortedSources[0] || data.sources[0];

    // Use the proxied URL (via frappe.hybrows.workers.dev or framextv proxy)
    const finalUrl = source.url;

    return {
      success: true,
      m3u8Url: finalUrl,
      isMaster: true,
      embedUrl,
      extractedAt: new Date().toISOString(),
      provider: data.provider,
      quality: source.quality,
      server: source.server,
      sources: data.sources,
      subtitles: data.subtitles || [],
      extractionMode: 'legacy-backend',
    };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out after 30s');
    }
    throw error;
  }
}

async function fetchFramextvStream(embedUrl) {
  const parsed = parseFramextvUrl(embedUrl);
  if (!parsed) {
    throw new Error('Invalid framextv.xyz embed URL format');
  }

  const { tmdbId, isTv, season, episode } = parsed;

  // Primary path: reproduce framextv's own client-side Movy extraction.
  // The legacy public backend now answers 401 "Invalid or missing client key"
  // for every request (including ones from framextv.xyz itself).
  try {
    console.log(`[MOVY] Extracting tmdbId=${tmdbId} type=${isTv ? 'tv' : 'movie'}`);
    const movy = await extractMovy({
      tmdbId,
      mediaType: isTv ? 'tv' : 'movie',
      season: season || 1,
      episode: episode || 1,
    });

    const primary = movy.sources[0];

    return {
      success: true,
      m3u8Url: primary.url,
      isMaster: false,
      embedUrl,
      extractedAt: new Date().toISOString(),
      provider: movy.provider,
      quality: primary.quality,
      server: primary.server,
      sources: movy.sources,
      subtitles: movy.subtitles || [],
      thumbnail: movy.thumbnail || null,
      playlist: movy.playlist || null,
      extractionMode: 'movy-client',
      warnings: movy.errors,
    };
  } catch (movyError) {
    console.warn(`[MOVY] Failed: ${movyError.message}. Trying legacy backend...`);

    try {
      return await fetchFromLegacyBackend({ tmdbId, isTv, season, episode, embedUrl });
    } catch (legacyError) {
      throw new Error(`${movyError.message} | legacy backend: ${legacyError.message}`);
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    cacheSize: cache.size,
    mode: 'movy-client',
  });
});

// Main extraction endpoint
app.get('/api/extract', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameter: url' 
    });
  }

  const embedUrl = new URL(url).href;
  
  // Validate domain
  if (!validateEmbedUrl(embedUrl)) {
    return res.status(403).json({ 
      success: false, 
      error: `Domain not allowed. Only framextv.xyz is supported.` 
    });
  }

  // Check cache
  const cacheKey = embedUrl;
  if (cache.has(cacheKey)) {
    console.log(`[CACHE HIT] ${embedUrl}`);
    return res.json(cache.get(cacheKey));
  }

  try {
    const result = await fetchFramextvStream(embedUrl);
    cache.set(cacheKey, result);
    console.log(`[SUCCESS] Extracted: ${result.m3u8Url}`);
    res.json(result);
  } catch (error) {
    console.error(`[ERROR] Extraction failed for ${embedUrl}:`, error.message);
    res.json({
      success: false,
      error: error.message,
      embedUrl,
    });
  }
});

// Batch extraction
app.post('/api/extract/batch', express.json(), async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing or invalid urls array' 
    });
  }

  if (urls.length > 10) {
    return res.status(400).json({ 
      success: false, 
      error: 'Max 10 URLs per batch' 
    });
  }

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      if (!validateEmbedUrl(url)) {
        return { success: false, error: 'Domain not allowed', embedUrl: url };
      }
      
      const cacheKey = url;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      
      try {
        const result = await fetchFramextvStream(url);
        cache.set(cacheKey, result);
        return result;
      } catch (error) {
        return { success: false, error: error.message, embedUrl: url };
      }
    })
  );

  const formattedResults = results.map((r, i) => 
    r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message || 'Unknown error', embedUrl: urls[i] }
  );

  res.json({ results: formattedResults });
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

app.listen(PORT, () => {
  console.log(`🚀 m3u8-extractor (Movy client mode) running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Extract: GET http://localhost:${PORT}/api/extract?url=<embed_url>`);
  console.log(`   Batch: POST http://localhost:${PORT}/api/extract/batch`);
  console.log(`   Primary: https://api.wecollege.net (seed + city sources)`);
  console.log(`   Fallback: https://api.framextv.cc/api/stream (currently 401)`);
});