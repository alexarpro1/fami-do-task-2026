/**
 * SDG – Schach/Dame-Game
 * Brett aus 64 Feldern, rendert aus State, leitet Klicks/Drag weiter
 */
(function (global) {
  const SDG_COORD = global.SDG && global.SDG.coord;
  const SDG_STATE = global.SDG && global.SDG.state;
  const SDG_GAME_DAME = global.SDG && global.SDG.gameDame;
  const SDG_GAME_CHESS = global.SDG && global.SDG.gameChess;
  const SDG_I18N = global.SDG && global.SDG.i18n;
  if (!SDG_COORD || !SDG_STATE) throw new Error('SDG: coord and state required');

  const t = SDG_I18N ? SDG_I18N.t.bind(SDG_I18N) : function (p) { return p; };

  const UNICODE_DAME = { weiss: '○', schwarz: '●' };
  const UNICODE_CHESS = {
    koenig: { weiss: '♔', schwarz: '♚' },
    dame: { weiss: '♕', schwarz: '♛' },
    turm: { weiss: '♖', schwarz: '♜' },
    laeufer: { weiss: '♗', schwarz: '♝' },
    springer: { weiss: '♘', schwarz: '♞' },
    bauer: { weiss: '♙', schwarz: '♟' },
  };

  function getPieceSymbol(piece, game) {
    if (!piece) return '';
    if (game === 'dame') {
      return piece.type === 'dame' ? '◎' : UNICODE_DAME[piece.color];
    }
    const set = UNICODE_CHESS[piece.type];
    return set ? set[piece.color] : '';
  }

  function buildBoard(container) {
    container.innerHTML = '';
    const boardEl = document.createElement('div');
    boardEl.id = 'sdg-board';
    boardEl.className = 'sdg-board';
    boardEl.setAttribute('role', 'grid');
    const ids = SDG_COORD.allFieldIds();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const coord = SDG_COORD.idToCoord(id);
      const light = SDG_COORD.isLightSquare(coord.row, coord.col);
      const cell = document.createElement('div');
      cell.className = 'sdg-cell ' + (light ? 'sdg-light' : 'sdg-dark');
      cell.dataset.fieldId = id;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '0');
      boardEl.appendChild(cell);
    }
    container.appendChild(boardEl);
    return boardEl;
  }

  function renderFromState(boardEl) {
    const state = SDG_STATE.getState();
    const board = state.board;
    const game = state.activeGame;
    const currentPlayer = state.currentPlayer;
    const selectedId = state.selectedFieldId;
    const validTargets = state.validTargetIds || [];
    const lastMove = state.lastMove;
    const check = state.check;
    const figureClass = state.figureType || 'classic';

    const ids = SDG_COORD.allFieldIds();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const cell = boardEl.querySelector('[data-field-id="' + id + '"]');
      if (!cell) continue;
      const cellState = board[id];
      const piece = cellState && cellState.piece;

      cell.classList.remove('sdg-selected', 'sdg-valid', 'sdg-last-from', 'sdg-last-to', 'sdg-check');
      if (selectedId === id) cell.classList.add('sdg-selected');
      if (validTargets.indexOf(id) !== -1) cell.classList.add('sdg-valid');
      if (lastMove && lastMove.from === id) cell.classList.add('sdg-last-from');
      if (lastMove && lastMove.to === id) cell.classList.add('sdg-last-to');

      const kingId = game === 'schach' && SDG_GAME_CHESS ? SDG_GAME_CHESS.findKing(board, currentPlayer) : null;
      if (check && kingId === id) cell.classList.add('sdg-check');

      let pieceHtml = '';
      if (piece) {
        const sym = getPieceSymbol(piece, game);
        const colorClass = piece.color === 'weiss' ? 'sdg-white' : 'sdg-black';
        const typeClass = 'sdg-' + piece.type;
        if (figureClass === 'classic') {
          pieceHtml = '<span class="sdg-piece ' + colorClass + ' ' + typeClass + '">' + sym + '</span>';
        } else {
          pieceHtml = '<span class="sdg-piece ' + colorClass + ' ' + typeClass + '">' + (sym || '') + '</span>';
        }
      }
      cell.innerHTML = pieceHtml;
    }

    const root = document.getElementById('sdg-root');
    if (root) {
      root.classList.remove('theme-sommer', 'theme-wald', 'theme-abend');
      root.classList.add('theme-' + (state.theme || 'sommer'));
      root.classList.remove('sdg-figure-classic', 'sdg-figure-modern', 'sdg-figure-nature');
      root.classList.add('sdg-figure-' + figureClass);
    }
  }

  function getValidTargets(fieldId) {
    const state = SDG_STATE.getState();
    const board = state.board;
    const game = state.activeGame;
    const currentPlayer = state.currentPlayer;
    if (game === 'dame' && SDG_GAME_DAME) {
      return SDG_GAME_DAME.getValidTargetsForField(board, fieldId, currentPlayer);
    }
    if (game === 'schach' && SDG_GAME_CHESS) {
      return SDG_GAME_CHESS.getValidTargetsForField(board, fieldId, currentPlayer, state.chessMeta);
    }
    return [];
  }

  function onCellClick(fieldId, boardEl) {
    const state = SDG_STATE.getState();
    if (state.gameOver) return;
    if (state.gameMode === 'pvai' && state.currentPlayer === 'schwarz') return;

    const selectedId = state.selectedFieldId;
    const validTargets = state.validTargetIds || [];

    if (validTargets.indexOf(fieldId) !== -1 && selectedId) {
      window.SDG && window.SDG.onMove && window.SDG.onMove(selectedId, fieldId);
      return;
    }

    const targets = getValidTargets(fieldId);
    state.selectedFieldId = targets.length > 0 ? fieldId : null;
    state.validTargetIds = targets;
    renderFromState(boardEl);
  }

  function setupDragDrop(boardEl) {
    let dragId = null;
    boardEl.addEventListener('dragstart', function (e) {
      const cell = e.target.closest('.sdg-cell');
      if (!cell || !cell.dataset.fieldId) return;
      const id = cell.dataset.fieldId;
      const state = SDG_STATE.getState();
      const piece = state.board[id] && state.board[id].piece;
      if (!piece) return;
      if (state.gameMode === 'pvai' && state.currentPlayer === 'schwarz') return;
      if (state.gameOver) return;
      const targets = getValidTargets(id);
      if (targets.length === 0) return;
      dragId = id;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      const pieceEl = cell.querySelector('.sdg-piece');
      if (pieceEl) pieceEl.classList.add('dragging');
    });
    boardEl.addEventListener('dragend', function (e) {
      const pieceEl = boardEl.querySelector('.sdg-piece.dragging');
      if (pieceEl) pieceEl.classList.remove('dragging');
      dragId = null;
    });
    boardEl.addEventListener('dragover', function (e) {
      if (e.dataTransfer.types.indexOf('text/plain') !== -1) e.preventDefault();
    });
    boardEl.addEventListener('drop', function (e) {
      e.preventDefault();
      const toCell = e.target.closest('.sdg-cell');
      if (!toCell || !toCell.dataset.fieldId) return;
      const toId = toCell.dataset.fieldId;
      const fromId = e.dataTransfer.getData('text/plain');
      if (!fromId) return;
      const targets = getValidTargets(fromId);
      if (targets.indexOf(toId) !== -1 && window.SDG && window.SDG.onMove) {
        window.SDG.onMove(fromId, toId);
      }
      dragId = null;
    });
  }

  function init(containerId) {
    const container = document.getElementById(containerId || 'sdg-board-wrap');
    if (!container) return null;
    const boardEl = buildBoard(container);
    container.querySelector('.sdg-board').setAttribute('draggable', 'false');
    const cells = boardEl.querySelectorAll('.sdg-cell');
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      cell.setAttribute('draggable', 'true');
      cell.addEventListener('click', function () {
        onCellClick(cell.dataset.fieldId, boardEl);
      });
    }
    setupDragDrop(boardEl);
    renderFromState(boardEl);
    return { boardEl, render: function () { renderFromState(boardEl); } };
  }

  global.SDG = global.SDG || {};
  global.SDG.board = {
    buildBoard,
    renderFromState,
    getValidTargets,
    getPieceSymbol,
    init,
  };
})(typeof window !== 'undefined' ? window : this);
