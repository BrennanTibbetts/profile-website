import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle pointer drag interactions on a canvas element
 * Detects clicks vs drags and provides drag offset for carousel rotation
 * 
 * @param {Object} gl - Three.js WebGL renderer from useThree
 * @param {Function} onSwipeLeft - Callback when user drags/swipes left
 * @param {Function} onSwipeRight - Callback when user drags/swipes right
 * @param {Function} onModelClick - Callback when user clicks (not drags)
 * @param {boolean} isMobile - Whether the device is mobile
 * @returns {Object} Drag state reference
 */
export function usePointerDrag(gl, onSwipeLeft, onSwipeRight, onModelClick, isMobile = false) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragOffset = useRef(0);
  const isClick = useRef(true);

  useEffect(() => {
    if (!gl) return;
    
    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      isDragging.current = true;
      startX.current = e.clientX;
      isClick.current = true;
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      
      // If movement exceeds threshold, it's a drag not a click
      if (Math.abs(delta) > 5) {
        isClick.current = false;
      }
      
      // Calculate drag offset for rotation (normalized to screen width)
      dragOffset.current = (delta / window.innerWidth) * (Math.PI * 1.5);
    };

    const onPointerUp = (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      // Handle click (not drag)
      if (isClick.current && onModelClick) {
        if (isMobile) {
          // Only trigger click in the middle 50% of the screen (avoid UI buttons)
          const y = e.clientY;
          const height = window.innerHeight;
          if (y > height * 0.25 && y < height * 0.75) {
            onModelClick();
          }
        } else {
          onModelClick();
        }
      }

      // Handle drag/swipe (not click)
      const threshold = Math.PI / 4;
      
      // On desktop or when using mouse on mobile
      if (!isMobile || e.pointerType === "mouse") {
        if (dragOffset.current > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (dragOffset.current < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      // Reset drag offset
      dragOffset.current = 0;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, onSwipeLeft, onSwipeRight, onModelClick, isMobile]);

  return {
    dragOffset,
  };
}
