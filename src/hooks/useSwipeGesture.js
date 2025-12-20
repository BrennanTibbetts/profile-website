import { useRef } from 'react';

/**
 * Custom hook to handle swipe gestures on touch devices
 * @param {Function} onSwipeLeft - Callback when user swipes left
 * @param {Function} onSwipeRight - Callback when user swipes right
 * @param {boolean} enabled - Whether gestures are enabled (e.g., not when modal is open)
 * @param {number} minSwipeDistance - Minimum distance in pixels to register as swipe (default: 50)
 * @returns {Object} Touch event handlers
 */
export function useSwipeGesture(onSwipeLeft, onSwipeRight, enabled = true, minSwipeDistance = 50) {
  const touchStart = useRef(null);
  const touchStartY = useRef(null);

  const onTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (!enabled) return;
    if (!touchStart.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const distanceX = touchStart.current - touchEndX;
    const distanceY = touchStartY.current - touchEndY;
    
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    // Only swipe if horizontal movement is greater than vertical movement
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      }
      if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    }
    
    touchStart.current = null;
    touchStartY.current = null;
  };

  return {
    onTouchStart,
    onTouchEnd,
  };
}
