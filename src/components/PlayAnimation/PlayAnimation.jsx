import "./playAnimation.scss";
import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { TADUM_SOUND_URL } from "../../requests";

const PlayAnimation = () => {
    const history = useHistory();
    const location = useLocation();
    const soundRef = useRef(null);
    console.log("Location State in PlayAnimation:", location.state);
    const { id, isTv } = location.state || {};

    const handleTadum = () => {
        soundRef.current.currentTime = 0;
        soundRef.current.play();
    };

    useEffect(() => {
        handleTadum();
        setTimeout(() => {
            history.push({
                pathname: '/PlayMovie',
                state: { id, isTv }, // Pass the ID and the flag
            });
        }, 4200);
    }, [history, id, isTv]);

    return (
        <div className="PlayAnimation__wrp">
            <audio ref={soundRef} src={TADUM_SOUND_URL} />
            <span className="PlayAnimation__text">FAKEFLIX</span>
        </div>
    );
};

export default PlayAnimation;