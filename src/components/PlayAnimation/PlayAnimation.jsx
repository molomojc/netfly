import "./playAnimation.scss";
import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { TADUM_SOUND_URL } from "../../requests";

const PlayAnimation = () => {
    const history = useHistory();
    const location = useLocation();
    const soundRef = useRef(null);
    console.log("Location State in PlayAnimation:", location.state);
    const { id, isTv, Season, Episode} = location.state || {};

    const handleTadum = () => {
        soundRef.current.currentTime = 0;
        soundRef.current.play();
    };

    useEffect(() => {
        handleTadum();
        console.log("ID in PlayAnimation:", id);
        console.log("isTv in PlayAnimation:", isTv);   
        console.log("Season in PlayAnimation:", Season);
        console.log("Episode in PlayAnimation:", Episode);   
        setTimeout(() => {
            history.push({
                pathname: '/PlayMovie',
                state: { id, isTv,Season, Episode }, // Pass the ID and the flag
            });
        }, 4200);
    }, [history, id, isTv, Season, Episode]);

    return (
        <div className="PlayAnimation__wrp">
            <audio ref={soundRef} src={TADUM_SOUND_URL} />
            <span className="PlayAnimation__text">FAKEFLIX</span>
        </div>
    );
};

export default PlayAnimation;