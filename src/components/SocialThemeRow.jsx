export default function SocialThemeRow({ className = "" }) {
  const rowClass = ["site-social-row", className].filter(Boolean).join(" ");

  return (
    <div className={rowClass} aria-label="Social links">
      <a
        className="social-btn"
        href="https://www.linkedin.com/in/brennan-t-tibbetts/"
        title="LinkedIn"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/images/linkedin.png" alt="LinkedIn" />
      </a>
      <a
        className="social-btn"
        href="https://github.com/BrennanTibbetts"
        title="GitHub"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/images/github.png" alt="GitHub" />
      </a>
      <a
        className="social-btn"
        href="https://linktr.ee/brennanttibbetts"
        title="Linktree"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/images/email.png" alt="Linktree" />
      </a>
    </div>
  );
}
