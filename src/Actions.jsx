import React, { useState } from 'react';
import { projects } from './projects';

export default function Actions({ theme, setTheme, viewControlProps, hasSwiped, hasClicked, isMobile }) {
  const { prev, next, viewIndex } = viewControlProps || {};
  const [resumeOpen, setResumeOpen] = useState(false);

  return (
    <div className="actions">
      <hr className="divider" />
      {isMobile && (
        <div className="hints-wrapper">
          <div className={`click-hint ${hasClicked ? 'fade-out' : ''}`}>
              <div className="arrow-up">^</div>
              <div className="text">CLICK TO LEARN MORE ABOUT {projects[viewIndex]?.subject}</div>
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
        className="resume-btn btn"
        onClick={() => setResumeOpen(true)}
        aria-label="Open resume"
        title="View resume"
      >RESUME</button>

      <button
        className="btn theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle light / dark theme"
        title="Toggle theme"
      >{theme === 'dark' ? '☀️' : '🌑'}</button>
      </div>

      {resumeOpen && (
        <div className="resume-modal" onClick={() => setResumeOpen(false)}>
          <div className={`resume-modal-content ${theme === 'dark' ? 'dark' : 'light'}`} onClick={e => e.stopPropagation()}>
            <button className="btn close-resume" onClick={() => setResumeOpen(false)} aria-label="Close resume">✕</button>
            <iframe
              src="/assets/Resume_Brennan_Tibbetts.pdf"
              title="Resume — Brennan Tibbetts"
              frameBorder="0"
              className="resume-iframe"
            />
          </div>
        </div>
      )}
    </div>
  );
}
