/**
 * SDG – Schach/Dame-Game
 * Schach-Logik: Bewegungen, Rochade, En Passant, Schach/Checkmate
 */
(function (global) {
  const SDG_COORD = global.SDG && global.SDG.coord;
  if (!SDG_COORD) throw new Error('SDG: coord required');

  const COLS = SDG_COORD.COLS;
  const ROWS = SDG_COORD.ROWS;

  function getPiece(board, id) {
    return board[id] && board[id].piece;
  }

  function findKing(board, color) {
    for (let i = 0; i < SDG_COORD.allFieldIds().length; i++) {
      const id = SDG_COORD.allFieldIds()[i];
      const p = getPiece(board, id);
      if (p && p.type === 'koenig' && p.color === color) return id;
    }
    return null;
  }

  function isAttacked(board, fieldId, byColor) {
    const coord = SDG_COORD.idToCoord(fieldId);
    if (!coord) return false;
    const { row, col } = coord;

    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightMoves) {
      const id = SDG_COORD.coordToId(row + dr, col + dc);
      const p = id ? getPiece(board, id) : null;
      if (p && p.color === byColor && p.type === 'springer') return true;
    }

    const pawnRow = byColor === 'schwarz' ? row + 1 : row - 1;
    if (pawnRow >= 0 && pawnRow < 8) {
      const pl = getPiece(board, SDG_COORD.coordToId(pawnRow, col - 1));
      const pr = getPiece(board, SDG_COORD.coordToId(pawnRow, col + 1));
      if ((pl && pl.color === byColor && pl.type === 'bauer') || (pr && pr.color === byColor && pr.type === 'bauer')) return true;
    }
    const rookLike = ['turm', 'dame'];
    const bishopLike = ['laeufer', 'dame'];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < ROWS) {
        const id = SDG_COORD.coordToId(r, c);
        const p = getPiece(board, id);
        if (p) {
          if (p.color === byColor && rookLike.indexOf(p.type) !== -1) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
    for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < ROWS) {
        const id = SDG_COORD.coordToId(r, c);
        const p = getPiece(board, id);
        if (p) {
          if (p.color === byColor && bishopLike.indexOf(p.type) !== -1) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
    const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of kingMoves) {
      const id = SDG_COORD.coordToId(row + dr, col + dc);
      const p = id ? getPiece(board, id) : null;
      if (p && p.color === byColor && p.type === 'koenig') return true;
    }
    return false;
  }

  function isInCheck(board, color) {
    const kingId = findKing(board, color);
    if (!kingId) return false;
    const opp = color === 'weiss' ? 'schwarz' : 'weiss';
    return isAttacked(board, kingId, opp);
  }

  function getRawMoves(board, fromId, meta) {
    const from = SDG_COORD.idToCoord(fromId);
    if (!from) return [];
    const piece = getPiece(board, fromId);
    if (!piece) return [];
    const { row, col } = from;
    const moves = [];
    const color = piece.color;
    const opp = color === 'weiss' ? 'schwarz' : 'weiss';

    function add(toId) {
      if (toId) moves.push({ from: fromId, to: toId });
    }

    function ray(dr, dc, limit) {
      let r = row + dr;
      let c = col + dc;
      let n = 0;
      while (r >= 0 && r < ROWS && c >= 0 && c < ROWS && (limit === 0 || n < limit)) {
        const toId = SDG_COORD.coordToId(r, c);
        const p = getPiece(board, toId);
        if (p) {
          if (p.color === opp) add(toId);
          break;
        }
        add(toId);
        r += dr;
        c += dc;
        n++;
      }
    }

    if (piece.type === 'koenig') {
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        const toId = SDG_COORD.coordToId(row + dr, col + dc);
        if (toId) {
          const p = getPiece(board, toId);
          if (!p || p.color === opp) add(toId);
        }
      }
      if (meta && meta.castlingRights) {
        const side = color === 'weiss' ? 'weiss' : 'schwarz';
        const baseRow = color === 'weiss' ? 7 : 0;
        if (meta.castlingRights[side].k && !getPiece(board, SDG_COORD.coordToId(baseRow, 5)) && !getPiece(board, SDG_COORD.coordToId(baseRow, 6))) {
          const kId = SDG_COORD.coordToId(baseRow, 6);
          add(kId);
        }
        if (meta.castlingRights[side].q && !getPiece(board, SDG_COORD.coordToId(baseRow, 1)) && !getPiece(board, SDG_COORD.coordToId(baseRow, 2)) && !getPiece(board, SDG_COORD.coordToId(baseRow, 3))) {
          add(SDG_COORD.coordToId(baseRow, 2));
        }
      }
    } else if (piece.type === 'dame') {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) ray(dr, dc, 0);
    } else if (piece.type === 'turm') {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ray(dr, dc, 0);
    } else if (piece.type === 'laeufer') {
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ray(dr, dc, 0);
    } else if (piece.type === 'springer') {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const toId = SDG_COORD.coordToId(row + dr, col + dc);
        if (toId) {
          const p = getPiece(board, toId);
          if (!p || p.color === opp) add(toId);
        }
      }
    } else if (piece.type === 'bauer') {
      const forward = color === 'weiss' ? -1 : 1;
      const startRow = color === 'weiss' ? 6 : 1;
      const one = SDG_COORD.coordToId(row + forward, col);
      if (one && !getPiece(board, one)) {
        add(one);
        if (row === startRow) {
          const two = SDG_COORD.coordToId(row + 2 * forward, col);
          if (two && !getPiece(board, two)) add(two);
        }
      }
      for (const dc of [-1, 1]) {
        const toId = SDG_COORD.coordToId(row + forward, col + dc);
        if (toId) {
          const p = getPiece(board, toId);
          if (p && p.color === opp) add(toId);
        }
      }
      if (meta && meta.enPassantTarget) {
        const ep = SDG_COORD.idToCoord(meta.enPassantTarget);
        if (ep && ep.row === row && Math.abs(ep.col - col) === 1) {
          const toId = SDG_COORD.coordToId(row + forward, ep.col);
          if (toId) add(toId);
        }
      }
    }
    return moves;
  }

  function applyMoveRaw(board, move, meta) {
    const next = JSON.parse(JSON.stringify(board));
    const fromCell = next[move.from];
    const piece = fromCell.piece;
    if (!piece) return null;
    fromCell.piece = null;
    next[move.to].piece = piece;
    return next;
  }

  function applyChessMove(board, move, currentPlayer, meta) {
    const next = JSON.parse(JSON.stringify(board));
    const fromCell = next[move.from];
    const piece = fromCell.piece;
    if (!piece) return { board: null, newMeta: null };
    fromCell.piece = null;
    const toCoord = SDG_COORD.idToCoord(move.to);
    const fromCoord = SDG_COORD.idToCoord(move.from);
    let newMeta = meta ? JSON.parse(JSON.stringify(meta)) : { enPassantTarget: null, castlingRights: { weiss: { k: true, q: true }, schwarz: { k: true, q: true } }, halfMoveCount: 0, fullMoveNumber: 1 };

    if (piece.type === 'bauer') {
      newMeta.halfMoveCount = 0;
      if (Math.abs(toCoord.row - fromCoord.row) === 2) {
        newMeta.enPassantTarget = SDG_COORD.coordToId((fromCoord.row + toCoord.row) / 2, fromCoord.col);
      } else {
        newMeta.enPassantTarget = null;
      }
      if (meta && meta.enPassantTarget && move.to === meta.enPassantTarget) {
        const epCoord = SDG_COORD.idToCoord(meta.enPassantTarget);
        const captureRow = currentPlayer === 'weiss' ? epCoord.row + 1 : epCoord.row - 1;
        const captureId = SDG_COORD.coordToId(captureRow, epCoord.col);
        if (captureId && next[captureId]) next[captureId].piece = null;
      }
    } else {
      newMeta.enPassantTarget = null;
      if (piece.type === 'koenig') {
        newMeta.castlingRights[currentPlayer].k = false;
        newMeta.castlingRights[currentPlayer].q = false;
        const baseRow = currentPlayer === 'weiss' ? 7 : 0;
        if (move.to === SDG_COORD.coordToId(baseRow, 6)) {
          next[SDG_COORD.coordToId(baseRow, 5)].piece = next[SDG_COORD.coordToId(baseRow, 7)].piece;
          next[SDG_COORD.coordToId(baseRow, 7)].piece = null;
        } else if (move.to === SDG_COORD.coordToId(baseRow, 2)) {
          next[SDG_COORD.coordToId(baseRow, 3)].piece = next[SDG_COORD.coordToId(baseRow, 0)].piece;
          next[SDG_COORD.coordToId(baseRow, 0)].piece = null;
        }
      } else if (piece.type === 'turm') {
        if (fromCoord && fromCoord.col === 0) newMeta.castlingRights[currentPlayer].q = false;
        if (fromCoord && fromCoord.col === 7) newMeta.castlingRights[currentPlayer].k = false;
      }
    }

    if (piece.type !== 'bauer') newMeta.halfMoveCount = (newMeta.halfMoveCount || 0) + 1;
    if (currentPlayer === 'schwarz') newMeta.fullMoveNumber = (newMeta.fullMoveNumber || 1) + 1;

    const promote = piece.type === 'bauer' && (toCoord.row === 0 || toCoord.row === 7);
    next[move.to].piece = promote ? { type: 'dame', color: currentPlayer } : piece;
    return { board: next, newMeta };
  }

  function filterLegalMoves(board, moves, currentPlayer, meta) {
    const result = [];
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const applied = applyChessMove(board, move, currentPlayer, meta);
      if (!applied.board) continue;
      if (!isInCheck(applied.board, currentPlayer)) result.push(move);
    }
    return result;
  }

  function getValidMoves(board, currentPlayer, meta) {
    const ids = SDG_COORD.allFieldIds();
    const all = [];
    for (let i = 0; i < ids.length; i++) {
      const p = getPiece(board, ids[i]);
      if (p && p.color === currentPlayer) {
        const raw = getRawMoves(board, ids[i], meta);
        const legal = filterLegalMoves(board, raw, currentPlayer, meta);
        legal.forEach(function (m) {
          all.push(m);
        });
      }
    }
    return all;
  }

  function getValidTargetsForField(board, fieldId, currentPlayer, meta) {
    const raw = getRawMoves(board, fieldId, meta);
    const legal = filterLegalMoves(board, raw, currentPlayer, meta);
    return legal.map(function (m) {
      return m.to;
    });
  }

  function hasLegalMoves(board, currentPlayer, meta) {
    return getValidMoves(board, currentPlayer, meta).length > 0;
  }

  function isCheckmate(board, currentPlayer, meta) {
    return isInCheck(board, currentPlayer) && !hasLegalMoves(board, currentPlayer, meta);
  }

  function isStalemate(board, currentPlayer, meta) {
    return !isInCheck(board, currentPlayer) && !hasLegalMoves(board, currentPlayer, meta);
  }

  function isInsufficientMaterial(board) {
    let pieces = [];
    SDG_COORD.allFieldIds().forEach(function (id) {
      const p = getPiece(board, id);
      if (p) pieces.push(p);
    });
    if (pieces.length > 4) return false;
    const types = pieces.map(function (p) { return p.type; });
    if (pieces.length <= 2) return true;
    if (pieces.length === 3) {
      if (types.indexOf('springer') !== -1 || types.indexOf('laeufer') !== -1) return true;
    }
    if (pieces.length === 4) {
      const bishops = pieces.filter(function (p) { return p.type === 'laeufer'; });
      if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
        const others = pieces.filter(function (p) { return p.type !== 'laeufer'; });
        if (others.length === 2 && others.every(function (p) { return p.type === 'koenig'; })) return true;
      }
    }
    return false;
  }

  function isFiftyMoveDraw(meta) {
    return meta && (meta.halfMoveCount || 0) >= 50;
  }

  function boardHash(board) {
    const ids = SDG_COORD.allFieldIds();
    let s = '';
    ids.forEach(function (id) {
      const p = getPiece(board, id);
      s += id + (p ? p.type + p.color : '-');
    });
    return s;
  }

  function isThreefoldRepetition(board, positionHistory) {
    if (!positionHistory || positionHistory.length < 3) return false;
    const h = boardHash(board);
    let count = 0;
    for (let i = 0; i < positionHistory.length; i++) {
      if (positionHistory[i] === h) count++;
    }
    return count >= 3;
  }

  function getDrawReason(board, meta, positionHistory) {
    if (isFiftyMoveDraw(meta)) return 'draw50';
    if (isThreefoldRepetition(board, positionHistory)) return 'drawRepetition';
    if (isInsufficientMaterial(board)) return 'drawMaterial';
    return null;
  }

  global.SDG = global.SDG || {};
  global.SDG.gameChess = {
    getPiece,
    findKing,
    isAttacked,
    isInCheck,
    getRawMoves,
    applyChessMove,
    getValidMoves,
    getValidTargetsForField,
    hasLegalMoves,
    isCheckmate,
    isStalemate,
    isInsufficientMaterial,
    isFiftyMoveDraw,
    getDrawReason,
    filterLegalMoves,
    boardHash,
  };
})(typeof window !== 'undefined' ? window : this);
