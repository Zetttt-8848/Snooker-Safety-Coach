/* Puzzle authoring rules: validate a layout and reference shot, then prove it by simulation.
   Pure logic with no DOM; the Create screen builds on it. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || (typeof require !== 'undefined' ? require('./physics.js') : null);
  const F = Coach.scoring || (typeof require !== 'undefined' ? require('./scoring.js') : null);
  const OBJECTIVES = ['rail', 'snooker', 'escape', 'distance', 'target'];
  const TACTIC_FOR_OBJECTIVE = { distance: 'control', rail: 'control', snooker: 'hide', escape: 'escape', target: 'object' };
  // Default one-line instruction, worded for whichever ball must be hit first.
  const defaultBrief = (type, colour = 'red') => ({
    distance: `Hit the ${colour} first, then leave the white far from it.`,
    rail: `Hit the ${colour} first, then stop the white close to a cushion.`,
    snooker: `Hit the ${colour} first, then hide the white behind a colour.`,
    escape: `Escape with cushions, hit the ${colour} first and finish in the zone.`,
    target: `Hit the ${colour} first and send it to the safe zone.`
  })[type];
  const DEFAULT_BRIEF = Object.fromEntries(OBJECTIVES.map(type => [type, defaultBrief(type)]));
  const OBJECTIVE_LABELS = {
    distance: 'Create distance', rail: 'Cushion control', snooker: 'Hide behind a colour', escape: 'Multi-cushion escape', target: 'Move the red to safety'
  };

  function validatePuzzle(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.balls) || input.balls.length < 2 || input.balls.length > 32) throw Error('A puzzle needs 2–32 balls.');
    const ids = new Set(), allowed = ['white', 'red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];
    const balls = input.balls.map(b => {
      if (!b || typeof b.id !== 'string' || !b.id || b.id.length > 64 || ids.has(b.id)) throw Error('Each ball needs a valid, unique ID.');
      ids.add(b.id);
      if (!allowed.includes(b.color) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) throw Error('Invalid ball colour or position.');
      if (b.x < P.TABLE.radius || b.x > P.TABLE.width - P.TABLE.radius || b.y < P.TABLE.radius || b.y > P.TABLE.height - P.TABLE.radius) throw Error('Ball centres must be inside the cushions.');
      if (P.TABLE.pockets.some(p => Math.hypot(p.x - b.x, p.y - b.y) <= p.radius)) throw Error('Starting balls cannot occupy a pocket capture zone.');
      return { id: b.id, color: b.color, x: b.x, y: b.y };
    });
    if (balls.filter(b => b.id === 'cue' && b.color === 'white').length !== 1 || balls.filter(b => b.color === 'white').length !== 1) throw Error('A puzzle must have exactly one white ball with ID cue.');
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      if (Math.hypot(balls[i].x - balls[j].x, balls[i].y - balls[j].y) < 2 * P.TABLE.radius - 1e-8) throw Error('Starting balls overlap.');
    }
    if (!ids.has(input.targetId) || input.targetId === 'cue') throw Error('Choose a valid target ball.');
    const sh = input.referenceShot;
    if (!sh || !['angle', 'cueSpeed', 'top', 'side'].every(k => Number.isFinite(sh[k]))) throw Error('Reference shot settings are missing.');
    if (Math.abs(sh.angle) > 360 || sh.cueSpeed <= 0 || sh.cueSpeed > 6 || Math.hypot(sh.top, sh.side) > .5 + 1e-9) throw Error('Cue speed or combined tip offset is outside the physical range.');
    const text = (key, fallback, max) => typeof input[key] === 'string' ? input[key].slice(0, max) : fallback;
    const objective = { type: OBJECTIVES.includes(input.objective?.type) ? input.objective.type : 'distance' };
    for (const key of ['cueZone', 'targetZone']) {
      const z = input.objective?.[key];
      if (z) {
        if (!Number.isFinite(z.x) || !Number.isFinite(z.y) || !Number.isFinite(z.radius) || z.radius < .025 || z.radius > 2 || z.x < 0 || z.y < 0 || z.x > P.TABLE.width || z.y > P.TABLE.height) throw Error('Invalid target zone position or radius.');
        objective[key] = { x: z.x, y: z.y, radius: z.radius };
      }
    }
    const legal = input.legalTargetIds || [input.targetId];
    if (!Array.isArray(legal) || !legal.length || legal.some(id => !ids.has(id) || id === 'cue')) throw Error('Invalid list of legal targets.');
    return {
      id: text('id', 'custom-' + Date.now(), 100), title: text('title', 'My safety puzzle', 60), category: text('category', 'Custom puzzle', 30),
      difficulty: text('difficulty', 'Custom', 20), balls, targetId: input.targetId, legalTargetIds: [...new Set(legal)],
      referenceShot: { angle: sh.angle, cueSpeed: sh.cueSpeed, top: sh.top, side: sh.side }, objective,
      task: text('task', 'Make legal contact and control the leave.', 1000), goal: text('goal', 'Control where the cue ball and object ball finish.', 500),
      explanation: text('explanation', 'Choose the leave, then find the route.', 2000), hint: text('hint', 'Start by choosing a route towards the target area.', 400),
      source: text('source', 'Custom puzzle · Forward simulation with default physics', 200),
      brief: text('brief', defaultBrief(objective.type, balls.find(b => b.id === input.targetId).color), 140), learn: text('learn', 'Test your own idea against the physics.', 140),
      tactic: TACTIC_FOR_OBJECTIVE[objective.type], level: 0, tags: [],
      focus: { id: input.targetId, role: 'target', label: 'Hit first' }, custom: true
    };
  }

  function validateAndSimulate(input) {
    const puzzle = validatePuzzle(input), result = P.simulate(puzzle.balls, puzzle.referenceShot, P.DEFAULTS, { recordFrames: false }), legal = F.checkResult(puzzle, result);
    if (!legal.valid) throw Error('Reference shot failed validation: ' + legal.reason);
    const m = F.outcomeMetrics(puzzle, result.balls, { verified: true });
    if (puzzle.objective.type === 'snooker' && m.blockedFraction < .8) throw Error('A hide puzzle needs a colour that blocks at least 80% of the red’s contact directions. Move the colour or reshoot, or choose another tactic.');
    if (puzzle.objective.type === 'rail' && m.cueRailDistance > .08) throw Error('A cushion-control puzzle must leave the white within 8 cm of a cushion. Adjust your speed.');
    if (puzzle.objective.cueZone && m.cueZone < 1 - 1e-9) throw Error('The reference white ball missed the specified zone.');
    if (puzzle.objective.targetZone && m.targetSafety < 1 - 1e-9) throw Error('The reference red missed the specified zone.');
    return { puzzle, result };
  }

  // Keep only what is needed to replay a shot later.
  function snapshot(result) {
    return { path: result.path, tracks: result.tracks, balls: result.balls, events: result.events, duration: result.duration, params: result.params, shot: result.shot, completed: result.completed };
  }

  // Build the puzzle definition from a captured Free Table shot and the author's choices.
  // The reference is always re-simulated with the default table, whatever table the shot was taken on.
  function fromCapture(capture, form) {
    const initial = capture.initial.filter(b => !b.potted).map(({ id, color, x, y }) => ({ id, color, x, y }));
    const shot = { angle: capture.shot.angle, cueSpeed: capture.shot.cueSpeed, top: capture.shot.top, side: capture.shot.side };
    const rerun = P.simulate(initial, shot, P.DEFAULTS, { recordFrames: false });
    const cue = rerun.balls.find(b => b.id === 'cue'), targetEnd = rerun.balls.find(b => b.id === form.targetId);
    const target = initial.find(b => b.id === form.targetId);
    const radius = Math.max(.03, Math.min(.8, Number(form.zoneRadius) || .18));
    const type = OBJECTIVES.includes(form.type) ? form.type : 'distance';
    return {
      id: form.id || 'custom-' + Date.now(), title: (form.title || '').trim() || 'My safety puzzle', category: 'Custom puzzle', difficulty: 'Custom',
      balls: initial, targetId: form.targetId, legalTargetIds: target?.color === 'red' ? initial.filter(b => b.color === 'red').map(b => b.id) : [form.targetId],
      referenceShot: shot, task: form.task || defaultBrief(type, target?.color), brief: (form.brief || '').trim() || defaultBrief(type, target?.color),
      goal: 'Leave the white in the target zone.', explanation: form.note || 'Look at where both balls finish, not just the moment of contact.',
      objective: { type, cueZone: { x: cue.x, y: cue.y, radius }, ...(type === 'target' ? { targetZone: { x: targetEnd.x, y: targetEnd.y, radius: .2 } } : {}) }
    };
  }

  const api = { validatePuzzle, validateAndSimulate, snapshot, fromCapture, OBJECTIVES, OBJECTIVE_LABELS, DEFAULT_BRIEF, defaultBrief };
  Coach.editor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
