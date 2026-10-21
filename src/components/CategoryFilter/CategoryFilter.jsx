import "./categoryFilter.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaCaretDown } from "react-icons/fa";
import useOutsideClick from "../../hooks/useOutsideClick";
import {
	fetchMovieDataConfig,
	fetchPopularDataConfig,
	fetchSeriesDataConfig,
} from "../../dataConfig";

// Every browse section that owns a "/:category" route
const SECTIONS = {
	browse: {
		label: "Movies",
		base: "/browse",
		allLabel: "All movies",
		config: fetchMovieDataConfig,
	},
	movies: {
		label: "Movies",
		base: "/movies",
		allLabel: "All movies",
		config: fetchMovieDataConfig,
	},
	tvseries: {
		label: "TV Series",
		base: "/tvseries",
		allLabel: "All series",
		config: fetchSeriesDataConfig,
	},
	popular: {
		label: "New & Popular",
		base: "/popular",
		allLabel: "All new & popular",
		config: fetchPopularDataConfig,
	},
};

// Curated feeds, kept in their own group so "Action" reads as a genre
const COLLECTION_GENRES = ["trending", "toprated", "fakeflix", "upcoming", "newin"];
// "Recommended For You" is built locally and has no category page
const HIDDEN_GENRES = ["recommendations"];

const CategoryFilter = () => {
	const { pathname } = useLocation();
	const history = useHistory();
	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	useOutsideClick(wrapRef, () => {
		if (open) setOpen(false);
	});

	const [sectionName, activeGenre] = pathname.split("/").filter(Boolean);
	const section = SECTIONS[sectionName];

	const { genres, collections } = useMemo(() => {
		if (!section) return { genres: [], collections: [] };

		const visible = section.config.filter(
			item => !HIDDEN_GENRES.includes(item.genre)
		);

		return {
			genres: visible.filter(item => !COLLECTION_GENRES.includes(item.genre)),
			collections: visible.filter(item => COLLECTION_GENRES.includes(item.genre)),
		};
	}, [section]);

	// A route change means the pick landed, so drop the card
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = e => {
			if (e.key === "Escape") setOpen(false);
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	if (!section) return null;

	const isActive = Boolean(activeGenre);
	const goTo = genre => {
		history.push(genre ? `${section.base}/${genre}` : section.base);
		setOpen(false);
	};

	const renderChip = item => (
		<button
			key={item.genre}
			type="button"
			className={`CategoryFilter__chip ${activeGenre === item.genre ? "is-active" : ""}`}
			onClick={() => goTo(item.genre)}
		>
			{item.title}
		</button>
	);

	return (
		<div
			ref={wrapRef}
			className={`CategoryFilter ${open ? "CategoryFilter--open" : ""} ${
				isActive ? "CategoryFilter--active" : ""
			}`}
		>
			<button
				type="button"
				className="CategoryFilter__trigger"
				onClick={() => setOpen(state => !state)}
				aria-haspopup="true"
				aria-expanded={open}
			>
				<span>Categories</span>
				<FaCaretDown className="CategoryFilter__caret" />
			</button>

			<AnimatePresence>
				{open && (
					<motion.div
						className="CategoryFilter__card"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
					>
						<div className="CategoryFilter__header">
							<p className="CategoryFilter__eyebrow">Filter by category</p>
							<p className="CategoryFilter__section">{section.label}</p>
						</div>

						<div className="CategoryFilter__chips">
							<button
								type="button"
								className={`CategoryFilter__chip ${!activeGenre ? "is-active" : ""}`}
								onClick={() => goTo(null)}
							>
								{section.allLabel}
							</button>
						</div>

						{genres.length > 0 && (
							<div className="CategoryFilter__group">
								<p className="CategoryFilter__group-title">Genres</p>
								<div className="CategoryFilter__chips">
									{genres.map(renderChip)}
								</div>
							</div>
						)}

						{collections.length > 0 && (
							<div className="CategoryFilter__group">
								<p className="CategoryFilter__group-title">Collections</p>
								<div className="CategoryFilter__chips">
									{collections.map(renderChip)}
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default CategoryFilter;
