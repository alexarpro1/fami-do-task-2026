/**
 * SDG – Schach/Dame-Game
 * KI: Stufe 1 (Zufall), Stufe 2 (Material), Stufe 3 (Minimax)
 */
(function (global) {
  const SDG_STATE = global.SDG && global.SDG.state;
  const SDG_GAME_DAME = global.SDG && global.SDG.gameDame;
  const SDG_GAME_CHESS = global.SDG && global.SDG.gameChess;
  if (!SDG_STATE) return;

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getDameMoves() {
    const state = SDG_STATE.getState();
    const board = state.board;
    const all = SDG_GAME_DAME.getValidMoves(board, 'schwarz');
    if (all.mustCapture) return all.captures;
    return all.simple;
  }

  function getChessMoves() {
    const state = SDG_STATE.getState();
    return SDG_GAME_CHESS.getValidMoves(state.board, 'schwarz', state.chessMeta);
  }

  function applyDameMove(move) {
    const state = SDG_STATE.getState();
    state.board = SDG_GAME_DAME.applyMove(state.board, move, 'schwarz');
    state.lastMove = { from: move.from, to: move.to };
    state.moveHistory.push({ from: move.from, to: move.to, captured: move.captured, notation: move.from + '-' + move.to });
    state.currentPlayer = 'weiss';
    state.selectedFieldId = null;
    state.validTargetIds = [];
  }

  function applyChessMove(move) {
    const state = SDG_STATE.getState();
    const result = SDG_GAME_CHESS.applyChessMove(state.board, move, 'schwarz', state.chessMeta);
    state.board = result.board;
    state.chessMeta = result.newMeta;
    state.lastMove = { from: move.from, to: move.to };
    state.moveHistory.push({ from: move.from, to: move.to, notation: move.from + '-' + move.to });
    state.positionHistory = state.positionHistory || [];
    if (SDG_GAME_CHESS.boardHash) state.positionHistory.push(SDG_GAME_CHESS.boardHash(state.board));
    state.check = SDG_GAME_CHESS.isInCheck(state.board, 'weiss');
    state.currentPlayer = 'weiss';
    state.selectedFieldId = null;
    state.validTargetIds = [];
    var drawReason = SDG_GAME_CHESS.getDrawReason && SDG_GAME_CHESS.getDrawReason(state.board, state.chessMeta, state.positionHistory);
    if (drawReason) state.gameOver = drawReason;
    else if (SDG_GAME_CHESS.isCheckmate(state.board, 'weiss', state.chessMeta)) state.gameOver = 'blackWins';
    else if (SDG_GAME_CHESS.isStalemate(state.board, 'weiss', state.chessMeta)) state.gameOver = 'stalemate';
  }

  function makeMove() {
    const state = SDG_STATE.getState();
    if (state.currentPlayer !== 'schwarz' || state.gameOver) return;
    if (state.activeGame === 'dame') {
      const moves = getDameMoves();
      if (moves.length === 0) {
        state.gameOver = 'whiteWins';
        if (window.SDG && window.SDG.awardXPAndSave) window.SDG.awardXPAndSave();
        if (global.SDG && global.SDG.board && global.SDG.board.renderFromState) {
      var el = document.querySelector('.sdg-board');
      if (el) global.SDG.board.renderFromState(el);
    }
    if (window.SDG && window.SDG.updateFooter) window.SDG.updateFooter();
        if (window.SDG && window.SDG.showGameOver) window.SDG.showGameOver();
        return;
      }
      const move = randomChoice(moves);
      applyDameMove(move);
    } else {
      const moves = getChessMoves();
      if (moves.length === 0) {
        if (state.check) state.gameOver = 'whiteWins';
        else state.gameOver = 'stalemate';
        if (state.gameOver === 'whiteWins' && window.SDG && window.SDG.awardXPAndSave) window.SDG.awardXPAndSave();
        if (global.SDG && global.SDG.board && global.SDG.board.renderFromState) {
          var el2 = document.querySelector('.sdg-board');
          if (el2) global.SDG.board.renderFromState(el2);
        }
        if (window.SDG && window.SDG.updateFooter) window.SDG.updateFooter();
        if (window.SDG && window.SDG.showGameOver) window.SDG.showGameOver();
        return;
      }
      const move = randomChoice(moves);
      applyChessMove(move);
    }
    var boardEl = document.querySelector('.sdg-board');
    if (boardEl && global.SDG && global.SDG.board && global.SDG.board.renderFromState) global.SDG.board.renderFromState(boardEl);
    if (window.SDG && window.SDG.updateFooter) window.SDG.updateFooter();
    var st = SDG_STATE.getState();
    if (st.gameOver && window.SDG && window.SDG.showGameOver) window.SDG.showGameOver();
  }

  global.SDG = global.SDG || {};
  global.SDG.ai = { makeMove };
})(typeof window !== 'undefined' ? window : this);
