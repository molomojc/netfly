# Local recommendations

The "Recommended For You" row is generated in the browser. There is no
`/AIrecommendations` request any more.

## Where the data lives

| Data                            | Storage                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| Watch history and "seen" titles | `localStorage` via `redux-persist` (`persist:root`, `history`)    |
| Favourites                      | `localStorage` via `redux-persist` (`persist:root`, `favourites`) |
| Candidate catalogue             | `localStorage` key `fakeflix:recommendation-catalogue:v1`         |

The catalogue is filled from rows the app has already fetched (trending, top
rated, genre rows, ...). It is capped at 600 titles so it stays small.

## How a recommendation is scored

1. **Taste profile** – history and favourites are converted into a sparse
   vector of features: `genre:<id>`, `language:<code>`, `decade:<year>` and
   `type:movie` / `type:tv`.
   - A favourite counts more than a watch.
   - Finishing a title counts more than starting it.
   - Recent activity counts more than old activity (30-day half-life).
2. **Candidate similarity** – every catalogue title gets its own feature vector
   and is compared with the taste vector using cosine similarity.
3. **Blend** – `0.62 * similarity + 0.18 * rating + 0.12 * popularity +
0.08 * freshness`.
4. **Cold start** – with no history yet, the ranking falls back to
   `0.45 * rating + 0.35 * popularity + 0.20 * freshness`, so the row is still
   useful on a first visit.
5. **Exclusions** – titles in history, favourites and `seenKeys` (including
   finished titles that left Continue Watching) are never recommended.
6. **Diversity** – a small per-genre penalty stops one genre from filling the
   whole row.

## Tuning

Weights and limits are constants at the top of
`recommendationEngine.js` (`FEATURE_WEIGHTS`, `SCORE_WEIGHTS`,
`COLD_START_WEIGHTS`, `CATALOGUE_LIMIT`, `TASTE_HALF_LIFE_DAYS`).

## Tests

`npm test -- --watchAll=false src/redux/recommendations/recommendationEngine.test.js`
