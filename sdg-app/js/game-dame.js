/**
 * SDG – Schach/Dame-Game
 * Dame-Logik 8×8: Schlagzwang, Kettensprünge, Beförderung zur Dame
 */
(function (global) {
  const SDG_COORD = global.SDG && global.SDG.coord;
  if (!SDG_COORD) throw new Error('SDG: coord required');

  function getPiece(board, id) {
    return board[id] && board[id].piece;
  }

  function getCapturesFrom(board, fromId, currentPlayer) {
    const from = SDG_COORD.idToCoord(fromId);
    if (!from) return [];
    const piece = getPiece(board, fromId);
    if (!piece || piece.color !== currentPlayer) return [];
    const isKing = piece.type === 'dame';
    const captures = [];
    const dirs = isKing
      ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 }]
      : currentPlayer === 'weiss'
        ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }]
        : [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }];

    for (const d of dirs) {
      let r = from.row + d.dr;
      let c = from.col + d.dc;
      if (!isKing) {
        const overId = SDG_COORD.coordToId(r, c);
        const over = overId ? getPiece(board, overId) : null;
        if (!over || over.color === currentPlayer) continue;
        const landR = r + d.dr;
        const landC = c + d.dc;
        const landId = SDG_COORD.coordToId(landR, landC);
        if (landId && !getPiece(board, landId)) {
          captures.push({ from: fromId, over: overId, to: landId, captured: [overId] });
        }
        continue;
      }
    }
    if (piece.type === 'dame') {
      return captures.concat(getKingCapturesFrom(board, fromId, currentPlayer));
    }
    return captures;
  }

  function getKingCapturesFrom(board, fromId, currentPlayer) {
    const from = SDG_COORD.idToCoord(fromId);
    if (!from) return [];
    const piece = getPiece(board, fromId);
    if (!piece || piece.type !== 'dame' || piece.color !== currentPlayer) return [];
    const dirs = [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 }];
    const captures = [];
    for (const d of dirs) {
      let r = from.row + d.dr;
      let c = from.col + d.dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const overId = SDG_COORD.coordToId(r, c);
        const over = overId ? getPiece(board, overId) : null;
        if (over) {
          if (over.color === currentPlayer) break;
          const landR = r + d.dr;
          const landC = c + d.dc;
          const landId = SDG_COORD.coordToId(landR, landC);
          if (landId && !getPiece(board, landId)) {
            captures.push({ from: fromId, over: overId, to: landId, captured: [overId] });
          }
          break;
        }
        r += d.dr;
        c += d.dc;
      }
    }
    return captures;
  }

  function getAllCaptures(board, currentPlayer) {
    const all = [];
    SDG_COORD.allFieldIds().forEach(function (id) {
      const p = getPiece(board, id);
      if (p && p.color === currentPlayer) {
        getCapturesFrom(board, id, currentPlayer).forEach(function (c) {
          all.push(c);
        });
      }
    });
    return all;
  }

  function expandChainCaptures(board, currentPlayer, pathSoFar, fromId, capturedSet) {
    const next = getCapturesFrom(board, fromId, currentPlayer).filter(function (c) {
      return !capturedSet[c.over];
    });
    if (next.length === 0) return [pathSoFar];
    let results = [];
    for (const cap of next) {
      const newBoard = JSON.parse(JSON.stringify(board));
      newBoard[cap.from].piece = null;
      newBoard[cap.over].piece = null;
      const piece = pathSoFar.piece || getPiece(board, pathSoFar.from);
      const promote = (pathSoFar.to && SDG_COORD.idToCoord(cap.to)) ? (currentPlayer === 'weiss' ? SDG_COORD.idToCoord(cap.to).row === 7 : SDG_COORD.idToCoord(cap.to).row === 0) : false;
      newBoard[cap.to].piece = promote ? { type: 'dame', color: currentPlayer } : { type: piece.type, color: piece.color };
      const newCaptured = Object.assign({}, capturedSet);
      cap.captured.forEach(function (id) {
        newCaptured[id] = true;
      });
      const chain = { from: pathSoFar.from, to: cap.to, captured: pathSoFar.captured.concat(cap.captured), piece };
      const sub = expandChainCaptures(newBoard, currentPlayer, chain, cap.to, newCaptured);
      sub.forEach(function (s) {
        if (!s.to) s.to = cap.to;
        results.push(s);
      });
    }
    return results.length ? results : [pathSoFar];
  }

  function getCaptureChains(board, currentPlayer) {
    const singleCaptures = getAllCaptures(board, currentPlayer);
    const chains = [];
    singleCaptures.forEach(function (cap) {
      const newBoard = JSON.parse(JSON.stringify(board));
      newBoard[cap.from].piece = null;
      newBoard[cap.over].piece = null;
      const piece = getPiece(board, cap.from);
      const promote = currentPlayer === 'weiss' ? SDG_COORD.idToCoord(cap.to).row === 7 : SDG_COORD.idToCoord(cap.to).row === 0;
      newBoard[cap.to].piece = promote ? { type: 'dame', color: currentPlayer } : piece;
      const capturedSet = {};
      cap.captured.forEach(function (id) {
        capturedSet[id] = true;
      });
      const path = { from: cap.from, to: cap.to, captured: cap.captured.slice(), piece };
      const expanded = expandChainCaptures(newBoard, currentPlayer, path, cap.to, capturedSet);
      expanded.forEach(function (e) {
        chains.push({ from: e.from, to: e.to, captured: e.captured });
      });
    });
    return chains;
  }

  function getSimpleMoves(board, fromId, currentPlayer) {
    const from = SDG_COORD.idToCoord(fromId);
    if (!from) return [];
    const piece = getPiece(board, fromId);
    if (!piece || piece.color !== currentPlayer) return [];
    const isKing = piece.type === 'dame';
    const moves = [];
    const dirs = isKing
      ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 }]
      : currentPlayer === 'weiss'
        ? [{ dr: 1, dc: 1 }, { dr: 1, dc: -1 }]
        : [{ dr: -1, dc: 1 }, { dr: -1, dc: -1 }];

    for (const d of dirs) {
      if (isKing) {
        let r = from.row + d.dr;
        let c = from.col + d.dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const toId = SDG_COORD.coordToId(r, c);
          if (!toId || getPiece(board, toId)) break;
          moves.push({ from: fromId, to: toId });
          r += d.dr;
          c += d.dc;
        }
      } else {
        const r = from.row + d.dr;
        const c = from.col + d.dc;
        const toId = SDG_COORD.coordToId(r, c);
        if (toId && !getPiece(board, toId)) moves.push({ from: fromId, to: toId });
      }
    }
    return moves;
  }

  function getValidMoves(board, currentPlayer) {
    const chains = getCaptureChains(board, currentPlayer);
    if (chains.length > 0) {
      const byFrom = {};
      chains.forEach(function (c) {
        if (!byFrom[c.from]) byFrom[c.from] = [];
        byFrom[c.from].push(c);
      });
      return { captures: chains, simple: [], mustCapture: true };
    }
    const simple = [];
    SDG_COORD.allFieldIds().forEach(function (id) {
      getSimpleMoves(board, id, currentPlayer).forEach(function (m) {
        simple.push(m);
      });
    });
    return { captures: [], simple, mustCapture: false };
  }

  function getValidTargetsForField(board, fieldId, currentPlayer) {
    const all = getValidMoves(board, currentPlayer);
    if (all.mustCapture) {
      return all.captures.filter(function (c) {
        return c.from === fieldId;
      }).map(function (c) {
        return c.to;
      });
    }
    return all.simple.filter(function (m) {
      return m.from === fieldId;
    }).map(function (m) {
      return m.to;
    });
  }

  function applyMove(board, move, currentPlayer) {
    const next = JSON.parse(JSON.stringify(board));
    const fromCell = next[move.from];
    const piece = fromCell.piece;
    if (!piece) return null;
    fromCell.piece = null;
    const toCoord = SDG_COORD.idToCoord(move.to);
    const promote = (piece.type === 'stein' && toCoord && (currentPlayer === 'weiss' ? toCoord.row === 7 : toCoord.row === 0));
    next[move.to].piece = promote ? { type: 'dame', color: currentPlayer } : piece;
    if (move.captured && move.captured.length) {
      move.captured.forEach(function (id) {
        if (next[id]) next[id].piece = null;
      });
    }
    return next;
  }

  global.SDG = global.SDG || {};
  global.SDG.gameDame = {
    getPiece,
    getValidMoves,
    getValidTargetsForField,
    getCaptureChains,
    applyMove,
  };
})(typeof window !== 'undefined' ? window : this);
