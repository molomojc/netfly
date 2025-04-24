import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./PlaySports.scss";

const PlaySports = () => {
    const location = useLocation();
    const { home, away, streamId } = location.state || {};
    console.log("Stream Home:", home);
    console.log("Stream ID:", streamId);
    

    const [currentSource, setCurrentSource] = useState("alpha");
    const [currentStreamNo, setCurrentStreamNo] = useState(1);
  
    let embedUrl= " ";
    if(currentSource === "admin" && currentStreamNo === 1) {
        embedUrl = `https://embedstreams.top/embed/${currentSource}/admin-${streamId}/${currentStreamNo}`;
    }else{
        embedUrl = `https://embedstreams.top/embed/${currentSource}/${streamId}/${currentStreamNo}`;
    }

   // window.alert("Please note if you get Network Error, Means the stream is not available yet. Please wait until Air time.");
    return (
        <div className="PlayMovie__wrp">
            <div className="video-container">
                <iframe
                    src={embedUrl}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                    title={`${home} vs ${away} Stream`}
                    style={{ width: "100%", height: "640px", overflow: "hidden", marginTop: "62px" }}
                />
            </div>

            <div className="server-buttons">
                {["admin","alpha", "bravo", "charlie", "delta", "echo", "foxtrot"].map((source) => (
                    <button
                        key={source}
                        onClick={() => setCurrentSource(source)}
                        className={currentSource === source ? "active" : ""}
                    >
                        {source.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="server-buttons">
                {[1, 2, 3].map((num) => (
                    <button
                        key={num}
                        onClick={() => setCurrentStreamNo(num)}
                        className={currentStreamNo === num ? "active" : ""}
                    >
                        Stream {num}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PlaySports;
