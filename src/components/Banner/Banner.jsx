 import "./banner.scss";
import React from "react";
import { motion } from "framer-motion";
import { staggerOne, bannerFadeInLoadSectionVariants, bannerFadeInVariants, bannerFadeInUpVariants } from "../../motionUtils";
import { BASE_IMG_URL } from "../../requests";
import { FaPlay } from "react-icons/fa";
import { BiInfoCircle } from "react-icons/bi";
import { randomize, truncate } from "../../utils";
import { useHistory } from "react-router-dom";
import SkeletonBanner from "../SkeletonBanner/SkeletonBanner";
import { useDispatch, useSelector } from "react-redux";
import { showModalDetail } from "../../redux/modal/modal.actions";
import { selectTrendingMovies} from "../../redux/movies/movies.selectors";
import { selectNetflixSeries } from "../../redux/series/series.selectors";

const Banner = ({ type }) => {
    const history = useHistory();
    let selector;
    let isTv = false; // Add a flag to indicate if it's a TV series

    switch (type) {
        case "movies":
            selector = selectTrendingMovies;
            break;
        case "series":
            selector = selectNetflixSeries;
            isTv = true; // Set the flag to true for TV series
            break;
        default:
            selector = selectNetflixSeries;
            isTv = true; // Set the flag to true for TV series
            break;
    }

    const myData = useSelector(selector);
    const { loading, error, data: results } = myData;
    const finalData = results[randomize(results)];
    const fallbackTitle = finalData?.title || finalData?.name || finalData?.original_name;
    const id = finalData?.id;
    const getMediaType = () => {
        if (isTv == true) return 'tv';
        if (isTv == false) return 'movie';
       
      };
    const episodeId = finalData?.episode_id;
    const seasonId = finalData?.season_id;
    const description = truncate(finalData?.overview, 150);
    const dispatch = useDispatch();
     const mediaType = getMediaType();

    const handlePlayAnimation = (event) => {
        event.stopPropagation();
        console.log("Movie ID in Banner:", id);
        console.log("Episode ID in Banner:", episodeId);
        console.log("Season ID in Banner:", seasonId);
        history.push({
            pathname: '/play',
            state: { id, isTv }, // Pass the ID and the flag
        });
    };

    const handleModalOpening = () => {
        console.log("Movie ID in Banner:", id);
        console.log("Is TV:", mediaType);
        dispatch(showModalDetail({ ...finalData, fallbackTitle, media_type: mediaType  }));
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
                {error && <div className="errored">Oops, an error occurred.</div>}
            </motion.section>

            {!loading && finalData && (
                <motion.header
                    variants={bannerFadeInVariants}
                    initial='initial'
                    animate='animate'
                    exit='exit'
                    className="Banner"
                    style={{ backgroundImage: `url(${BASE_IMG_URL}/${finalData?.backdrop_path})` }}
                >
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