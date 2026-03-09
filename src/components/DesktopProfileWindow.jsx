import { bioText } from "../data";

export default function DesktopProfileWindow() {
  return (
    <section className="desktop-profile-window">
      <div className="desktop-profile-top">
        <div className="desktop-overview-avatar-block">
          <img
            src="/images/profile.png"
            alt="Brennan Tibbetts"
            className="desktop-overview-avatar"
          />
        </div>
        <h1 className="desktop-overview-name">Brennan Tibbetts</h1>
        <p className="desktop-overview-handle">brennanTtibbetts@gmail.com</p>
      </div>

      <div className="desktop-profile-separator" aria-hidden="true" />

      <div className="desktop-profile-about">
        <p className="desktop-overview-about-title">ABOUT ME</p>
        <p className="desktop-overview-about-text">{bioText}</p>
      </div>

      <a
        className="desktop-overview-resume-btn desktop-profile-resume-btn"
        href="/assets/Resume_Brennan_Tibbetts.pdf"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open resume PDF"
      >
        <span className="desktop-overview-resume-icon" aria-hidden="true" />
        <span className="desktop-overview-resume-label">Resume</span>
        <span className="desktop-overview-resume-action">Open PDF</span>
      </a>
    </section>
  );
}
