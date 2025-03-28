import './PlayMovie.scss';
import React, { useState } from "react";
import { useLocation } from "react-router-dom";

const PlayMovie = () => {
    const location = useLocation();
    const { id, isTv } = location.state;
    const [currentServer, setCurrentServer] = useState(1); // Default: Server 1

    // Available servers (1-3)
    const servers = {
        1: isTv ? `https://vidsrc.cc/v2/embed/tv/${id}` 
               : `https://vidsrc.cc/v2/embed/movie/${id}`,
        2: isTv ? `https://vidsrc.xyz/embed/tv/${id}` 
               : `https://vidsrc.xyz/embed/movie/${id}`,
        3: isTv ? `https://vidsrc.to/embed/tv/${id}` 
               : `https://vidsrc.to/embed/movie/${id}`
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

                    style={{ width: "100%", height: "680px", overflow: "hidden", marginTop: "52px" }}
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
            </div>
        </div>
    );
};

export default PlayMovie;