export default function Actions({ theme, setTheme }) {
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
      <button
        className="btn theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle light / dark theme"
        title="Toggle theme"
      >{theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>
    </div>
  );
}
