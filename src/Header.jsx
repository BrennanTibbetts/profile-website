import { bioText } from './data';
import { useState, useEffect } from 'react';

export default function Header({ onHeaderClick }) {
  const [showHint, setShowHint] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);

  useEffect(() => {
    if (!onHeaderClick || hasClicked) return;

    const timer = setTimeout(() => {
      setShowHint(true);
    }, 25000);

    return () => clearTimeout(timer);
  }, [onHeaderClick, hasClicked]);

  const handleClick = () => {
    if (onHeaderClick) {
      setHasClicked(true);
      setShowHint(false);
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
        <p className="subtitle">3D web developer · Interactive experiences</p>
        <p className="bio">{bioText}</p>
        <hr className="divider" />
      </div>
      {showHint && <div className="header-hint">^ CLICK TO LEARN MORE ABOUT ME</div>}
    </div>
  );
}
