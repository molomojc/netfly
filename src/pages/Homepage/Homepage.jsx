import "./homepage.scss"
import Banner from "../../components/Banner/Banner"
import Row from "../../components/Row/Row"
import ContinueWatchingRow from "../../components/ContinueWatchingRow/ContinueWatchingRow"
import CategoryFilter from "../../components/CategoryFilter/CategoryFilter"
import Credits from "../../components/Credits/Credits";
import { useRetrieveData } from "../../hooks/useRetrieveData";
import { motion } from "framer-motion";
import { defaultPageFadeInVariants } from "../../motionUtils";

const Homepage = () => {
    const rows = useRetrieveData('movies');

    return (
        <motion.div
            className="Homepage"
            variants={defaultPageFadeInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="CategoryFilterAnchor">
                <Banner />
                <CategoryFilter />
            </div>
            <ContinueWatchingRow />
            {rows && rows.map(props => (
                <Row key={props.id} {...props} />
            ))}
            <Credits />
        </motion.div>
    )
}

export default Homepage
