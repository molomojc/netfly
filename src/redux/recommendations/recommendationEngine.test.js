import {
  RECOMMENDATION_CATALOGUE_KEY,
  getLocalRecommendations,
  readCatalogue,
} from "./recommendationEngine";

const title = (id, genreIds, overrides = {}) => ({
  id,
  media_type: "movie",
  title: `Title ${id}`,
  genre_ids: genreIds,
  vote_average: 7,
  popularity: 100,
  release_date: "2020-01-01",
  original_language: "en",
  ...overrides,
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("local recommendation engine", () => {
  it("persists the catalogue to localStorage", () => {
    getLocalRecommendations({
      mediaType: "movie",
      candidates: [title(1, [28]), title(2, [35])],
    });

    expect(window.localStorage.getItem(RECOMMENDATION_CATALOGUE_KEY)).toBeTruthy();
    expect(readCatalogue()).toHaveLength(2);
  });

  it("falls back to quality and popularity before any history exists", () => {
    const results = getLocalRecommendations({
      mediaType: "movie",
      candidates: [
        title(1, [28], { vote_average: 5.5, popularity: 10 }),
        title(2, [35], { vote_average: 8.5, popularity: 500 }),
      ],
    });

    expect(results[0].id).toBe(2);
  });

  it("learns genres from history and skips watched titles", () => {
    const watched = title(1, [28], { vote_average: 9 });
    const action = title(2, [28]);
    const comedy = title(3, [35]);

    const results = getLocalRecommendations({
      mediaType: "movie",
      candidates: [watched, action, comedy],
      historyItems: [
        {
          key: "movie:1",
          id: 1,
          media_type: "movie",
          genre_ids: [28],
          percent: 0.8,
          updatedAt: Date.now(),
        },
      ],
    });

    expect(results.map((item) => item.id)).not.toContain(1);
    expect(results[0].id).toBe(2);
  });

  it("does not recommend titles that were already finished", () => {
    const results = getLocalRecommendations({
      mediaType: "movie",
      candidates: [title(1, [28]), title(2, [28])],
      seenKeys: ["movie:1"],
    });

    expect(results.map((item) => item.id)).not.toContain(1);
  });

  it("uses catalogue metadata when old history entries have no genres", () => {
    const action = title(2, [28]);
    const comedy = title(3, [35]);

    const results = getLocalRecommendations({
      mediaType: "movie",
      candidates: [title(1, [28]), action, comedy],
      historyItems: [
        {
          key: "movie:1",
          id: 1,
          media_type: "movie",
          percent: 0.8,
          updatedAt: Date.now(),
        },
      ],
    });

    expect(results[0].id).toBe(2);
  });
});
