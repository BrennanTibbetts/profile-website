import { useEffect, useRef, useState } from 'react';
import { projects } from './projects';
import { renderParagraphsAsNodes } from './utils/renderText';

export default function ViewInfo({ viewIndex, showTitle = true }) {
  const [renderedIndex, setRenderedIndex] = useState(viewIndex);
  const [phase, setPhase] = useState('is-entered');
  const containerRef = useRef(null);
  const project = projects[renderedIndex] || {};

  useEffect(() => {
    if (viewIndex === renderedIndex) {
      return undefined;
    }

    setPhase('is-leaving');
    const exitTimeout = window.setTimeout(() => {
      setRenderedIndex(viewIndex);
      setPhase('is-entering');
    }, 140);

    return () => window.clearTimeout(exitTimeout);
  }, [viewIndex, renderedIndex]);

  useEffect(() => {
    if (phase !== 'is-entering') {
      return undefined;
    }

    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }

    const rafId = window.requestAnimationFrame(() => {
      setPhase('is-entered');
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [phase]);

  return (
    <div ref={containerRef} className="view-info">
      <div className={`view-info-content ${phase}`}>
        {showTitle && project.title && (
          <h3 className="project-title">{project.title}</h3>
        )}
        {renderParagraphsAsNodes(project.description, '', renderedIndex)}
      </div>
    </div>
  );
}
