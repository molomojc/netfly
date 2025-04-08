import { getOneMonthAgoReleaseDate } from "./utils";

export const GITHUB_BASE_URL = "#";
export const GITHUB_AVATAR_URL = "https://avatars.githubusercontent.com/u/25078541?v=4";
const GITHUB_ASSETS_BASE_URL = "https://cdn.jsdelivr.net/gh/Th3Wall/assets-cdn/Fakeflix";
export const LANG = "en-US";
export const REGION = "US";
export const BASE_IMG_URL = "https://image.tmdb.org/t/p/original";
export const FALLBACK_IMG_URL = `${GITHUB_ASSETS_BASE_URL}/Fakeflix_readme.png`;
export const LOGO_URL = `https://i.postimg.cc/B8M5YrRH/Cinema.png`;
export const MOBILE_LOGO_URL = `${GITHUB_ASSETS_BASE_URL}/Fakeflix_favicon_192.png`;
export const PROFILE_PIC_URL = `${GITHUB_ASSETS_BASE_URL}/Fakeflix_profilepic.png`;
export const SIGNIN_BGIMG_URL = `${GITHUB_ASSETS_BASE_URL}/Fakeflix_auth_bg.jpg`;
export const TADUM_SOUND_URL = `${GITHUB_ASSETS_BASE_URL}/Fakeflix_TaDum.mp3`;
const ONEMONTHAGO = getOneMonthAgoReleaseDate();
const { REACT_APP_TMDB_API_KEY } = process.env;

// Helper function to get trailer URL from TMDB videos response
export const fetchTrailerUrl = async (id, mediaType = 'movie') => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}/videos?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`
    );
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) return null;
    
    // Find the first official trailer (preferably in English)
    const trailer = data.results.find(
      video => 
        video.type === 'Trailer' && 
        video.official &&
        (video.iso_639_1 === 'en' || !video.iso_639_1) // Prefer English trailers
    ) || data.results[0]; // Fallback to first video if no official trailer
    
    if (!trailer) return null;
    
    // Return embed URL based on site
    if (trailer.site === 'YouTube') {
      return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0`;
    } else if (trailer.site === 'Vimeo') {
      return `https://player.vimeo.com/video/${trailer.key}?autoplay=1&muted=1`;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching trailer:", error);
    return null;
  }
};

const requests = {
    fetchSearchQuery: `/search/multi?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}&query=`,
    fetchTrendingAll: `/trending/all/week?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`,
    fetchReleasedMoviesByOneMonth: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&primary_release_date.gte=${ONEMONTHAGO}&sort_by=popularity.desc&language=${LANG}`,
    // Movies
    fetchTrendingMovies: `/trending/movie/week?api_key=${REACT_APP_TMDB_API_KEY}&sort_by=popularity.desc&language=${LANG}`,
    fetchUpcomingMovies: `/movie/upcoming?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`,
    fetchTopRated: `/movie/top_rated?api_key=${REACT_APP_TMDB_API_KEY}&sort_by=popularity.desc&region=${REGION}`,
    fetchActionMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=28&sort_by=popularity.desc&language=${LANG}`,
    fetchAdventureMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=12&sort_by=popularity.desc&language=${LANG}`,
    fetchComedyMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=35&sort_by=popularity.desc&language=${LANG}`,
    fetchHorrorMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=27&sort_by=popularity.desc&language=${LANG}`,
    fetchRomanceMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10749&sort_by=popularity.desc&language=${LANG}`,
    fetchWarMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10752&sort_by=popularity.desc&language=${LANG}`,
    fetchAnimationMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&language=${LANG}`,
    discoverMovies: `/discover/movie?api_key=${REACT_APP_TMDB_API_KEY}&sort_by=popularity.desc&language=${LANG}`,
    // Series
    discoverSeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&sort_by=popularity.desc&language=${LANG}`,
    fetchTrendingSeries: `/trending/tv/week?api_key=${REACT_APP_TMDB_API_KEY}&sort_by=popularity.desc&language=${LANG}`,
    fetchNetflixOriginals: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_networks=213&sort_by=popularity.desc&language=${LANG}`,
    fetchActionAdventureSeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10759&sort_by=popularity.desc&language=${LANG}`,
    fetchAnimationSeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&language=${LANG}`,
    fetchComedySeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=35&sort_by=popularity.desc&language=${LANG}`,
    fetchCrimeSeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=80&sort_by=popularity.desc&language=${LANG}`,
    fetchDocumentarySeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=99&sort_by=popularity.desc&language=${LANG}`,
    fetchFamilySeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10751&sort_by=popularity.desc&language=${LANG}`,
    fetchKidsSeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10762&sort_by=popularity.desc&language=${LANG}`,
    fetchSciFiFantasySeries: `/discover/tv?api_key=${REACT_APP_TMDB_API_KEY}&with_genres=10765&sort_by=popularity.desc&language=${LANG}`,
    // Video endpoints
    fetchMovieVideos: (movieId) => `/movie/${movieId}/videos?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`,
    fetchTVVideos: (tvId) => `/tv/${tvId}/videos?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`,

    fetchSeasonNum: (id) =>  `/tv/${id}?api_key=${process.env.REACT_APP_TMDB_API_KEY}`,

   fetchTVEpisodes: (tvId, seasonNumber) => `/tv/${tvId}/season/${seasonNumber}?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}`,
   fetchSimilar: (id, mediaType) => `/${mediaType}/${id}/similar?api_key=${REACT_APP_TMDB_API_KEY}&language=${LANG}&page=1&sort_by=popularity.desc&vote_count.gte=50`,
};

export default requests;