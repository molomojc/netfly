// Continue watching helpers.
// The whole feature is backed by localStorage (through redux-persist), so these
// helpers stay dumb and serialisable-safe.

// Don't record the first seconds of a stream: autoplay noise polls the row.
export const HISTORY_MIN_SECONDS = 15;
// A title watched past this point is considered finished and leaves the row.
export const HISTORY_FINISHED_RATIO = 0.95;
// Keep localStorage small.
export const HISTORY_MAX_ITEMS = 40;
// Titles that have been played, including ones that no longer appear in the
// Continue Watching row because they were finished. The recommender uses this
// so a completed film is not recommended straight back to the viewer.
export const HISTORY_SEEN_LIMIT = 200;

export const getHistoryKey = ({ id, media_type }) =>
  `${media_type || "movie"}:${id}`;

export const getPercent = (currentTime, duration) => {
  if (!duration || duration <= 0) return 0;
  return Math.max(0, Math.min(currentTime / duration, 1));
};

export const isResumable = (entry) =>
  Boolean(
    entry &&
      entry.currentTime > 0 &&
      getPercent(entry.currentTime, entry.duration) < HISTORY_FINISHED_RATIO
  );

export const formatMinutesLeft = (entry) => {
  if (!entry || !entry.duration || !entry.currentTime) return "Resume";
  const secondsLeft = Math.max(entry.duration - entry.currentTime, 0);
  const minutesLeft = Math.round(secondsLeft / 60);

  if (minutesLeft < 1) return "Almost done";
  if (minutesLeft < 60) return `${minutesLeft}m left`;

  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  return minutes ? `${hours}h ${minutes}m left` : `${hours}h left`;
};

export const formatTime = (seconds) => {
  const total = Math.max(Math.floor(Number(seconds) || 0), 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  const pad = (value) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(remaining)}`
    : `${minutes}:${pad(remaining)}`;
};
