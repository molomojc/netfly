import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar/Navbar"
import Homepage from "./pages/Homepage/Homepage"
import Movies from "./pages/Movies/Movies"
import TVSeries from './pages/TVSeries/TVSeries';
import Popular from "./pages/Popular/Popular";
import MyList from './pages/MyList/MyList';
import Auth from "./pages/Auth/Auth";
import Search from "./pages/Search/Search";
import Category from "./pages/Category/Category";
import DetailModal from "./components/DetailModal/DetailModal";
import SplashAnimation from "./components/SplashAnimation/SplashAnimation";
import PlayAnimation from "./components/PlayAnimation/PlayAnimation";
import { selectCurrentUser } from './redux/auth/auth.selectors';
import { selectSearchResults } from "./redux/search/search.selectors";
import { checkUserSession } from "./redux/auth/auth.actions";
import PlayMovie from "./components/PlayMovie/PlayMovie";
//import Notification from "./components/Notification/Notification";
//import React, { useState } from "react";





/*

const update = (
    <>
        <p>Our team has been continuously improving the website.</p>
        <p> Here are the latest updates:</p>
        <br></br>
        <br></br>
        <p> In order to Mitigate the dangerous warning when trying to log in, we will be changing the domain to a proper one with added security </p>
        <p>To: <a href="https://series2.netlify.app">The new Link,</a> This is Now available</p>
        <p> we will also email you with the new Link</p>
        <br></br>
        <p> Other updates... </p>
        <br></br>
        <ul className="update-list">
            <li>Multiple servers added — switch servers if audio/video is poor</li>
            <li>Manual “Next Episode” button added temporarily on the season page</li>
            <li>Choose your desired Season/Episode via the “More Info” page</li>
            <li>“More Like This” section now available at the bottom of “More Info”</li>
        </ul>

        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <p className="update-signoff">ENJOY!!<br /><strong>- Cinema Team</strong></p>
    </>
)
    */
/*
{showNotification && (
    <Notification
        content={update}
        onClose={() => setShowNotification(false)}
    />
)} */

const App = () => {
    const currentUser = useSelector(selectCurrentUser);
    const searchResults = useSelector(selectSearchResults);
    const dispatch = useDispatch();
 //   const [showNotification, setShowNotification] = useState(true); // Correctly destructure useState

    const location = useLocation();

    useEffect(() => {
        dispatch(checkUserSession());
      /*
        const timer = setTimeout(() => {
            setShowNotification(true);
        }, 6000); 
        */
        // eslint-disable-next-line react-hooks/exhaustive-deps

       // return () => clearTimeout(timer);
    }, [dispatch]);

    return (
        <div className="App">
            {currentUser && (
                <>
                    <Navbar />
                    <DetailModal />

                    
                </>
            )}
            <AnimatePresence exitBeforeEnter>
                <Switch location={location} key={location.pathname}>
                    <Route exact path="/">
                        <Redirect to="/login" />
                    </Route>
                    <Route path="/splash" component={SplashAnimation} />
                    <Route path="/play" component={PlayAnimation} />
                    <Route path="/PlayMovie" component={PlayMovie} />
                    <Route
                        path="/search"
                        render={() =>
                            currentUser ? (
                                searchResults && <Search results={searchResults} />
                            ) : (
                                <Redirect to="/login" />
                            )
                        }
                    />
                    <Route
                        exact
                        path="/browse"
                        render={() => (currentUser ? <Homepage /> : <Redirect to="/login" />)}
                    />
                    <Route
                        exact
                        path="/browse/:categoryName"
                        render={(props) =>
                            currentUser ? <Category {...props} /> : <Redirect to="/login" />
                        }
                    />
                    <Route
                        exact
                        path="/tvseries"
                        render={() => (currentUser ? <TVSeries /> : <Redirect to="/login" />)}
                    />
                    <Route
                        exact
                        path="/tvseries/:categoryName"
                        render={(props) =>
                            currentUser ? <Category {...props} /> : <Redirect to="/login" />
                        }
                    />
                    <Route
                        exact
                        path="/movies"
                        render={() => (currentUser ? <Movies /> : <Redirect to="/login" />)}
                    />
                    <Route
                        exact
                        path="/movies/:categoryName"
                        render={(props) =>
                            currentUser ? <Category {...props} /> : <Redirect to="/login" />
                        }
                    />
                    <Route
                        exact
                        path="/popular"
                        render={() => (currentUser ? <Popular /> : <Redirect to="/login" />)}
                    />
                    <Route
                        exact
                        path="/popular/:categoryName"
                        render={(props) =>
                            currentUser ? <Category {...props} /> : <Redirect to="/login" />
                        }
                    />
                    <Route
                        exact
                        path="/mylist"
                        render={() => (currentUser ? <MyList /> : <Redirect to="/login" />)}
                    />
                    <Route
                        exact
                        path="/login"
                        render={() => (currentUser ? <Redirect to="/splash" /> : <Auth />)}
                    />
                    <Route path="*">
                        <Redirect to="/" />
                    </Route>
                </Switch>
            </AnimatePresence>
        </div>
    );
};

export default App;
