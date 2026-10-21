import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./PlaySports.scss";

const PlaySports = () => {
    const location = useLocation();
    const { home, away, streamId } = location.state || {};
    console.log("Stream Home:", home);
    console.log("Stream ID:", streamId);
    

    const [currentSource, setCurrentSource] = useState("alpha");
    const [currentStreamNo, setCurrentStreamNo] = useState(1);
    const [showOverlay, setShowOverlay] = useState(true);
    const overlayRef = useRef(null);
    const iframeRef = useRef(null);
    const containerRef = useRef(null);
    const inactivityTimerRef = useRef(null);

    const INACTIVITY_TIMEOUT = 30000; // 30 seconds

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        if (!showOverlay) {
            inactivityTimerRef.current = setTimeout(() => {
                setShowOverlay(true);
            }, INACTIVITY_TIMEOUT);
        }
    }, [showOverlay]);

    const handleOverlayClick = useCallback(() => {
        setShowOverlay(false);
        if (iframeRef.current) {
            iframeRef.current.focus();
        }
        resetInactivityTimer();
    }, [resetInactivityTimer]);

    // Track user activity on the container to reset inactivity timer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const events = ['mousemove', 'click', 'keydown', 'touchstart'];
        const handler = resetInactivityTimer;

        events.forEach(event => container.addEventListener(event, handler, true));
        return () => {
            events.forEach(event => container.removeEventListener(event, handler, true));
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [resetInactivityTimer]);

    // Reset overlay when source/stream changes
    useEffect(() => {
        setShowOverlay(true);
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
    }, [currentSource, currentStreamNo]);
  
    let embedUrl= " ";
    if(currentSource === "admin" && currentStreamNo === 1) {
        embedUrl = `https://embedstreams.top/embed/${currentSource}/admin-${streamId}/${currentStreamNo}`;
    }else{
        embedUrl = `https://embedstreams.top/embed/${currentSource}/${streamId}/${currentStreamNo}`;
    }

   // window.alert("Please note if you get Network Error, Means the stream is not available yet. Please wait until Air time.");
    return (
        <div className="PlaySports__wrp" ref={containerRef}>
            <div className="video-container" style={{ position: "relative" }}>
                <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                    title={`${home} vs ${away} Stream`}
                    style={{ width: "100%", height: "640px", overflow: "hidden", marginTop: "62px" }}
                    referrerPolicy="no-referrer"
                />
                {showOverlay && (
                    <div
                        ref={overlayRef}
                        className="click-overlay"
                        onClick={handleOverlayClick}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            zIndex: 10,
                            cursor: "pointer",
                            background: "transparent",
                        }}
                        aria-label="Click to enable player"
                    />
                )}
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
