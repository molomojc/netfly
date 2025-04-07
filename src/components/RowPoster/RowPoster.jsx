import "./rowPoster.scss";
import { BASE_IMG_URL, FALLBACK_IMG_URL } from "../../requests";
import { useDispatch } from "react-redux";
import { addToFavourites, removeFromFavourites } from "../../redux/favourites/favourites.actions";
import { FaPlus, FaMinus, FaPlay, FaChevronDown } from "react-icons/fa";
import useGenreConversion from "../../hooks/useGenreConversion";
import { showModalDetail } from "../../redux/modal/modal.actions";
import { useHistory } from "react-router-dom"; // Add useHistory

const RowPoster = ({ item, isLarge, isFavourite }) => {
    const { title, original_name, original_title, name, genre_ids, poster_path, backdrop_path, id, media_type } = item;
    const fallbackTitle = title || original_title || name || original_name;
    const genresConverted = useGenreConversion(genre_ids);
    const dispatch = useDispatch();
    const history = useHistory(); // Add useHistory

    const getMediaType = () => {
        if (item.original_name || item.name) return 'tv';
        if (item.original_title || item.title) return 'movie';
        return item.first_air_date ? 'tv' : 'movie';
      };
    
      const mediaType = getMediaType();
   //   const isTvv = mediaType === 'tv';
    //  const dateToShow = isTv ? item.first_air_date : item.release_date;
   
	const isTv = media_type === "tv"; // Use mediaType to determine isTv
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
        console.log("Movie ID in Row:", id);
        console.log("isTv:", isTv);
        console.log("Media Type:", mediaType);
        dispatch(showModalDetail({ 
            ...item, 
            fallbackTitle, 
            genresConverted, 
            isFavourite,
            media_type: mediaType // Explicitly pass the media_type
        }));
    };
     
  
    
  
    const handlePlayAction = (event) => {
        event.stopPropagation();
       
        console.log("Movie ID in Row:", id); // Debugging
        console.log("Is TV:", isTv); // Debugging   
        console.log("Season:", Season); // Debugging
        console.log("Episode:", Episode); // Debugging
        history.push({
            pathname: "/play",
            state: { id, isTv, Season, Episode}, // Pass the ID and isTv flag
        });
    };

    return (
        <div
            className={`Row__poster ${isLarge && "Row__poster--big"}`}
            onClick={handleModalOpening}
        >
            {isLarge ? (
                poster_path ? (
                    <img src={`${BASE_IMG_URL}/${poster_path}`} alt={fallbackTitle} />
                ) : ""
            ) : backdrop_path ? (
                <img src={`${BASE_IMG_URL}/${backdrop_path}`} alt={fallbackTitle} />
            ) : (
                <>
                    <img src={FALLBACK_IMG_URL} alt={fallbackTitle} />
                    <div className="Row__poster__fallback">
                        <span>{fallbackTitle}</span>
                    </div>
                </>
            )}
            <div className="Row__poster-info">
                {/* This section from the rowPoster */}
                <div className="Row__poster-info--iconswrp">
                    <button
                        className="Row__poster-info--icon icon--play"
                        onClick={handlePlayAction} // Use onClick for navigation
                    >
                        <FaPlay />
                    </button>
                    {!isFavourite ? (
                        <button className="Row__poster-info--icon icon--favourite" onClick={handleAdd}>
                            <FaPlus />
                        </button>
                    ) : (
                        <button className="Row__poster-info--icon icon--favourite" onClick={handleRemove}>
                            <FaMinus />
                        </button>
                    )}
                    <button className="Row__poster-info--icon icon--toggleModal" onClick={handleModalOpening}>
                        <FaChevronDown />
                    </button>
                </div>
                <div className="Row__poster-info--title">
                    <h3>{fallbackTitle}</h3>
                </div>
                <div className="Row__poster-info--genres">
                    {genresConverted && genresConverted.map((genre) => (
                        <span key={`Genre--id_${genre}`} className="genre-title">
                            {genre}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RowPoster; 