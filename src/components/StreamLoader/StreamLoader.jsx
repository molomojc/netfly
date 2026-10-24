import React from 'react';
import './StreamLoader.scss';

const StreamLoader = ({ message = 'Loading stream...' }) => (
  <div className="StreamLoader">
    <div className="StreamLoader__content">
      <div className="StreamLoader__spinner">
        {/* Netflix-style pulsing ring */}
        <div className="StreamLoader__ring" />
        <div className="StreamLoader__ring StreamLoader__ring--delayed" />
      </div>
      <span className="StreamLoader__text">{message}</span>
    </div>
  </div>
);

export default StreamLoader;
