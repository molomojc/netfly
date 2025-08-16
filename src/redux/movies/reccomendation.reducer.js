// recommendations.reducer.js
import { moviesActionTypes } from './movies.types';

const initialState = {
   loading: false,
  error: null,
  data: [],
};

const recommendationsReducer = (state = initialState, { type, payload }) => {
  switch (type) {
    case moviesActionTypes.FETCH_RECOMMENDATIONS_REQUEST:
      return { ...state, loading: true, error: null };
    
    case moviesActionTypes.FETCH_RECOMMENDATIONS_SUCCESS:
      return { 
        ...state, 
        data: payload, 
        loading: false, 
        error: null 
      };
    
    case moviesActionTypes.LOAD_MORE_RECOMMENDATIONS_SUCCESS:
      return { 
        ...state, 
        data: [...state.data, ...payload], 
        loading: false 
      };
    
    case moviesActionTypes.FETCH_RECOMMENDATIONS_FAILURE:
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

export default recommendationsReducer;