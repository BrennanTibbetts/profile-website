import { useEffect, useMemo, useRef, useState } from "react";
import { projects } from "../projects";
import { renderInlineText, renderParagraphsAsNodes } from "../utils/renderText";

function getParagraphs(text = "") {
  return String(text)
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export default function MobileInfoPanel({
  viewIndex = 0,
  isOpen = false,
  onOpen,
  onClose,
}) {
  const [renderedIndex, setRenderedIndex] = useState(viewIndex);
  const [phase, setPhase] = useState("is-entered");
  const sheetBodyRef = useRef(null);
  const project = projects[renderedIndex] || {};
  const previewParagraph = useMemo(() => getParagraphs(project.description)[0] ?? "", [project.description]);

  useEffect(() => {
    if (viewIndex === renderedIndex) {
      return undefined;
    }

    setPhase("is-leaving");
    const timeoutId = window.setTimeout(() => {
      setRenderedIndex(viewIndex);
      setPhase("is-entering");
    }, 140);

    return () => window.clearTimeout(timeoutId);
  }, [viewIndex, renderedIndex]);

  useEffect(() => {
    if (phase !== "is-entering") {
      return undefined;
    }

    if (sheetBodyRef.current) {
      sheetBodyRef.current.scrollTop = 0;
    }

    const rafId = window.requestAnimationFrame(() => {
      setPhase("is-entered");
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [phase]);

  const handleExpand = () => {
    onOpen?.();
  };

  return (
    <div className="mobile-info-dock">
      <button
        type="button"
        className={`mobile-info-peek ${isOpen ? "is-open" : ""}`}
        onClick={handleExpand}
        aria-expanded={isOpen}
        aria-label={`Expand details for ${project.title ?? "this slide"}`}
      >
        <div className={`mobile-info-peek-body view-info-content ${phase}`}>
          <p className="mobile-info-preview-paragraph">{renderInlineText(previewParagraph, `peek-${renderedIndex}`)}</p>
        </div>
        <div className="mobile-info-peek-hint" aria-hidden="true">
          <span className="mobile-info-peek-hint-label">Tap to read more</span>
          <span className="mobile-info-peek-hint-arrow">›</span>
        </div>
      </button>

      <div
        className={`mobile-info-sheet ${isOpen ? "is-open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose?.();
          }
        }}
      >
        <div className="mobile-info-sheet-panel">
          <div ref={sheetBodyRef} className="mobile-info-body">
            <div className={`view-info-content ${phase}`}>
              {renderParagraphsAsNodes(project.description, "", renderedIndex)}
            </div>
          </div>
        </div>
        <div className="mobile-info-sheet-footer">
          <button type="button" className="mobile-info-back-btn" onClick={() => onClose?.()}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
