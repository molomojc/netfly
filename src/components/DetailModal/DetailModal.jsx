import './detailModal.scss';
import { useRef, useState, useEffect, useCallback } from 'react'; // Add useCallback
import { useHistory } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { staggerOne, modalOverlayVariants, modalVariants, modalFadeInUpVariants } from "../../motionUtils";
import { hideModalDetail } from "../../redux/modal/modal.actions";
import { useDispatch, useSelector } from "react-redux";
import { selectModalContent, selectModalState } from "../../redux/modal/modal.selectors";
import { BASE_IMG_URL, FALLBACK_IMG_URL, fetchTrailerUrl } from "../../requests";
import { VscChromeClose } from "react-icons/vsc";
import { capitalizeFirstLetter, dateToYearOnly } from "../../utils";
import { FaMinus, FaPlay, FaPlus } from "react-icons/fa";
import { addToFavourites, removeFromFavourites } from "../../redux/favourites/favourites.actions";
import useOutsideClick from "../../hooks/useOutsideClick";

const DetailModal = () => {
    const dispatch = useDispatch();
    const history = useHistory();
    const modalClosed = useSelector(selectModalState);
    const modalContent = useSelector(selectModalContent);
    const [trailerUrl, setTrailerUrl] = useState(null);
    const [loadingTrailer, setLoadingTrailer] = useState(false);
    const [error, setError] = useState(null);

   
    const fetchTrailer = useCallback(async () => {
        if (!modalContent?.id || !modalContent?.media_type) return;
        
        setLoadingTrailer(true);
        setError(null);
        
        try {
            const url = await fetchTrailerUrl(modalContent.id, modalContent.media_type);
            if (url) {
                setTrailerUrl(url);
                console.log("Trailer URL:", url);
            } else {
                console.log("No trailer found for this content.");
                setError('No trailer available');
            }
        } catch (err) {
            setError('Failed to load trailer');
            console.error("Error fetching trailer:", err);
        } finally {
            setLoadingTrailer(false);
        }
    }, [modalContent]); // Add dependencies here

    useEffect(() => {
        if (!modalClosed && modalContent) {
            fetchTrailer();
        }
    }, [modalClosed, modalContent, fetchTrailer]); 

    const handleModalClose = () => {
        setTrailerUrl(null); // Reset trailer when closing
        dispatch(hideModalDetail());
    };

    const { overview, fallbackTitle, backdrop_path, release_date, first_air_date, vote_average, original_language, adult, genresConverted, isFavourite, id, media_type } = modalContent || {};
    const joinedGenres = genresConverted ? genresConverted.join(', ') : "Not available";
    const maturityRating = adult === undefined ? "Not available" : adult ? "Suitable for adults only" : "Suitable for all ages";
    const reducedDate = release_date ? dateToYearOnly(release_date) : first_air_date ? dateToYearOnly(first_air_date) : "Not Available";
    const modalRef = useRef();

    const mediaType = media_type || (first_air_date ? "tv" : "movie");
    const isTv = mediaType === "tv";

    const handleAdd = (event) => {
        event.stopPropagation();
        dispatch(addToFavourites({ ...modalContent, isFavourite }));
    };

    const handleRemove = (event) => {
        event.stopPropagation();
        dispatch(removeFromFavourites({ ...modalContent, isFavourite }));
        if (!modalClosed) handleModalClose();
    };

    const handlePlayAnimation = (event) => {
        event.stopPropagation();
        handleModalClose();
        history.push({
            pathname: "/play",
            state: { id, isTv },
        });
    };

    useOutsideClick(modalRef, () => {
        if (!modalClosed) handleModalClose();
    });

    return (
        <AnimatePresence exitBeforeEnter>
            {!modalClosed && (
                <motion.div
                    variants={modalOverlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    key="modalOverlay"
                    className={`Modal__overlay ${modalClosed && 'Modal__invisible'}`}
                >
                    <motion.div
                        key="modal"
                        variants={modalVariants}
                        ref={modalRef}
                        className={`Modal__wrp ${modalClosed && 'Modal__invisible'}`}
                    >
                        <motion.button
                            className="Modal__closebtn"
                            onClick={handleModalClose}
                        >
                            <VscChromeClose />
                        </motion.button>
                        <div className="Modal__image--wrp">
                            <div className="Modal__image--shadow" />
                            
                            {/* Trailer or fallback content */}
                            {loadingTrailer ? (
                                <div className="Modal__trailer--loading">
                                    Loading trailer...
                                </div>
                            ) : trailerUrl ? (
                                <div className="Modal__trailer--container">
                                    <iframe
                                        src={trailerUrl}
                                        title={`${fallbackTitle} Trailer`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="Modal__trailer--iframe"
                                        width="100%"
                                       
                                        loading="lazy"
                                        style={{ border: 'none', height: 'calc(100vh - 50px)' }}
                                    />
                                </div>
                            ) : error ? (
                                <div className="Modal__trailer--error">
                                    <img
                                        className="Modal__image--img"
                                        src={backdrop_path ? `${BASE_IMG_URL}/${backdrop_path}` : FALLBACK_IMG_URL}
                                        alt={fallbackTitle}
                                    />
                                    <div className="Modal__trailer--error-message">
                                        {error}
                                    </div>
                                </div>
                            ) : (
                                <img
                                    className="Modal__image--img"
                                    src={backdrop_path ? `${BASE_IMG_URL}/${backdrop_path}` : FALLBACK_IMG_URL}
                                    alt={fallbackTitle}
                                />
                            )}
                            
                            <div className="Modal__image--buttonswrp">
                                <button
                                    className="Modal__image--button"
                                    onClick={handlePlayAnimation}
                                >
                                    <FaPlay />
                                    <span>Play</span>
                                </button>
                                {!isFavourite ? (
                                    <button className='Modal__image--button-circular' onClick={handleAdd}>
                                        <FaPlus />
                                    </button>
                                ) : (
                                    <button className='Modal__image--button-circular' onClick={handleRemove}>
                                        <FaMinus />
                                    </button>
                                )}
                            </div>
                        </div>
                        <motion.div variants={staggerOne} initial="initial" animate="animate" exit="exit" className="Modal__info--wrp">
                            <motion.h3 variants={modalFadeInUpVariants} className="Modal__info--title">{fallbackTitle}</motion.h3>
                            <motion.p variants={modalFadeInUpVariants} className="Modal__info--description">{overview}</motion.p>
                            <motion.hr variants={modalFadeInUpVariants} className="Modal__info--line"/>
                            <motion.h4 variants={modalFadeInUpVariants} className="Modal__info--otherTitle">Info on <b>{fallbackTitle}</b></motion.h4>
                            <motion.div variants={modalFadeInUpVariants} className="Modal__info--row">
                                <span className='Modal__info--row-label'>Genres: </span>
                                <span className="Modal__info--row-description">{joinedGenres}</span>
                            </motion.div>
                            <motion.div variants={modalFadeInUpVariants} className="Modal__info--row">
                                <span className='Modal__info--row-label'>
                                    {release_date ? "Release date: " : "First air date: "}
                                </span>
                                <span className="Modal__info--row-description">{reducedDate}</span>
                            </motion.div>
                            <motion.div variants={modalFadeInUpVariants} className="Modal__info--row">
                                <span className='Modal__info--row-label'>Average vote: </span>
                                <span className="Modal__info--row-description">{vote_average || "Not available"}</span>
                            </motion.div>
                            <motion.div variants={modalFadeInUpVariants} className="Modal__info--row">
                                <span className='Modal__info--row-label'>Original language: </span>
                                <span className="Modal__info--row-description">{capitalizeFirstLetter(original_language)}</span>
                            </motion.div>
                            <motion.div variants={modalFadeInUpVariants} className="Modal__info--row">
                                <span className='Modal__info--row-label'>Age classification: </span>
                                <span className="Modal__info--row-description">{maturityRating}</span>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DetailModal;