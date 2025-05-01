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
import SportsAnimation from "./components/SportsAnimation/SportsAnimation";
import { selectCurrentUser } from './redux/auth/auth.selectors';
import { selectSearchResults } from "./redux/search/search.selectors";
import { checkUserSession } from "./redux/auth/auth.actions";
import PlayMovie from "./components/PlayMovie/PlayMovie";
import Sports  from "./pages/Sports/Sports";
import PlaySports from "./components/PlaySports/PlaySports";
import Notification from "./components/Notification/Notification";
import React, { useState } from "react";
import "./App.css";






const update = (
    <>
        <div className="desktop-app-announcement"></div>
      <div className="desktop-app-announcement">
  <h1 className="announcement-title">🚀 Introducing Our New Desktop App!</h1>
  
  <p className="announcement-subtitle">
    Enjoy a premium viewing experience with our dedicated Windows application
  </p>
  
  <div className="feature-list">
    <h3>Exclusive Desktop Features:</h3>
    <ul>
      <li className="feature-item">
        <span className="feature-icon">✔️</span>
        <strong>No-ADS Experience:</strong> Watch without interruptions
      </li>
      <li className="feature-item">
        <span className="feature-icon">✔️</span>
         4K HDR support with smoother streaming
      </li>
      <li className="feature-item">
        <span className="feature-icon">✔️</span>
        <strong>SAFE:</strong> No dangerous warning
      </li>
    </ul>
  </div>
  
  <div className="cta-section">
    <p className="download-size"> Quick install</p>
    <button className="download-button" onClick={() => window.location.href = "https://streaam.netlify.app"}>
      Download Now for Windows
    </button>
   
  </div>
</div>
    </>
)
    


const App = () => {
    const currentUser = useSelector(selectCurrentUser);
    const searchResults = useSelector(selectSearchResults);
    const dispatch = useDispatch();
   const [showNotification, setShowNotification] = useState(true); // Correctly destructure useState

    const location = useLocation();

    useEffect(() => {
        dispatch(checkUserSession());
      
        const timer = setTimeout(() => {
            setShowNotification(true);
        }, 9000); 
        
        return () => clearTimeout(timer);
    }, [dispatch]);

    return (
        <div className="App">
            {currentUser && (
                <>
                    <Navbar />
                    <DetailModal />
                   
{showNotification && (
    <Notification
        content={update}
        onClose={() => setShowNotification(false)}
    />
)}  
                    
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
                    <Route path="/playSport" component={SportsAnimation} />
                    <Route path="/PlaySports" component={PlaySports} />
                    
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
                        path="/Sports"
                        render={() => (currentUser ? <Sports /> : <Redirect to="/login" />)}
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
