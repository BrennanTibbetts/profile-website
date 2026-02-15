import { Canvas, useThree } from "@react-three/fiber";
import { useState, useEffect } from "react";
import { Leva } from "leva";
import Experience from "../Experience";
import Header from "../Header";
import Actions from "../Actions";
import ViewInfo from "../ViewInfo";
import MobileOverlay from "../components/MobileOverlay";
import SiteTopNav from "../components/SiteTopNav";
import { projects } from "../projects";
import { useViewState } from "../hooks/useViewState";
import { useSwipeGesture } from "../hooks/useSwipeGesture";

const LEVA_THEME = {
  sizes: {
    rootWidth: "360px",
    controlWidth: "200px",
  },
};

function CameraController({ isMobile }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.z = isMobile ? 18 : 14;
  }, [isMobile, camera]);

  return null;
}

export default function PortfolioPage({ pathname, navigate }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const {
    slideIndex,
    setSlideIndex,
    viewIndex,
    prev,
    next,
    showLeva,
    showInfo,
    setShowInfo,
    showBio,
    setShowBio,
    hasSwiped,
    clickedViews,
    markViewAsClicked,
  } = useViewState();

  const { onTouchStart, onTouchEnd } = useSwipeGesture(next, prev, !showInfo && !showBio);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="landscape-warning">
        <p>Please rotate your device to portrait mode</p>
      </div>
      <Leva hidden={!showLeva} theme={LEVA_THEME} />

      <MobileOverlay type="info" isOpen={showInfo} onClose={() => setShowInfo(false)} viewIndex={viewIndex} />

      <MobileOverlay type="bio" isOpen={showBio} onClose={() => setShowBio(false)} />

      <aside className="panel-left">
        {!isMobile ? (
          <SiteTopNav
            pathname={pathname}
            navigate={navigate}
            className="site-top-nav-inline"
          />
        ) : null}
        <Header
          onBack={() => navigate("/")}
          onHeaderClick={isMobile ? () => setShowBio(true) : undefined}
          showBack={isMobile}
        />
        <div className="desktop-view-info">
          <ViewInfo viewIndex={viewIndex} />
        </div>
        <Actions
          viewControlProps={{ prev, next, viewIndex }}
          hasSwiped={hasSwiped}
          hasClicked={clickedViews.has(viewIndex)}
          isMobile={isMobile}
        />
      </aside>

      {isMobile ? (
        <button
          className="mobile-info-btn"
          onClick={() => {
            setShowInfo(true);
            markViewAsClicked(viewIndex);
          }}
        >
          Learn more
        </button>
      ) : null}

      <main className="panel-right">
        <div className="canvas-container">
          <Canvas camera={{ position: [0, 0, isMobile ? 16 : 12], fov: 45 }} gl={{ powerPreference: "high-performance" }}>
            <CameraController isMobile={isMobile} />
            <Experience
              slideIndex={slideIndex}
              setSlideIndex={(val) => {
                setSlideIndex(val);
              }}
              onModelClick={() => {
                if (isMobile) {
                  setShowInfo(true);
                  markViewAsClicked(viewIndex);
                }
              }}
            />
          </Canvas>

          <div className="view-controls desktop-only">
            <button className="btn view-btn" onClick={prev} aria-label="Previous view">
              ‹
            </button>
            <div className="view-indicator">
              {viewIndex + 1} / {projects.length}
            </div>
            <button className="btn view-btn" onClick={next} aria-label="Next view">
              ›
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
