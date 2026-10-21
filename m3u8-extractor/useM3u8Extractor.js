// Client-side hook to use the m3u8 extractor microservice
// Usage: const { extractStream, loading, error } = useM3u8Extractor();

import { useState, useCallback } from 'react';

const EXTRACTOR_BASE = process.env.REACT_APP_EXTRACTOR_URL || 'http://localhost:3001';

export function useM3u8Extractor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const extractStream = useCallback(async (embedUrl, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ url: embedUrl });
      if (options.waitTime) params.set('waitTime', options.waitTime);
      if (options.clickSelectors) params.set('clickSelectors', options.clickSelectors.join(','));
      
      const response = await fetch(`${EXTRACTOR_BASE}/api/extract?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }
      
      setLastResult(data);
      return data.m3u8Url;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const extractBatch = useCallback(async (urls, waitTime) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${EXTRACTOR_BASE}/api/extract/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, waitTime }),
      });
      const data = await response.json();
      return data.results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    extractStream,
    extractBatch,
    loading,
    error,
    lastResult,
    clearError: () => setError(null),
  };
}

// Standalone function for non-React usage
export async function extractM3u8(embedUrl, options = {}) {
  const base = process.env.REACT_APP_EXTRACTOR_URL || 'http://localhost:3001';
  const params = new URLSearchParams({ url: embedUrl });
  if (options.waitTime) params.set('waitTime', options.waitTime);
  
  const response = await fetch(`${base}/api/extract?${params}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Extraction failed');
  }
  return data.m3u8Url;
}