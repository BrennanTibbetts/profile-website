import { useState, useEffect } from 'react';
import { projects } from '../projects';

/**
 * Custom hook to manage view/slide state and related UI states
 * @returns {Object} View state and handlers
 */
export function useViewState() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showLeva, setShowLeva] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [clickedViews, setClickedViews] = useState(new Set());

  const viewIndex = ((slideIndex % projects.length) + projects.length) % projects.length;

  const prev = () => {
    setSlideIndex((s) => s - 1);
    setHasSwiped(true);
  };

  const next = () => {
    setSlideIndex((s) => s + 1);
    setHasSwiped(true);
  };

  const markViewAsClicked = (index) => {
    setClickedViews(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const toggleLeva = () => setShowLeva((s) => !s);

  // Keyboard shortcut for Leva controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        toggleLeva();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
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
    setHasSwiped,
    clickedViews,
    markViewAsClicked,
  };
}
