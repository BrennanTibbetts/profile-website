import { useState, useEffect } from 'react';
import { projects } from '../projects';

const SLIDE_QUERY_KEY = 'slide';
const TOTAL_SLIDES = Math.max(projects.length, 1);

function clampSlideIndex(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const maxIndex = Math.max(projects.length - 1, 0);
  const normalized = Math.trunc(value);
  if (normalized < 0) {
    return 0;
  }

  if (normalized > maxIndex) {
    return maxIndex;
  }

  return normalized;
}

function wrapSlideIndex(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.trunc(value) % TOTAL_SLIDES;
  return normalized < 0 ? normalized + TOTAL_SLIDES : normalized;
}

function getInitialSlideIndex() {
  if (typeof window === 'undefined') {
    return 0;
  }

  const rawValue = new URLSearchParams(window.location.search).get(SLIDE_QUERY_KEY);
  if (rawValue == null) {
    return 0;
  }

  return clampSlideIndex(Number.parseInt(rawValue, 10));
}

/**
 * Custom hook to manage view/slide state and related UI states
 * @returns {Object} View state and handlers
 */
export function useViewState() {
  const [viewIndex, setViewIndex] = useState(() => clampSlideIndex(getInitialSlideIndex()));
  const [showLeva, setShowLeva] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [clickedViews, setClickedViews] = useState(new Set());

  const prev = () => {
    setViewIndex((index) => wrapSlideIndex(index - 1));
    setHasSwiped(true);
  };

  const next = () => {
    setViewIndex((index) => wrapSlideIndex(index + 1));
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.location.pathname.startsWith('/portfolio')) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const currentRaw = searchParams.get(SLIDE_QUERY_KEY);
    const currentValue = currentRaw == null ? null : Number.parseInt(currentRaw, 10);

    if (viewIndex === 0) {
      if (currentRaw == null) {
        return;
      }

      searchParams.delete(SLIDE_QUERY_KEY);
    } else if (currentValue === viewIndex) {
      return;
    } else {
      searchParams.set(SLIDE_QUERY_KEY, String(viewIndex));
    }

    const nextSearch = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [viewIndex]);

  return {
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
  };
}
