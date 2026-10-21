/**
 * Local recommendation engine.
 *
 * Recommendations used to come from the /AIrecommendations backend. This module
 * replaces that round-trip with a content-based recommender that runs entirely
 * in the browser:
 *
 *   1. Watch history (redux-persist -> localStorage) and favourites tell us what
 *      the viewer likes: genres, languages, decades and movies vs. series.
 *   2. Every title the app has already fetched is kept in a small localStorage
 *      catalogue, so there is always something to recommend from.
 *   3. Each candidate is turned into a sparse feature vector and compared with
 *      the viewer's taste vector using cosine similarity. Quality, popularity
 *      and freshness are blended in so the row is still useful before the
 *      viewer has watched anything (cold start).
 *
 * Nothing here talks to the network and nothing leaves the browser.
 */

export const RECOMMENDATION_CATALOGUE_KEY = "fakeflix:recommendation-catalogue:v1";

// Keep localStorage small: enough titles to personalise, not a full mirror.
const CATALOGUE_LIMIT = 600;

// Taste half-life: something watched 30 days ago counts half as much.
const TASTE_HALF_LIFE_DAYS = 30;
const MIN_RECENCY_WEIGHT = 0.2;

const FEATURE_WEIGHTS = {
  genre: 1,
  mediaType: 0.5,
  language: 0.6,
  decade: 0.35,
};

const SCORE_WEIGHTS = {
  similarity: 0.62,
  quality: 0.18,
  popularity: 0.12,
  freshness: 0.08,
};

// Used when there is no history yet, so the row is "best of what we know".
const COLD_START_WEIGHTS = {
  quality: 0.45,
  popularity: 0.35,
  freshness: 0.2,
};

const clamp = (value, min = 0, max = 1) =>
  Math.min(Math.max(value, min), max);

const hasStorage = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "__fakeflix_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch (_error) {
    return false;
  }
};

const readJson = (key, fallback) => {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Storage can be full or disabled; recommendations still work in-memory.
  }
};

const getMediaType = (item, fallbackMediaType) => {
  if (item?.media_type === "tv" || item?.media_type === "movie") {
    return item.media_type;
  }
  if (fallbackMediaType === "tv" || fallbackMediaType === "movie") {
    return fallbackMediaType;
  }
  return item?.first_air_date || item?.name || item?.original_name
    ? "tv"
    : "movie";
};

const getReleaseDate = (item) => item?.release_date || item?.first_air_date || "";

const getYear = (item) => {
  const date = getReleaseDate(item);
  const year = Number.parseInt(String(date).slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
};

export const getCatalogueKey = (item) =>
  `${getMediaType(item)}:${item?.id}`;

const compact = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );

const asFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

/**
 * Keep only the fields the rows, cards and detail modal actually read. This
 * keeps the localStorage catalogue small and serialisable.
 */
export const normaliseCatalogueItem = (item, fallbackMediaType) => {
  if (!item || item.id === undefined || item.id === null) return null;

  const mediaType = getMediaType(item, fallbackMediaType);

  return compact({
    key: `${mediaType}:${item.id}`,
    id: item.id,
    media_type: mediaType,
    title: item.title,
    name: item.name,
    original_title: item.original_title,
    original_name: item.original_name,
    overview: item.overview,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    genre_ids:
      Array.isArray(item.genre_ids) && item.genre_ids.length > 0
        ? item.genre_ids.map(Number).filter(Number.isFinite)
        : undefined,
    vote_average: asFiniteNumber(item.vote_average),
    vote_count: asFiniteNumber(item.vote_count),
    popularity: asFiniteNumber(item.popularity),
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    original_language: item.original_language,
    adult: typeof item.adult === "boolean" ? item.adult : undefined,
  });
};

export const readCatalogue = () => {
  const stored = readJson(RECOMMENDATION_CATALOGUE_KEY, []);
  return Array.isArray(stored) ? stored : [];
};

/**
 * Merge fetched rows into the persisted catalogue and return the merged list.
 * Newer metadata wins, so a row that finally loads a poster fills the gaps in a
 * catalogue entry saved earlier without one.
 */
export const rememberCatalogue = (items = [], fallbackMediaType) => {
  const catalogue = new Map(
    readCatalogue().map((item) => [item.key, item])
  );

  items.forEach((item) => {
    const normalised = normaliseCatalogueItem(item, fallbackMediaType);
    if (!normalised) return;

    const previous = catalogue.get(normalised.key);
    // Re-insert so the most recently seen titles stay at the end of the list.
    catalogue.delete(normalised.key);
    catalogue.set(normalised.key, { ...previous, ...normalised });
  });

  const merged = Array.from(catalogue.values()).slice(-CATALOGUE_LIMIT);
  writeJson(RECOMMENDATION_CATALOGUE_KEY, merged);
  return merged;
};

export const clearCatalogue = () => writeJson(RECOMMENDATION_CATALOGUE_KEY, []);

const addFeature = (vector, key, weight) => {
  vector.set(key, (vector.get(key) || 0) + weight);
};

/**
 * "Taste" is a sparse vector of the genres, languages, decades and media types
 * the viewer has spent time with. History contributes more than a passing look;
 * favourites contribute the most.
 */
const eventWeight = (entry, isFavourite) => {
  if (isFavourite) return 3;

  const percent = clamp(Number(entry?.percent) || 0);
  const completionBoost = percent >= 0.9 ? 1.6 : percent >= 0.5 ? 1.25 : 0.9;
  const ageDays = entry?.updatedAt
    ? Math.max(0, (Date.now() - entry.updatedAt) / 86_400_000)
    : 0;
  const recency = Math.max(
    MIN_RECENCY_WEIGHT,
    0.5 ** (ageDays / TASTE_HALF_LIFE_DAYS)
  );

  return completionBoost * recency;
};

const featuresFor = (item, fallbackMediaType) => {
  const vector = new Map();
  if (!item) return vector;

  const mediaType = getMediaType(item, fallbackMediaType);
  addFeature(vector, `type:${mediaType}`, FEATURE_WEIGHTS.mediaType);

  if (Array.isArray(item.genre_ids)) {
    item.genre_ids.forEach((genreId) => {
      addFeature(vector, `genre:${genreId}`, FEATURE_WEIGHTS.genre);
    });
  }

  if (item.original_language) {
    addFeature(
      vector,
      `language:${item.original_language}`,
      FEATURE_WEIGHTS.language
    );
  }

  const year = getYear(item);
  if (year) {
    const decade = Math.floor(year / 10) * 10;
    addFeature(vector, `decade:${decade}`, FEATURE_WEIGHTS.decade);
  }

  return vector;
};

const normaliseVector = (vector) => {
  let magnitude = 0;
  vector.forEach((value) => {
    magnitude += value * value;
  });

  magnitude = Math.sqrt(magnitude);
  if (!magnitude) return new Map();

  const normalised = new Map();
  vector.forEach((value, key) => normalised.set(key, value / magnitude));
  return normalised;
};

const cosineSimilarity = (a, b) => {
  if (!a.size || !b.size) return 0;

  // Walk the smaller vector so scoring stays cheap.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  small.forEach((value, key) => {
    const other = large.get(key);
    if (other) dot += value * other;
  });

  return clamp(dot);
};

const buildTasteVector = (historyItems, favouriteItems, catalogueByKey) => {
  const vector = new Map();
  let samples = 0;

  const addItem = (rawItem, isFavourite) => {
    const key = rawItem?.key || getCatalogueKey(rawItem);
    // Older history entries were saved without genre metadata; the catalogue
    // fills those gaps so a viewer's first recommendations still improve.
    const item = {
      ...(catalogueByKey.get(key) || {}),
      ...rawItem,
      genre_ids:
        rawItem?.genre_ids?.length > 0
          ? rawItem.genre_ids
          : catalogueByKey.get(key)?.genre_ids || [],
    };

    const weight = eventWeight(rawItem, isFavourite);
    const features = featuresFor(item, item?.media_type);
    if (!features.size) return;

    features.forEach((value, feature) => {
      addFeature(vector, feature, value * weight);
    });
    samples += 1;
  };

  favouriteItems.forEach((item) => addItem(item, true));
  historyItems.forEach((item) => addItem(item, false));

  return { vector: normaliseVector(vector), samples };
};

const qualityScore = (item) => {
  const vote = Number(item.vote_average);
  if (!Number.isFinite(vote)) return 0.5; // unknown: neutral, don't punish
  return clamp((vote - 4) / 6);
};

const popularityScore = (item) => {
  const popularity = Number(item.popularity);
  if (!Number.isFinite(popularity) || popularity <= 0) return 0;
  return clamp(Math.log1p(popularity) / Math.log1p(1500));
};

const freshnessScore = (item) => {
  const year = getYear(item);
  if (!year) return 0.5;
  const age = new Date().getFullYear() - year;
  return clamp(1 - age / 40);
};

const scoreCandidate = (item, tasteVector, hasTaste) => {
  const quality = qualityScore(item);
  const popularity = popularityScore(item);
  const freshness = freshnessScore(item);

  if (!hasTaste) {
    return (
      COLD_START_WEIGHTS.quality * quality +
      COLD_START_WEIGHTS.popularity * popularity +
      COLD_START_WEIGHTS.freshness * freshness
    );
  }

  const similarity = cosineSimilarity(
    tasteVector,
    normaliseVector(featuresFor(item, item.media_type))
  );

  return (
    SCORE_WEIGHTS.similarity * similarity +
    SCORE_WEIGHTS.quality * quality +
    SCORE_WEIGHTS.popularity * popularity +
    SCORE_WEIGHTS.freshness * freshness
  );
};

/**
 * Pick high scoring titles without letting one genre take over the row. Every
 * extra title from the same primary genre carries a small penalty (a simple
 * MMR-style diversity pass).
 */
const pickDiverse = (scored, limit) => {
  const pending = [...scored];
  const picked = [];
  const genreUse = new Map();

  while (pending.length > 0 && picked.length < limit) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;

    pending.forEach((candidate, index) => {
      const primaryGenre = candidate.item.genre_ids?.[0];
      const genrePenalty = primaryGenre
        ? (genreUse.get(primaryGenre) || 0) * 0.05
        : 0;
      const adjusted = candidate.score - genrePenalty;

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    });

    const [chosen] = pending.splice(bestIndex, 1);
    picked.push(chosen.item);

    const primaryGenre = chosen.item.genre_ids?.[0];
    if (primaryGenre) {
      genreUse.set(primaryGenre, (genreUse.get(primaryGenre) || 0) + 1);
    }
  }

  return picked;
};

/**
 * @param {object} options
 * @param {string} [options.mediaType]        "movie", "tv", or undefined for both
 * @param {Array}  [options.candidates]       rows currently in the redux store
 * @param {Array}  [options.historyItems]     state.history.items
 * @param {Array}  [options.favouriteItems]   state.favourites.favouritesList
 * @param {Array}  [options.seenKeys]         state.history.seenKeys (includes finished titles)
 * @param {number} [options.limit]
 * @param {Array}  [options.excludeKeys]      extra "media_type:id" keys to skip
 * @returns {Array} recommendation cards ready for <RowPoster />
 */
export const getLocalRecommendations = ({
  mediaType,
  candidates = [],
  historyItems = [],
  favouriteItems = [],
  seenKeys = [],
  limit = 24,
  excludeKeys = [],
} = {}) => {
  const catalogue = rememberCatalogue(candidates, mediaType);
  const catalogueByKey = new Map(catalogue.map((item) => [item.key, item]));

  const watchedKeys = new Set(
    historyItems.map((item) => item.key || getCatalogueKey(item))
  );
  const favouriteKeys = new Set(
    favouriteItems.map((item) => item.key || getCatalogueKey(item))
  );
  const blockedKeys = new Set([
    ...watchedKeys,
    ...favouriteKeys,
    ...seenKeys,
    ...excludeKeys,
  ]);

  const { vector: tasteVector, samples } = buildTasteVector(
    historyItems,
    favouriteItems,
    catalogueByKey
  );
  const hasTaste = samples > 0 && tasteVector.size > 0;

  const pool = catalogue.filter(
    (item) =>
      (!mediaType || item.media_type === mediaType) &&
      !blockedKeys.has(item.key)
  );

  const scored = pool.map((item) => ({
    item,
    score: scoreCandidate(item, tasteVector, hasTaste),
  }));

  scored.sort((a, b) => b.score - a.score);

  return pickDiverse(scored, limit).map((item) => ({
    ...item,
    isFavourite: false,
    media_type: item.media_type || mediaType || "movie",
  }));
};
