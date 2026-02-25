/**
 * SDG – Schach/Dame-Game
 * Einstieg: UI verbinden, Züge ausführen, Spielwechsel, Undo (PvAI)
 */
(function (global) {
  const SDG_STATE = global.SDG && global.SDG.state;
  const SDG_STORAGE = global.SDG && global.SDG.storage;
  const SDG_BOARD = global.SDG && global.SDG.board;
  const SDG_GAME_DAME = global.SDG && global.SDG.gameDame;
  const SDG_GAME_CHESS = global.SDG && global.SDG.gameChess;
  const SDG_COORD = global.SDG && global.SDG.coord;
  const SDG_I18N = global.SDG && global.SDG.i18n;
  if (!SDG_STATE || !SDG_BOARD) return;

  const t = SDG_I18N && SDG_I18N.t ? SDG_I18N.t.bind(SDG_I18N) : function (p) { return p; };

  let boardController = null;

  function getDameMove(fromId, toId) {
    const state = SDG_STATE.getState();
    const board = state.board;
    const all = SDG_GAME_DAME.getValidMoves(board, state.currentPlayer);
    if (all.mustCapture) {
      const chain = all.captures.filter(function (c) { return c.from === fromId && c.to === toId; })[0];
      return chain ? { from: chain.from, to: chain.to, captured: chain.captured } : null;
    }
    const simple = all.simple.filter(function (m) { return m.from === fromId && m.to === toId; })[0];
    return simple ? { from: simple.from, to: simple.to } : null;
  }

  function getChessMove(fromId, toId) {
    const state = SDG_STATE.getState();
    const raw = SDG_GAME_CHESS.getRawMoves(state.board, fromId, state.chessMeta);
    const move = raw.filter(function (m) { return m.to === toId; })[0];
    if (!move) return null;
    const legal = SDG_GAME_CHESS.filterLegalMoves(state.board, [move], state.currentPlayer, state.chessMeta);
    return legal.length ? move : null;
  }

  function applyMoveAndFlip(fromId, toId) {
    const state = SDG_STATE.getState();
    if (state.gameMode === 'pvai' && state.currentPlayer === 'weiss') {
      SDG_STATE.pushUndoSnapshot && SDG_STATE.pushUndoSnapshot();
    }
    const game = state.activeGame;
    let move = null;
    if (game === 'dame') {
      move = getDameMove(fromId, toId);
      if (!move) return false;
      state.board = SDG_GAME_DAME.applyMove(state.board, move, state.currentPlayer);
      state.lastMove = { from: move.from, to: move.to };
      state.moveHistory.push({ from: move.from, to: move.to, captured: move.captured, notation: move.from + '-' + move.to });
    } else {
      move = getChessMove(fromId, toId);
      if (!move) return false;
      const result = SDG_GAME_CHESS.applyChessMove(state.board, move, state.currentPlayer, state.chessMeta);
      state.board = result.board;
      state.chessMeta = result.newMeta;
      state.lastMove = { from: move.from, to: move.to };
      state.moveHistory.push({ from: move.from, to: move.to, notation: move.from + '-' + move.to });
      state.positionHistory = state.positionHistory || [];
      state.positionHistory.push(SDG_GAME_CHESS.boardHash && SDG_GAME_CHESS.boardHash(state.board));
      state.check = SDG_GAME_CHESS.isInCheck(state.board, state.currentPlayer === 'weiss' ? 'schwarz' : 'weiss');
    }
    state.selectedFieldId = null;
    state.validTargetIds = [];
    state.currentPlayer = state.currentPlayer === 'weiss' ? 'schwarz' : 'weiss';

    if (game === 'schach') {
      const opp = state.currentPlayer;
      const drawReason = SDG_GAME_CHESS.getDrawReason && SDG_GAME_CHESS.getDrawReason(state.board, state.chessMeta, state.positionHistory);
      if (drawReason) {
        state.gameOver = drawReason;
      } else if (SDG_GAME_CHESS.isCheckmate(state.board, opp, state.chessMeta)) {
        state.gameOver = opp === 'weiss' ? 'blackWins' : 'whiteWins';
      } else if (SDG_GAME_CHESS.isStalemate(state.board, opp, state.chessMeta)) {
        state.gameOver = 'stalemate';
      }
    } else {
      const opp = state.currentPlayer;
      const oppMoves = SDG_GAME_DAME.getValidMoves(state.board, opp);
      const hasMove = oppMoves.mustCapture ? oppMoves.captures.length > 0 : oppMoves.simple.length > 0;
      if (!hasMove) {
        state.gameOver = state.currentPlayer === 'weiss' ? 'blackWins' : 'whiteWins';
      }
    }
    if (state.gameOver) {
      awardXPAndSave();
      showGameOver();
      if (state.gameOver === 'whiteWins' || state.gameOver === 'blackWins') triggerShake();
    }

    if (boardController && boardController.render) boardController.render();
    updateFooter();
    if (state.gameMode === 'pvai' && state.currentPlayer === 'schwarz') {
      SDG_STATE.pushUndoSnapshot && SDG_STATE.pushUndoSnapshot();
    }
    return true;
  }

  function awardXPAndSave() {
    const s = SDG_STATE.getState();
    if (s.gameOver !== 'whiteWins' || s.gameMode !== 'pvai') return;
    const xp = s.difficulty === 'leicht' ? 50 : s.difficulty === 'mittel' ? 150 : 300;
    s.xp = (s.xp || 0) + xp;
    SDG_STORAGE.setXp(s.xp);
    var xpForLevel = 100 + (s.level - 1) * 50;
    while (s.level < 30 && s.xp >= xpForLevel) {
      s.xp -= xpForLevel;
      s.level += 1;
      SDG_STORAGE.setLevel(s.level);
      SDG_STORAGE.setXp(s.xp);
      xpForLevel = 100 + (s.level - 1) * 50;
    }
    var hof = SDG_STORAGE.getHallOfFame();
    var entry = s.activeGame === 'schach' ? 'Sieg (Schach) vs. KI ' + (s.difficulty === 'leicht' ? 'Leicht' : s.difficulty === 'mittel' ? 'Mittel' : 'Schwer') + ' in ' + (s.moveHistory ? s.moveHistory.length : 0) + ' Zügen' : 'Sieg (Dame) vs. KI ' + (s.difficulty === 'leicht' ? 'Leicht' : s.difficulty === 'mittel' ? 'Mittel' : 'Schwer');
    hof = hof || [];
    hof.unshift({ text: entry, at: Date.now() });
    hof = hof.slice(0, 5);
    SDG_STORAGE.setHallOfFame(hof);
    updateHeader();
    updateHof();
  }

  function updateHeader() {
    const state = SDG_STATE.getState();
    const levelEl = document.getElementById('sdg-level-text');
    const progressEl = document.getElementById('sdg-progress-fill');
    if (levelEl) levelEl.textContent = t('header.level') + ' ' + state.level;
    if (progressEl) {
      const xpForLevel = 100 + (state.level - 1) * 50;
      const pct = Math.min(100, (state.xp || 0) / xpForLevel * 100);
      progressEl.style.width = pct + '%';
    }
    const btnDame = document.getElementById('sdg-btn-dame');
    const btnSchach = document.getElementById('sdg-btn-schach');
    if (btnDame) { btnDame.textContent = t('buttons.dame'); btnDame.classList.toggle('sdg-active', state.activeGame === 'dame'); btnDame.setAttribute('aria-pressed', state.activeGame === 'dame'); }
    if (btnSchach) { btnSchach.textContent = t('buttons.schach'); btnSchach.classList.toggle('sdg-active', state.activeGame === 'schach'); btnSchach.setAttribute('aria-pressed', state.activeGame === 'schach'); }
  }

  function updateFooter() {
    const state = SDG_STATE.getState();
    const historyEl = document.getElementById('sdg-move-history');
    if (historyEl) historyEl.textContent = state.moveHistory.map(function (m) { return m.notation; }).join(' ');
    const undoBtn = document.getElementById('sdg-undo-btn');
    if (undoBtn) {
      undoBtn.textContent = t('buttons.undo');
      undoBtn.disabled = state.gameMode !== 'pvai' || state.moveHistory.length === 0 || state.gameOver != null;
    }
  }

  function updateHof() {
    var list = document.getElementById('sdg-hof-list');
    if (!list) return;
    list.innerHTML = '';
    var hof = SDG_STORAGE.getHallOfFame();
    if (!hof || hof.length === 0) {
      var li = document.createElement('li');
      li.textContent = 'Noch keine Siege.';
      list.appendChild(li);
      return;
    }
    hof.slice(0, 5).forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = e.text || e;
      list.appendChild(li);
    });
  }

  function updateSidebar() {
    const titleEl = document.getElementById('sdg-sidebar-title');
    const listEl = document.getElementById('sdg-task-list');
    if (titleEl) titleEl.textContent = t('sidebar.taskCards');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!window.SDG || !window.SDG.tasks) {
      const li = document.createElement('li');
      li.textContent = t('sidebar.noTasks');
      listEl.appendChild(li);
      return;
    }
    const tasks = window.SDG.tasks.getActiveTasks();
    if (tasks.length === 0) {
      const li = document.createElement('li');
      li.textContent = t('sidebar.noTasks');
      listEl.appendChild(li);
      return;
    }
    tasks.forEach(function (task) {
      const li = document.createElement('li');
      let text = t('task.' + (task.id || ''));
      if (task.params && task.params.x != null) text = text.replace('{x}', task.params.x);
      li.textContent = text;
      listEl.appendChild(li);
    });
  }

  global.SDG.onMove = function (fromId, toId) {
    if (!applyMoveAndFlip(fromId, toId)) return;
    if (SDG_STATE.getState().gameMode === 'pvai' && SDG_STATE.getState().currentPlayer === 'schwarz' && !SDG_STATE.getState().gameOver) {
      setTimeout(function () { if (window.SDG && window.SDG.onAITurn) window.SDG.onAITurn(); }, 400);
    }
  };

  global.SDG.onAITurn = function () {
    if (!window.SDG || !window.SDG.ai) return;
    window.SDG.ai.makeMove();
  };

  function onGameSwitch(game) {
    SDG_STATE.switchGame(game);
    if (boardController && boardController.render) boardController.render();
    updateHeader();
    updateFooter();
  }

  function onUndo() {
    const state = SDG_STATE.getState();
    if (state.gameMode !== 'pvai' || state.gameOver) return;
    if (!SDG_STATE.popUndoSnapshot || state.undoStack.length < 2) return;
    SDG_STATE.popUndoSnapshot();
    SDG_STATE.popUndoSnapshot();
    if (boardController && boardController.render) boardController.render();
    updateFooter();
  }

  function init() {
    boardController = SDG_BOARD.init('sdg-board-wrap');
    updateHeader();
    updateFooter();
    updateSidebar();

    document.getElementById('sdg-btn-dame').addEventListener('click', function () { onGameSwitch('dame'); });
    document.getElementById('sdg-btn-schach').addEventListener('click', function () { onGameSwitch('schach'); });
    document.getElementById('sdg-undo-btn').addEventListener('click', onUndo);
    var modal = document.getElementById('sdg-settings-modal');
    var themeSel = document.getElementById('sdg-setting-theme');
    var figureSel = document.getElementById('sdg-setting-figure');
    var diffSel = document.getElementById('sdg-setting-difficulty');
    document.getElementById('sdg-settings-btn').addEventListener('click', function () {
      var settings = SDG_STORAGE.getSettings();
      themeSel.value = settings.theme || 'sommer';
      figureSel.value = settings.figureType || 'classic';
      diffSel.value = settings.difficulty || 'leicht';
      if (modal) modal.hidden = false;
    });
    document.getElementById('sdg-settings-close').addEventListener('click', function () {
      if (modal) modal.hidden = true;
    });
    function applySettings() {
      var settings = SDG_STORAGE.getSettings();
      settings.theme = themeSel.value;
      settings.figureType = figureSel.value;
      settings.difficulty = diffSel.value;
      SDG_STORAGE.setSettings(settings);
      SDG_STATE.loadProgression();
      var root = document.getElementById('sdg-root');
      if (root) {
        root.classList.remove('theme-sommer', 'theme-wald', 'theme-abend');
        root.classList.add('theme-' + settings.theme);
        root.classList.remove('sdg-figure-classic', 'sdg-figure-modern', 'sdg-figure-nature');
        root.classList.add('sdg-figure-' + settings.figureType);
      }
      if (boardController && boardController.render) boardController.render();
    }
    themeSel.addEventListener('change', applySettings);
    figureSel.addEventListener('change', applySettings);
    diffSel.addEventListener('change', applySettings);

    var goClose = document.getElementById('sdg-game-over-close');
    if (goClose) { goClose.textContent = t('buttons.newGame'); goClose.addEventListener('click', closeGameOverAndRestart); }
    updateHof();
  }

  function showGameOver() {
    const s = SDG_STATE.getState();
    const el = document.getElementById('sdg-game-over');
    const textEl = document.getElementById('sdg-game-over-text');
    if (!el || !textEl) return;
    var msg = '';
    if (s.gameOver === 'whiteWins') msg = t('game.whiteWins');
    else if (s.gameOver === 'blackWins') msg = t('game.blackWins');
    else if (s.gameOver === 'stalemate') msg = t('game.stalemate');
    else if (s.gameOver === 'draw50') msg = t('game.draw50');
    else if (s.gameOver === 'drawRepetition') msg = t('game.drawRepetition');
    else if (s.gameOver === 'drawMaterial') msg = t('game.drawMaterial');
    else msg = t('game.draw');
    textEl.textContent = msg;
    el.hidden = false;
  }

  function triggerShake() {
    const wrap = document.getElementById('sdg-board-wrap');
    if (wrap) {
      wrap.classList.remove('sdg-shake');
      wrap.offsetHeight;
      wrap.classList.add('sdg-shake');
      setTimeout(function () { wrap.classList.remove('sdg-shake'); }, 450);
    }
  }

  function closeGameOverAndRestart() {
    const el = document.getElementById('sdg-game-over');
    if (el) el.hidden = true;
    SDG_STATE.resetGame();
    if (boardController && boardController.render) boardController.render();
    updateHeader();
    updateFooter();
  }

  global.SDG.updateFooter = updateFooter;
  global.SDG.awardXPAndSave = awardXPAndSave;
  global.SDG.showGameOver = showGameOver;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
