import "./movies.scss"
import Banner from "../../components/Banner/Banner"
import Row from "../../components/Row/Row"
import ContinueWatchingRow from "../../components/ContinueWatchingRow/ContinueWatchingRow"
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter"
import Credits from "../../components/Credits/Credits";
import { useRetrieveData } from "../../hooks/useRetrieveData";
import { motion } from "framer-motion";
import { defaultPageFadeInVariants } from "../../motionUtils";

const Movies = () => {
    const rows = useRetrieveData('movies');

    return (
        <motion.div
            className="Movies"
            variants={defaultPageFadeInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="CategoryFilterAnchor">
                <Banner type='movies' />
                <CategoryFilter />
            </div>
            <ContinueWatchingRow mediaType="movie" />
            {rows && rows.map(props => (
                <Row key={props.id} {...props} />
            ))}
            <Credits />
        </motion.div>
    )
}

export default Movies
