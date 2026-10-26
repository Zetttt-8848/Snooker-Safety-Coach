/* The shape of the course: five levels, five tactics, and helpers for ordering, neighbours and "what next". */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};

  const LEVELS = [
    { level: 1, name: 'Beginner', blurb: 'Touch and your first safeties' },
    { level: 2, name: 'Foundation', blurb: 'Hide it, bounce it' },
    { level: 3, name: 'Intermediate', blurb: 'Blockers from every side' },
    { level: 4, name: 'Advanced', blurb: 'Two cushions and spin' },
    { level: 5, name: 'Challenge', blurb: 'Long routes, tight margins' }
  ];
  const TACTICS = [
    { id: 'control', label: 'Touch & control', icon: 'gauge', verb: 'Control the pace' },
    { id: 'hide', label: 'Hide behind a colour', icon: 'eye-off', verb: 'Block the view' },
    { id: 'escape', label: 'Escape with cushions', icon: 'bounce', verb: 'Go round a blocker' },
    { id: 'object', label: 'Move the red', icon: 'target', verb: 'Send the red to safety' },
    { id: 'break', label: 'Break-off', icon: 'burst', verb: 'Open the frame' }
  ];
  // Custom puzzles are labelled from the objective the author chose.
  const TACTIC_FOR_OBJECTIVE = { distance: 'control', rail: 'control', snooker: 'hide', escape: 'escape', target: 'object' };

  const tacticOf = id => TACTICS.find(t => t.id === id) || TACTICS[0];
  const levelOf = n => LEVELS.find(l => l.level === n) || null;

  function order(builtIn, custom = []) { return [...builtIn, ...custom]; }
  function neighbours(list, id) {
    const i = list.findIndex(p => p.id === id);
    return { index: i, previous: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
  }
  // The first built-in puzzle the learner has not yet mastered; if everything is mastered, the first one.
  function recommended(builtIn, statusOf) {
    return builtIn.find(p => statusOf(p.id) !== 'mastered') || builtIn[0] || null;
  }
  function counts(builtIn, statusOf) {
    const tally = { total: builtIn.length, tried: 0, mastered: 0 };
    for (const p of builtIn) { const s = statusOf(p.id); if (s !== 'new') tally.tried++; if (s === 'mastered') tally.mastered++; }
    return tally;
  }
  function byLevel(builtIn) {
    return LEVELS.map(l => ({ ...l, puzzles: builtIn.filter(p => p.level === l.level) })).filter(l => l.puzzles.length);
  }

  const api = { LEVELS, TACTICS, TACTIC_FOR_OBJECTIVE, tacticOf, levelOf, order, neighbours, recommended, counts, byLevel };
  Coach.courses = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
