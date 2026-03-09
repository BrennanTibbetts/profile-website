import { projects } from "../projects";

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

export default function DesktopExperienceCards({ activeIndex = 0, onSelectSlide }) {
  const visibleProjects = projects.slice(0, 3);

  return (
    <section className="desktop-experience-cards" aria-label="My experience">
      <p className="desktop-experience-heading">MY EXPERIENCE</p>
      <div className="desktop-experience-list">
        {visibleProjects.map((project, index) => (
          <button
            key={project.id ?? index}
            type="button"
            className={`desktop-experience-card theme-${index} ${
              activeIndex === index ? "is-active" : ""
            }`}
            onClick={() => onSelectSlide?.(index)}
            aria-label={`Open ${project.title}`}
          >
            <span className={`desktop-experience-preview theme-${index}`} aria-hidden="true">
              {SLIDE_LOGOS[index]?.src ? (
                <img
                  src={SLIDE_LOGOS[index].src}
                  alt={SLIDE_LOGOS[index].alt}
                  className="desktop-experience-logo"
                />
              ) : null}
            </span>
            <span className="desktop-experience-copy">
              <span className="desktop-experience-title">{project.title}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
