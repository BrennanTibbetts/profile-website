// The block game behind the "psst" arrow in the intro's corner: pieces of
// four squares drop into a 10 x 18 well and full rows clear. These are the
// rules only; pages/PlayPage.jsx draws the game and reads input.

export const COLS = 10;
export const ROWS = 18;

// Each piece's squares as [x, y] in a size x size box (y down), with a colour
// from the site's palette.
export const PIECES = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: "#e2589b" },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "#34d3b4" },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "#e0a45c" },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: "#7fa3e8" },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "#e8e4d8" },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#a77bff" },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: "#9ad36a" },
};
const PIECE_IDS = Object.keys(PIECES);

const LOCK_DELAY_MS = 500; // a landed piece can still slide for this long...
const MAX_LOCK_RESETS = 15; // ...restarted by each move, up to this many times
const CLEAR_MS = 180; // full rows flash this long before they clear
const ROWS_PER_LEVEL = 10;
// Nudges tried, in order, when a turned piece would overlap something.
const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

/** A piece's squares on the board, turned clockwise `rotation` times. */
export function pieceCells(id, rotation, x = 0, y = 0) {
  const { size, cells } = PIECES[id];
  return cells.map(([cellX, cellY]) => {
    let px = cellX;
    let py = cellY;
    for (let turn = 0; turn < rotation; turn += 1) {
      [px, py] = [size - 1 - py, px];
    }
    return [x + px, y + py];
  });
}

// Pieces fall a row every this many ms, faster each level.
function fallInterval(level) {
  return Math.max(70, 800 * 0.82 ** (level - 1));
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function createGame(random = Math.random) {
  let board = emptyBoard();
  let bag = [];
  let piece = null;
  let clearing = null;
  let fallMs = 0;
  let lockMs = 0;
  let lockResets = 0;

  const game = { status: "ready", score: 0, rows: 0, level: 1, next: null };

  const fits = (cells) =>
    cells.every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || board[y][x] === null));
  const cellsAt = (rotation = piece.rotation, x = piece.x, y = piece.y) => pieceCells(piece.id, rotation, x, y);
  const landed = () => !fits(cellsAt(piece.rotation, piece.x, piece.y + 1));
  const canAct = () => game.status === "playing" && piece !== null && clearing === null;

  // Every run of seven pieces has one of each, shuffled.
  function takePiece() {
    if (bag.length === 0) {
      bag = PIECE_IDS.slice();
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function spawn() {
    const id = game.next;
    game.next = takePiece();
    piece = { id, rotation: 0, x: Math.floor((COLS - PIECES[id].size) / 2), y: id === "I" ? -1 : 0 };
    fallMs = 0;
    lockMs = 0;
    lockResets = 0;
    if (!fits(cellsAt())) {
      game.status = "over";
    }
  }

  function shift(dx, dy) {
    if (!fits(cellsAt(piece.rotation, piece.x + dx, piece.y + dy))) {
      return false;
    }
    piece.x += dx;
    piece.y += dy;
    return true;
  }

  // Moving or turning a landed piece gives it a little longer to slide.
  function extendLock() {
    if (lockMs > 0 && lockResets < MAX_LOCK_RESETS) {
      lockMs = 0;
      lockResets += 1;
    }
  }

  function lock() {
    const cells = cellsAt();
    cells.forEach(([x, y]) => {
      if (y >= 0) {
        board[y][x] = piece.id;
      }
    });
    piece = null;
    if (cells.some(([, y]) => y < 0)) {
      game.status = "over"; // the stack reached the top
      return;
    }
    const full = [];
    board.forEach((row, y) => {
      if (row.every((id) => id !== null)) {
        full.push(y);
      }
    });
    if (full.length > 0) {
      clearing = { rows: full, ms: 0 };
    } else {
      spawn();
    }
  }

  function finishClearing() {
    const count = clearing.rows.length;
    board = board.filter((_, y) => !clearing.rows.includes(y));
    while (board.length < ROWS) {
      board.unshift(Array(COLS).fill(null));
    }
    game.score += count * count * 100 * game.level;
    game.rows += count;
    game.level = 1 + Math.floor(game.rows / ROWS_PER_LEVEL);
    clearing = null;
    spawn();
  }

  game.start = () => {
    board = emptyBoard();
    bag = [];
    clearing = null;
    game.score = 0;
    game.rows = 0;
    game.level = 1;
    game.status = "playing";
    game.next = takePiece();
    spawn();
  };

  game.pause = () => {
    if (game.status === "playing") {
      game.status = "paused";
    }
  };

  game.resume = () => {
    if (game.status === "paused") {
      game.status = "playing";
    }
  };

  /** Returns whether the piece moved (steering stops at walls and stacks). */
  game.move = (dx) => {
    if (canAct() && shift(dx, 0)) {
      extendLock();
      return true;
    }
    return false;
  };

  game.rotate = (direction) => {
    if (!canAct() || piece.id === "O") {
      return;
    }
    const rotation = (piece.rotation + direction + 4) % 4;
    const kick = KICKS.find(([kx, ky]) => fits(cellsAt(rotation, piece.x + kx, piece.y + ky)));
    if (kick) {
      piece.rotation = rotation;
      piece.x += kick[0];
      piece.y += kick[1];
      extendLock();
    }
  };

  game.softDrop = () => {
    if (canAct() && shift(0, 1)) {
      game.score += 1;
      fallMs = 0;
    }
  };

  game.hardDrop = () => {
    if (!canAct()) {
      return;
    }
    let distance = 0;
    while (shift(0, 1)) {
      distance += 1;
    }
    game.score += distance * 2;
    lock();
  };

  game.update = (ms) => {
    if (game.status !== "playing") {
      return;
    }
    if (clearing) {
      clearing.ms += ms;
      if (clearing.ms >= CLEAR_MS) {
        finishClearing();
      }
      return;
    }
    if (landed()) {
      lockMs += ms;
      if (lockMs >= LOCK_DELAY_MS) {
        lock();
      }
      return;
    }
    lockMs = 0;
    fallMs += ms;
    const interval = fallInterval(game.level);
    while (fallMs >= interval) {
      fallMs -= interval;
      if (!shift(0, 1)) {
        fallMs = 0;
        break;
      }
    }
  };

  // What to draw: the settled squares, the falling piece and where it would land.
  game.view = () => {
    let ghost = null;
    if (piece) {
      let drop = 0;
      while (fits(cellsAt(piece.rotation, piece.x, piece.y + drop + 1))) {
        drop += 1;
      }
      ghost = cellsAt(piece.rotation, piece.x, piece.y + drop);
    }
    return {
      board,
      piece: piece ? { id: piece.id, cells: cellsAt() } : null,
      ghost,
      clearing: clearing ? { rows: clearing.rows, progress: clearing.ms / CLEAR_MS } : null,
    };
  };

  return game;
}
