import { historyActionTypes } from "./history.types";
import {
  getHistoryKey,
  getPercent,
  HISTORY_FINISHED_RATIO,
  HISTORY_MAX_ITEMS,
  HISTORY_MIN_SECONDS,
  HISTORY_SEEN_LIMIT,
} from "./history.utils";

const initialState = {
  items: [],
  seenKeys: [],
};

const addSeenKey = (seenKeys = [], key) =>
  [key, ...seenKeys.filter((seenKey) => seenKey !== key)].slice(
    0,
    HISTORY_SEEN_LIMIT
  );

const normaliseEntry = (payload, previous) => {
  const currentTime = Math.max(Number(payload.currentTime) || 0, 0);
  const duration = Math.max(Number(payload.duration) || 0, 0);

  return {
    ...previous,
    key: getHistoryKey(payload),
    id: payload.id,
    media_type: payload.media_type || "movie",
    title: payload.title || previous?.title || "Untitled",
    poster_path:
      payload.poster_path === undefined
        ? previous?.poster_path
        : payload.poster_path,
    backdrop_path:
      payload.backdrop_path === undefined
        ? previous?.backdrop_path
        : payload.backdrop_path,
    // Kept so the local recommender can build a taste profile without needing
    // to look every title up again.
    genre_ids:
      Array.isArray(payload.genre_ids) && payload.genre_ids.length > 0
        ? payload.genre_ids
        : previous?.genre_ids || [],
    vote_average: payload.vote_average ?? previous?.vote_average ?? null,
    original_language:
      payload.original_language ?? previous?.original_language ?? null,
    release_date:
      payload.release_date ?? previous?.release_date ?? null,
    season: payload.season ?? previous?.season ?? 0,
    episode: payload.episode ?? previous?.episode ?? 0,
    currentTime,
    duration,
    percent: getPercent(currentTime, duration),
    updatedAt: Date.now(),
  };
};

const historyReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case historyActionTypes.UPDATE_PROGRESS: {
      if (!payload || payload.id === undefined || payload.id === null) {
        return state;
      }

      const key = getHistoryKey(payload);
      const previous = state.items.find((item) => item.key === key);
      const entry = normaliseEntry(payload, previous);

      // Finished: drop it, exactly like Netflix does.
      if (
        entry.duration > 0 &&
        entry.percent >= HISTORY_FINISHED_RATIO
      ) {
        const seenKeys = addSeenKey(state.seenKeys, key);
        if (!previous) return { ...state, seenKeys };
        return {
          ...state,
          items: state.items.filter((item) => item.key !== key),
          seenKeys,
        };
      }

      // Ignore the first seconds of a brand new stream.
      if (!previous && entry.currentTime < HISTORY_MIN_SECONDS) {
        return state;
      }

      const items = [entry, ...state.items.filter((item) => item.key !== key)]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, HISTORY_MAX_ITEMS);

      return {
        ...state,
        items,
        seenKeys: addSeenKey(state.seenKeys, key),
      };
    }

    case historyActionTypes.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item.key !== payload),
      };

    case historyActionTypes.CLEAR_HISTORY:
      return initialState;

    default:
      return state;
  }
};

export default historyReducer;
