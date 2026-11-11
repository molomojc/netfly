import { useEffect, useState } from "react"
import { fetchMovieDataConfig, fetchPopularDataConfig, fetchSeriesDataConfig} from "../dataConfig";

//
// [...fetchMovieDataConfig, fetchRecommendationsConfig];
export const useRetrieveData = (type) => {

    const [data, setData] = useState(null)

    useEffect(() => {
        let selectedConfigArray = null;
        switch (type) {
            case "movies":
                selectedConfigArray = fetchMovieDataConfig;
                break;
            case "series":
                selectedConfigArray = fetchSeriesDataConfig;
                break;
            case "popular":
                selectedConfigArray = fetchPopularDataConfig;
                break;
            default:
                break;
        }

        const rowsData = selectedConfigArray.map(el => {
            return {
                id: el.id,
                title: el.title,
                genre: el.genre,
                selector: el.selector,
                isLarge: el.isLarge,
                thunk: el.thunk,
                url: el.url,
            }
        })
        setData(rowsData)

    }, [type])

    return data
}
