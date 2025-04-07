import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BASE_IMG_URL, FALLBACK_IMG_URL } from '../../requests';
import { hideModalDetail } from "../../redux/modal/modal.actions";
import { FaPlay } from 'react-icons/fa';
import { useDispatch} from "react-redux";
import './Episodes.scss';

const Episodes = ({ tvId, seasonNumber }) => {
    const history = useHistory();
    const dispatch = useDispatch();
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!tvId || !seasonNumber) return;

        const fetchEpisodes = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.episodes && data.episodes.length > 0) {
                    setEpisodes(data.episodes);
                } else {
                    setEpisodes([]);
                }
            } catch (err) {
                console.error("Error fetching episodes:", err);
                setError('Failed to load episodes');
                setEpisodes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEpisodes();
    }, [tvId, seasonNumber]);

    const handlePlayEpisode = (episodeNumber) => {

        handleModalClose();
        console.log("Episode Number:", episodeNumber);
        console.log("Season Number:", seasonNumber);
        history.push({
            pathname: "/play",
            state: { 
                id: tvId, 
                isTv: true,
                Season: seasonNumber,
                Episode: episodeNumber
            },
        });
    };

    const handleModalClose = () => {
        dispatch(hideModalDetail());
    };


    if (loading) return <div className="episodes-loading">Loading episodes...</div>;
    if (error) return <div className="episodes-error">{error}</div>;
    if (episodes.length === 0) return null;

    return (
        <motion.div 
            className="episodes-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
        
<p className="season-info">
    Season {seasonNumber} • {episodes.length} episodes
</p>
            <div className="episodes-list">
                {episodes.map((episode) => (
                    <div key={episode.id} className="episode-row">
                        <div className="episode-image-container">
                            <img
                                src={episode.still_path ? `${BASE_IMG_URL}${episode.still_path}` : FALLBACK_IMG_URL}
                                alt={episode.name}
                                className="episode-image"
                            />
                            <button 
                                className="episode-play-button"
                                onClick={() => handlePlayEpisode(episode.episode_number)}
                            >
                                <FaPlay />
                            </button>
                        </div>
                        <div className="episode-info">
                            <h4 className="episode-name">{episode.episode_number}. {episode.name}</h4>
                            <p className="episode-airdate">Aired: {episode.air_date}</p>
                            <p className="episode-overview">
                                {episode.overview || 'No description available.'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default Episodes;