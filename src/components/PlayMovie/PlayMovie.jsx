import React, { useState, useEffect } from "react";
import { useLocation} from "react-router-dom"; // Replace useNavigate with useHistory
import { FaForward } from "react-icons/fa";
import "./PlayMovie.scss"; // Import your styles here

const PlayMovie = () => {
    const location = useLocation();
  //  const history = useHistory(); // Replace navigate with history
    const { id, isTv, Season: initialSeason = 1, Episode: initialEpisode = 1 } = location.state || {};
    const [currentServer, setCurrentServer] = useState(1);
    const [currentSeason] = useState(initialSeason);
    const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);

    useEffect(() => {
        // When currentEpisode or currentSeason changes, re-render iframe
    }, [currentEpisode, currentSeason]);

    const handleNextEpisode = () => {
        setCurrentEpisode((prev) => prev + 1);
    };

    const servers = {
        1: isTv
            ? `https://vidsrc.cc/v2/embed/tv/${id}/${currentSeason}/${currentEpisode}`
            : `https://vidsrc.cc/v2/embed/movie/${id}`,
        2: isTv
            ? `https://vidsrc.xyz/embed/tv/${id}/${currentSeason}-${currentEpisode}`
            : `https://vidsrc.xyz/embed/movie/${id}`,
        3: isTv
            ? `https://www.2embed.cc/embedtv/${id}&s=${currentSeason}&e=${currentEpisode}`
            : `https://www.2embed.cc/embed/${id}`,
    };

    return (
        <div className="PlayMovie__wrp">
            <div className="video-container">
                <iframe
                    src={servers[currentServer]}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    frameBorder="0"
                    title={`${isTv ? "TV Show" : "Movie"} Player`}
                    style={{ width: "100%", height: "640px", overflow: "hidden", marginTop: "62px" }}
                />
            </div>

            <div className="server-buttons">
                {[1, 2, 3].map((serverNum) => (
                    <button
                        key={serverNum}
                        onClick={() => setCurrentServer(serverNum)}
                        className={currentServer === serverNum ? "active" : ""}
                    >
                        Server {serverNum}
                    </button>
                ))}

                {isTv && (
                    <button className="next-episode-button" onClick={handleNextEpisode}>
                        <FaForward /> Next Episode
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlayMovie;