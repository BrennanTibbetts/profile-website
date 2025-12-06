export default function Actions({ theme, setTheme, viewControlProps }) {
  const { prev, next, viewIndex } = viewControlProps || {};
  
  return (
    <div className="actions">
      <hr className="divider" />
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

      {viewControlProps && (
        <div className="mobile-view-controls">
            <button className="btn view-btn" onClick={prev} aria-label="Previous view">‹</button>
            <div className="view-indicator">{viewIndex + 1} / 3</div>
            <button className="btn view-btn" onClick={next} aria-label="Next view">›</button>
        </div>
      )}

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
