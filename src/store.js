/* Everything the app remembers: progress, settings and custom puzzles. Backed by localStorage, but the
   backend is injected so the same code runs in tests and keeps working when storage is blocked. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || (typeof require !== 'undefined' ? require('./physics.js') : null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Grades saved by the earlier-language release, written as escapes so the source stays ASCII.
  const LEGACY_GRADES = { '\u4e2d': 'Developing', '\u4e2d\u504f\u4f18': 'Promising', '\u4f18': 'Excellent' };
  const GRADE_RANK = { Developing: 0, Promising: 1, Excellent: 2 };

  // key, label, min, max, step, unit, plain-language hint
  const PARAM_SPEC = [
    { key: 'muSlide', label: 'Cloth grip', min: .1, max: .35, step: .005, unit: '', hint: 'How hard the cloth grabs a sliding ball.' },
    { key: 'muRoll', label: 'Rolling drag', min: .005, max: .03, step: .001, unit: '', hint: 'How quickly a rolling ball slows down.' },
    { key: 'cushionRestitution', label: 'Cushion elasticity', min: .5, max: 1, step: .01, unit: '', hint: 'Energy returned by the rubber: the returned share is this value squared. Friction also slows the rebound.' },
    { key: 'cushionFriction', label: 'Cushion friction', min: 0, max: .3, step: .005, unit: '', hint: 'Grip between ball and cushion. Spin transfer is limited by impact strength.' },
    { key: 'ballRestitution', label: 'Ball bounce', min: .85, max: 1, step: .005, unit: '', hint: 'How lively ball-to-ball contact is.' },
    { key: 'spinDecay', label: 'Spin fade', min: 0, max: 20, step: .5, unit: ' rad/s²', hint: 'How quickly side spin dies away.' }
  ];

  const PRESETS = [
    { id: 'baseline', label: 'Teaching baseline', blurb: 'The standard table every puzzle is scored on.', params: {} },
    { id: 'fast', label: 'Fast cloth', blurb: 'Balls run on for longer.', params: { muRoll: .007, muSlide: .17 } },
    { id: 'slow', label: 'Slow cloth', blurb: 'Balls die quickly.', params: { muRoll: .016, muSlide: .24 } },
    { id: 'lively', label: 'Lively cushions', blurb: 'Rebounds keep more pace.', params: { cushionRestitution: 1, cushionFriction: .12 } },
    { id: 'dead', label: 'Dead cushions', blurb: 'Rebounds lose more pace.', params: { cushionRestitution: .72, cushionFriction: .18 } }
  ];

  const DEFAULT_SETTINGS = { aimGuide: true, predict: false, sound: true, colourLabels: true, replaySpeed: 1, reduceMotion: 'auto', preset: 'baseline', params: {} };

  function sanitizeParams(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    // The old normal-speed coefficient is not the new energetic restitution.
    // Keep cloth/ball settings, but retire the old artificial side-spin gain.
    if (input && ('cushionTangent' in input || 'spinCushion' in input)) {
      input = { ...input, cushionRestitution: P.DEFAULTS.cushionRestitution, cushionFriction: P.DEFAULTS.cushionFriction };
    }
    const out = {};
    for (const spec of PARAM_SPEC) {
      const v = Number(input?.[spec.key]);
      out[spec.key] = Number.isFinite(v) ? clamp(v, spec.min, spec.max) : P.DEFAULTS[spec.key];
    }
    return out;
  }

  function createStore(backend, onError) {
    const prefix = 'ssc.';
    let warned = false;
    function migrateProgress(value) {
      if (!value || typeof value !== 'object') return {};
      for (const item of Object.values(value)) {
        if (!item || typeof item !== 'object') continue;
        for (const key of ['grade', 'lastGrade']) if (LEGACY_GRADES[item[key]]) item[key] = LEGACY_GRADES[item[key]];
      }
      return value;
    }
    const store = {
      get(key, fallback) {
        try {
          const raw = backend.getItem(prefix + key);
          if (raw === null || raw === undefined) return fallback;
          const value = JSON.parse(raw);
          if (value === null || value === undefined) return fallback;
          return key === 'progress' ? migrateProgress(value) : value;
        } catch { return fallback; }
      },
      set(key, value) {
        try { backend.setItem(prefix + key, JSON.stringify(value)); return true; }
        catch (error) { if (!warned) { warned = true; onError?.(error); } return false; }
      },
      remove(key) { try { backend.removeItem?.(prefix + key); } catch { /* storage unavailable */ } },

      // ---- progress ----
      progress() { return store.get('progress', {}); },
      statusOf(id, progress = store.progress()) {
        const entry = progress[id];
        if (!entry || !entry.attempts) return 'new';
        if (entry.grade === 'Excellent') return 'mastered';
        return entry.grade === 'Promising' ? 'promising' : 'tried';
      },
      recordAttempt(id, report, verified) {
        const all = store.progress(), old = all[id] || { attempts: 0, best: 0, grade: 'Developing', verifiedBest: 0 };
        all[id] = {
          attempts: old.attempts + 1, best: Math.max(old.best || 0, report.total),
          grade: GRADE_RANK[report.grade] > GRADE_RANK[old.grade] ? report.grade : old.grade,
          verifiedBest: verified ? Math.max(old.verifiedBest || 0, report.total) : old.verifiedBest || 0,
          lastGrade: report.grade, lastVerified: !!verified, updatedAt: new Date().toISOString()
        };
        store.set('progress', all);
        return all[id];
      },
      resetProgress() { store.remove('progress'); },

      // ---- settings ----
      settings() {
        const saved = store.get('settings', {});
        const s = { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
        s.params = sanitizeParams(s.params);
        s.replaySpeed = [.25, .5, 1, 2].includes(s.replaySpeed) ? s.replaySpeed : 1;
        if (!['auto', 'reduce', 'full'].includes(s.reduceMotion)) s.reduceMotion = 'auto';
        return s;
      },
      saveSettings(patch) {
        const next = { ...store.settings(), ...patch };
        if (patch.params) next.params = sanitizeParams({ ...store.settings().params, ...patch.params });
        store.set('settings', next);
        return next;
      },

      // ---- custom puzzles ----
      customPuzzles() { const v = store.get('custom-puzzles', []); return Array.isArray(v) ? v : []; },
      trash() { const v = store.get('custom-trash', []); return Array.isArray(v) ? v : []; }
    };
    return store;
  }

  const api = { createStore, PARAM_SPEC, PRESETS, DEFAULT_SETTINGS, sanitizeParams, LEGACY_GRADES };
  Coach.storeFactory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
