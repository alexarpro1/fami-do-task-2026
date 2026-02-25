/**
 * SDG – Schach/Dame-Game
 * Zustands-Manager: aktives Spiel, Modus, am Zug, Brett, Level, XP, History
 */
(function (global) {
  const SDG_COORD = global.SDG && global.SDG.coord;
  const SDG_STORAGE = global.SDG && global.SDG.storage;
  if (!SDG_COORD || !SDG_STORAGE) throw new Error('SDG: coord and storage required');

  const ROWS = SDG_COORD.ROWS;

  function createEmptyBoard() {
    const board = {};
    SDG_COORD.allFieldIds().forEach(function (id) {
      board[id] = { id, piece: null };
    });
    return board;
  }

  function getInitialDameBoard() {
    const board = createEmptyBoard();
    for (let c = 0; c < ROWS; c++) {
      if ((0 + c) % 2 === 1) board[SDG_COORD.coordToId(0, c)].piece = { type: 'stein', color: 'schwarz' };
      if ((1 + c) % 2 === 1) board[SDG_COORD.coordToId(1, c)].piece = { type: 'stein', color: 'schwarz' };
      if ((2 + c) % 2 === 1) board[SDG_COORD.coordToId(2, c)].piece = { type: 'stein', color: 'schwarz' };
      if ((5 + c) % 2 === 1) board[SDG_COORD.coordToId(5, c)].piece = { type: 'stein', color: 'weiss' };
      if ((6 + c) % 2 === 1) board[SDG_COORD.coordToId(6, c)].piece = { type: 'stein', color: 'weiss' };
      if ((7 + c) % 2 === 1) board[SDG_COORD.coordToId(7, c)].piece = { type: 'stein', color: 'weiss' };
    }
    return board;
  }

  function getInitialChessBoard() {
    const board = createEmptyBoard();
    const set = function (row, col, piece) {
      const id = SDG_COORD.coordToId(row, col);
      if (id) board[id].piece = piece;
    };
    const black = 'schwarz';
    const white = 'weiss';
    for (let c = 0; c < 8; c++) {
      set(1, c, { type: 'bauer', color: black });
      set(6, c, { type: 'bauer', color: white });
    }
    set(0, 0, { type: 'turm', color: black }); set(0, 7, { type: 'turm', color: black });
    set(0, 1, { type: 'springer', color: black }); set(0, 6, { type: 'springer', color: black });
    set(0, 2, { type: 'laeufer', color: black }); set(0, 5, { type: 'laeufer', color: black });
    set(0, 3, { type: 'dame', color: black }); set(0, 4, { type: 'koenig', color: black });
    set(7, 0, { type: 'turm', color: white }); set(7, 7, { type: 'turm', color: white });
    set(7, 1, { type: 'springer', color: white }); set(7, 6, { type: 'springer', color: white });
    set(7, 2, { type: 'laeufer', color: white }); set(7, 5, { type: 'laeufer', color: white });
    set(7, 3, { type: 'dame', color: white }); set(7, 4, { type: 'koenig', color: white });
    return board;
  }

  const state = {
    activeGame: 'dame',
    gameMode: 'pvai',
    currentPlayer: 'weiss',
    board: null,
    moveHistory: [],
    lastMove: null,
    selectedFieldId: null,
    validTargetIds: [],
    gameOver: null,
    check: false,
    undoStack: [],
    level: 1,
    xp: 0,
    difficulty: 'leicht',
    theme: 'sommer',
    figureType: 'classic',
    chessMeta: { enPassantTarget: null, castlingRights: { weiss: { k: true, q: true }, schwarz: { k: true, q: true } }, halfMoveCount: 0, fullMoveNumber: 1 },
    positionHistory: [],
  };

  function resetGame() {
    state.board = state.activeGame === 'dame' ? getInitialDameBoard() : getInitialChessBoard();
    state.moveHistory = [];
    state.lastMove = null;
    state.selectedFieldId = null;
    state.validTargetIds = [];
    state.gameOver = null;
    state.check = false;
    state.currentPlayer = 'weiss';
    state.undoStack = [];
    if (state.activeGame === 'schach') {
      state.chessMeta = { enPassantTarget: null, castlingRights: { weiss: { k: true, q: true }, schwarz: { k: true, q: true } }, halfMoveCount: 0, fullMoveNumber: 1 };
      state.positionHistory = [];
    }
    loadProgression();
  }

  function pushUndoSnapshot() {
    const s = state;
    if (s.gameMode !== 'pvai') return;
    state.undoStack.push({
      board: JSON.parse(JSON.stringify(s.board)),
      currentPlayer: s.currentPlayer,
      moveHistory: s.moveHistory.slice(),
      lastMove: s.lastMove ? { from: s.lastMove.from, to: s.lastMove.to } : null,
      chessMeta: s.activeGame === 'schach' ? JSON.parse(JSON.stringify(s.chessMeta)) : null,
      positionHistory: (s.positionHistory && s.positionHistory.slice()) || [],
    });
    if (state.undoStack.length > 30) state.undoStack.shift();
  }

  function popUndoSnapshot() {
    const snap = state.undoStack.pop();
    if (!snap) return false;
    state.board = snap.board;
    state.currentPlayer = snap.currentPlayer;
    state.moveHistory = snap.moveHistory;
    state.lastMove = snap.lastMove;
    if (state.activeGame === 'schach' && snap.chessMeta) state.chessMeta = snap.chessMeta;
    if (snap.positionHistory) state.positionHistory = snap.positionHistory;
    state.selectedFieldId = null;
    state.validTargetIds = [];
    state.gameOver = null;
    state.check = state.activeGame === 'schach' ? (global.SDG && global.SDG.gameChess && global.SDG.gameChess.isInCheck(state.board, 'weiss')) : false;
    return true;
  }

  function loadProgression() {
    state.level = SDG_STORAGE.getLevel();
    state.xp = SDG_STORAGE.getXp();
    const settings = SDG_STORAGE.getSettings();
    state.difficulty = settings.difficulty || 'leicht';
    state.theme = settings.theme || 'sommer';
    state.figureType = settings.figureType || 'classic';
  }

  function switchGame(game) {
    if (game !== 'dame' && game !== 'schach') return;
    state.activeGame = game;
    resetGame();
  }

  function getBoard() {
    return state.board;
  }
  function getState() {
    return state;
  }

  loadProgression();
  state.board = state.activeGame === 'dame' ? getInitialDameBoard() : getInitialChessBoard();

  global.SDG = global.SDG || {};
  global.SDG.state = {
    state,
    createEmptyBoard,
    getInitialDameBoard,
    getInitialChessBoard,
    resetGame,
    loadProgression,
    switchGame,
    getBoard,
    getState,
    pushUndoSnapshot,
    popUndoSnapshot,
  };
})(typeof window !== 'undefined' ? window : this);
