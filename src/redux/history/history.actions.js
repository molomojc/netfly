import { historyActionTypes } from "./history.types";

export const updateWatchProgress = (entry) => ({
  type: historyActionTypes.UPDATE_PROGRESS,
  payload: entry,
});

export const removeFromHistory = (key) => ({
  type: historyActionTypes.REMOVE_ITEM,
  payload: key,
});

export const clearHistory = () => ({
  type: historyActionTypes.CLEAR_HISTORY,
});
