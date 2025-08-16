import "./banner.scss";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { staggerOne, bannerFadeInLoadSectionVariants, bannerFadeInVariants, bannerFadeInUpVariants } from "../../motionUtils";
import { BASE_IMG_URL, FALLBACK_IMG_URL, fetchTrailerUrl } from "../../requests";
import { FaPlay } from "react-icons/fa";
import { BiInfoCircle } from "react-icons/bi";
import { randomize, truncate } from "../../utils";
import { useHistory } from "react-router-dom";
import SkeletonBanner from "../SkeletonBanner/SkeletonBanner";
import { useDispatch, useSelector } from "react-redux";
import { showModalDetail } from "../../redux/modal/modal.actions";
import { selectTrendingMovies } from "../../redux/movies/movies.selectors";
import { selectNetflixSeries } from "../../redux/series/series.selectors";

const Banner = ({ type }) => {
    const history = useHistory();
    const [trailerUrl, setTrailerUrl] = useState(null);
    const [loadingTrailer, setLoadingTrailer] = useState(false);
    const [error, setError] = useState(null);
    const [currentBannerData, setCurrentBannerData] = useState(null);
    const dataRef = useRef(null);
    
    let selector;
    let isTv = false;

    switch (type) {
        case "movies":
            selector = selectTrendingMovies;
            break;
        case "series":
            selector = selectNetflixSeries;
            isTv = true;
            break;
        default:
            selector = selectNetflixSeries;
            isTv = true;
            break;
    }

    const myData = useSelector(selector);
    const { loading, error: dataError, data: results } = myData;
    
    // Only update the banner data when results actually change
    useEffect(() => {
        if (results && results.length > 0) {
            const newData = results[randomize(results)];
            if (JSON.stringify(newData) !== JSON.stringify(dataRef.current)) {
                dataRef.current = newData;
                setCurrentBannerData(newData);
                // Reset trailer state when banner data changes
                setTrailerUrl(null);
                setError(null);
            }
        }
    }, [results]);

    const fallbackTitle = currentBannerData?.title || currentBannerData?.name || currentBannerData?.original_name;
    const id = currentBannerData?.id;
    
    const getMediaType = () => {
        if (isTv) return 'tv';
        return 'movie';
    };
    
    const description = truncate(currentBannerData?.overview, 150);
    const dispatch = useDispatch();
    const mediaType = getMediaType();

    let Season = 0;
    let Episode = 0;
    if (isTv) {    
        Season = 1;
        Episode = 1;
    }

    const fetchTrailer = useCallback(async () => {
        if (!id || !mediaType) return;
        
        setLoadingTrailer(true);
        setError(null);
        
        try {
            const url = await fetchTrailerUrl(id, mediaType);
            if (url) {
                setTrailerUrl(url);
            } else {
                setError('No trailer available');
            }
        } catch (err) {
            setError('Failed to load trailer');
            console.error("Error fetching trailer:", err);
        } finally {
            setLoadingTrailer(false);
        }
    }, [id, mediaType]);

    useEffect(() => {
        if (id) {
            fetchTrailer();
        }
    }, [id, fetchTrailer]);

    const handlePlayAnimation = (event) => {
        event.stopPropagation();
        history.push({
            pathname: '/play',
            state: {fallbackTitle, id, isTv, Season, Episode },
        });
    };

    const handleModalOpening = () => {
        dispatch(showModalDetail({ ...currentBannerData, fallbackTitle, media_type: mediaType }));
    };

    return (
        <>
            <motion.section
                variants={bannerFadeInLoadSectionVariants}
                initial='initial'
                animate='animate'
                exit='exit'
                className="Banner__loadsection"
            >
                {loading && <SkeletonBanner />}
                {dataError && <div className="errored">Oops, an error occurred.</div>}
            </motion.section>

            {!loading && currentBannerData && (
                <motion.header
                    variants={bannerFadeInVariants}
                    initial='initial'
                    animate='animate'
                    exit='exit'
                    className="Banner"
                    style={!trailerUrl ? { 
                        backgroundImage: `url(${BASE_IMG_URL}/${currentBannerData?.backdrop_path || FALLBACK_IMG_URL})` 
                    } : {}}
                >
                    {/* Trailer or fallback content */}
                    {loadingTrailer ? (
                        <div className="Banner__trailer--loading">
                            Loading trailer...
                        </div>
                    ) : trailerUrl ? (
                        <div className="Banner__trailer--container">
                            <iframe
                                src={trailerUrl}
                                title={`${fallbackTitle} Trailer`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="Banner__trailer--iframe"
                                width="100%"
                                height="100%"
                                loading="lazy"
                                style={{ border: 'none' }}
                            />
                        </div>
                    ) : error ? (
                        <div className="Banner__trailer--error">
                            <div 
                                className="Banner__image"
                                style={{ 
                                    backgroundImage: `url(${BASE_IMG_URL}/${currentBannerData?.backdrop_path || FALLBACK_IMG_URL})` 
                                }}
                            />
                        </div>
                    ) : null}

                    <motion.div
                        className="Banner__content"
                        variants={staggerOne}
                        initial='initial'
                        animate='animate'
                        exit='exit'
                    >
                        <motion.h1 variants={bannerFadeInUpVariants} className="Banner__content--title">{fallbackTitle}</motion.h1>
                        <motion.div variants={bannerFadeInUpVariants} className="Banner__buttons">
                            <button
                                className="Banner__button"
                                onClick={handlePlayAnimation}
                            >
                                <FaPlay />
                                <span>Play</span>
                            </button>
                            <button
                                className="Banner__button"
                                onClick={handleModalOpening}
                            >
                                <BiInfoCircle size="1.5em" />
                                <span>More info</span>
                            </button>
                        </motion.div>
                        <motion.p variants={bannerFadeInUpVariants} className="Banner__content--description">{description}</motion.p>
                    </motion.div>
                    <div className="Banner__panel" />
                    <div className="Banner__bottom-shadow" />
                </motion.header>
            )}
        </>
    );
};

export default React.memo(Banner);