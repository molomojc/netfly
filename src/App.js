import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar/Navbar";
import Homepage from "./pages/Homepage/Homepage";
import Movies from "./pages/Movies/Movies";
import TVSeries from "./pages/TVSeries/TVSeries";
import Popular from "./pages/Popular/Popular";
import MyList from "./pages/MyList/MyList";
import Search from "./pages/Search/Search";
import Category from "./pages/Category/Category";
import DetailModal from "./components/DetailModal/DetailModal";
import SplashAnimation from "./components/SplashAnimation/SplashAnimation";
import PlayAnimation from "./components/PlayAnimation/PlayAnimation";
import SportsAnimation from "./components/SportsAnimation/SportsAnimation";
import Sports from "./pages/Sports/Sports";
import PlaySports from "./components/PlaySports/PlaySports";
import { selectSearchResults } from "./redux/search/search.selectors";
import "./App.css";

const PlayMovie = lazy(() => import("./components/PlayMovie/PlayMovie"));

const getAnimationKey = (pathname) => {
  if (pathname === "/play" || pathname === "/PlayMovie") return "player";
  if (pathname === "/playSport" || pathname === "/PlaySports") return "player-sport";
  return pathname;
};

const App = () => {
  const searchResults = useSelector(selectSearchResults);
  const location = useLocation();

  return (
    <div className="App">
      <Navbar />
      <DetailModal />
      <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}>
        <AnimatePresence exitBeforeEnter>
          <Switch location={location} key={getAnimationKey(location.pathname)}>
            <Route exact path="/">
              <Redirect to="/browse" />
            </Route>
            <Route path="/login">
              <Redirect to="/browse" />
            </Route>
            <Route path="/splash" component={SplashAnimation} />
            <Route path="/play" component={PlayAnimation} />
            <Route path="/PlayMovie" component={PlayMovie} />
            <Route path="/playSport" component={SportsAnimation} />
            <Route path="/PlaySports" component={PlaySports} />
            <Route
              path="/search"
              render={() => (searchResults ? <Search results={searchResults} /> : <Redirect to="/browse" />)}
            />
            <Route exact path="/browse" component={Homepage} />
            <Route exact path="/browse/:categoryName" component={Category} />
            <Route exact path="/tvseries" component={TVSeries} />
            <Route exact path="/Sports" component={Sports} />
            <Route exact path="/tvseries/:categoryName" component={Category} />
            <Route exact path="/movies" component={Movies} />
            <Route exact path="/movies/:categoryName" component={Category} />
            <Route exact path="/popular" component={Popular} />
            <Route exact path="/popular/:categoryName" component={Category} />
            <Route exact path="/mylist" component={MyList} />
            <Route path="*">
              <Redirect to="/browse" />
            </Route>
          </Switch>
        </AnimatePresence>
      </Suspense>
    </div>
  );
};

export default App;
