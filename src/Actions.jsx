export default function Actions({ theme, setTheme, viewControlProps, hasSwiped, hasClicked, isMobile }) {
  const { prev, next, viewIndex } = viewControlProps || {};
  
  return (
    <div className="actions">
      <hr className="divider" />
      {isMobile && (
        <div className="hints-wrapper">
          <div className={`click-hint ${hasClicked ? 'fade-out' : ''}`}>
              <div className="arrow-up">^</div>
              <div className="text">CLICK TO LEARN MORE</div>
          </div>
          <div className={`swipe-hint ${!hasClicked ? 'waiting' : ''} ${hasSwiped ? 'fade-out' : ''}`}>
              &lt; SWIPE &gt;
          </div>
        </div>
      )}
      <div className="actions-buttons">
        <a className="social-btn" href="https://www.linkedin.com/in/brennan-t-tibbetts/" title="LinkedIn" target="_blank" rel="noopener noreferrer">
          <img src="/images/linkedin.png" alt="LinkedIn" />
      </a>
      <a className="social-btn" href="https://github.com/BrennanTibbetts" title="GitHub" target="_blank" rel="noopener noreferrer">
        <img src="/images/github.png" alt="GitHub" />
      </a>
      <a className="social-btn" href="https://linktr.ee/brennanttibbetts" title="Contact Me" target="_blank" rel="noopener noreferrer">
        <img src="/images/email.png" alt="link" />
      </a>

      <button
        className="btn theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle light / dark theme"
        title="Toggle theme"
      >{theme === 'dark' ? '☀️' : '🌑'}</button>
      </div>
    </div>
  );
}
