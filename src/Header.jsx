import { bioText } from './data';
import { useState } from 'react';

export default function Header({ onHeaderClick }) {
  const [hasClicked, setHasClicked] = useState(false);

  const handleClick = () => {
    if (onHeaderClick) {
      setHasClicked(true);
      onHeaderClick();
    }
  };

  return (
    <div className="header-container">
      <div 
        className="left-top" 
        onClick={handleClick}
        role={onHeaderClick ? "button" : undefined}
        tabIndex={onHeaderClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onHeaderClick && (e.key === 'Enter' || e.key === ' ')) {
            handleClick();
          }
        }}
      >
        <div className="info-indicator">i</div>
        <h1 className="title">Brennan Tibbetts</h1>
        <p className="subtitle">iOS & Cloud Software Engineer</p>
        <p className="bio">{bioText}</p>
        <hr className="divider" />
      </div>
      {!hasClicked && (
        <div className="header-hint">
          <div className="text">^ CLICK TO LEARN MORE ABOUT ME</div>
        </div>
      )}
    </div>
  );
}
