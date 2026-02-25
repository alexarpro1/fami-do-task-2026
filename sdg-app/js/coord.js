/**
 * SDG – Schach/Dame-Game
 * Koordinaten-System: 8×8, IDs A1–H8
 */
(function (global) {
  const COLS = 'ABCDEFGH';
  const ROWS = 8;

  function coordToId(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= ROWS) return null;
    return COLS[col] + (row + 1);
  }

  function idToCoord(id) {
    if (!id || id.length !== 2) return null;
    const col = COLS.indexOf(id[0].toUpperCase());
    const row = parseInt(id[1], 10) - 1;
    if (col === -1 || isNaN(row) || row < 0 || row >= ROWS) return null;
    return { row, col };
  }

  /** Diagonale Nachbarn (für Dame): [oben-links, oben-rechts, unten-links, unten-rechts] */
  function getDiagonalNeighbors(row, col, direction) {
    const neighbors = [];
    if (direction === 'up') {
      if (row < ROWS - 1 && col > 0) neighbors.push({ row: row + 1, col: col - 1 });
      if (row < ROWS - 1 && col < ROWS - 1) neighbors.push({ row: row + 1, col: col + 1 });
    } else {
      if (row > 0 && col > 0) neighbors.push({ row: row - 1, col: col - 1 });
      if (row > 0 && col < ROWS - 1) neighbors.push({ row: row - 1, col: col + 1 });
    }
    return neighbors;
  }

  function allFieldIds() {
    const ids = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < ROWS; c++)
        ids.push(coordToId(r, c));
    return ids;
  }

  function isLightSquare(row, col) {
    return (row + col) % 2 === 0;
  }

  global.SDG = global.SDG || {};
  global.SDG.coord = {
    COLS,
    ROWS,
    coordToId,
    idToCoord,
    getDiagonalNeighbors,
    allFieldIds,
    isLightSquare,
  };
})(typeof window !== 'undefined' ? window : this);
