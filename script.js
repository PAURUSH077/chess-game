// Select DOM elements
const boardElement = document.getElementById("chessboard");
const turnDisplay = document.getElementById("turn");
const difficultySelect = document.getElementById("difficulty");
const moveSound = document.getElementById("moveSound");
const captureSound = document.getElementById("captureSound");
const checkSound = document.getElementById("checkSound");

// Unicode symbols
const PIECES = {
  wP: "♙", wR: "♖", wN: "♘", wB: "♗", wQ: "♕", wK: "♔",
  bP: "♟", bR: "♜", bN: "♞", bB: "♝", bQ: "♛", bK: "♚"
};

// Game state
let board = [];
let selected = null;
let currentPlayer = "white";
let history = [];
let botLevel = "medium";

function initBoard() {
  board = [
    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]
  ];
  selected = null;
  currentPlayer = "white";
  history = [];
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement("div");
      cell.className = "cell " + ((r + c) % 2 === 0 ? "white" : "black");
      cell.dataset.row = r;
      cell.dataset.col = c;
      const piece = board[r][c];
      if (piece) cell.textContent = PIECES[piece];
      if (selected && selected.row == r && selected.col == c)
        cell.classList.add("highlight");
      cell.addEventListener("click", handleClick);
      boardElement.appendChild(cell);
    }
  }
  turnDisplay.textContent = `Turn: ${currentPlayer}`;
}

function handleClick(e) {
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  const piece = board[row][col];
  if (selected) {
    if (tryMove(selected.row, selected.col, row, col)) {
      selected = null;
      renderBoard();
      if (isCheck(getOpponent(currentPlayer))) {
        checkSound.play();
        if (isCheckmate(getOpponent(currentPlayer))) {
          alert(`${currentPlayer} wins by checkmate!`);
          return;
        }
      }
      currentPlayer = getOpponent(currentPlayer);
      renderBoard();
      if (currentPlayer === "black") setTimeout(botMove, 300);
    } else {
      selected = null;
      renderBoard();
    }
  } else if (piece && piece.startsWith(currentPlayer[0])) {
    selected = { row, col };
    renderBoard();
  }
}

function getOpponent(color) {
  return color === "white" ? "black" : "white";
}

function tryMove(sr, sc, dr, dc) {
  const piece = board[sr][sc];
  const target = board[dr][dc];
  if (!isLegalMove(sr, sc, dr, dc)) return false;

  const snapshot = JSON.parse(JSON.stringify(board));
  const capture = board[dr][dc];
  board[dr][dc] = piece;
  board[sr][sc] = "";

  if (isCheck(currentPlayer)) {
    board = snapshot;
    return false;
  }

  history.push(snapshot);
  if (capture) captureSound.play(); else moveSound.play();
  return true;
}

// Simplified logic placeholders
function isLegalMove(sr, sc, dr, dc) {
  const piece = board[sr][sc];
  const dx = dc - sc;
  const dy = dr - sr;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const dest = board[dr][dc];
  const isWhite = piece[0] === "w";

  // Prevent capture own piece
  if (dest && dest[0] === piece[0]) return false;

  switch (piece[1]) {
    case "P":
      const dir = isWhite ? -1 : 1;
      if (dx === 0 && dy === dir && !dest) return true;
      if (dx === 0 && dy === 2 * dir && sr === (isWhite ? 6 : 1) && !dest && !board[sr + dir][sc]) return true;
      if (absDx === 1 && dy === dir && dest) return true;
      break;
    case "R":
      if (sr === dr || sc === dc) return pathClear(sr, sc, dr, dc);
      break;
    case "N":
      if ((absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2)) return true;
      break;
    case "B":
      if (absDx === absDy) return pathClear(sr, sc, dr, dc);
      break;
    case "Q":
      if ((sr === dr || sc === dc || absDx === absDy)) return pathClear(sr, sc, dr, dc);
      break;
    case "K":
      if (absDx <= 1 && absDy <= 1) return true;
      // castling basic
      if (!isCheck(currentPlayer) && dy === 0 && absDx === 2) {
        return canCastle(piece, sr, sc, dr, dc);
      }
      break;
  }
  return false;
}

function pathClear(sr, sc, dr, dc) {
  const stepR = Math.sign(dr - sr);
  const stepC = Math.sign(dc - sc);
  let r = sr + stepR;
  let c = sc + stepC;
  while (r !== dr || c !== dc) {
    if (board[r][c]) return false;
    r += stepR;
    c += stepC;
  }
  return true;
}

function canCastle(piece, sr, sc, dr, dc) {
  if (piece !== (piece[0] + "K")) return false;
  if (board[dr][dc]) return false;
  const isWhite = piece[0] === "w";
  const row = isWhite ? 7 : 0;

  if (dc === 6 && board[row][7] === piece[0] + "R") {
    return board[row][5] === "" && board[row][6] === "";
  }
  if (dc === 2 && board[row][0] === piece[0] + "R") {
    return board[row][1] === "" && board[row][2] === "" && board[row][3] === "";
  }
  return false;
}

function isCheck(color) {
  // Simple: locate king, see if opponent can attack it
  let kingPos;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color[0] + "K") kingPos = { r, c };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c][0] !== color[0]) {
        if (isLegalMove(r, c, kingPos.r, kingPos.c)) return true;
      }
    }
  }
  return false;
}

function isCheckmate(color) {
  for (let sr = 0; sr < 8; sr++) {
    for (let sc = 0; sc < 8; sc++) {
      if (board[sr][sc] && board[sr][sc][0] === color[0]) {
        for (let dr = 0; dr < 8; dr++) {
          for (let dc = 0; dc < 8; dc++) {
            const snapshot = JSON.parse(JSON.stringify(board));
            if (isLegalMove(sr, sc, dr, dc)) {
              board[dr][dc] = board[sr][sc];
              board[sr][sc] = "";
              const safe = !isCheck(color);
              board = snapshot;
              if (safe) return false;
            }
          }
        }
      }
    }
  }
  return true;
}

function undoMove() {
  if (history.length > 0) {
    board = history.pop();
    currentPlayer = getOpponent(currentPlayer);
    renderBoard();
  }
}

function resetGame() {
  botLevel = difficultySelect.value;
  initBoard();
}

// BOT
function botMove() {
  const allMoves = [];
  for (let sr = 0; sr < 8; sr++) {
    for (let sc = 0; sc < 8; sc++) {
      const piece = board[sr][sc];
      if (piece && piece.startsWith("b")) {
        for (let dr = 0; dr < 8; dr++) {
          for (let dc = 0; dc < 8; dc++) {
            const snapshot = JSON.parse(JSON.stringify(board));
            if (isLegalMove(sr, sc, dr, dc)) {
              const target = board[dr][dc];
              board[dr][dc] = piece;
              board[sr][sc] = "";
              if (!isCheck("black")) {
                const score = evaluateBoard();
                allMoves.push({ sr, sc, dr, dc, score });
              }
              board = snapshot;
            }
          }
        }
      }
    }
  }

  if (allMoves.length === 0) {
    alert("Game over! Stalemate.");
    return;
  }

  let best;
  if (botLevel === "easy") best = allMoves[Math.floor(Math.random() * allMoves.length)];
  else if (botLevel === "medium") best = allMoves.sort((a, b) => b.score - a.score)[0];
  else best = allMoves.reduce((a, b) => a.score > b.score ? a : b);

  tryMove(best.sr, best.sc, best.dr, best.dc);
  currentPlayer = "white";
  renderBoard();
}

function evaluateBoard() {
  const scoreMap = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 1000 };
  let score = 0;
  for (let row of board) {
    for (let cell of row) {
      if (!cell) continue;
      const value = scoreMap[cell[1]] || 0;
      score += cell[0] === "b" ? value : -value;
    }
  }
  return score;
}

// Start
resetGame();
