import { combineReducers } from "redux"
import persistReducer from "redux-persist/es/persistReducer";
import storage from 'redux-persist/lib/storage';

import auth from "./auth";
import movies from "./movies";
import series from "./series";
import favourites from "./favourites";
import search from "./search";
import detailModal from "./modal";
import history from "./history";


const persistConfig = {
    key: 'root',
    storage,
    // `history` holds "Continue Watching" and lives in localStorage only.
    whitelist: ['favourites', 'history']
}

const rootReducer = combineReducers({
    search,
    auth,
    movies,
    series,
    favourites,
    detailModal,
    history
})

export default persistReducer(persistConfig, rootReducer);