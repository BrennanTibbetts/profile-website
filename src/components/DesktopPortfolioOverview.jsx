import DesktopExperienceCards from "./DesktopExperienceCards";
import SiteTopNav from "./SiteTopNav";
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

export default function DesktopPortfolioOverview({ pathname, navigate, onSelectSlide }) {
  return (
    <div className="desktop-overview">
      <SiteTopNav pathname={pathname} navigate={navigate} className="site-top-nav-inline desktop-overview-nav" />

      <section className="desktop-overview-profile-card">
        <div className="desktop-overview-avatar-block">
          <img
            src="/images/profile.png"
            alt="Brennan Tibbetts"
            className="desktop-overview-avatar"
          />
        </div>
        <h1 className="desktop-overview-name">Brennan Tibbetts</h1>
        <p className="desktop-overview-handle">brennanTtibbetts@gmail.com</p>
        <div className="desktop-overview-social-row" aria-label="Social links">
          {SOCIAL_ITEMS.map((item) => (
            <a
              key={item.id}
              className="desktop-overview-social-btn"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              title={item.label}
              aria-label={item.label}
            >
              <img src={item.icon} alt="" aria-hidden="true" className="desktop-overview-social-icon" />
            </a>
          ))}
        </div>
      </section>

      <section className="desktop-overview-about-card" aria-label="About me">
        <p className="desktop-overview-about-title">ABOUT ME</p>
        <p className="desktop-overview-about-text">{bioText}</p>
      </section>

      <a
        className="desktop-overview-resume-btn"
        href="/assets/Resume_Brennan_Tibbetts.pdf"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open resume PDF"
      >
        <span className="desktop-overview-resume-icon" aria-hidden="true" />
        <span className="desktop-overview-resume-label">Resume</span>
        <span className="desktop-overview-resume-action">Open PDF</span>
      </a>

      <section className="desktop-overview-experience">
        <DesktopExperienceCards activeIndex={-1} onSelectSlide={(index) => onSelectSlide?.(index, false)} />
      </section>
    </div>
  );
}
