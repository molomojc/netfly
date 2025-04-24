import "./SportsAnimation.scss";
import { useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { TADUM_SOUND_URL } from "../../requests";

const PlayAnimation = () => {
    const history = useHistory();
    const location = useLocation();
    const soundRef = useRef(null);

    const home = location.state?.homeTeam;
    const away = location.state?.awayTeam;

    const handleTadum = () => {
        soundRef.current.currentTime = 0;
        soundRef.current.play();
    };

    useEffect(() => {
        handleTadum();

        setTimeout(() => {
            history.push({
                pathname: '/PlaySports',
                state: {
                    home,
                    away,
                    streamId: `${home?.toLowerCase().replace(/\s+/g, "-")}-vs-${away?.toLowerCase().replace(/\s+/g, "-")}`
                }
            });
        }, 4200);
    }, [history, home, away]); // Include home and away in the dependency array

    return (
        <div className="PlayAnimation__wrp">
            <audio ref={soundRef} src={TADUM_SOUND_URL} />
            <span className="PlayAnimation__text">FAKEFLIX</span>
        </div>
    );
};

export default PlayAnimation;