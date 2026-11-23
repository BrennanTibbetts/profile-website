import { Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";
import { apps } from "../apps";
import { bioText } from "../data";
import { posts } from "../blog/posts";

// three.js is most of the site's JavaScript, so the 3D views load separately:
// the text paints first and each view's empty box holds its place meanwhile.
const loadScene = () => import("../components/SceneViews");
const PhoneView = lazy(() => loadScene().then((module) => ({ default: module.PhoneView })));
const JourneyView = lazy(() => loadScene().then((module) => ({ default: module.JourneyView })));

const RESUME_PATH = "/assets/Resume_Brennan_Tibbetts.pdf";
const NAME_WORDS = ["Brennan", "Tibbetts"];
// Sketchfab models used on the page; CC BY 4.0 requires crediting each.
const MODEL_CREDITS = [
  {
    title: "Coffee Cup",
    url: "https://sketchfab.com/3d-models/coffee-cup-992750b0df674378989fa915b0688ce1",
    author: "AK STUDIO",
    authorUrl: "https://sketchfab.com/inven2000",
  },
  {
    title: "Climbing Shoe Scan LOWPOLY",
    url: "https://sketchfab.com/3d-models/climbing-shoe-scan-lowpoly-cb2cedcb90cd48999632e4aa33488262",
    author: "EvanLegrand",
    authorUrl: "https://sketchfab.com/evan4129",
  },
];
// Sections alternate between two blacks so each reads as its own band: the
// intro is band A, then the apps alternate starting with B, then About.
function bandClass(sectionIndex) {
  return sectionIndex % 2 === 0 ? "band-b" : "band-a";
}

// True once the site font (Fraunces) has loaded, or after a short wait if it
// can't, so the intro animation always plays in the right font.
function useFontsReady(timeoutMs = 1500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) {
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, timeoutMs);
    if (document.fonts?.load) {
      document.fonts.load('700 1em "Fraunces"').then(finish, finish);
    } else {
      finish();
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [timeoutMs]);

  return ready;
}

// The name, one span per letter so each can ease in on load and swell on hover.
function HeroName() {
  let letterIndex = 0;
  return (
    <h1 className="scroll-hero-name" aria-label={NAME_WORDS.join(" ")}>
      {NAME_WORDS.map((word) => (
        <span key={word} className="scroll-hero-word" aria-hidden="true">
          {[...word].map((letter) => {
            const index = letterIndex++;
            return (
              <span key={index} className="scroll-hero-letter" style={{ "--i": index }}>
                {letter}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

// True while the element is at least `threshold` visible in the viewport
// (grown by `rootMargin`, e.g. "100% 0px" to count a screen ahead).
function useInView(ref, threshold = 0.15, rootMargin = "0px") {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold,
      rootMargin,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return inView;
}

// An app's number, name, tagline, description and technologies.
function AppCopy({ app, index, className = "scroll-app-copy", titleId = `${app.id}-title` }) {
  return (
    <div className={className}>
      <p className="scroll-app-index">{String(index + 1).padStart(2, "0")}</p>
      <h2 id={titleId} className="scroll-app-name">
        {app.name}
      </h2>
      <p className="scroll-app-tagline">{app.tagline}</p>
      <p className="scroll-app-meta">{app.meta}</p>
      {app.paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="scroll-app-text">
          {paragraph}
        </p>
      ))}
      <ul className="scroll-app-tech" aria-label={`${app.name} technologies`}>
        {app.tech.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AppSection({ app, index }) {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef);
  // Start loading the screen recording a screen before the section arrives.
  const isNear = useInView(sectionRef, 0, "100% 0px");
  const [hasEntered, setHasEntered] = useState(false);
  // Phones alternate sides, starting on the right.
  const side = index % 2 === 0 ? "right" : "left";
  // Drag the phone to spin it (on touch screens, a finger on the phone holds
  // the page still; see SceneViews).
  const phoneClass = "scroll-app-phone";

  useEffect(() => {
    if (inView) {
      setHasEntered(true);
    }
  }, [inView]);

  return (
    <section
      ref={sectionRef}
      id={app.id}
      className={`scroll-app scroll-band ${bandClass(index)} scroll-app--phone-${side} ${
        hasEntered ? "is-entered" : ""
      }`.trim()}
      style={{ "--app-accent": app.accent }}
      aria-labelledby={`${app.id}-title`}
    >
      <div className="scroll-app-phone-wrap">
        <Suspense fallback={<div className={phoneClass} />}>
          <PhoneView
            className={phoneClass}
            near={isNear}
            sectionRef={sectionRef}
            videoSrc={app.video}
            videoLoad={isNear}
            isPlaying={inView}
            side={side}
            draggable
            companion={app.companion}
          />
        </Suspense>
      </div>

      <AppCopy app={app} index={index} />
    </section>
  );
}

// This app's section becomes a pinned scene where its phone turns into the
// first stop of a backend diagram.
const JOURNEY_APP = "waypoint";
const ARCH_TECH = ["AWS Lambda", "API Gateway", "DynamoDB", "Node.js", "TypeScript", "REST APIs", "React"];

function ArchitectureIntro({ className }) {
  return (
    <header className={className}>
      <p className="scroll-eyebrow">UNDER THE HOOD</p>
      <h2 className="scroll-arch-heading">Half my work is the part you don’t see.</h2>
      <p className="scroll-arch-lead">
        Alongside the iOS work, I design, build and run AWS microservices: Lambda services behind API Gateway, each
        owning its own data in DynamoDB, written in Node.js and TypeScript and shipped with an agile Scrum team.
      </p>
      <ul className="scroll-app-tech" aria-label="Backend technologies">
        {ARCH_TECH.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </header>
  );
}

/**
 * Waypoint, pinned for a tall scroll track. It starts as a normal app section;
 * then the text gives way to the "Under the hood" intro while the phone
 * shrinks into a diagram and a submission travels through API Gateway and
 * Lambda to a push notification on a second phone (see WaypointJourney).
 * On phones: the Waypoint text, then the pinned scene, then the intro, each
 * in normal flow around it.
 */
function WaypointJourneySection({ app, index, scrollRef }) {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const progressRef = useRef(0);
  const inView = useInView(trackRef, 0);
  const isNear = useInView(trackRef, 0, "100% 0px");
  const [isDragZone, setIsDragZone] = useState(true);

  useEffect(() => {
    const page = scrollRef.current;
    const track = trackRef.current;
    if (!page || !track) {
      return undefined;
    }
    const update = () => {
      const rect = track.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      progressRef.current = progress;
      // Drive the text cross-fade from CSS, without re-rendering.
      stageRef.current?.style.setProperty("--journey", progress.toFixed(4));
      const nextDragZone = progress < 0.12;
      setIsDragZone((current) => (current === nextDragZone ? current : nextDragZone));
    };
    update();
    page.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      page.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRef]);

  return (
    <section
      id={app.id}
      className={`scroll-journey ${bandClass(index)}`}
      style={{ "--app-accent": app.accent }}
      aria-labelledby={`${app.id}-title`}
    >
      {/* Phones only: the Waypoint text before the pinned diagram... */}
      <div className="scroll-journey-flow">
        <AppCopy app={app} index={index} className="scroll-app-copy is-static" titleId={`${app.id}-title-mobile`} />
      </div>

      <div ref={trackRef} className="scroll-journey-track">
        <div className="scroll-journey-mark scroll-journey-mark--start" aria-hidden="true" />
        <div className="scroll-journey-mark scroll-journey-mark--end" aria-hidden="true" />
        <div ref={stageRef} className="scroll-journey-stage">
          <Suspense fallback={<div className="scroll-journey-view" />}>
            <JourneyView
              className="scroll-journey-view"
              near={isNear}
              progressRef={progressRef}
              videoSrc={app.video}
              videoLoad={isNear}
              isPlaying={inView}
              draggable={isDragZone}
            />
          </Suspense>
          <div className="scroll-journey-layer">
            <AppCopy app={app} index={index} className="scroll-app-copy is-static scroll-journey-app" />
            <ArchitectureIntro className="scroll-journey-arch" />
          </div>
        </div>
      </div>

      {/* ...and the "Under the hood" intro after it. */}
      <div className="scroll-journey-flow">
        <ArchitectureIntro className="scroll-arch-intro" />
      </div>
    </section>
  );
}

export default function ScrollPortfolioPage({ pathname, navigate }) {
  const scrollRef = useRef(null);
  const appsRef = useRef(null);
  const fontsReady = useFontsReady();

  // Scroll only this page's own scroller. (scrollIntoView would also scroll the
  // body, which the rest of the site locks, and shift the whole layout up.)
  const scrollToApps = useCallback((behavior = "smooth") => {
    const page = scrollRef.current;
    const appsSection = appsRef.current;
    if (page && appsSection) {
      page.scrollTo({ top: appsSection.offsetTop, behavior });
    }
  }, []);

  // The scrollbar takes the colours of the section across the middle of the
  // screen: its accent for the thumb, its band for the track.
  useEffect(() => {
    const page = scrollRef.current;
    if (!page || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((item) => item.isIntersecting);
        if (!entry) {
          return;
        }
        const style = getComputedStyle(entry.target);
        const accent = style.getPropertyValue("--app-accent").trim();
        const band = style.getPropertyValue("--band").trim();
        page.style.setProperty("--scroll-thumb", accent || "rgba(244, 244, 244, 0.45)");
        page.style.setProperty("--scroll-track", band || "#000000");
      },
      { root: page, rootMargin: "-50% 0px -50% 0px" }
    );
    page.querySelectorAll(":scope > section, :scope > div > section, :scope > footer").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // /portfolio (where the resume links) opens on the apps rather than the intro.
  useEffect(() => {
    if (pathname === "/portfolio") {
      scrollToApps("instant");
    }
  }, [pathname, scrollToApps]);

  return (
    <div ref={scrollRef} className="scroll-page">
      <header className="scroll-topbar">
        {posts.length > 0 ? (
          <SiteTopNav pathname={pathname} navigate={navigate} showHome={false} showPortfolio={false} />
        ) : (
          <span />
        )}
      </header>

      <section className={`scroll-hero band-a ${fontsReady ? "is-ready" : ""}`.trim()} aria-label="Introduction">
        <div className="scroll-hero-inner">
          <picture>
            <source srcSet="/images/profile.avif" type="image/avif" />
            <img className="scroll-hero-photo" src="/images/profile.png" alt="Brennan Tibbetts" width="112" height="112" decoding="async" />
          </picture>
          <HeroName />
          <p className="scroll-hero-eyebrow">Software engineer · iOS, cloud and web</p>
          <div className="scroll-hero-actions">
            <SocialThemeRow className="scroll-hero-social" />
            <a className="scroll-hero-resume" href={RESUME_PATH} target="_blank" rel="noopener noreferrer">
              Résumé
            </a>
          </div>
        </div>
        <button type="button" className="scroll-hint" onClick={() => scrollToApps()}>
          <span>Selected work</span>
          <span className="scroll-hint-arrow" aria-hidden="true">
            ↓
          </span>
        </button>
        {/* Easter egg: a faint arrow in the corner to a block game (/play). */}
        <a
          className="scroll-sneaky"
          href="/play"
          aria-label="Psst: play a game"
          onClick={(event) => {
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              navigate("/play");
            }
          }}
        >
          <span aria-hidden="true">psst</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 9v8H9" />
          </svg>
        </a>
      </section>


      <div ref={appsRef}>
        {apps.map((app, index) => (
          <Fragment key={app.id}>
            {app.id === JOURNEY_APP ? (
              <WaypointJourneySection app={app} index={index} scrollRef={scrollRef} />
            ) : (
              <AppSection app={app} index={index} />
            )}
          </Fragment>
        ))}
      </div>

      <section className={`scroll-about scroll-band ${bandClass(apps.length)}`} aria-labelledby="about-title">
        <picture>
          <source srcSet="/images/profile.avif" type="image/avif" />
          <img
            src="/images/profile.png"
            alt="Brennan Tibbetts"
            className="scroll-about-avatar"
            width="88"
            height="88"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <h2 id="about-title" className="scroll-about-name">
          Brennan Tibbetts
        </h2>
        <p className="scroll-about-text">{bioText}</p>
        <div className="scroll-about-actions">
          <a className="scroll-about-btn scroll-about-btn--primary" href={RESUME_PATH} target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
          <a className="scroll-about-btn" href="mailto:brennanTtibbetts@gmail.com">
            Email me
          </a>
        </div>
        <SocialThemeRow className="scroll-about-social" />
      </section>

      <footer className={`scroll-credits scroll-band ${bandClass(apps.length)}`}>
        <p>
          3D models:{" "}
          {MODEL_CREDITS.map((credit, index) => (
            <span key={credit.title}>
              {index > 0 ? "; " : ""}
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                “{credit.title}”
              </a>{" "}
              by{" "}
              <a href={credit.authorUrl} target="_blank" rel="noopener noreferrer">
                {credit.author}
              </a>
            </span>
          ))}
          , licensed under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
          .
        </p>
      </footer>

    </div>
  );
}
