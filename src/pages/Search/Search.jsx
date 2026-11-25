import "./search.scss"
import { useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Poster from "../../components/Poster/Poster";
import { motion } from "framer-motion";
import { staggerHalf } from "../../motionUtils";
import {
	selectSearchInputValue,
	selectSearchResults,
	selectSearchLoadingState,
} from "../../redux/search/search.selectors";
import { changeSearchInputValue, fetchSearchResultsAsync } from "../../redux/search/search.actions";

const Search = () => {
	const location = useLocation();
	const history = useHistory();
	const dispatch = useDispatch();

	// The query lives in the URL (`/search?q=you`) so refreshing, sharing or
	// opening the shortcut on a TV always lands on the same results instead of
	// bouncing to /browse.
	const query = new URLSearchParams(location.search).get("q") || "";

	const results = useSelector(selectSearchResults);
	const inputValue = useSelector(selectSearchInputValue);
	const isLoading = useSelector(selectSearchLoadingState);

	useEffect(() => {
		if (!query) {
			// An empty search has nothing to show.
			history.replace("/browse");
			return;
		}

		// The searchbar already dispatched this query on the way here, so only
		// fetch when the store is out of date (direct link, refresh, back/forward).
		if (inputValue !== query) {
			dispatch(changeSearchInputValue(query));
			dispatch(fetchSearchResultsAsync(query));
		}
	}, [query, inputValue, dispatch, history]);

	const isStale = inputValue !== query;
	const showResults = results && results.length > 0;

	return (
		<div className="Search">
			{showResults && !isStale && (
				<h2 className="Search__title">Search results for: {query}</h2>
			)}
			<motion.div
				className="Search__wrp"
				variants={staggerHalf}
				initial="initial"
				animate="animate"
				exit="exit"
			>
				{showResults && !isStale
					? results.map(result => (
						<Poster
							key={result.id}
							item={result}
							{...result}
						/>)
					)
					: (isStale || isLoading) && query ? (
						<h2 className="Search__title">Searching for “{query}”…</h2>
					) : (
						<h2 className="Search__title">
							Sorry, we searched everywhere but we did not found any movie or tv-show with that title.
						</h2>
					)
				}
			</motion.div>
		</div>
	);
}

export default Search
