import './detailModal.scss';
import { useRef } from 'react';
import { useHistory } from "react-router-dom"; // Add useHistory
import { motion, AnimatePresence } from "framer-motion";
import { staggerOne, modalOverlayVariants, modalVariants, modalFadeInUpVariants } from "../../motionUtils";
import { hideModalDetail } from "../../redux/modal/modal.actions";
import { useDispatch, useSelector } from "react-redux";
import { selectModalContent, selectModalState } from "../../redux/modal/modal.selectors";
import { BASE_IMG_URL, FALLBACK_IMG_URL } from "../../requests";
import { VscChromeClose } from "react-icons/vsc";
import { capitalizeFirstLetter, dateToYearOnly } from "../../utils";
import { FaMinus, FaPlay, FaPlus } from "react-icons/fa";
import { addToFavourites, removeFromFavourites } from "../../redux/favourites/favourites.actions";
import useOutsideClick from "../../hooks/useOutsideClick";

const DetailModal = () => {
    const dispatch = useDispatch();
    const history = useHistory(); // Add useHistory
    const modalClosed = useSelector(selectModalState);
    const modalContent = useSelector(selectModalContent);
    console.log("Modal Content:", modalContent); // Debugging

    const handleModalClose = () => {
        console.log("Modal closed"); // Debugging
        dispatch(hideModalDetail());
    };

    const { overview, fallbackTitle, backdrop_path, release_date, first_air_date, vote_average, original_language, adult, genresConverted, isFavourite, id, media_type } = modalContent || {};
    const joinedGenres = genresConverted ? genresConverted.join(', ') : "Not available";
    const maturityRating = adult === undefined ? "Not available" : adult ? "Suitable for adults only" : "Suitable for all ages";
    const reducedDate = release_date ? dateToYearOnly(release_date) : first_air_date ? dateToYearOnly(first_air_date) : "Not Available";
    const modalRef = useRef();

	const mediaType = media_type || (first_air_date ? "tv" : "movie");
	const isTv = mediaType === "tv"; // Use mediaType to determine isTv

    const handleAdd = (event) => {
        event.stopPropagation();
        console.log("Add to Favourites clicked"); // Debugging
        dispatch(addToFavourites({ ...modalContent, isFavourite }));
    };

    const handleRemove = (event) => {
        event.stopPropagation();
        console.log("Remove from Favourites clicked"); // Debugging
        dispatch(removeFromFavourites({ ...modalContent, isFavourite }));
        if (!modalClosed) handleModalClose();
    };

    const handlePlayAnimation = (event) => {
        event.stopPropagation();
        console.log("Play button clicked"); // Debugging
        console.log("ID from detailed:", id); // Debugging
        console.log("Is TV: from detailed", isTv); // Debugging
		console.log("Media Type:", mediaType); // Debugging
        handleModalClose();
        // Navigate to /play with the ID and isTv flag
        history.push({
            pathname: "/play",
            state: { id, isTv }, // Pass the ID and isTv flag
        });
    };

    useOutsideClick(modalRef, () => {
        if (!modalClosed) handleModalClose();
    });

    return (
        <AnimatePresence exitBeforeEnter>
            {!modalClosed && (
                <>
                    {console.log("DetailModal is rendering")} {/* Debugging */}
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
                                <img
                                    className="Modal__image--img"
                                    src={backdrop_path ? `${BASE_IMG_URL}/${backdrop_path}` : FALLBACK_IMG_URL}
                                    alt={fallbackTitle}
                                />
                                <div className="Modal__image--buttonswrp">
                                    <button
                                        className="Modal__image--button"
                                        onClick={handlePlayAnimation} // Use onClick for play action
                                    >
                                        <FaPlay />
                                        <span>Play</span>
                                    </button>
                                    {!isFavourite
                                        ? (
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
                </>
            )}
        </AnimatePresence>
    );
};

export default DetailModal;