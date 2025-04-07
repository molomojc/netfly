import React from 'react';
import { BASE_IMG_URL, FALLBACK_IMG_URL } from '../../requests';
import { useDispatch } from 'react-redux';
import { showModalDetail } from '../../redux/modal/modal.actions';
import './SimilarContent.scss';

const SimilarContent = ({ similarItems }) => {
    const dispatch = useDispatch();

    const handleItemClick = (item) => {
      
        const fallbackTitle = item.title || item.original_title || item.name || item.original_name;
        const mediaType = item.media_type || (item.original_name ? 'tv' : 'movie'); // Determine media type
      
        dispatch(showModalDetail({ 
            ...item, 
            fallbackTitle,
            mediaType, // Explicitly pass the media_type
            isFavourite: item.isFavourite || false
        }));
    };

    if (!similarItems || similarItems.length === 0) return null;

    return (
        <div className="similar-content">
            <h3 className="similar-content__title">More Like This</h3>
            <div className="similar-content__grid">
                {similarItems.slice(0, 6).map((item) => {
                  
                    return (
                        <div 
                            key={item.id} 
                            className="similar-content__item"
                            onClick={() => handleItemClick(item)}
                        >
                           <img
                            src={item.poster_path ? `${BASE_IMG_URL}/${item.poster_path}` : FALLBACK_IMG_URL} 
                            alt={item.fallbackTitle}
                            className="similar-content__image"
                        />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SimilarContent;