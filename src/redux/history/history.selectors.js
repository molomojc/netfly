import { createSelector } from "reselect";
import { getHistoryKey, isResumable } from "./history.utils";

const selectHistoryItems = (state) => state.history.items;

/**
 * Items shown in the "Continue Watching" row.
 * Pass a media type ("movie" / "tv") to scope the row to a page.
 */
export const selectContinueWatching = createSelector(
  [selectHistoryItems, (_state, mediaType) => mediaType],
  (items, mediaType) =>
    items.filter(
      (item) => isResumable(item) && (!mediaType || item.media_type === mediaType)
    )
);

/**
 * Raw saved entry for one title, used by the player to resume playback.
 */
export const selectHistoryEntry = (state, id, mediaType = "movie") =>
  state.history.items.find((item) => item.key === getHistoryKey({ id, media_type: mediaType })) ||
  null;

export const selectHistoryCount = (state) => state.history.items.length;
