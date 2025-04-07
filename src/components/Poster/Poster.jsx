import "./poster.scss";
import { motion } from "framer-motion";
import { posterFadeInVariants } from "../../motionUtils";
import { BASE_IMG_URL, FALLBACK_IMG_URL } from "../../requests";
import { FaChevronDown, FaMinus, FaPlay, FaPlus } from "react-icons/fa";
import useGenreConversion from "../../hooks/useGenreConversion";
import { showModalDetail } from "../../redux/modal/modal.actions";
import { useDispatch } from "react-redux";
import { addToFavourites, removeFromFavourites } from "../../redux/favourites/favourites.actions";
import { useHistory } from "react-router-dom";

const Poster = ({ item, isFavourite }) => {
    const history = useHistory();
    const { title, original_name, original_title, name, genre_ids, backdrop_path, id, media_type } = item;
    let fallbackTitle = title || original_title || name || original_name;
    const genresConverted = useGenreConversion(genre_ids);
    const dispatch = useDispatch();

    // Determine if the item is a TV series based on `media_type`
    const isTv = media_type === "tv";
    const Season = isTv ? 1 : 0;
    const Episode = isTv ? 1 : 0;

    const handleAdd = (event) => {
        event.stopPropagation();
        dispatch(addToFavourites({ ...item, isFavourite }));
    };

    const handleRemove = (event) => {
        event.stopPropagation();
        dispatch(removeFromFavourites({ ...item, isFavourite }));
    };

    const handleModalOpening = () => {
        console.log("Movie ID in Poster:", id); // Debugging
        console.log("Is TV:", isTv); // Debugging
        console.log("Media Type:", media_type); // Debugging
        dispatch(showModalDetail({ ...item, fallbackTitle, genresConverted, isFavourite }));
    };

    


    const handlePlayAction = (event) => {
        event.stopPropagation();
        history.push({
            pathname: "/play",
            state: { id, isTv,Season,Episode }, // Pass the ID and isTv flag
        });
    };

    return (
        <motion.div
            variants={posterFadeInVariants}
            className="Poster"
            onClick={handleModalOpening}
        >
            {backdrop_path ? (
                <img src={`${BASE_IMG_URL}/${backdrop_path}`} alt={fallbackTitle} />
            ) : (
                <>
                    <img src={FALLBACK_IMG_URL} alt={fallbackTitle} />
                    <div className="Poster__fallback">
                        <span>{fallbackTitle}</span>
                    </div>
                </>
            )}
            <div className="Poster__info">
                <div className="Poster__info--iconswrp">
                    <button
                        className="Poster__info--icon icon--play"
                        onClick={handlePlayAction} // Use onClick for play action
                    >
                        <FaPlay />
                    </button>
                    {!isFavourite ? (
                        <button className="Poster__info--icon icon--favourite" onClick={handleAdd}>
                            <FaPlus />
                        </button>
                    ) : (
                        <button className="Poster__info--icon icon--favourite" onClick={handleRemove}>
                            <FaMinus />
                        </button>
                    )}
                    <button className="Poster__info--icon icon--toggleModal" onClick={handleModalOpening}>
                        <FaChevronDown />
                    </button>
                </div>
                <div className="Poster__info--title">
                    <h3>{fallbackTitle}</h3>
                </div>
                <div className="Poster__info--genres">
                    {genresConverted && genresConverted.map((genre) => (
                        <span key={`Genre--id_${genre}`} className="genre-title">
                            {genre}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default Poster;