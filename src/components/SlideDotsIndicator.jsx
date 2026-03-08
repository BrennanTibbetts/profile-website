import { useEffect, useMemo, useState } from "react";

const mod = (value, n) => ((value % n) + n) % n;

function shortestWrappedDelta(rawDelta, total) {
  let delta = mod(rawDelta, total);
  if (delta > total / 2) {
    delta -= total;
  }
  return delta;
}

function getDotStyles(visualIndex, totalSlides) {
  const wrappedVisual = mod(visualIndex, totalSlides);
  return Array.from({ length: totalSlides }, (_, index) => {
    const distance = Math.abs(shortestWrappedDelta(index - wrappedVisual, totalSlides));
    const influence = Math.max(0, 1 - Math.min(distance, 1));
    const opacity = 0.28 + influence * 0.72;
    const scale = 0.76 + influence * 0.46;
    return { opacity, scale };
  });
}

export default function SlideDotsIndicator({
  totalSlides = 1,
  laneIndex = 0,
  slideOffsetRef,
  className = "",
}) {
  const normalizedTotalSlides = Math.max(1, Math.trunc(totalSlides));
  const [visualIndex, setVisualIndex] = useState(() => laneIndex + (slideOffsetRef?.current ?? 0));

  useEffect(() => {
    setVisualIndex(laneIndex + (slideOffsetRef?.current ?? 0));
  }, [laneIndex, slideOffsetRef]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const nextVisualIndex = laneIndex + (slideOffsetRef?.current ?? 0);
      setVisualIndex((currentVisualIndex) =>
        Math.abs(currentVisualIndex - nextVisualIndex) > 0.0005 ? nextVisualIndex : currentVisualIndex
      );
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [laneIndex, slideOffsetRef]);

  const dotStyles = useMemo(
    () => getDotStyles(visualIndex, normalizedTotalSlides),
    [normalizedTotalSlides, visualIndex]
  );

  return (
    <div className={`slide-progress-dots ${className}`.trim()} aria-hidden="true">
      {dotStyles.map((dotStyle, index) => (
        <span
          key={`slide-dot-${index}`}
          className="slide-progress-dot"
          style={{
            opacity: dotStyle.opacity,
            transform: `scale(${dotStyle.scale})`,
          }}
        />
      ))}
    </div>
  );
}
