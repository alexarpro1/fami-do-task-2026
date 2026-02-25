/**
 * SDG – Schach/Dame-Game
 * TaskCard-Pool: Menge, Zeit/Züge, Qualität, Sicherheit
 */
(function (global) {
  const SDG_STORAGE = global.SDG && global.SDG.storage;
  const SDG_I18N = global.SDG && global.SDG.i18n;
  const t = SDG_I18N && SDG_I18N.t ? SDG_I18N.t.bind(SDG_I18N) : function (p) { return p; };

  const TASK_POOL = [
    { id: 'capture', type: 'menge', textKey: 'task.capture', params: { x: 3 }, check: function (ctx) { return (ctx.capturesThisGame || 0) >= (ctx.task.params.x || 3); } },
    { id: 'capture5', type: 'menge', textKey: 'task.capture5', params: { x: 5 }, check: function (ctx) { return (ctx.capturesThisGame || 0) >= 5; } },
    { id: 'winUnder', type: 'zuege', textKey: 'task.winUnder', params: { x: 20 }, check: function (ctx) { return ctx.won && (ctx.moveCount || 0) < (ctx.task.params.x || 20); } },
    { id: 'promoteDame', type: 'qualitaet', textKey: 'task.promoteDame', check: function (ctx) { return !!ctx.promotedToDame; } },
    { id: 'promotePawn', type: 'qualitaet', textKey: 'task.promotePawn', check: function (ctx) { return !!ctx.promotedPawn; } },
    { id: 'winMaxLoss', type: 'sicherheit', textKey: 'task.winMaxLoss', params: { x: 2 }, check: function (ctx) { return ctx.won && (ctx.ownLost || 0) <= (ctx.task.params.x || 2); } },
  ];

  function getText(task) {
    if (task.params && task.params.x) return (task.textKey || '').replace('{x}', task.params.x);
    return task.textKey || task.id || '';
  }

  function pickRandom(count) {
    const shuffled = TASK_POOL.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = t;
    }
    return shuffled.slice(0, Math.min(count || 3, shuffled.length));
  }

  function fromSaved(saved) {
    if (!saved || !Array.isArray(saved)) return [];
    return saved.map(function (o) {
      const t = TASK_POOL.find(function (p) { return p.id === (o.id || o); });
      return t ? { id: t.id, type: t.type, textKey: t.textKey, params: o.params || t.params, check: t.check } : null;
    }).filter(Boolean);
  }

  function getActiveTasks() {
    if (SDG_STORAGE && SDG_STORAGE.get) {
      const saved = SDG_STORAGE.get(SDG_STORAGE.PREFIX + 'activeTasks', null);
      if (saved && Array.isArray(saved) && saved.length > 0) return fromSaved(saved);
    }
    const picked = pickRandom(3);
    if (SDG_STORAGE && SDG_STORAGE.set) {
      SDG_STORAGE.set(SDG_STORAGE.PREFIX + 'activeTasks', picked.map(function (t) { return { id: t.id, params: t.params }; }));
    }
    return picked;
  }

  function setActiveTasks(tasks) {
    if (SDG_STORAGE && SDG_STORAGE.set) {
      SDG_STORAGE.set(SDG_STORAGE.PREFIX + 'activeTasks', tasks.map(function (t) { return { id: t.id, params: t.params }; }));
    }
  }

  function checkAndAward(ctx) {
    const tasks = getActiveTasks();
    let awarded = 0;
    const remaining = tasks.filter(function (task) {
      const done = task.check ? task.check(Object.assign({}, ctx, { task })) : false;
      if (done) awarded += 100;
      return !done;
    });
    if (awarded > 0 && SDG_STORAGE) {
      const xp = SDG_STORAGE.getXp();
      SDG_STORAGE.setXp(xp + awarded);
      if (global.SDG && global.SDG.state) global.SDG.state.loadProgression();
    }
    if (remaining.length !== tasks.length) {
      if (remaining.length) setActiveTasks(remaining);
      else {
        const newTasks = pickRandom(3);
        setActiveTasks(newTasks);
      }
    }
    return awarded;
  }

  global.SDG = global.SDG || {};
  global.SDG.tasks = {
    getActiveTasks,
    setActiveTasks,
    pickRandom,
    getText,
    checkAndAward,
    TASK_POOL,
  };
})(typeof window !== 'undefined' ? window : this);
