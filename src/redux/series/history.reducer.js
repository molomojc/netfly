// recommendations.reducer.js
import { seriesActionTypes } from './series.types';

const initialState = {
   loading: false,
  error: null,
  data: [],
};

const historyReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case seriesActionTypes.FETCH_HISTORY_REQUEST:
      return { ...state, loading: true, error: null };
    
    case seriesActionTypes.FETCH_HISTORY_SUCCESS:
      return { 
        ...state, 
        data: payload, 
        loading: false, 
        error: null 
      };
    
    case seriesActionTypes.LOAD_MORE_HISTORY_SUCCESS:
      return { 
        ...state, 
        data: [...state.data, ...payload], 
        loading: false 
      };
    
    case seriesActionTypes.FETCH_HISTORY_FAILURE:
      return { 
        ...state, 
        error: payload, 
        loading: false, 
        data: [] 
      };
    
    default:
      return state;
  }
};

export default historyReducer;