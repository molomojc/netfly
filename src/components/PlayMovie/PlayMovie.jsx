import React from "react";
import { useLocation } from "react-router-dom";

const PlayMovie = () => {
    const location = useLocation();
    const { id, isTv } = location.state;

    // Log the ID and flag for debugging
    console.log("Movie ID in PlayMovie:", id);
    console.log("Is TV:", isTv);

    // Construct the VidSrc URL based on whether it's a TV series or a movie
    const vidSrcUrl = isTv
        ? `https://vidsrc.to/embed/tv/${id}`
        : `https://vidsrc.to/embed/movie/${id}`;

    return (
        <div className="PlayMovie__wrp">
            <div className="video-container">
                <iframe
                    src={vidSrcUrl}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    frameBorder="no"
                    scrolling="no"
                    style={{ width: "100%", height: "680px", overflow: "hidden", marginTop: "52px" }}
                />
            </div>
        </div>
    );
};

export default PlayMovie;