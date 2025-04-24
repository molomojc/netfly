import "./SportsBanner.css";
import { motion } from "framer-motion";
import { BiInfoCircle } from "react-icons/bi";
import { FaPlay } from "react-icons/fa";
import { useHistory } from "react-router-dom";

const SportsBanner = ({ match, league }) => {
    const history = useHistory();

    const handlePlayAnimation = () => {
        console.log("I am in the Play Animation function");
        history.push({
            pathname: '/playSport',
            state : { homeTeam: match.homeTeam, awayTeam: match.awayTeam }
        });
    };

    const handleModalOpening = () => {
        console.log("I am Opening the Modal");
    };

    if (!match) {
        return (
            <div className="sports-banner">
                <div className="shadow" />
                <div className="no-matches">No matches available for {league}</div>
            </div>
        );
    }

    return (
        <div className="sports-banner"> 
            <div className="shadow" />
            <img 
                src={match.imageUrl} 
                alt={`${match.homeTeam} vs ${match.awayTeam}`} 
                className="banner-image" 
                onError={(e) => {
                    e.target.src = '/images/uefa-default.jpg';
                }}
            />
            <div className="banner-content">
                <h1 className="banner-title">
                    {match.homeTeam} vs {match.awayTeam}
                </h1>
               
                <motion.div className="Banner__buttons">
                    <button
                        className="Banner__button"
                        onClick={handlePlayAnimation}
                    >
                        <FaPlay />
                        <span>Play</span>
                    </button>
                    <button
                        className="Banner__button"
                        onClick={handleModalOpening}
                    >
                        <BiInfoCircle size="1.5em" />
                        <span>More info</span>
                    </button>
                </motion.div>

                <p className="banner-description">
                    {match.date} at {match.venue}
                    <br />
                    <span>
                        Air: {match.time}
                        <br />
                        {(() => {
                            const currentTime = new Date();
                            const matchTime = new Date(`${match.date}T${match.time}`);
                            const timeDifference = matchTime - currentTime;

                            if (timeDifference > 0) {
                                const minutes = Math.floor((timeDifference / 1000 / 60) % 60);
                                const hours = Math.floor(timeDifference / 1000 / 60 / 60);
                                return `Will air in ${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ` : ''}${minutes} minute${minutes !== 1 ? 's' : ''}`;
                            } else {
                                return 'Currently airing or already aired';
                            }
                        })()}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default SportsBanner;