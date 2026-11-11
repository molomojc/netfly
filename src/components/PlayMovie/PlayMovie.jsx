import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { useDispatch, useStore } from "react-redux";
import { FaCheck, FaChevronDown, FaClosedCaptioning, FaCog, FaDownload, FaForward, FaBackward, FaArrowLeft, FaList } from "react-icons/fa";
import Hls from "hls.js";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaFullscreenButton,
} from "media-chrome/react";
import "./PlayMovie.scss";
import { downloadStream } from "./downloadStream";
import { selectHistoryEntry } from "../../redux/history";
import { updateWatchProgress } from "../../redux/history/history.actions";
import { formatTime } from "../../redux/history/history.utils";
import Loader from "../Loader/Loader";
import StreamLoader from "../StreamLoader/StreamLoader";
import { isTvDevice } from "../../utils";

const EXTRACTOR_URL = process.env.REACT_APP_EXTRACTOR_URL || "http://localhost:3001";
const USE_DIRECT_STREAM = process.env.REACT_APP_USE_DIRECT_STREAM === "true";

// Sources offered in the server dropdown on the player.
const SERVER_OPTIONS = [
  { id: 1, label: "Server 1", description: "Ours — direct stream, no ads" },
  { id: 2, label: "Prime", description: "frameXTV embed player" },
  { id: 3, label: "Server 3", description: "vidsrc.to" },
  { id: 4, label: "Server 4", description: "vidsrc-embed.ru" },
];

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ---------------------------------------------------------------------------
// Playback tuning
//
// Android TV / Fire TV boxes have weak CPUs and very little RAM. Keep the
// forward buffer short, release the back buffer, and never start at a level
// the display can't reasonably decode.
// ---------------------------------------------------------------------------
const HLS_CONFIG = {
  enableWorker: true,
  // `lowLatencyMode` targets LL-HLS live streams. On VOD it only adds
  // constraints and delays startup, so it must stay off on TV.
  lowLatencyMode: false,
  // Free already-played fragments instead of holding the whole movie in RAM.
  backBufferLength: 30,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  maxBufferSize: 30 * 1000 * 1000,
  // Never pick a rendition larger than the rendered player, and start the
  // adaptive estimate conservatively so a 1 GB box doesn't open at 1080p.
  capLevelToPlayerSize: true,
  abrEwmaDefaultEstimate: 800 * 1000,
  fragLoadingMaxRetry: 4,
  manifestLoadingMaxRetry: 4,
};

// Chrome/WebView on Android TV exposes the platform HLS stack, which decodes
// in hardware and costs almost no JavaScript. Prefer it and fall back to
// hls.js only when it's genuinely unavailable. `?engine=hls` (or
// REACT_APP_FORCE_HLS=true) forces the MSE path for A/B testing.
const FORCE_HLS = process.env.REACT_APP_FORCE_HLS === "true";

const prefersNativeHls = () => {
  if (FORCE_HLS) return false;
  try {
    return new URLSearchParams(window.location.search).get("engine") !== "hls";
  } catch (err) {
    return true;
  }
};

// Turn a 3-letter subtitle code ("eng") into a readable language name.
function languageLabel(code) {
  if (!code) return "Unknown";
  if (/^t\d+$/i.test(code)) return code.toUpperCase();
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(code.toLowerCase()) || code.toUpperCase();
  } catch (err) {
    return code.toUpperCase();
  }
}

// How often a new position is written while playing. Each write also
// serialises the whole persisted slice, so keep it infrequent and flush on
// pause / hide / unmount instead.
const PROGRESS_WRITE_INTERVAL = 15000;
// Don't bother seeking for the first few seconds of a title.
const MIN_RESUME_SECONDS = 5;

const PlayMovie = () => {
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  // Reading the store directly (instead of useSelector) keeps this component
  // from re-rendering every time a progress update is persisted mid-playback.
  const store = useStore();

  const {
    fallbackTitle,
    id,
    isTv,
    Season: initialSeason = 1,
    Episode: initialEpisode = 1,
    media_type,
    poster_path,
    backdrop_path,
    // Metadata used by the local recommendation engine.
    genre_ids: itemGenreIds = [],
    vote_average,
    original_language,
    release_date,
    first_air_date,
    progress: requestedProgress,
  } = location.state || {};

  const mediaType = media_type || (isTv ? "tv" : first_air_date ? "tv" : "movie");
  const isTvShow = Boolean(isTv || mediaType === "tv");

  const [currentServer, setCurrentServer] = useState(1);
  const [openMenu, setOpenMenu] = useState(null); // "servers" | "subtitles" | "settings" | "episodes" | null
  const [allSubtitles, setAllSubtitles] = useState([]);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [download, setDownload] = useState({ active: false, done: 0, total: 0, error: null });
  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [directStreamUrl, setDirectStreamUrl] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [currentQuality, setCurrentQuality] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(USE_DIRECT_STREAM && id));
  const [error, setError] = useState(null);
  const [resumedAt, setResumedAt] = useState(0);
  // Start on the platform HLS player, drop to hls.js only if it fails.
  const [useNativeEngine, setUseNativeEngine] = useState(prefersNativeHls);

  // Episode selector state
  const [episodesData, setEpisodesData] = useState({});
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedSeasonForEpisodes, setSelectedSeasonForEpisodes] = useState(initialSeason);
  const [totalSeasons, setTotalSeasons] = useState(1);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const overlayRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const toolsRef = useRef(null);
  const isMountedRef = useRef(true);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // The position the player should start at: an explicit value handed over by
  // the "Continue Watching" row wins, otherwise the saved entry for this exact
  // episode is used.
  const initialResumeRef = useRef(undefined);
  if (initialResumeRef.current === undefined) {
    const savedEntry = selectHistoryEntry(store.getState(), id, mediaType);
    const sameEpisode =
      !savedEntry ||
      (savedEntry.season === currentSeason &&
        savedEntry.episode === currentEpisode);

    initialResumeRef.current =
      typeof requestedProgress === "number" && requestedProgress > 0
        ? requestedProgress
        : sameEpisode && savedEntry
        ? savedEntry.currentTime || 0
        : 0;
  }

  // Always kept up to date so a quality switch (which re-mounts the media
  // element) resumes where the viewer actually was, not where they started.
  const positionRef = useRef(initialResumeRef.current);
  const durationRef = useRef(0);
  const lastWriteRef = useRef(0);

  const [showOverlay, setShowOverlay] = useState(true);
  const INACTIVITY_TIMEOUT = 30000; // 30 seconds

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (!showOverlay) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowOverlay(true);
      }, INACTIVITY_TIMEOUT);
    }
  }, [showOverlay]);

  const handleOverlayClick = useCallback(() => {
    setShowOverlay(false);
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Track user activity on the container to reset inactivity timer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const events = ["mousemove", "click", "keydown", "touchstart"];
    const handler = resetInactivityTimer;

    events.forEach((event) => container.addEventListener(event, handler, true));
    return () => {
      events.forEach((event) => container.removeEventListener(event, handler, true));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Reset overlay when server/episode changes
  useEffect(() => {
    setShowOverlay(true);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, [currentServer, currentEpisode, currentSeason]);

  // Close the player menus on outside click / Escape.
  useEffect(() => {
    if (!openMenu) return undefined;

    const handlePointerDown = (event) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  // Deduplicated, human-readable subtitle tracks (English first).
  const subtitleTracks = useMemo(() => {
    const seen = new Set();
    const tracks = [];

    for (const subtitle of allSubtitles) {
      const code = (subtitle.lang || subtitle.language || "").toLowerCase();
      if (code && seen.has(code)) continue;
      if (code) seen.add(code);
      tracks.push({ ...subtitle, code, label: languageLabel(code) });
    }

    tracks.sort((a, b) => {
      if (a.label === "English") return -1;
      if (b.label === "English") return 1;
      return a.label.localeCompare(b.label);
    });

    return tracks;
  }, [allSubtitles]);

  // Apply the selected subtitle track to the media element.
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return undefined;

    const applySubtitleMode = () => {
      const { textTracks } = video;
      for (let i = 0; i < textTracks.length; i += 1) {
        textTracks[i].mode = i === activeSubtitleIndex ? "showing" : "disabled";
      }
    };

    applySubtitleMode();
    video.addEventListener("loadedmetadata", applySubtitleMode);
    const retry = setTimeout(applySubtitleMode, 500);

    return () => {
      video.removeEventListener("loadedmetadata", applySubtitleMode);
      clearTimeout(retry);
    };
  }, [activeSubtitleIndex, subtitleTracks, directStreamUrl]);

  // Keep playback speed in sync with the chosen setting.
  useEffect(() => {
    const video = playerRef.current;
    if (video) video.playbackRate = playbackRate;
  }, [playbackRate, directStreamUrl]);

  /* ------------------------------------------------------------------ */
  /* Continue watching: persist playback position to localStorage        */
  /* ------------------------------------------------------------------ */

  // Build the "Continue Watching" entry from refs, so a timeupdate tick does
  // no allocation and no Redux/persist work unless we actually write.
  const persistProgress = useCallback(
    (force = false) => {
      const duration = durationRef.current;
      if (!id || !duration) return;

      const now = Date.now();
      if (!force && now - lastWriteRef.current < PROGRESS_WRITE_INTERVAL) {
        return;
      }
      lastWriteRef.current = now;

      dispatch(
        updateWatchProgress({
          id,
          media_type: mediaType,
          title: fallbackTitle,
          poster_path,
          backdrop_path,
          genre_ids: itemGenreIds,
          vote_average,
          original_language,
          release_date: release_date || first_air_date,
          season: currentSeason,
          episode: currentEpisode,
          currentTime: positionRef.current || 0,
          duration,
        })
      );
    },
    [
      dispatch,
      id,
      mediaType,
      fallbackTitle,
      poster_path,
      backdrop_path,
      itemGenreIds,
      vote_average,
      original_language,
      release_date,
      first_air_date,
      currentSeason,
      currentEpisode,
    ]
  );

  // Flush the last known position when the page is closed or the player
  // unmounts. This is the only place progress is written outside the
  // throttled interval above.
  useEffect(() => {
    const flush = () => persistProgress(true);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [persistProgress]);

  // Attach the selected source to the <video> element. This must run from an
  // effect (not from onLoadedData): nothing loads the media otherwise, so
  // onLoadedData never fires for HLS.
  useEffect(() => {
    const video = playerRef.current;
    if (!video || !directStreamUrl) return undefined;

    const resumeFrom = () => {
      const target = positionRef.current;
      if (target > MIN_RESUME_SECONDS) {
        video.currentTime = target;
        if (
          target === initialResumeRef.current &&
          initialResumeRef.current > MIN_RESUME_SECONDS
        ) {
          setResumedAt(initialResumeRef.current);
        }
      }
    };

    const isHLS = directStreamUrl.includes(".m3u8");

    const tryPlay = () => {
      // Check if component is still mounted and video is in document.
      if (!isMountedRef.current || !video.isConnected) return;
      const playPromise = video.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    };

    const canPlayNativeHls =
      isHLS &&
      useNativeEngine &&
      // `canPlayType` is authoritative where it answers, but some Android TV
      // builds route HLS through the platform player without advertising it.
      (video.canPlayType("application/vnd.apple.mpegurl") ||
        (isTvDevice() && /Android/i.test(navigator.userAgent || "")));

    if (canPlayNativeHls) {
      // Android TV / iOS: hand the playlist to the platform player. Decoding
      // happens in hardware and hls.js's demuxer never touches the main thread.
      console.info("[Player] Native HLS playback");
      video.src = directStreamUrl;

      const onNativeMeta = () => {
        resumeFrom();
        tryPlay();
      };

      const fallbackToHlsJs = () => {
        if (Hls.isSupported()) {
          console.warn("[Player] Native HLS failed, retrying with hls.js");
          setUseNativeEngine(false);
        } else {
          setDirectStreamUrl(null);
          setError("Stream failed to load");
        }
      };

      // Some platform players fail silently (no error event, never load).
      const watchdog = setTimeout(() => {
        if (video.readyState === 0) fallbackToHlsJs();
      }, 10000);

      video.addEventListener("loadedmetadata", onNativeMeta, { once: true });
      video.addEventListener("error", fallbackToHlsJs);

      return () => {
        clearTimeout(watchdog);
        video.removeEventListener("loadedmetadata", onNativeMeta);
        video.removeEventListener("error", fallbackToHlsJs);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (isHLS && Hls.isSupported()) {
      console.info("[Player] hls.js playback");
      const hls = new Hls(HLS_CONFIG);

      video.hls = hls;
      hls.loadSource(directStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        resumeFrom();
        tryPlay();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data.fatal) return;
        console.error("[Hls.js] Fatal error:", data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          setDirectStreamUrl(null);
          setError("Stream failed to load");
        }
      });

      return () => {
        hls.destroy();
        if (video.hls === hls) video.hls = null;
      };
    }

    // MP4 (or HLS the browser handles directly): let the browser play it.
    video.src = directStreamUrl;
    const onLoadedMeta = () => {
      resumeFrom();
      tryPlay();
    };
    const onError = () => {
      setDirectStreamUrl(null);
      setError("Stream failed to load");
    };
    video.addEventListener("loadedmetadata", onLoadedMeta, { once: true });
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      video.load();
    };
  }, [directStreamUrl, useNativeEngine]);

  // Track position with a plain DOM listener. React's synthetic event path
  // dispatches ~4x/second for no benefit, and every write re-renders nothing
  // now that the component no longer subscribes to the history slice.
  useEffect(() => {
    const video = playerRef.current;
    if (!video) return undefined;

    const onTimeUpdate = () => {
      positionRef.current = video.currentTime;
      if (video.duration) durationRef.current = video.duration;
      persistProgress(false);
    };

    const flushOnPause = () => persistProgress(true);

    video.addEventListener("timeupdate", onTimeUpdate, { passive: true });
    video.addEventListener("pause", flushOnPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("pause", flushOnPause);
    };
  }, [directStreamUrl, persistProgress]);

  // Hide the "resuming" badge after a few seconds.
  useEffect(() => {
    if (!resumedAt) return undefined;
    const timer = setTimeout(() => setResumedAt(0), 6000);
    return () => clearTimeout(timer);
  }, [resumedAt]);

  const handleNextEpisode = () => {
    // A new episode starts from the beginning.
    if (playerRef.current?.hls) {
      playerRef.current.hls.destroy();
      playerRef.current.hls = null;
    }
    positionRef.current = 0;
    initialResumeRef.current = 0;
    setResumedAt(0);
    setCurrentEpisode((prev) => prev + 1);
  };

  const handlePreviousEpisode = () => {
    if (currentEpisode <= 1) return;
    // A new episode starts from the beginning.
    if (playerRef.current?.hls) {
      playerRef.current.hls.destroy();
      playerRef.current.hls = null;
    }
    positionRef.current = 0;
    initialResumeRef.current = 0;
    setResumedAt(0);
    setCurrentEpisode((prev) => prev - 1);
  };

  // Fetch episodes for a season
  const fetchEpisodes = useCallback(async (season) => {
    if (!id || !isTv) return;
    const cacheKey = `${id}-season-${season}`;
    if (episodesData[cacheKey]) {
      setSelectedSeasonForEpisodes(season);
      return;
    }
    setLoadingEpisodes(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.episodes && data.episodes.length > 0) {
        setEpisodesData((prev) => ({ ...prev, [cacheKey]: data.episodes }));
        setTotalSeasons(data.number_of_seasons || 1);
      }
      setSelectedSeasonForEpisodes(season);
    } catch (err) {
      console.error("Error fetching episodes:", err);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [id, isTv, episodesData]);

  // Fetch total seasons on mount
  useEffect(() => {
    if (isTv && id) {
      fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`)
        .then((res) => res.json())
        .then((data) => setTotalSeasons(data.number_of_seasons || 1))
        .catch(() => {});
    }
  }, [id, isTv]);

  const handleDownload = useCallback(async () => {
    if (!directStreamUrl || download.active) return;

    const safeTitle = (fallbackTitle || `video-${id || "stream"}`)
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    setDownload({ active: true, done: 0, total: 0, error: null });

    try {
      await downloadStream(directStreamUrl, {
        suggestedName: `${safeTitle || `video-${id || "stream"}`}-${currentQuality || "stream"}.mp4`,
        onProgress: ({ done, total }) =>
          setDownload((prev) => ({ ...prev, done, total })),
      });
      setDownload({ active: false, done: 0, total: 0, error: null });
    } catch (err) {
      if (err && err.name === "AbortError") {
        setDownload({ active: false, done: 0, total: 0, error: null });
        return;
      }
      setDownload({
        active: false,
        done: 0,
        total: 0,
        error: err?.message || "Download failed",
      });
    }
  }, [directStreamUrl, download.active, fallbackTitle, id, currentQuality]);

  // Clear a download error after a few seconds.
  useEffect(() => {
    if (!download.error) return undefined;
    const timer = setTimeout(
      () => setDownload((prev) => ({ ...prev, error: null })),
      8000
    );
    return () => clearTimeout(timer);
  }, [download.error]);

  // Server URLs
  // 1 = ours (framextv direct stream, extracted by the local service)
  // 2 = Prime (framextv embed player)
  // 3 = vidsrc.to (formerly Server 2)
  // 4 = vidsrc-embed.ru (formerly Server 3)
  const servers = useMemo(() => {
    const framextvEmbed = isTv
      ? `https://framextv.xyz/embed/${id}/${currentSeason}/${currentEpisode}`
      : `https://framextv.xyz/embed/${id}`;

    return {
      1: framextvEmbed,
      2: framextvEmbed,
      3: isTv
        ? `https://vidsrc.to/embed/tv/${id}/${currentSeason}-${currentEpisode}`
        : `https://vidsrc.to/embed/movie/${id}`,
      4: isTv
        ? `https://vidsrc-embed.ru/embed/tv/${id}/${currentSeason}-${currentEpisode}`
        : `https://vidsrc-embed.ru/embed/movie/${id}`,
    };
  }, [id, isTv, currentSeason, currentEpisode]);

  const extractDirectStream = useCallback(async (embedUrl) => {
    if (!USE_DIRECT_STREAM || !embedUrl) return;
    setIsLoading(true);
    setError(null);
    console.log("[DirectStream] Starting extraction for:", embedUrl);
    try {
      const params = new URLSearchParams({ url: embedUrl });
      const res = await fetch(`${EXTRACTOR_URL}/api/extract?${params}`);
      console.log("[DirectStream] API response status:", res.status);
      const data = await res.json();
      console.log("[DirectStream] API response data:", data);
      if (data.success && data.m3u8Url) {
        setDirectStreamUrl(data.m3u8Url);
        // Store all available sources for quality selection
        if (data.sources && data.sources.length > 0) {
          setAvailableSources(data.sources);
          // Set initial quality
          const initialSource = data.sources[0];
          setCurrentQuality(initialSource.quality || "Auto");
        }
        setAllSubtitles(Array.isArray(data.subtitles) ? data.subtitles : []);
        setActiveSubtitleIndex(-1);
        console.log("[DirectStream] SUCCESS - Set stream URL:", data.m3u8Url);
      } else {
        throw new Error(data.error || "No stream found");
      }
    } catch (err) {
      console.error("[DirectStream] ERROR:", err.message, err.stack);
      setError(err.message);
      setDirectStreamUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Extract when server/episode changes (only for Server 1 - framextv)
  useEffect(() => {
    if (currentServer === 1 && id) {
      const embedUrl = servers[1];
      console.log("[DirectStream] Triggering extraction for server 1:", embedUrl);
      extractDirectStream(embedUrl);
    } else {
      console.log("[DirectStream] Clearing stream (server:", currentServer, ")");
      setDirectStreamUrl(null);
      setAvailableSources([]);
      setCurrentQuality("");
      setAllSubtitles([]);
      setActiveSubtitleIndex(-1);
      setIsLoading(false);
      setError(null);
    }
  }, [currentServer, currentEpisode, currentSeason, id, isTv, extractDirectStream, servers]);

  return (
    <div className="PlayMovie__wrp" ref={containerRef}>
      <div className="video-container">
        <div className="now-playing-info">
          <span className="now-playing-title">{fallbackTitle}</span>
          {isTvShow && <span className="now-playing-episode">S{currentSeason} E{currentEpisode}</span>}
        </div>

        {directStreamUrl ? (
          // Direct stream: platform HLS player when available, hls.js otherwise.
          <div className="player-frame">
            <MediaController style={{ width: "100%", height: "100%", background: "#000", borderRadius: "4px" }}>
              <video
                ref={playerRef}
                slot="media"
                style={{ width: "100%", height: "100%" }}
                crossOrigin="anonymous"
                preload="auto"
              >
                {subtitleTracks.map((subtitle) => (
                  <track
                    key={subtitle.url}
                    kind="subtitles"
                    src={subtitle.url}
                    srcLang={subtitle.code || "und"}
                    label={subtitle.label}
                  />
                ))}
              </video>
              <MediaControlBar>
                <MediaPlayButton />
                <MediaSeekBackwardButton seekOffset={10} />
                <MediaSeekForwardButton seekOffset={10} />
                <MediaTimeRange />
                <MediaTimeDisplay showDuration />
                <MediaMuteButton />
                <MediaVolumeRange />
                <MediaFullscreenButton />
              </MediaControlBar>
            </MediaController>

            {resumedAt > 0 && (
              <div className="resume-badge">
                Resuming from {formatTime(resumedAt)}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <StreamLoader />
        ) : error ? (
          <StreamLoader message={`Failed to load: ${error}`} />
        ) : (
          // Fallback to iframe with click overlay
          <>
            <iframe
              ref={iframeRef}
              src={servers[currentServer]}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              title={`${isTv ? "TV Show" : "Movie"} Player`}
              className="player-frame"
              referrerPolicy="no-referrer"
            />
            {showOverlay && (
              <div
                ref={overlayRef}
                className="click-overlay"
                onClick={handleOverlayClick}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 10,
                  cursor: "pointer",
                  background: "transparent",
                }}
                aria-label="Click to enable player"
              />
            )}
          </>
        )}

        {/* Player tools pinned to the top-right corner of the video */}
        <div className="player-tools" ref={toolsRef}>
          {directStreamUrl && (
            <>
              <div className="player-tool">
                <button
                  type="button"
                  className={`player-tool__btn${openMenu === "subtitles" ? " is-active" : ""}${activeSubtitleIndex >= 0 ? " has-subtitles" : ""}`}
                  onClick={() => setOpenMenu(openMenu === "subtitles" ? null : "subtitles")}
                  aria-haspopup="menu"
                  aria-expanded={openMenu === "subtitles"}
                  aria-label="Subtitles"
                  title="Subtitles"
                >
                  <FaClosedCaptioning />
                </button>

                {openMenu === "subtitles" && (
                  <div className="player-tool__panel" role="menu">
                    <div className="player-tool__title">Subtitles</div>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={activeSubtitleIndex === -1}
                      className={`player-tool__item${activeSubtitleIndex === -1 ? " is-active" : ""}`}
                      onClick={() => {
                        setActiveSubtitleIndex(-1);
                        setOpenMenu(null);
                      }}
                    >
                      <span>Off</span>
                      {activeSubtitleIndex === -1 && <FaCheck className="player-tool__check" />}
                    </button>

                    {subtitleTracks.length === 0 && (
                      <div className="player-tool__empty">No subtitles available</div>
                    )}

                    {subtitleTracks.map((subtitle, index) => (
                      <button
                        key={subtitle.url}
                        type="button"
                        role="menuitemradio"
                        aria-checked={activeSubtitleIndex === index}
                        className={`player-tool__item${activeSubtitleIndex === index ? " is-active" : ""}`}
                        onClick={() => {
                          setActiveSubtitleIndex(index);
                          setOpenMenu(null);
                        }}
                      >
                        <span>{subtitle.label}</span>
                        {activeSubtitleIndex === index && <FaCheck className="player-tool__check" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="player-tool">
                <button
                  type="button"
                  className={`player-tool__btn${openMenu === "settings" ? " is-active" : ""}`}
                  onClick={() => setOpenMenu(openMenu === "settings" ? null : "settings")}
                  aria-haspopup="menu"
                  aria-expanded={openMenu === "settings"}
                  aria-label="Playback settings"
                  title="Playback settings"
                >
                  <FaCog />
                </button>

                {openMenu === "settings" && (
                  <div className="player-tool__panel" role="menu">
                    {availableSources.length > 1 && (
                      <>
                        <div className="player-tool__title">Quality</div>
                        {availableSources.map((src) => {
                          const isActive = src.quality === currentQuality;
                          return (
                            <button
                              key={`${src.quality}-${src.server || src.type}`}
                              type="button"
                              role="menuitemradio"
                              aria-checked={isActive}
                              className={`player-tool__item${isActive ? " is-active" : ""}`}
                              onClick={() => {
                                if (src.url !== directStreamUrl) {
                                  setDirectStreamUrl(src.url);
                                  setCurrentQuality(src.quality);
                                }
                                setOpenMenu(null);
                              }}
                            >
                              <span>{src.quality}</span>
                              <span className="player-tool__meta">
                                <span className="player-tool__value">
                                  {src.type === "hls" ? "HLS" : src.type === "mp4" ? "MP4" : ""}
                                </span>
                                {isActive && <FaCheck className="player-tool__check" />}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    <div className="player-tool__title">Speed</div>
                    <div className="player-speed-grid">
                      {SPEED_OPTIONS.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`player-speed${playbackRate === rate ? " is-active" : ""}`}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setOpenMenu(null);
                          }}
                        >
                          {rate === 1 ? "Normal" : `${rate}×`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="player-tool">
                <button
                  type="button"
                  className={`player-tool__btn${download.active ? " is-active" : ""}`}
                  onClick={handleDownload}
                  disabled={download.active}
                  aria-label="Download video"
                  title={download.active ? "Downloading…" : "Download video"}
                >
                  {download.active ? (
                    <span className="player-tool__percent">
                      {download.total ? `${Math.round((download.done / download.total) * 100)}%` : "…"}
                    </span>
                  ) : (
                    <FaDownload />
                  )}
                </button>
              </div>
            </>
          )}

          {download.error && (
            <div className="player-tools__notice" role="alert">
              {download.error}
            </div>
          )}

          {/* Episode selector (TV shows only) */}
          {isTvShow && (
            <div className="player-tool">
              <button
                type="button"
                className={`player-tool__btn${openMenu === "episodes" ? " is-active" : ""}`}
                onClick={() => {
                  setOpenMenu(openMenu === "episodes" ? null : "episodes");
                  if (openMenu !== "episodes") {
                    fetchEpisodes(currentSeason);
                  }
                }}
                aria-haspopup="menu"
                aria-expanded={openMenu === "episodes"}
                aria-label="Select episode"
                title="Select episode"
              >
                <FaList />
              </button>

              {openMenu === "episodes" && (
                <div className="player-tool__panel player-tool__panel--episodes" role="menu">
                  <div className="player-tool__title">Episodes</div>
                  
                  {/* Season selector */}
                  <div className="episode-season-selector">
                    <label htmlFor="episode-season-select" className="player-tool__label">Season</label>
                    <select
                      id="episode-season-select"
                      value={selectedSeasonForEpisodes}
                      onChange={(e) => {
                        const season = Number(e.target.value);
                        setSelectedSeasonForEpisodes(season);
                        fetchEpisodes(season);
                      }}
                      className="player-tool__select"
                    >
                      {Array.from({ length: totalSeasons }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Season {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Episodes list */}
                  <div className="episodes-list-panel">
                    {loadingEpisodes ? (
                      <div className="episodes-loading-panel">
                        <Loader /> Loading episodes...
                      </div>
                    ) : (
                      <>
                        {episodesData[`${id}-season-${selectedSeasonForEpisodes}`] ? (
                          episodesData[`${id}-season-${selectedSeasonForEpisodes}`].map((episode) => (
                            <button
                              key={episode.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={currentEpisode === episode.episode_number}
                              className={`player-tool__item episode-item${currentEpisode === episode.episode_number ? " is-active" : ""}`}
                              onClick={() => {
                                if (playerRef.current?.hls) {
                                  playerRef.current.hls.destroy();
                                  playerRef.current.hls = null;
                                }
                                positionRef.current = 0;
                                initialResumeRef.current = 0;
                                setResumedAt(0);
                                if (selectedSeasonForEpisodes !== currentSeason) {
                                  setCurrentSeason(selectedSeasonForEpisodes);
                                }
                                setCurrentEpisode(episode.episode_number);
                                setOpenMenu(null);
                              }}
                            >
                              <span className="episode-item__num">E{episode.episode_number}</span>
                              <span className="episode-item__name">{episode.name || `Episode ${episode.episode_number}`}</span>
                              {currentEpisode === episode.episode_number && <FaCheck className="player-tool__check" />}
                            </button>
                          ))
                        ) : (
                          <div className="player-tool__empty">No episodes available</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Server switcher */}
          <div className="server-menu">
            <button
              type="button"
              className={`server-menu__toggle${openMenu === "servers" ? " is-open" : ""}`}
              onClick={() => setOpenMenu(openMenu === "servers" ? null : "servers")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "servers"}
              aria-label="Change video server"
              title="Change video server"
            >
              <span className="server-menu__dot" />
              <span className="server-menu__current">
                {SERVER_OPTIONS.find((server) => server.id === currentServer)?.label}
              </span>
              <FaChevronDown
                className={`server-menu__chevron${openMenu === "servers" ? " is-open" : ""}`}
              />
            </button>

            {openMenu === "servers" && (
              <div className="server-menu__list" role="menu">
                <div className="server-menu__title">Playback source</div>
                {SERVER_OPTIONS.map((server) => {
                  const isActive = currentServer === server.id;
                  return (
                    <button
                      key={server.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      className={`server-menu__item${isActive ? " is-active" : ""}`}
                      onClick={() => {
                        setCurrentServer(server.id);
                        setOpenMenu(null);
                      }}
                    >
                      <span className="server-menu__item-main">
                        <span className="server-menu__item-label">{server.label}</span>
                        <span className="server-menu__item-desc">{server.description}</span>
                      </span>
                      {isActive && <FaCheck className="server-menu__check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back button - always visible */}
      <div className="next-episode-row">
        <button className="nav-button go-back-button" onClick={() => history.goBack()} title="Go back">
          <FaArrowLeft />
        </button>
        {isTvShow && (
          <div className="episode-controls-group">
            <span className="now-playing-label">
              S{currentSeason} E{currentEpisode}
            </span>
            <button className="nav-button prev-episode-button" onClick={handlePreviousEpisode} disabled={currentEpisode <= 1} title="Previous Episode">
              <FaBackward />
            </button>
            <button className="nav-button next-episode-button" onClick={handleNextEpisode} title="Next Episode">
              <FaForward />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayMovie;