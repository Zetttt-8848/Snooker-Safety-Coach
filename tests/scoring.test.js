'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const G = require('../src/geometry.js');
const S = require('../src/scoring.js');
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const balls = [P.createBall({ id: 'cue', color: 'white', x: .5, y: .5 }), P.createBall({ id: 'red1', color: 'red', x: 1, y: .5 })];
const shot = { angle: 0, cueSpeed: .6, top: 0, side: 0 };
const reference = P.simulate(balls, shot);
const puzzle = { id: 'test', balls, targetId: 'red1', referenceShot: shot, objective: { type: 'distance' } };

test('rank boundary: matching route, endpoint, cushions and outcome earns Excellent', () => {
  assert.equal(S.rank({ E: .9, P: .85, C: .8, O: .9 }), 'Excellent');
  assert.equal(S.rank({ E: .899, P: .85, C: .8, O: .9 }), 'Developing');
});

test('rank boundary: different route with same endpoint earns Promising', () => {
  assert.equal(S.rank({ E: .90, P: .4, C: .1, O: .7 }), 'Promising');
});

test('rank boundary: different route and endpoint without safety earns Developing', () => {
  assert.equal(S.rank({ E: .1, P: .4, C: .1, O: .6 }), 'Developing');
});

test('rank boundary: objectively superior outcome cannot be demoted for reference mismatch', () => {
  assert.equal(S.rank({ E: .1, P: .9, C: .9, O: .96, objectivelyBetter: true }), 'Promising');
  assert.equal(S.rank({ E: .1, P: .9, C: .9, O: .96, objectivelyBetter: false }), 'Developing');
});

test('different cushion structure is encouraged even if coarse path similarity stays high', () => {
  assert.equal(S.rank({ E: 1, P: .9, C: .2, O: 1 }), 'Promising');
  assert.equal(S.rank({ E: .1, P: .9, C: .9, O: 1, structureDifferent: true }), 'Promising');
});

test('an invalid legal-contact condition prevents a high outcome bypass', () => {
  assert.equal(S.rank({ E: 1, P: 1, C: 1, O: 1, valid: false }), 'Developing');
});

test('physically replayed reference gives all four components and total 100', () => {
  const report = S.evaluate({ puzzle, studentPath: reference.path, reference, realized: reference });
  for (const key of ['E', 'P', 'C', 'O']) near(report[key], 1);
  near(report.total, 100); assert.equal(report.grade, 'Excellent');
  assert.equal(report.outcome.actual.verified, true);
});

test('matching or submillimetre endpoints receive reinforcement rather than invented lateral corrections', () => {
  for (const offset of [0, .0005]) {
    const realized = structuredClone(reference); realized.balls[0].y += offset;
    const report = S.evaluate({ puzzle, studentPath: reference.path, reference, realized });
    assert.ok(report.feedback.some(text => text.includes('Your endpoint matches. Keep the same speed and angle')));
    assert.ok(report.feedback.every(text => !text.includes('The error is mainly lateral')));
  }
  const misplaced = structuredClone(reference); misplaced.balls[0].y += .02;
  const report = S.evaluate({ puzzle, studentPath: reference.path, reference, realized: misplaced });
  assert.ok(report.feedback.some(text => text.includes('The error is mainly lateral')));
});

test('realized endpoint, not the attractive drawn endpoint, governs E', () => {
  const moved = structuredClone(reference); moved.balls[0].y += P.TABLE.radius;
  const report = S.evaluate({ puzzle, studentPath: reference.path, reference, realized: moved });
  near(report.E, Math.exp(-1)); near(report.P, 1); near(report.diagnostics.endpointDistance, P.TABLE.radius);
});

test('a different drawn route with the same realized safety and endpoint retains encouragement', () => {
  const end = reference.path.at(-1);
  const route = [{ x: .5, y: .5 }, { x: .7, y: 1.2 }, { x: 1.3, y: 1.2 }, { x: 1, y: .5 }, end];
  const report = S.evaluate({ puzzle, studentPath: route, reference, realized: reference });
  assert.equal(report.grade, 'Promising'); near(report.E, 1); assert.ok(report.P < .85);
  assert.ok(report.feedback.some(text => text.includes('equivalent to the reference')));
});

test('paper exposure and safety consider every legal red, not only the selected target', () => {
  const layout = [P.createBall({ id: 'cue', color: 'white', x: .5, y: .5 }),
    P.createBall({ id: 'red1', color: 'red', x: 2, y: .5 }),
    P.createBall({ id: 'red2', color: 'red', x: 1.2, y: 1 }),
    P.createBall({ id: 'blue', color: 'blue', x: 1, y: .5 })];
  const p = { balls: layout, targetId: 'red1', legalTargetIds: ['red1', 'red2'], objective: { type: 'snooker' } };
  const result = S.outcomeMetrics(p, layout);
  assert.equal(result.views.length, 2); assert.equal(result.deltaDegrees, 0); assert.ok(result.exposure > 0);
});

test('duplicate or missing ball contact and a scratch cannot masquerade as a safe return', () => {
  const noHit = structuredClone(reference); noHit.events = [];
  assert.equal(S.checkResult(puzzle, noHit).valid, false);
  const wrong = structuredClone(reference); wrong.events = [{ type: 'ball', ids: ['cue', 'blue'] }];
  assert.equal(S.checkResult(puzzle, wrong).valid, false);
  const scratch = structuredClone(reference); scratch.balls[0].potted = true;
  const report = S.evaluate({ puzzle, studentPath: reference.path, reference, realized: scratch });
  assert.equal(report.O, 0); assert.equal(report.grade, 'Developing');
});

test('a potted target is not counted as the required non-scoring safety outcome', () => {
  const potted = structuredClone(reference); potted.balls[1].potted = true;
  assert.equal(S.checkResult(puzzle, potted).valid, false);
});

test('unverified route never inherits reference target movement', () => {
  const p = structuredClone(puzzle); p.objective = { type: 'target', targetZone: { x: reference.balls[1].x, y: .5, radius: .05 } };
  const report = S.evaluate({ puzzle: p, studentPath: reference.path, reference });
  assert.equal(report.outcome.actual.verified, false);
  assert.ok(report.outcome.actual.targetSafety < .1);
  assert.ok(report.feedback.some(text => text.includes('geometric estimate')));
});

test('objective superiority requires no worsening of safety metrics, not only O >= .95', () => {
  const baseline = { valid: true, deltaRadians: .01, deltaDegrees: 1, cueRail: .5, targetSafety: .7, separation: .9, cueZone: 0 };
  const better = { ...baseline, deltaRadians: .012, deltaDegrees: 1.2, cueRail: .6, targetSafety: .8 };
  assert.equal(S.outcomeScore(puzzle, better, baseline).objectivelyBetter, true);
  assert.equal(S.outcomeScore(puzzle, { ...better, targetSafety: .3 }, baseline).objectivelyBetter, false);
});

test('all tactical families retain explicit cue-cushion and object-ball safety components', () => {
  const metrics = { valid: true, deltaRadians: .02, deltaDegrees: 1.2, cueRail: .5, targetSafety: .7, separation: .9, cueZone: .5 };
  for (const type of ['snooker', 'rail', 'escape', 'distance', 'target']) {
    const p = { ...puzzle, objective: { type, cueZone: { x: 1, y: 1, radius: .2 } } };
    const result = S.outcomeScore(p, metrics, metrics);
    assert.ok(result.components.cueRail.weight > 0); assert.ok(result.components.targetSafety.weight > 0);
    assert.ok(result.components.occlusion.weight > 0); near(result.score, 1);
  }
});

test('middle-grade feedback starts with an executable correction, before gaps', () => {
  const route = [{ x: .5, y: .5 }, { x: .4, y: .8 }, { x: .2, y: 1.2 }];
  const report = S.evaluate({ puzzle, studentPath: route, reference });
  assert.equal(report.grade, 'Developing'); assert.match(report.feedback[0], /^First/);
});

test('unanchored routes are explicitly rejected instead of silently earning a perfect score', () => {
  const route = structuredClone(reference.path); route[0].x += .2;
  const report = S.evaluate({ puzzle, studentPath: route, reference, realized: reference });
  assert.equal(report.grade, 'Developing'); assert.equal(report.O, 0); assert.match(report.feedback[0], /start/);
});

test('Fréchet and DTW distinguish path order and are symmetric', () => {
  const a = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], b = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
  near(S.discreteFrechet(a, b), S.discreteFrechet(b, a));
  near(S.dtwMean(a, b), S.dtwMean(b, a)); assert.ok(S.discreteFrechet(a, b) > 0);
  near(S.discreteFrechet(a, a), 0); near(S.dtwMean(a, a), 0);
});

test('cushion score respects order, contact coordinates and no-bank equality', () => {
  const a = [{ wall: 'top', s: 1 }, { wall: 'right', s: .5 }];
  near(S.cushionScore(a, a), 1); near(S.cushionScore([], []), 1);
  assert.ok(S.cushionScore(a, [...a].reverse()) < .8);
  assert.ok(S.cushionScore(a, [{ wall: 'top', s: 1.4 }, { wall: 'right', s: .5 }]) < .85);
});

test('inverse search physically reproduces a known legal route using bounded controls', async () => {
  const fit = await S.invert({ puzzle, path: reference.path, reference, maxEvaluations: 48 });
  assert.equal(fit.status, 'feasible'); assert.ok(fit.result.completed);
  assert.ok(fit.errors.endpoint <= .025 && fit.errors.path <= .025);
  assert.ok(Math.hypot(fit.shot.top, fit.shot.side) <= .5); assert.ok(fit.evaluations <= 48);
  assert.equal(S.checkResult(puzzle, fit.result).valid, true);
});

test('inverse search explores beyond the reference and does not use endpoint-only matching', async () => {
  const alternate = P.simulate(balls, { ...shot, cueSpeed: .8 });
  const fit = await S.invert({ puzzle, path: alternate.path, reference, maxEvaluations: 150 });
  assert.equal(fit.status, 'feasible'); assert.ok(fit.evaluations > 1);
  assert.ok(Math.abs(fit.shot.cueSpeed - shot.cueSpeed) > .05);
});

test('failed bounded inverse search reports unresolved rather than impossible', async () => {
  const path = [{ x: .5, y: .5 }, { x: .7, y: 1.2 }, { x: .8, y: .4 }];
  const fit = await S.invert({ puzzle, path, reference, maxEvaluations: 8 });
  assert.equal(fit.status, 'unresolved'); assert.match(fit.message, /not proof of impossibility/); assert.equal(fit.evaluations, 8);
});

test('same endpoint with an unsupported detour does not pass physical inversion from the reference alone', async () => {
  const path = [{ x: .5, y: .5 }, { x: .6, y: 1.3 }, { x: 1.3, y: 1.3 }, reference.path.at(-1)];
  const fit = await S.invert({ puzzle, path, reference, maxEvaluations: 8 });
  assert.equal(fit.status, 'unresolved'); assert.ok(fit.errors.path > .025);
});

test('a route outside the centre rectangle has an explicit geometric failure', async () => {
  const fit = await S.invert({ puzzle, path: [{ x: .5, y: .5 }, { x: -1, y: 1 }], reference });
  assert.equal(fit.status, 'invalid'); assert.equal(fit.evaluations, 0); assert.match(fit.message, /ball-centre boundary/);
});

test('an imprecise hand-drawn line is played as the closest legal shot, never rejected outright', async () => {
  const lesson = require('../data/puzzles.json').find(p => p.id === 'hide-yellow');
  const ref = P.simulate(lesson.balls, lesson.referenceShot);
  const wobble = G.simplifyPath(ref.path, .02).map((q, i) => i === 0 ? q : { x: q.x + Math.sin(i * 7.1) * .012, y: q.y + Math.cos(i * 5.3) * .012 });
  const route = G.normalizePath(wobble, { start: lesson.balls[0], smooth: true }).points;
  const fit = await S.invert({ puzzle: lesson, path: route, reference: ref, maxEvaluations: 320 });
  assert.ok(['feasible', 'approximate'].includes(fit.status), fit.status);
  assert.ok(fit.result.completed && S.checkResult(lesson, fit.result).valid);
  const report = S.evaluate({ puzzle: lesson, studentPath: route, reference: ref, realized: fit.result, feasibility: fit });
  assert.equal(report.verification, fit.status === 'approximate' ? 'approximate' : 'verified');
  assert.ok(report.outcome.actual.verified);
  if (fit.status === 'approximate') assert.match(fit.message, /closest legal shot/);
});

test('a cancelled search says so and never claims a verified or impossible result', async () => {
  const fit = await S.invert({ puzzle, path: [{ x: .5, y: .5 }, { x: .7, y: 1.2 }, { x: .8, y: .4 }], reference, maxEvaluations: 100, signal: { aborted: true } });
  assert.equal(fit.status, 'unresolved'); assert.match(fit.message, /cancelled/i); assert.equal(fit.evaluations, 0);
});

test('progress is reported while the search runs and the budget is respected', async () => {
  const seen = [];
  const fit = await S.invert({ puzzle, path: [{ x: .5, y: .5 }, { x: .7, y: 1.2 }, { x: .8, y: .4 }], reference, maxEvaluations: 30, onProgress: p => seen.push(p) });
  assert.ok(seen.length >= 3); assert.ok(seen.every(p => p.maxEvaluations === 30 && p.evaluations <= 30));
  assert.ok(fit.evaluations <= 30);
});

test('each score dimension has a plain-language explanation and the headline tells the learner what to do', () => {
  const exact = S.evaluate({ puzzle, studentPath: reference.path, reference, realized: reference });
  assert.equal(exact.verification, 'verified'); assert.equal(exact.alternative, false);
  for (const key of ['O', 'E', 'P', 'C']) assert.ok(typeof exact.explain[key] === 'string' && exact.explain[key].length > 10, key);
  assert.match(exact.explain.E, /within about 1 cm/);
  const route = [{ x: .5, y: .5 }, { x: .4, y: .8 }, { x: .2, y: 1.2 }];
  const poor = S.evaluate({ puzzle, studentPath: route, reference });
  assert.equal(poor.verification, 'estimate');
  assert.match(poor.headline, /^First/);
  assert.match(poor.explain.E, /cm from the reference finish/);
});

test('a different route with an equally safe verified result is recognised as an alternative that works', () => {
  const end = reference.path.at(-1);
  const route = [{ x: .5, y: .5 }, { x: .7, y: 1.2 }, { x: 1.3, y: 1.2 }, { x: 1, y: .5 }, end];
  const report = S.evaluate({ puzzle, studentPath: route, reference, realized: reference });
  assert.equal(report.alternative, true); assert.match(report.headline, /different route that works/);
  assert.equal(report.grade, 'Promising');
});
