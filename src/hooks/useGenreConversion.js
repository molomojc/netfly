import { genresList } from "../dataConfig";

const useGenreConversion = (item = {}) => {
  const genresConvertedList = [];

  const genreIds = item.genre_ids || [];
  const genres = item.genres || [];

  if (genreIds.length) {
    genreIds.slice(0, 3).forEach(genreId => {
      const genre = genresList.find(el => el.id === genreId);
      if (genre) genresConvertedList.push(genre.name);
    });
  } else if (genres.length) {
    genres.slice(0, 3).forEach(genre => {
      if (genre.name) genresConvertedList.push(genre.name);
    });
  }

  return genresConvertedList;
};

export default useGenreConversion;
