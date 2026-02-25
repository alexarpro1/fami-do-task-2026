/**
 * SDG – Schach/Dame-Game
 * Zentrale Texte (i18n-ready)
 */
(function (global) {
  const strings = {
    de: {
      appName: 'Schach/Dame-Game',
      buttons: {
        dame: 'Dame',
        schach: 'Schach',
        undo: 'Zug rückgängig',
        settings: 'Einstellungen',
        review: 'Partie analysieren',
        newGame: 'Neues Spiel',
        pvp: 'Zwei Spieler',
        pvai: 'Gegen KI',
      },
      header: {
        level: 'Level',
      },
      sidebar: {
        taskCards: 'Herausforderungen',
        noTasks: 'Keine aktiven Aufgaben.',
      },
      footer: {
        moveHistory: 'Züge',
        lastMove: 'Letzter Zug',
      },
      game: {
        whiteToMove: 'Weiß am Zug',
        blackToMove: 'Schwarz am Zug',
        check: 'Schach!',
        checkmate: 'Schachmatt!',
        stalemate: 'Patt',
        draw: 'Remis',
        draw50: 'Remis (50-Züge-Regel)',
        drawRepetition: 'Remis (dreifache Wiederholung)',
        drawMaterial: 'Remis (unzureichendes Material)',
        whiteWins: 'Weiß gewinnt',
        blackWins: 'Schwarz gewinnt',
        promotePawn: 'Bauer umwandeln',
      },
      settings: {
        theme: 'Thema',
        themeSommer: 'Sommer-Erinnerung',
        themeWald: 'Wald-Idyll',
        themeAbend: 'Abend-Dämmerung',
        figureType: 'Figuren',
        figureClassic: 'Klassisch',
        figureModern: 'Modern',
        figureNature: 'Natur',
        difficulty: 'Schwierigkeit',
        difficultyLeicht: 'Leicht',
        difficultyMittel: 'Mittel',
        difficultySchwer: 'Schwer',
      },
      stats: {
        winRate: 'Siegrate',
        maxCaptures: 'Meiste Schläge (eine Partie)',
        fastestMate: 'Schnellstes Matt',
      },
      task: {
        capture: 'Schlage {x} Figuren in einer Partie.',
        capture5: 'Schlage 5 Figuren in einer Partie.',
        winUnder: 'Gewinne in unter {x} Zügen.',
        promoteDame: 'Erreiche eine Dame.',
        promotePawn: 'Befördere einen Bauern.',
        winMaxLoss: 'Gewinne, ohne mehr als {x} eigene Figuren zu verlieren.',
      },
      badges: {
        level10: 'Level 10 erreicht',
        mateWithPawn: 'Schachmatt mit Bauer',
        firstDame: 'Erste Dame',
        taskCards10: '10 TaskCards erfüllt',
      },
    },
  };

  let currentLang = 'de';

  function setLanguage(lang) {
    if (strings[lang]) currentLang = lang;
  }

  function t(path) {
    const parts = path.split('.');
    let o = strings[currentLang];
    for (const p of parts) {
      o = o && o[p];
    }
    return o != null ? o : path;
  }

  global.SDG = global.SDG || {};
  global.SDG.i18n = { strings, setLanguage, t };
})(typeof window !== 'undefined' ? window : this);
