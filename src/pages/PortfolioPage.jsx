import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useState, useEffect, useRef, useCallback } from "react";
import { Leva, folder, useControls } from "leva";
import * as THREE from "three";
import Experience from "../Experience";
import Header from "../Header";
import Actions from "../Actions";
import ViewInfo from "../ViewInfo";
import MobileOverlay from "../components/MobileOverlay";
import SiteTopNav from "../components/SiteTopNav";
import SlideTitlePanel from "../components/SlideTitlePanel";
import { projects } from "../projects";
import { useViewState } from "../hooks/useViewState";
import { useDiagnosticsEnabled } from "../hooks/useDiagnosticsEnabled";
import { DESKTOP_SLIDE_SPACING, MOBILE_SLIDE_SPACING } from "../constants/slideLayout";

const LEVA_THEME = {
  sizes: {
    rootWidth: "820px",
    controlWidth: "460px",
  },
};

const SWIPE_PROGRESS_DISTANCE = 0.72;
const SWIPE_COMMIT_THRESHOLD = 0.24;
const DRAG_DEADZONE_PX = 6;
const SLIDE_SWIPE_ENABLED = true;
const DESKTOP_SCROLL_COMMIT_THRESHOLD = 44;
const DESKTOP_SCROLL_ACCUM_RESET_MS = 170;
const DESKTOP_SCROLL_INERTIA_RELEASE_MS = 150;
const CONNECTOR_SLIDE_INDEX = 2;

const mod = (value, n) => ((value % n) + n) % n;

function shortestWrappedDelta(rawDelta, total) {
  let delta = mod(rawDelta, total);
  if (delta > total / 2) {
    delta -= total;
  }
  return delta;
}

function CameraController({ isMobile, laneIndex, slideOffsetRef, isDraggingRef, onMotionStateChange }) {
  const { camera } = useThree();
  const hasInitializedRef = useRef(false);
  const wasMovingRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      const initialIndex = laneIndex + (slideOffsetRef.current || 0);
      camera.position.x = isMobile ? 0 : initialIndex * DESKTOP_SLIDE_SPACING;
      camera.position.y = isMobile ? -initialIndex * MOBILE_SLIDE_SPACING : 0;
      camera.position.z = isMobile ? 18 : 14;
      hasInitializedRef.current = true;
      return;
    }

    camera.position.z = isMobile ? 18 : 14;
  }, [isMobile, laneIndex, camera, slideOffsetRef]);

  useFrame((_, delta) => {
    if (!isDraggingRef.current) {
      const nextOffset = THREE.MathUtils.damp(slideOffsetRef.current, 0, 11, delta);
      slideOffsetRef.current = Math.abs(nextOffset) < 0.0005 ? 0 : nextOffset;
    }

    const visualIndex = laneIndex + slideOffsetRef.current;
    const targetX = isMobile ? 0 : visualIndex * DESKTOP_SLIDE_SPACING;
    const targetY = isMobile ? -visualIndex * MOBILE_SLIDE_SPACING : 0;
    const targetZ = isMobile ? 18 : 14;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 7, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 8, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 8, delta);

    const isMoving =
      isDraggingRef.current ||
      Math.abs(slideOffsetRef.current) > 0.0015 ||
      Math.abs(camera.position.x - targetX) > 0.015 ||
      Math.abs(camera.position.y - targetY) > 0.015 ||
      Math.abs(camera.position.z - targetZ) > 0.015;

    if (isMoving !== wasMovingRef.current) {
      wasMovingRef.current = isMoving;
      onMotionStateChange?.(isMoving);
    }
  });

  return null;
}

export default function PortfolioPage({ pathname, navigate }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileConnectorInteractionEnabled, setMobileConnectorInteractionEnabled] = useState(false);
  const [diagnosticsEnabled] = useDiagnosticsEnabled();
  const canvasContainerRef = useRef(null);
  const gestureRef = useRef({
    active: false,
    pointerId: null,
    startPrimary: 0,
    startOffset: 0,
    moved: false,
  });
  const slideOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPresentationDraggingRef = useRef(false);
  const suppressMobileClickUntilRef = useRef(0);
  const isCameraAnimatingRef = useRef(false);
  const desktopWheelRef = useRef({
    accumulated: 0,
    resetTimerId: null,
    inertiaLock: false,
    inertiaReleaseTimerId: null,
  });
  const layoutControls = useControls("Experience", {
    "Desktop Layout": folder(
      {
        desktopLeftPanelWidthPercent: { value: 58, min: 26, max: 72, step: 1 },
      },
      { collapsed: true }
    ),
  });

  const {
    viewIndex,
    prev: prevView,
    next: nextView,
    showLeva,
    showInfo,
    setShowInfo,
    showBio,
    setShowBio,
    hasSwiped,
    clickedViews,
    markViewAsClicked,
  } = useViewState();
  const totalSlides = Math.max(projects.length, 1);
  const [laneIndex, setLaneIndex] = useState(() => viewIndex);
  const isConnectorSlide = viewIndex === CONNECTOR_SLIDE_INDEX;
  const isConnectorInteractionMode =
    isMobile && isConnectorSlide && mobileConnectorInteractionEnabled;
  const isMobileSwipeEnabled = SLIDE_SWIPE_ENABLED && isMobile && !isConnectorInteractionMode;

  const desktopLeftPanelWidthPercent = Math.max(26, Math.min(72, layoutControls.desktopLeftPanelWidthPercent));

  const goNext = useCallback(() => {
    setLaneIndex((index) => index + 1);
    nextView();
  }, [nextView]);

  const goPrev = useCallback(() => {
    setLaneIndex((index) => index - 1);
    prevView();
  }, [prevView]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile && mobileConnectorInteractionEnabled) {
      setMobileConnectorInteractionEnabled(false);
    }
  }, [isMobile, mobileConnectorInteractionEnabled]);

  useEffect(() => () => {
    if (desktopWheelRef.current.resetTimerId !== null) {
      window.clearTimeout(desktopWheelRef.current.resetTimerId);
      desktopWheelRef.current.resetTimerId = null;
    }
    if (desktopWheelRef.current.inertiaReleaseTimerId !== null) {
      window.clearTimeout(desktopWheelRef.current.inertiaReleaseTimerId);
      desktopWheelRef.current.inertiaReleaseTimerId = null;
    }
  }, []);

  useEffect(() => {
    setLaneIndex((currentLaneIndex) => {
      const currentModIndex = mod(currentLaneIndex, totalSlides);
      const delta = shortestWrappedDelta(viewIndex - currentModIndex, totalSlides);
      if (delta === 0) {
        return currentLaneIndex;
      }
      return currentLaneIndex + delta;
    });
  }, [viewIndex, totalSlides]);

  const completeGesture = (event, cancelled = false) => {
    if (!isMobileSwipeEnabled) {
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    let didCommitSlide = false;
    if (!cancelled) {
      const releaseOffset = slideOffsetRef.current;
      if (releaseOffset > SWIPE_COMMIT_THRESHOLD) {
        goNext();
        slideOffsetRef.current = releaseOffset - 1;
        didCommitSlide = true;
      } else if (releaseOffset < -SWIPE_COMMIT_THRESHOLD) {
        goPrev();
        slideOffsetRef.current = releaseOffset + 1;
        didCommitSlide = true;
      }
    }

    if (gesture.moved || didCommitSlide) {
      suppressMobileClickUntilRef.current = performance.now() + 300;
    }

    gestureRef.current = {
      active: false,
      pointerId: null,
      startPrimary: 0,
      startOffset: slideOffsetRef.current,
      moved: false,
    };
    isDraggingRef.current = false;
  };

  const handleCanvasPointerDown = (event) => {
    if (!isMobileSwipeEnabled) {
      return;
    }

    if (showInfo || showBio) {
      return;
    }

    if (isPresentationDraggingRef.current) {
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

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const primary = isMobile ? event.clientY : event.clientX;
    const clampedStartOffset = Math.max(-1.2, Math.min(1.2, slideOffsetRef.current));
    slideOffsetRef.current = clampedStartOffset;
    gestureRef.current = {
      active: true,
      pointerId: event.pointerId,
      startPrimary: primary,
      startOffset: clampedStartOffset,
      moved: false,
    };
    isDraggingRef.current = true;
  };

  const handleCanvasPointerMove = (event) => {
    if (!isMobileSwipeEnabled) {
      return;
    }

    if (isPresentationDraggingRef.current) {
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId || showInfo || showBio) {
      return;
    }

    const primary = isMobile ? event.clientY : event.clientX;
    const deltaPrimary = gesture.startPrimary - primary;
    const viewportPrimary = Math.max(1, isMobile ? window.innerHeight : window.innerWidth);
    const deltaSlides = deltaPrimary / (viewportPrimary * SWIPE_PROGRESS_DISTANCE);
    slideOffsetRef.current = Math.max(-1.2, Math.min(1.2, gesture.startOffset + deltaSlides));

    if (Math.abs(deltaPrimary) > DRAG_DEADZONE_PX) {
      gesture.moved = true;
    }
  };

  const handleCanvasPointerUp = (event) => {
    if (!isMobileSwipeEnabled) {
      return;
    }

    if (isPresentationDraggingRef.current) {
      return;
    }
    completeGesture(event, false);
  };

  const handleCanvasPointerCancel = (event) => {
    if (!isMobileSwipeEnabled) {
      return;
    }

    if (isPresentationDraggingRef.current) {
      return;
    }
    completeGesture(event, true);
  };

  const handleCanvasClick = (event) => {
    if (showInfo || showBio) {
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

    if (!isMobile) {
      return;
    }

    if (isMobile && mobileConnectorInteractionEnabled) {
      return;
    }

    if (performance.now() < suppressMobileClickUntilRef.current) {
      return;
    }

    setShowInfo(true);
    markViewAsClicked(viewIndex);
  };

  const handleStartConnectorInteraction = useCallback(() => {
    setMobileConnectorInteractionEnabled(true);
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
    slideOffsetRef.current = 0;
  }, []);

  const handleStopConnectorInteraction = useCallback(() => {
    setMobileConnectorInteractionEnabled(false);
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
  }, []);

  const handleCanvasWheel = (event) => {
    if (isMobile) {
      return;
    }

    if (showInfo || showBio || isPresentationDraggingRef.current || event.ctrlKey) {
      return;
    }

    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!Number.isFinite(dominantDelta) || dominantDelta === 0) {
      return;
    }

    event.preventDefault();

    let normalizedDelta = dominantDelta;
    if (event.deltaMode === 1) {
      normalizedDelta *= 16;
    } else if (event.deltaMode === 2) {
      normalizedDelta *= Math.max(window.innerHeight, 1);
    }

    const wheelState = desktopWheelRef.current;

    const queueInertiaRelease = () => {
      if (wheelState.inertiaReleaseTimerId !== null) {
        window.clearTimeout(wheelState.inertiaReleaseTimerId);
      }
      wheelState.inertiaReleaseTimerId = window.setTimeout(() => {
        wheelState.inertiaLock = false;
        wheelState.accumulated = 0;
        wheelState.inertiaReleaseTimerId = null;
      }, DESKTOP_SCROLL_INERTIA_RELEASE_MS);
    };

    if (wheelState.inertiaLock) {
      queueInertiaRelease();
      return;
    }

    if (isCameraAnimatingRef.current) {
      wheelState.accumulated = 0;
      wheelState.inertiaLock = true;
      queueInertiaRelease();
      return;
    }

    wheelState.accumulated += normalizedDelta;
    if (Math.abs(wheelState.accumulated) < DESKTOP_SCROLL_COMMIT_THRESHOLD) {
      if (wheelState.resetTimerId !== null) {
        window.clearTimeout(wheelState.resetTimerId);
      }
      wheelState.resetTimerId = window.setTimeout(() => {
        wheelState.accumulated = 0;
        wheelState.resetTimerId = null;
      }, DESKTOP_SCROLL_ACCUM_RESET_MS);
      return;
    }

    if (wheelState.accumulated > 0) {
      goNext();
    } else {
      goPrev();
    }

    wheelState.accumulated = 0;
    if (wheelState.resetTimerId !== null) {
      window.clearTimeout(wheelState.resetTimerId);
      wheelState.resetTimerId = null;
    }
    wheelState.inertiaLock = true;
    queueInertiaRelease();
    isCameraAnimatingRef.current = true;
  };

  const handleCameraMotionStateChange = useCallback((isMoving) => {
    isCameraAnimatingRef.current = isMoving;
    if (!isMoving) {
      const wheelState = desktopWheelRef.current;
      wheelState.accumulated = 0;
      if (wheelState.resetTimerId !== null) {
        window.clearTimeout(wheelState.resetTimerId);
        wheelState.resetTimerId = null;
      }
      wheelState.inertiaLock = true;
      if (wheelState.inertiaReleaseTimerId !== null) {
        window.clearTimeout(wheelState.inertiaReleaseTimerId);
      }
      wheelState.inertiaReleaseTimerId = window.setTimeout(() => {
        wheelState.inertiaLock = false;
        wheelState.accumulated = 0;
        wheelState.inertiaReleaseTimerId = null;
      }, DESKTOP_SCROLL_INERTIA_RELEASE_MS);
    }
  }, []);

  const leftPanelStyle = isMobile
    ? undefined
    : {
        width: `${desktopLeftPanelWidthPercent}%`,
        flex: `0 0 ${desktopLeftPanelWidthPercent}%`,
      };

  return (
    <div className="main">
      <div className="landscape-warning">
        <p>Please rotate your device to portrait mode</p>
      </div>
      <Leva hidden={!showLeva} theme={LEVA_THEME} />

      <MobileOverlay type="info" isOpen={showInfo} onClose={() => setShowInfo(false)} viewIndex={viewIndex} />

      <MobileOverlay type="bio" isOpen={showBio} onClose={() => setShowBio(false)} />

      <aside className="panel-left" style={leftPanelStyle}>
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
          viewControlProps={{ prev: goPrev, next: goNext, viewIndex }}
          hasSwiped={hasSwiped}
          hasClicked={clickedViews.has(viewIndex)}
          isMobile={isMobile}
        />
      </aside>

      {isMobile && !isConnectorInteractionMode ? (
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
        <div
          ref={canvasContainerRef}
          className="canvas-container"
          onClick={handleCanvasClick}
          onWheel={!isMobile ? handleCanvasWheel : undefined}
          onPointerDown={isMobileSwipeEnabled ? handleCanvasPointerDown : undefined}
          onPointerMove={isMobileSwipeEnabled ? handleCanvasPointerMove : undefined}
          onPointerUp={isMobileSwipeEnabled ? handleCanvasPointerUp : undefined}
          onPointerCancel={isMobileSwipeEnabled ? handleCanvasPointerCancel : undefined}
        >
          {!isMobile ? <SlideTitlePanel title={projects[viewIndex]?.title ?? ""} /> : null}
          {isMobile && isConnectorSlide ? (
            <button
              type="button"
              className={`mobile-interaction-toggle ${isConnectorInteractionMode ? "is-active" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (isConnectorInteractionMode) {
                  handleStopConnectorInteraction();
                  return;
                }
                handleStartConnectorInteraction();
              }}
            >
              {isConnectorInteractionMode ? "stop interaction" : "click to Interact"}
            </button>
          ) : null}
          <Canvas
            camera={{
              position: [0, 0, isMobile ? 18 : 14],
              fov: 45,
            }}
            dpr={[1, 1.25]}
            gl={{ powerPreference: "high-performance" }}
          >
            <CameraController
              isMobile={isMobile}
              laneIndex={laneIndex}
              slideOffsetRef={slideOffsetRef}
              isDraggingRef={isDraggingRef}
              onMotionStateChange={handleCameraMotionStateChange}
            />
            <Experience
              diagnosticsEnabled={diagnosticsEnabled}
              viewIndex={viewIndex}
              layoutIndex={laneIndex}
              isMobile={isMobile}
              disableConnectorInteraction={isMobile && !mobileConnectorInteractionEnabled}
              onPresentationDragStart={() => {
                isPresentationDraggingRef.current = true;
                gestureRef.current.active = false;
                gestureRef.current.pointerId = null;
                isDraggingRef.current = false;
              }}
              onPresentationDragEnd={() => {
                isPresentationDraggingRef.current = false;
              }}
            />
          </Canvas>

          <div className="view-controls desktop-only">
            <button className="btn view-btn" onClick={goPrev} aria-label="Previous view">
              ‹
            </button>
            <div className="view-indicator">
              {viewIndex + 1} / {projects.length}
            </div>
            <button className="btn view-btn" onClick={goNext} aria-label="Next view">
              ›
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
