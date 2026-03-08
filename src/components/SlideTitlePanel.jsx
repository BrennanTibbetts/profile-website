import { useEffect, useState } from "react";

export default function SlideTitlePanel({
  title = "",
  className = "",
  onClick,
  disabled = false,
  onLeftButtonClick,
  leftButtonLabel = "×",
  leftButtonAriaLabel = "Back",
}) {
  const [renderedTitle, setRenderedTitle] = useState(title);
  const [phase, setPhase] = useState("is-entered");

  useEffect(() => {
    if (title === renderedTitle) {
      return undefined;
    }

    setPhase("is-leaving");
    const exitTimeout = window.setTimeout(() => {
      setRenderedTitle(title);
      setPhase("is-entering");
    }, 120);

    return () => window.clearTimeout(exitTimeout);
  }, [title, renderedTitle]);

  useEffect(() => {
    if (phase !== "is-entering") {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      setPhase("is-entered");
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [phase]);

  const panelClassName = `slide-title-panel ${className}`.trim();
  const isInteractive = typeof onClick === "function";
  const hasLeftButton = typeof onLeftButtonClick === "function";
  const containerClassName = `${panelClassName}${
    isInteractive || hasLeftButton ? " slide-title-container-interactive" : ""
  }${hasLeftButton ? " has-left-button" : ""}`;

  return (
    <div className={containerClassName} aria-live="polite">
      {hasLeftButton ? (
        <button
          type="button"
          className="slide-title-left-btn"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onLeftButtonClick?.();
          }}
          aria-label={leftButtonAriaLabel}
          title={leftButtonAriaLabel}
        >
          {leftButtonLabel}
        </button>
      ) : null}
      {isInteractive ? (
        <button
          type="button"
          className="slide-title-main-btn"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (!disabled) {
              onClick?.();
            }
          }}
          disabled={disabled}
          aria-label={`Open details for ${renderedTitle}`}
        >
          <p className={`slide-title-text ${phase}`}>{renderedTitle}</p>
        </button>
      ) : (
        <p className={`slide-title-text ${phase}`}>{renderedTitle}</p>
      )}
    </div>
  );
}
