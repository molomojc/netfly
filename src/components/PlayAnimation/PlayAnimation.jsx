import "./playAnimation.scss";
import { useEffect, useRef, useState, useMemo } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { TADUM_SOUND_URL } from "../../requests";

const PlayAnimation = () => {
    const history = useHistory();
    const location = useLocation();
    const soundRef = useRef(null);
    const [clicked, setClicked] = useState(false);
    console.log("Location State in PlayAnimation:", location.state);
    const {fallbackTitle, id, isTv, Season, Episode} = location.state || {};

    const handleTadum = () => {
        soundRef.current.currentTime = 0;
        soundRef.current.play();
    };

    // Forward every bit of state (poster, media type, resume position...) so the
    // player gets the same payload whether the splash was shown or skipped.
    const nextState = useMemo(() => ({ ...location.state, fallbackTitle, id, isTv, Season, Episode }), [location.state, fallbackTitle, id, isTv, Season, Episode]);

    const handleClick = () => {
        if (!clicked) {
            setClicked(true);
            history.push({
                pathname: '/PlayMovie',
                state: nextState,
            });
        }
    };

    useEffect(() => {
        handleTadum();
        console.log("ID in PlayAnimation:", id);
        console.log("isTv in PlayAnimation:", isTv);   
        console.log("Season in PlayAnimation:", Season);
        console.log("Episode in PlayAnimation:", Episode);   
        const timer = setTimeout(() => {
            if (!clicked) {
                history.push({
                    pathname: '/PlayMovie',
                    state: nextState,
                });
            }
        }, 4200);
        return () => clearTimeout(timer);
    }, [history, fallbackTitle, id, isTv, Season, Episode, clicked, nextState]);

    return (
        <div className="PlayAnimation__wrp" onClick={handleClick} style={{ cursor: "pointer" }}>
            <audio ref={soundRef} src={TADUM_SOUND_URL} />
            <span className="PlayAnimation__text">FAKEFLIX</span>
            <div style={{
                position: "absolute",
                bottom: "2rem",
                left: "50%",
                transform: "translateX(-50%)",
                color: "#fff",
                fontSize: "0.9rem",
                opacity: 0.7,
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                pointerEvents: "none"
            }}>
                Click to continue
            </div>
        </div>
    );
};

export default PlayAnimation;