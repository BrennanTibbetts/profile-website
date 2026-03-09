import { useMemo, useState } from "react";
import { bioText } from "../data";

const SOCIAL_ITEMS = [
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/BrennanTibbetts",
    icon: "/images/github.png",
  },
  {
    id: "email",
    label: "Email",
    href: "mailto:brennanTtibbetts@gmail.com",
    icon: "/images/email.png",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/brennan-t-tibbetts/",
    icon: "/images/linkedin.png",
  },
];

const SLIDE_LOGOS = [
  {
    src: "/images/apple-logo-transparent.png",
    alt: "Apple logo",
  },
  {
    src: "/images/aws-logo-transparent.webp",
    alt: "AWS logo",
  },
  {
    src: "/images/three-js-logo-transparent.png",
    alt: "Three.js logo",
  },
];

function getBioPreview(text = "") {
  const normalized = String(text).trim().replace(/\s+/g, " ");
  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180).trimEnd()}...`;
}

export default function MobilePortfolioOverview({
  projects = [],
  isActive = false,
  launchingSlideIndex = null,
  onSelectSlide,
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const slideProjects = useMemo(() => projects.slice(0, 3), [projects]);
  const aboutPreview = useMemo(() => getBioPreview(bioText), []);

  return (
    <div className={`mobile-overview-layer ${isActive ? "is-active" : "is-hidden"}`}>
      <div className="mobile-overview-surface">
        <section className="mobile-overview-profile-card">
          <div className="mobile-overview-avatar-block" aria-hidden="true">
            <div className="mobile-overview-avatar" />
          </div>
          <h2 className="mobile-overview-name">Brennan Tibbetts</h2>
          <p className="mobile-overview-handle">brennanTtibbetts@gmail.com</p>
          <div className="mobile-overview-social-row" aria-label="Social links">
            {SOCIAL_ITEMS.map((item) => (
              <a
                key={item.id}
                className="mobile-overview-social-btn"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={item.label}
                aria-label={item.label}
              >
                <img src={item.icon} alt="" aria-hidden="true" className="mobile-overview-social-icon" />
              </a>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="mobile-overview-about-card"
          onClick={() => setAboutOpen(true)}
          aria-expanded={aboutOpen}
          aria-label="Open about me details"
        >
          <span className="mobile-overview-about-title">About Me</span>
          <span className="mobile-overview-about-text">{aboutPreview}</span>
          <div className="mobile-info-peek-hint" aria-hidden="true">
            <span className="mobile-info-peek-hint-label">Tap to read more</span>
            <span className="mobile-info-peek-hint-arrow">›</span>
          </div>
        </button>

        <a
          className="mobile-overview-resume-btn"
          href="/assets/Resume_Brennan_Tibbetts.pdf"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open resume PDF"
        >
          <span className="mobile-overview-resume-icon" aria-hidden="true" />
          <span className="mobile-overview-resume-label">Resume</span>
          <span className="mobile-overview-resume-action">Open PDF</span>
        </a>

        <p className="mobile-overview-slides-heading">MY EXPERIENCE</p>

        <section className="mobile-overview-slide-grid" aria-label="Select a slide">
          {slideProjects.map((project, index) => (
            <button
              key={project.id ?? index}
              type="button"
              className={`mobile-overview-slide-tile theme-${index} ${
                launchingSlideIndex === index ? "is-launching" : ""
              }`}
              onClick={() => onSelectSlide?.(index)}
            >
              <span className={`mobile-overview-slide-preview theme-${index}`}>
                {SLIDE_LOGOS[index]?.src ? (
                  <img
                    src={SLIDE_LOGOS[index].src}
                    alt={SLIDE_LOGOS[index].alt}
                    className="mobile-overview-slide-logo"
                  />
                ) : null}
              </span>
              <span className="mobile-overview-slide-title">{project.title}</span>
              <span className="mobile-overview-slide-action">Open Slide</span>
            </button>
          ))}
        </section>
      </div>

      <div
        className={`mobile-info-sheet ${aboutOpen ? "is-open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setAboutOpen(false);
          }
        }}
      >
        <div className="mobile-info-sheet-panel">
          <div className="mobile-info-body">
            <div className="view-info-content is-entered">
              <p>{bioText}</p>
            </div>
          </div>
        </div>
        <div className="mobile-info-sheet-footer">
          <button type="button" className="mobile-info-back-btn" onClick={() => setAboutOpen(false)}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
