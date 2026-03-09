import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useState, useEffect, useRef, useCallback } from "react";
import { Leva, folder, useControls } from "leva";
import * as THREE from "three";
import Experience from "../Experience";
import Header from "../Header";
import Actions from "../Actions";
import ViewInfo from "../ViewInfo";
import MobileInfoPanel from "../components/MobileInfoPanel";
import MobilePortfolioOverview from "../components/MobilePortfolioOverview";
import SiteTopNav from "../components/SiteTopNav";
import SlideTitlePanel from "../components/SlideTitlePanel";
import SlideDotsIndicator from "../components/SlideDotsIndicator";
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
const PHONE_SLIDE_INDEX = 0;
const CONNECTOR_SLIDE_INDEX = 2;
const SLIDE_QUERY_KEY = "slide";
const MOBILE_VIEW_QUERY_KEY = "mobileView";

const mod = (value, n) => ((value % n) + n) % n;

function shortestWrappedDelta(rawDelta, total) {
  let delta = mod(rawDelta, total);
  if (delta > total / 2) {
    delta -= total;
  }
  return delta;
}

function getMobileSurfaceFromQuery(isMobileViewport) {
  if (typeof window === "undefined") {
    return "slides";
  }

  if (!isMobileViewport) {
    return "slides";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const mobileView = searchParams.get(MOBILE_VIEW_QUERY_KEY);
  if (mobileView === "home" || mobileView === "overview") {
    return "overview";
  }
  if (mobileView === "slides") {
    return "slides";
  }

  // Preserve deep-linking behavior when only a slide query is provided.
  return searchParams.has(SLIDE_QUERY_KEY) ? "slides" : "overview";
}

function isIOSWebKit() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);

  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isIPadDesktopMode = platform === "MacIntel" && maxTouchPoints > 1;
  const isAppleMobile = isIOSDevice || isIPadDesktopMode;

  if (!isAppleMobile) {
    return false;
  }

  // Exclude non-Safari WebKit wrappers with their own GPU behavior.
  return /WebKit/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

function canCreateWebGLContext() {
  if (typeof document === "undefined") {
    return true;
  }

  const testCanvas = document.createElement("canvas");
  if (!testCanvas) {
    return false;
  }

  const context =
    testCanvas.getContext("webgl2", { powerPreference: "low-power" }) ||
    testCanvas.getContext("webgl", { powerPreference: "low-power" }) ||
    testCanvas.getContext("experimental-webgl");

  return Boolean(context);
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
  const [isLikelyIOSWebKit] = useState(() => isIOSWebKit());
  const [hasCanvasFailure, setHasCanvasFailure] = useState(() => !canCreateWebGLContext());
  const totalSlides = Math.max(projects.length, 1);
  const [mobileSurface, setMobileSurface] = useState(() =>
    getMobileSurfaceFromQuery(window.innerWidth <= 768)
  );
  const [mobileLaunchingSlideIndex, setMobileLaunchingSlideIndex] = useState(null);
  const [mobileInteractionSlideIndex, setMobileInteractionSlideIndex] = useState(null);
  const [diagnosticsEnabled] = useDiagnosticsEnabled();
  const canvasContainerRef = useRef(null);
  const canvasContextCleanupRef = useRef(null);
  const mobileLaunchTimerRef = useRef(null);
  const wasMobileRef = useRef(window.innerWidth <= 768);
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
    goTo: goToView,
    showLeva,
    showInfo,
    setShowInfo,
  } = useViewState(totalSlides);
  const [laneIndex, setLaneIndex] = useState(() => viewIndex);
  const isMobileOverview = isMobile && mobileSurface === "overview";
  const isMobileSlideMode = !isMobile || mobileSurface === "slides";
  const shouldRenderCanvas = (!isMobile || isMobileSlideMode) && !hasCanvasFailure;
  const canvasDpr = isLikelyIOSWebKit ? [1, 1] : [1, 1.25];
  const canvasGlProps = isLikelyIOSWebKit
    ? { powerPreference: "default", antialias: false }
    : { powerPreference: "high-performance" };
  const isPhoneSlide = viewIndex === PHONE_SLIDE_INDEX;
  const isConnectorSlide = viewIndex === CONNECTOR_SLIDE_INDEX;
  const isInteractionEnabledForCurrentSlide =
    isMobile &&
    isMobileSlideMode &&
    (isPhoneSlide || isConnectorSlide) &&
    mobileInteractionSlideIndex === viewIndex;
  const isMobileSwipeEnabled =
    SLIDE_SWIPE_ENABLED && isMobile && isMobileSlideMode && !isInteractionEnabledForCurrentSlide;

  const desktopLeftPanelWidthPercent = Math.max(26, Math.min(72, layoutControls.desktopLeftPanelWidthPercent));

  const handleCanvasFailure = useCallback(() => {
    setHasCanvasFailure(true);
    setMobileInteractionSlideIndex(null);
    isPresentationDraggingRef.current = false;
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
    slideOffsetRef.current = 0;
  }, []);

  const attachCanvasContextLossListener = useCallback(
    (glRenderer) => {
      if (!glRenderer?.domElement) {
        return;
      }

      if (canvasContextCleanupRef.current) {
        canvasContextCleanupRef.current();
        canvasContextCleanupRef.current = null;
      }

      const handleContextLost = (event) => {
        event.preventDefault();
        handleCanvasFailure();
      };

      glRenderer.domElement.addEventListener("webglcontextlost", handleContextLost, { passive: false });

      canvasContextCleanupRef.current = () => {
        glRenderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      };
    },
    [handleCanvasFailure]
  );

  const goNext = useCallback(() => {
    setLaneIndex((index) => index + 1);
    nextView();
  }, [nextView]);

  const goPrev = useCallback(() => {
    setLaneIndex((index) => index - 1);
    prevView();
  }, [prevView]);

  const moveToSlideIndex = useCallback(
    (targetIndex) => {
      const normalizedIndex = mod(targetIndex, totalSlides);
      goToView(normalizedIndex);
      setLaneIndex((currentLaneIndex) => {
        const currentModIndex = mod(currentLaneIndex, totalSlides);
        const delta = shortestWrappedDelta(normalizedIndex - currentModIndex, totalSlides);
        return currentLaneIndex + delta;
      });
    },
    [goToView, totalSlides]
  );

  const handleReturnToMobileOverview = useCallback(() => {
    if (!isMobile) {
      return;
    }

    setShowInfo(false);
    setMobileSurface("overview");
    setMobileInteractionSlideIndex(null);
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
    slideOffsetRef.current = 0;
  }, [isMobile, setShowInfo]);

  const handleMobileSlideSelect = useCallback(
    (slideIndex) => {
      if (!isMobile || mobileSurface !== "overview") {
        return;
      }

      if (mobileLaunchTimerRef.current !== null) {
        window.clearTimeout(mobileLaunchTimerRef.current);
      }

      setMobileLaunchingSlideIndex(slideIndex);
      mobileLaunchTimerRef.current = window.setTimeout(() => {
        moveToSlideIndex(slideIndex);
        setShowInfo(false);
        setMobileSurface("slides");
        setMobileInteractionSlideIndex(null);
        gestureRef.current.active = false;
        gestureRef.current.pointerId = null;
        gestureRef.current.moved = false;
        isDraggingRef.current = false;
        slideOffsetRef.current = 0;
        setMobileLaunchingSlideIndex(null);
        mobileLaunchTimerRef.current = null;
      }, 190);
    },
    [isMobile, mobileSurface, moveToSlideIndex, setShowInfo]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && !wasMobileRef.current) {
      setMobileSurface(getMobileSurfaceFromQuery(true));
      setShowInfo(false);
      setMobileInteractionSlideIndex(null);
      setMobileLaunchingSlideIndex(null);
      slideOffsetRef.current = 0;
    } else if (!isMobile && wasMobileRef.current) {
      setMobileSurface("slides");
      setMobileLaunchingSlideIndex(null);
    }

    wasMobileRef.current = isMobile;
  }, [isMobile, setShowInfo]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.location.pathname.startsWith("/portfolio")) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const currentMobileView = searchParams.get(MOBILE_VIEW_QUERY_KEY);

    if (!isMobile) {
      if (currentMobileView == null) {
        return;
      }

      searchParams.delete(MOBILE_VIEW_QUERY_KEY);
    } else {
      const nextMobileView = mobileSurface === "overview" ? "home" : "slides";
      if (currentMobileView === nextMobileView) {
        return;
      }
      searchParams.set(MOBILE_VIEW_QUERY_KEY, nextMobileView);
    }

    const nextSearch = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [isMobile, mobileSurface]);

  useEffect(() => {
    if (!isMobile && mobileInteractionSlideIndex !== null) {
      setMobileInteractionSlideIndex(null);
    }
  }, [isMobile, mobileInteractionSlideIndex]);

  useEffect(() => () => {
    if (canvasContextCleanupRef.current) {
      canvasContextCleanupRef.current();
      canvasContextCleanupRef.current = null;
    }
    if (mobileLaunchTimerRef.current !== null) {
      window.clearTimeout(mobileLaunchTimerRef.current);
      mobileLaunchTimerRef.current = null;
    }
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

    if (!cancelled) {
      const releaseOffset = slideOffsetRef.current;
      if (releaseOffset > SWIPE_COMMIT_THRESHOLD) {
        goNext();
        slideOffsetRef.current = releaseOffset - 1;
      } else if (releaseOffset < -SWIPE_COMMIT_THRESHOLD) {
        goPrev();
        slideOffsetRef.current = releaseOffset + 1;
      }
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

    if (showInfo) {
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
    if (!gesture.active || gesture.pointerId !== event.pointerId || showInfo) {
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
    if (!isMobile || !isMobileSlideMode || !showInfo) {
      return;
    }

    if (event.target === event.currentTarget) {
      setShowInfo(false);
    }
  };

  const handleStartSlideInteraction = useCallback(() => {
    if (!isMobileSlideMode) {
      return;
    }
    setMobileInteractionSlideIndex(viewIndex);
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
    slideOffsetRef.current = 0;
  }, [isMobileSlideMode, viewIndex]);

  const handleStopSlideInteraction = useCallback(() => {
    setMobileInteractionSlideIndex(null);
    gestureRef.current.active = false;
    gestureRef.current.pointerId = null;
    gestureRef.current.moved = false;
    isDraggingRef.current = false;
  }, []);

  const handleCanvasWheel = (event) => {
    if (isMobile) {
      return;
    }

    if (showInfo || isPresentationDraggingRef.current || event.ctrlKey) {
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

      <aside className="panel-left" style={leftPanelStyle}>
        {!isMobile ? (
          <>
            <SiteTopNav
              pathname={pathname}
              navigate={navigate}
              className="site-top-nav-inline"
            />
            <Header
              onBack={() => navigate("/")}
              showBack={false}
            />
            <div className="desktop-view-info">
              <ViewInfo viewIndex={viewIndex} />
            </div>
            <Actions />
          </>
        ) : null}
      </aside>

      <main className="panel-right">
        <div
          ref={canvasContainerRef}
          className={`canvas-container ${isMobileOverview ? "mobile-overview-active" : "mobile-slides-active"} ${
            isInteractionEnabledForCurrentSlide ? "mobile-interaction-active" : ""
          }`}
          onClick={handleCanvasClick}
          onWheel={!isMobile ? handleCanvasWheel : undefined}
            onPointerDown={isMobileSwipeEnabled ? handleCanvasPointerDown : undefined}
            onPointerMove={isMobileSwipeEnabled ? handleCanvasPointerMove : undefined}
            onPointerUp={isMobileSwipeEnabled ? handleCanvasPointerUp : undefined}
            onPointerCancel={isMobileSwipeEnabled ? handleCanvasPointerCancel : undefined}
        >
          {isMobile ? (
            <MobilePortfolioOverview
              projects={projects}
              isActive={isMobileOverview}
              launchingSlideIndex={mobileLaunchingSlideIndex}
              onSelectSlide={handleMobileSlideSelect}
            />
          ) : null}

          <div className={`mobile-scene-layer ${isMobileOverview ? "is-hidden" : "is-active"}`}>
            {isMobile && isMobileSlideMode ? (
              <MobileInfoPanel
                viewIndex={viewIndex}
                isOpen={showInfo}
                onOpen={() => {
                  setShowInfo(true);
                }}
                onClose={() => setShowInfo(false)}
              />
            ) : null}
            {isMobileSlideMode ? (
              <SlideTitlePanel
                title={projects[viewIndex]?.title ?? ""}
                className={isMobile ? "mobile-only" : "desktop-only"}
                onClick={isMobile ? () => setShowInfo(true) : undefined}
                disabled={showInfo}
                onLeftButtonClick={isMobile && !showInfo ? handleReturnToMobileOverview : undefined}
                leftButtonLabel="×"
                leftButtonAriaLabel="Back to profile overview"
              />
            ) : null}
            {isMobile && isMobileSlideMode ? (
              <SlideDotsIndicator
                totalSlides={totalSlides}
                laneIndex={laneIndex}
                slideOffsetRef={slideOffsetRef}
                className={showInfo || isInteractionEnabledForCurrentSlide ? "is-hidden" : ""}
              />
            ) : null}
            {isMobile &&
            isMobileSlideMode &&
            shouldRenderCanvas &&
            (isPhoneSlide || isConnectorSlide) &&
            !showInfo ? (
              <button
                type="button"
                className={`mobile-interaction-toggle ${isInteractionEnabledForCurrentSlide ? "is-active" : ""}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isInteractionEnabledForCurrentSlide) {
                    handleStopSlideInteraction();
                    return;
                  }
                  handleStartSlideInteraction();
                }}
              >
                {isInteractionEnabledForCurrentSlide ? "stop interaction" : "Switch to interactive mode"}
              </button>
            ) : null}
            {shouldRenderCanvas ? (
              <>
                <Canvas
                  camera={{
                    position: [0, 0, isMobile ? 18 : 14],
                    fov: 45,
                  }}
                  dpr={canvasDpr}
                  gl={canvasGlProps}
                  onCreated={({ gl }) => {
                    attachCanvasContextLossListener(gl);
                  }}
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
                    totalSlides={totalSlides}
                    isMobile={isMobile}
                    mobilePhoneInteractionEnabled={isMobile && mobileInteractionSlideIndex === PHONE_SLIDE_INDEX}
                    disableConnectorInteraction={isMobile && mobileInteractionSlideIndex !== CONNECTOR_SLIDE_INDEX}
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
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
