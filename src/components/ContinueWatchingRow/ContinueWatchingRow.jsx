import "./continueWatching.scss";
import { useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { FaPlay, FaTimes } from "react-icons/fa";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import SwiperCore, { Navigation } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper.scss";
import "swiper/components/navigation/navigation.scss";
import { BASE_IMG_URL, FALLBACK_IMG_URL } from "../../requests";
import {
  formatMinutesLeft,
  removeFromHistory,
  selectContinueWatching,
} from "../../redux/history";

SwiperCore.use([Navigation]);

const ContinueWatchingRow = ({ mediaType, title = "Continue Watching" }) => {
  const items = useSelector((state) => selectContinueWatching(state, mediaType));
  const dispatch = useDispatch();
  const history = useHistory();

  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);

  if (!items || items.length === 0) return null;

  const resume = (item) => {
    const isTv = item.media_type === "tv";

    history.push({
      pathname: "/PlayMovie",
      state: {
        id: item.id,
        isTv,
        media_type: item.media_type || (isTv ? "tv" : "movie"),
        fallbackTitle: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        Season: item.season || 1,
        Episode: item.episode || 1,
        // Hand the saved position straight to the player so it can seek on ready.
        progress: item.currentTime,
      },
    });
  };

  const remove = (event, item) => {
    event.stopPropagation();
    dispatch(removeFromHistory(item.key));
  };

  const handleKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      resume(item);
    }
  };

  const swiperParams = {
    observer: true,
    observeParents: true,
    navigation: {
      prevEl: navigationPrevRef.current,
      nextEl: navigationNextRef.current,
    },
    breakpoints: {
      1378: { slidesPerView: 4, slidesPerGroup: 4 },
      998: { slidesPerView: 3, slidesPerGroup: 3 },
      625: { slidesPerView: 2, slidesPerGroup: 2 },
      0: { slidesPerView: 1.35, slidesPerGroup: 1 },
    },
    spaceBetween: 8,
    loop: false,
    draggable: false,
    allowTouchMove: true,
    preventClicksPropagation: true,
    preventClicks: true,
    slideToClickedSlide: false,
  };

  return (
    <div className="ContinueRow">
      <h3 className="ContinueRow__title">{title}</h3>

      <div className="ContinueRow__poster--wrp">
        <div className="ContinueRow__slider--mask left" ref={navigationPrevRef}>
          <MdChevronLeft size="3em" />
        </div>
        <div className="ContinueRow__slider--mask right" ref={navigationNextRef}>
          <MdChevronRight size="3em" />
        </div>

        <Swiper
          {...swiperParams}
          onBeforeInit={(swiper) => {
            swiper.params.navigation.prevEl = navigationPrevRef.current;
            swiper.params.navigation.nextEl = navigationNextRef.current;
          }}
        >
          {items.map((item) => {
            const backdrop = item.backdrop_path || item.poster_path;
            const image = backdrop
              ? `${BASE_IMG_URL}/${backdrop}`
              : FALLBACK_IMG_URL;
            const percent = Math.round((item.percent || 0) * 100);

            return (
              <SwiperSlide key={item.key}>
                <div
                  className="ContinueRow__card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Resume ${item.title}`}
                  onClick={() => resume(item)}
                  onKeyDown={(event) => handleKeyDown(event, item)}
                >
                  <img src={image} alt={item.title} loading="lazy" />

                  <div className="ContinueRow__card--scrim" />

                  <button
                    type="button"
                    className="ContinueRow__card--remove"
                    aria-label={`Remove ${item.title} from ${title}`}
                    onClick={(event) => remove(event, item)}
                  >
                    <FaTimes />
                  </button>

                  <span className="ContinueRow__card--play">
                    <FaPlay />
                  </span>

                  <div className="ContinueRow__card--info">
                    <h4>{item.title}</h4>
                    <p>
                      {item.media_type === "tv"
                        ? `Season ${item.season || 1} • Episode ${item.episode || 1}`
                        : "Film"}
                      <span> · {formatMinutesLeft(item)}</span>
                    </p>
                  </div>

                  <div className="ContinueRow__card--bar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </div>
  );
};

export default ContinueWatchingRow;
