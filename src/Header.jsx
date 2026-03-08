import { bioText } from './data';

export default function Header({ onBack, onHeaderClick, showBack = false }) {
  const handleClick = () => {
    if (onHeaderClick) {
      onHeaderClick();
    }
  };

  const handleBackClick = (event) => {
    event.stopPropagation();
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="header-container">
      <div className={`header-top-row ${showBack ? "has-back" : ""}`.trim()}>
        {showBack ? (
          <button
            type="button"
            className="header-back-btn"
            onClick={handleBackClick}
            aria-label="Back to home"
            title="Back to home"
          >
            {"<"}
          </button>
        ) : null}
        <div
          className="left-top"
          onClick={handleClick}
          role={onHeaderClick ? "button" : undefined}
          tabIndex={onHeaderClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (onHeaderClick && (e.key === "Enter" || e.key === " ")) {
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
      </div>
    </div>
  );
}
