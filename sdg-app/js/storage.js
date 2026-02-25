/**
 * SDG – Schach/Dame-Game
 * LocalStorage mit einheitlichem Präfix sdg_
 */
(function (global) {
  const PREFIX = 'sdg_';
  const KEYS = {
    level: PREFIX + 'level',
    xp: PREFIX + 'xp',
    stats: PREFIX + 'stats',
    settings: PREFIX + 'settings',
    hallOfFame: PREFIX + 'hallOfFame',
    badges: PREFIX + 'badges',
  };

  function get(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw);
    } catch (_) {
      return defaultValue;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function getLevel() {
    return get(KEYS.level, 1);
  }
  function setLevel(v) {
    set(KEYS.level, v);
  }

  function getXp() {
    return get(KEYS.xp, 0);
  }
  function setXp(v) {
    set(KEYS.xp, v);
  }

  function getStats() {
    return get(KEYS.stats, { gamesPlayed: 0, gamesWon: 0, maxCapturesInGame: 0, fastestMate: null });
  }
  function setStats(v) {
    set(KEYS.stats, v);
  }

  function getSettings() {
    return get(KEYS.settings, {
      theme: 'sommer',
      figureType: 'classic',
      difficulty: 'leicht',
      language: 'de',
    });
  }
  function setSettings(v) {
    set(KEYS.settings, v);
  }

  function getHallOfFame() {
    return get(KEYS.hallOfFame, []);
  }
  function setHallOfFame(v) {
    set(KEYS.hallOfFame, v);
  }

  function getBadges() {
    return get(KEYS.badges, []);
  }
  function setBadges(v) {
    set(KEYS.badges, v);
  }

  global.SDG = global.SDG || {};
  global.SDG.storage = {
    PREFIX,
    KEYS,
    get,
    set,
    getLevel,
    setLevel,
    getXp,
    setXp,
    getStats,
    setStats,
    getSettings,
    setSettings,
    getHallOfFame,
    setHallOfFame,
    getBadges,
    setBadges,
  };
})(typeof window !== 'undefined' ? window : this);
