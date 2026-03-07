import { useEffect, useState } from 'react';

export default function CarouselTitlePanel({ title = '' }) {
  const [renderedTitle, setRenderedTitle] = useState(title);
  const [phase, setPhase] = useState('is-entered');

  useEffect(() => {
    if (title === renderedTitle) {
      return undefined;
    }

    setPhase('is-leaving');
    const exitTimeout = window.setTimeout(() => {
      setRenderedTitle(title);
      setPhase('is-entering');
    }, 120);

    return () => window.clearTimeout(exitTimeout);
  }, [title, renderedTitle]);

  useEffect(() => {
    if (phase !== 'is-entering') {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      setPhase('is-entered');
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [phase]);

  return (
    <div className="carousel-title-panel desktop-only" aria-live="polite">
      <p className={`carousel-title-text ${phase}`}>{renderedTitle}</p>
    </div>
  );
}
