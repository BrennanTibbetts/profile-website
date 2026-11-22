import { useCallback, useEffect, useRef, useState } from "react";
import { COLS, PIECES, ROWS, createGame, pieceCells } from "../play/blocks";
import "../styles/pages/play.css";

// The block game behind the "psst" arrow in the intro's corner (rules in
// play/blocks.js). Loaded only when /play is opened.

// For held moves: [ms before repeating, ms between repeats].
const REPEAT = { left: [170, 50], right: [170, 50], down: [60, 40] };

const KEY_ACTIONS = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowUp: "rotate",
  KeyX: "rotate",
  KeyZ: "rotateBack",
  Space: "drop",
  Enter: "start",
};

// Pointer gestures. A tap turns the piece; on touch screens a quick downward
// swipe drops it (with a mouse, space does).
const TAP_SLOP_PX = 10;
const SWIPE_WINDOW_MS = 160;
const DROP_PATH = "M5 5l7 7 7-7M5 12l7 7 7-7";

const PIECE_RGB = Object.fromEntries(
  Object.entries(PIECES).map(([id, { color }]) => {
    const value = Number.parseInt(color.slice(1), 16);
    return [id, [(value >> 16) & 255, (value >> 8) & 255, value & 255]];
  })
);

function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function repeatsBy(ms, [delay, every]) {
  return ms < delay ? 0 : Math.floor((ms - delay) / every) + 1;
}

function roundedSquare(ctx, x, y, size, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
}

// One square, drawn like the site's tech chips: a tinted fill with a bright edge.
function drawSquare(ctx, col, row, cell, id, { ghost = false, flash = 0 } = {}) {
  const [r, g, b] = PIECE_RGB[id];
  const inset = Math.max(1, cell * 0.07);
  const size = cell - inset * 2;
  if (size <= 1) {
    return; // the canvas is mid-resize
  }
  roundedSquare(ctx, col * cell + inset, row * cell + inset, size, size * 0.26);
  ctx.lineWidth = Math.max(1, cell * 0.05);
  if (ghost) {
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.32)`;
    ctx.stroke();
    return;
  }
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.24 + 0.76 * flash})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
  ctx.stroke();
}

function drawWell(canvas, view) {
  const ctx = canvas.getContext("2d");
  const cell = Math.min(canvas.width / COLS, canvas.height / ROWS);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // A faint dot at each grid corner.
  const dot = Math.max(1, cell * 0.06);
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  for (let y = 1; y < ROWS; y += 1) {
    for (let x = 1; x < COLS; x += 1) {
      ctx.fillRect(x * cell - dot / 2, y * cell - dot / 2, dot, dot);
    }
  }

  // Full rows light up before they clear.
  const flashRows = view.clearing ? new Set(view.clearing.rows) : null;
  const flash = view.clearing ? Math.min(1, view.clearing.progress * 2) : 0;
  view.board.forEach((row, y) => {
    row.forEach((id, x) => {
      if (id) {
        drawSquare(ctx, x, y, cell, id, { flash: flashRows?.has(y) ? flash : 0 });
      }
    });
  });

  if (view.piece) {
    view.ghost.forEach(([x, y]) => y >= 0 && drawSquare(ctx, x, y, cell, view.piece.id, { ghost: true }));
    view.piece.cells.forEach(([x, y]) => y >= 0 && drawSquare(ctx, x, y, cell, view.piece.id));
  }
}

function drawNext(canvas, id) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!id) {
    return;
  }
  const cells = pieceCells(id, 0);
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const cell = Math.min(canvas.width / 4.5, canvas.height / 2.5);
  const offsetX = (canvas.width / cell - (Math.max(...xs) - Math.min(...xs) + 1)) / 2 - Math.min(...xs);
  const offsetY = (canvas.height / cell - (Math.max(...ys) - Math.min(...ys) + 1)) / 2 - Math.min(...ys);
  ctx.save();
  ctx.translate(offsetX * cell, offsetY * cell);
  cells.forEach(([x, y]) => drawSquare(ctx, x, y, cell, id));
  ctx.restore();
}

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function PlayPage({ navigate }) {
  const pageRef = useRef(null);
  const wellRef = useRef(null);
  const nextRef = useRef(null);
  const gameRef = useRef(null);
  const heldRef = useRef(new Map());
  // Where the mouse points, in columns across the well (null: not steering).
  const aimRef = useRef(null);
  const [status, setStatus] = useState("playing");

  if (gameRef.current === null) {
    gameRef.current = createGame();
    gameRef.current.start();
  }

  const press = useCallback((action) => {
    const game = gameRef.current;
    if (game.status !== "playing") {
      if (action === "start" || action === "drop") {
        if (game.status === "paused") {
          game.resume();
        } else {
          game.start();
        }
      }
      return;
    }
    if (action === "left") {
      game.move(-1);
    } else if (action === "right") {
      game.move(1);
    } else if (action === "down") {
      game.softDrop();
    } else if (action === "rotate") {
      game.rotate(1);
    } else if (action === "rotateBack") {
      game.rotate(-1);
    } else if (action === "drop") {
      game.hardDrop();
    }
    if (REPEAT[action]) {
      // The newest direction wins.
      heldRef.current.delete(action === "left" ? "right" : action === "right" ? "left" : "");
      heldRef.current.set(action, 0);
    }
  }, []);

  const release = useCallback((action) => {
    heldRef.current.delete(action);
  }, []);

  // Keyboard, and pausing when the player leaves the tab or window.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      // Enter and Space still work on the page's own links and buttons.
      if ((event.code === "Enter" || event.code === "Space") && event.target.closest?.("a, button")) {
        return;
      }
      event.preventDefault();
      aimRef.current = null; // the keys take over from the mouse
      if (!event.repeat) {
        press(action);
      }
    };
    const handleKeyUp = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (action) {
        release(action);
      }
    };
    const handleAway = () => {
      heldRef.current.clear();
      gameRef.current.pause();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        handleAway();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleAway);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleAway);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [press, release]);

  // Mouse and touch, anywhere on the page:
  //  - mouse: the piece follows the pointer across the well; click to turn
  //    (space drops it);
  //  - touch: drag sideways to move it a column at a time; tap to turn;
  //    swipe down quickly to drop it.
  useEffect(() => {
    const page = pageRef.current;
    let gesture = null;

    const cellWidth = () => wellRef.current.getBoundingClientRect().width / COLS;
    const aimAt = (clientX) => {
      const rect = wellRef.current.getBoundingClientRect();
      aimRef.current = ((clientX - rect.left) / rect.width) * COLS;
    };
    const onControl = (event) => Boolean(event.target.closest?.("a, button"));

    const handleDown = (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0) || onControl(event)) {
        return;
      }
      if (event.pointerType === "mouse") {
        aimAt(event.clientX);
      } else {
        aimRef.current = null;
      }
      gesture = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        anchorX: event.clientX,
        travel: 0,
        dropped: false,
        points: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
      };
    };

    const handleMove = (event) => {
      if (event.pointerType === "mouse") {
        aimAt(event.clientX);
      }
      if (!gesture || event.pointerId !== gesture.id) {
        return;
      }
      const game = gameRef.current;
      gesture.travel = Math.max(gesture.travel, Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY));

      // Touch: a column per cell's width of drag.
      if (event.pointerType !== "mouse" && !gesture.dropped) {
        const step = cellWidth() * 0.9;
        while (Math.abs(event.clientX - gesture.anchorX) >= step) {
          const direction = Math.sign(event.clientX - gesture.anchorX);
          gesture.anchorX += direction * step;
          game.move(direction);
        }
      }

      if (event.pointerType === "mouse") {
        return;
      }

      // A quick, mostly downward swipe drops the piece (once per gesture).
      const points = gesture.points;
      points.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
      while (points.length > 2 && event.timeStamp - points[0].t > SWIPE_WINDOW_MS) {
        points.shift();
      }
      const dy = event.clientY - points[0].y;
      const dx = event.clientX - points[0].x;
      if (!gesture.dropped && dy > Math.max(28, cellWidth()) && dy > Math.abs(dx) * 1.5) {
        gesture.dropped = true;
        press("drop");
      }
    };

    const handleUp = (event) => {
      if (!gesture || event.pointerId !== gesture.id) {
        return;
      }
      const game = gameRef.current;
      if (!gesture.dropped && gesture.travel < TAP_SLOP_PX) {
        if (game.status === "paused") {
          game.resume();
        } else {
          press("rotate");
        }
      }
      gesture = null;
    };

    const handleCancel = () => {
      gesture = null;
    };

    page.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      page.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [press]);

  // Canvas sizes and the game loop.
  useEffect(() => {
    const canvases = [wellRef.current, nextRef.current];
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvases.forEach((canvas) => {
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    canvases.forEach((canvas) => observer.observe(canvas));

    // Slide the piece toward the column under the mouse, as far as it fits.
    const steer = (game) => {
      const piece = game.view().piece;
      if (aimRef.current === null || !piece) {
        return;
      }
      const xs = piece.cells.map(([x]) => x);
      const centre = (Math.min(...xs) + Math.max(...xs) + 1) / 2;
      const shift = Math.round(aimRef.current - centre);
      for (let i = 0; i < Math.abs(shift); i += 1) {
        if (!game.move(Math.sign(shift))) {
          break;
        }
      }
    };

    let frame = 0;
    let last = performance.now();
    let shownStatus = "playing";
    const loop = (now) => {
      const ms = Math.min(now - last, 100);
      last = now;
      const game = gameRef.current;
      heldRef.current.forEach((heldMs, action) => {
        const total = heldMs + ms;
        heldRef.current.set(action, total);
        const due = repeatsBy(total, REPEAT[action]) - repeatsBy(heldMs, REPEAT[action]);
        for (let i = 0; i < due; i += 1) {
          if (action === "left") {
            game.move(-1);
          } else if (action === "right") {
            game.move(1);
          } else {
            game.softDrop();
          }
        }
      });
      if (game.status === "playing") {
        steer(game);
      }
      game.update(ms);
      drawWell(wellRef.current, game.view());
      drawNext(nextRef.current, game.next);
      if (game.status !== shownStatus) {
        shownStatus = game.status;
        setStatus(game.status);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Blocks · Brennan Tibbetts";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  let overlay = null;
  if (status === "paused") {
    overlay = (
      <>
        <p className="play-overlay-title">Paused</p>
        <button type="button" className="play-button" onClick={() => press("start")}>
          Keep playing
        </button>
      </>
    );
  } else if (status === "over") {
    overlay = (
      <>
        <p className="play-overlay-title">Game over</p>
        <button type="button" className="play-button" onClick={() => press("start")}>
          Play again
        </button>
      </>
    );
  }

  return (
    <div ref={pageRef} className="play-page">
      <header className="play-header">
        <a
          className="play-chip"
          href="/"
          onClick={(event) => {
            if (isPlainClick(event)) {
              event.preventDefault();
              navigate("/");
            }
          }}
        >
          <Icon path="M15 5l-7 7 7 7" />
          Back to the site
        </a>
      </header>

      <main className="play-main">
        <h1 className="play-hidden-title">Blocks</h1>

        <div className="play-board">
          <div className="play-well">
            <canvas ref={wellRef} role="img" aria-label="Game board" />
            {overlay ? <div className="play-overlay">{overlay}</div> : null}
          </div>

          <div className="play-next">
            <p className="play-label">Next</p>
            <canvas ref={nextRef} aria-hidden="true" />
          </div>

          <button
            type="button"
            className="play-drop"
            tabIndex={-1}
            onPointerDown={(event) => {
              event.preventDefault();
              aimRef.current = event.pointerType === "mouse" ? aimRef.current : null;
              press("drop");
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <Icon path={DROP_PATH} />
            Drop
          </button>
        </div>

        <p className="play-hint play-hint-mouse">Move the mouse to steer, click to turn, press space to drop. Arrow keys work too.</p>
        <p className="play-hint play-hint-touch">Drag to move, tap to turn, swipe down to drop.</p>
      </main>
    </div>
  );
}
