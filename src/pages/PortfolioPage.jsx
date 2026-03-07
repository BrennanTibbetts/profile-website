import { Canvas, useThree } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import { Leva, folder, useControls } from "leva";
import Experience from "../Experience";
import Header from "../Header";
import Actions from "../Actions";
import ViewInfo from "../ViewInfo";
import MobileOverlay from "../components/MobileOverlay";
import SiteTopNav from "../components/SiteTopNav";
import CarouselTitlePanel from "../components/CarouselTitlePanel";
import { projects } from "../projects";
import { useViewState } from "../hooks/useViewState";
import { useSwipeGesture } from "../hooks/useSwipeGesture";
import { useDiagnosticsEnabled } from "../hooks/useDiagnosticsEnabled";
import { QUALITY_TIER_OPTIONS, useAdaptiveQualityProfile } from "../hooks/useAdaptiveQualityProfile";

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

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function normalizeRange(a, b) {
  return [clamp01(Math.min(a, b)), clamp01(Math.max(a, b))];
}

export default function PortfolioPage({ pathname, navigate }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [diagnosticsEnabled] = useDiagnosticsEnabled();
  const canvasContainerRef = useRef(null);
  const lastClickNavAtRef = useRef(0);
  const clickNavControls = useControls("Experience", {
    "Performance Profile": folder(
      {
        qualityTierOverride: {
          value: "auto",
          options: QUALITY_TIER_OPTIONS,
        },
      },
      { collapsed: true }
    ),
    "Click Navigation": folder(
      {
        clickNavEnabled: { value: true },
        showClickRegions: { value: false },
        clickNavCooldownMs: { value: 220, min: 0, max: 900, step: 10 },
        regionYMin: { value: 0.16, min: 0, max: 1, step: 0.01 },
        regionYMax: { value: 0.88, min: 0, max: 1, step: 0.01 },
        leftRegionXMin: { value: 0.0, min: 0, max: 1, step: 0.01 },
        leftRegionXMax: { value: 0.42, min: 0, max: 1, step: 0.01 },
        rightRegionXMin: { value: 0.58, min: 0, max: 1, step: 0.01 },
        rightRegionXMax: { value: 1.0, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true }
    ),
  });
  const qualityProfile = useAdaptiveQualityProfile(clickNavControls.qualityTierOverride);

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

  const [zoneYMin, zoneYMax] = normalizeRange(clickNavControls.regionYMin, clickNavControls.regionYMax);
  const [leftXMin, leftXMax] = normalizeRange(clickNavControls.leftRegionXMin, clickNavControls.leftRegionXMax);
  const [rightXMin, rightXMax] = normalizeRange(clickNavControls.rightRegionXMin, clickNavControls.rightRegionXMax);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCanvasRegionClick = (event) => {
    if (isMobile || showInfo || showBio || !clickNavControls.clickNavEnabled) {
      return;
    }

    if (event.target instanceof Element) {
      const interactiveTarget = event.target.closest(
        ".view-controls, .view-btn, .btn, .mobile-info-btn, button, a, input, textarea, select"
      );
      if (interactiveTarget) {
        return;
      }
    }

    const container = canvasContainerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (y < zoneYMin || y > zoneYMax) {
      return;
    }

    const now = performance.now();
    if (now - lastClickNavAtRef.current < clickNavControls.clickNavCooldownMs) {
      return;
    }

    if (x >= leftXMin && x <= leftXMax) {
      lastClickNavAtRef.current = now;
      prev();
      return;
    }

    if (x >= rightXMin && x <= rightXMax) {
      lastClickNavAtRef.current = now;
      next();
    }
  };

  const leftRegionStyle = {
    left: `${leftXMin * 100}%`,
    top: `${zoneYMin * 100}%`,
    width: `${Math.max(0, (leftXMax - leftXMin) * 100)}%`,
    height: `${Math.max(0, (zoneYMax - zoneYMin) * 100)}%`,
  };

  const rightRegionStyle = {
    left: `${rightXMin * 100}%`,
    top: `${zoneYMin * 100}%`,
    width: `${Math.max(0, (rightXMax - rightXMin) * 100)}%`,
    height: `${Math.max(0, (zoneYMax - zoneYMin) * 100)}%`,
  };

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
        <div ref={canvasContainerRef} className="canvas-container" onClick={handleCanvasRegionClick}>
          {!isMobile ? <CarouselTitlePanel title={projects[viewIndex]?.title ?? ""} /> : null}
          <Canvas
            camera={{ position: [0, 0, isMobile ? 16 : 12], fov: 45 }}
            dpr={qualityProfile.preset.canvasDpr}
            gl={{ powerPreference: "high-performance" }}
          >
            <CameraController isMobile={isMobile} />
            <Experience
              diagnosticsEnabled={diagnosticsEnabled}
              qualityProfile={qualityProfile}
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
          {!isMobile && clickNavControls.showClickRegions ? (
            <div className="click-region-debug-layer" aria-hidden="true">
              <div className="click-region-debug-zone click-region-debug-zone-left" style={leftRegionStyle}>
                <span>PREV</span>
              </div>
              <div className="click-region-debug-zone click-region-debug-zone-right" style={rightRegionStyle}>
                <span>NEXT</span>
              </div>
            </div>
          ) : null}

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
