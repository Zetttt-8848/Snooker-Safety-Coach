'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/physics.js');
const G = require('../src/geometry.js');
const R = G.TABLE.radius, W = G.TABLE.width, H = G.TABLE.height;
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test('point to segment distance handles projection, endpoints and degenerate segments', () => {
  near(G.pointSegmentDistance({ x: .5, y: .3 }, { x: 0, y: 0 }, { x: 1, y: 0 }), .3);
  near(G.pointSegmentDistance({ x: 2, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }), Math.sqrt(2));
  near(G.pointSegmentDistance({ x: 2, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }), Math.sqrt(5));
});

test('smoothing reduces hand jitter while preserving endpoints and a sharp rail contact', () => {
  const jitter = Array.from({ length: 61 }, (_, i) => ({ x: .2 + i * .01, y: .5 + (i % 2 ? .003 : -.003) }));
  const smooth = G.smoothPath(jitter);
  assert.deepEqual(smooth[0], jitter[0]); assert.deepEqual(smooth.at(-1), jitter.at(-1));
  const averageError = points => points.slice(3, -3).reduce((s, p) => s + Math.abs(p.y - .5), 0) / (points.length - 6);
  assert.ok(averageError(smooth) < averageError(jitter) / 4);
  const bank = [{ x: .5, y: .5 }, { x: .75, y: .263125 }, { x: 1, y: R }, { x: 1.25, y: .263125 }, { x: 1.5, y: .5 }];
  const bankSmooth = G.smoothPath(bank);
  assert.deepEqual(bankSmooth[2], bank[2]);
  assert.ok(bankSmooth.every(p => p.y >= R));
});

test('Douglas-Peucker removes small drawing jitter but retains route turns', () => {
  const jitter = Array.from({ length: 100 }, (_, i) => ({ x: .2 + i * .01, y: .5 + (i % 2 ? .002 : -.002) }));
  assert.equal(G.simplifyPath(jitter, .008).length, 2);
  const bank = [{ x: .5, y: .6 }, { x: .75, y: .3 }, { x: 1, y: R }, { x: 1.3, y: .3 }, { x: 1.6, y: .6 }];
  assert.ok(G.simplifyPath(bank, .025).some(p => p.x === 1 && p.y === R));
});

test('arc-length resampling is 10 mm apart across vertices and retains the exact endpoint', () => {
  const input = [{ x: 0, y: 0, t: 0 }, { x: .025, y: 0, t: 1 }, { x: .025, y: .024, t: 2 }];
  const sampled = G.resamplePath(input);
  assert.equal(sampled.length, 6);
  near(sampled[1].x, .01); near(sampled[2].x, .02);
  near(sampled[3].x, .025); near(sampled[3].y, .005);
  near(sampled[4].y, .015); assert.deepEqual(sampled[5], input[2]);
  near(sampled[1].t, .4);
});

test('cushion signatures use ball-centre walls and have stable along-edge coordinates', () => {
  const route = [{ x: .5, y: .5 }, { x: 1, y: R + .008 }, { x: W - R - .006, y: .8 }, { x: 2.1, y: H - R + .004 }, { x: 1.5, y: 1 }];
  const normalized = G.normalizePath(route);
  assert.deepEqual(normalized.cushions.map(c => c.wall), ['top', 'right', 'bottom']);
  near(normalized.cushions[0].s, 1 - R); near(normalized.cushions[1].s, .8 - R);
  near(normalized.points[1].y, R); near(normalized.points[2].x, W - R);
  near(normalized.points[3].y, H - R);
});

test('a rail endpoint or a route parallel to a cushion is not counted as a rebound', () => {
  assert.equal(G.cushionSignature([{ x: .5, y: .5 }, { x: 1, y: R }]).length, 0);
  assert.equal(G.cushionSignature([{ x: .5, y: R }, { x: 1, y: R }, { x: 1.5, y: R }]).length, 0);
});

test('explicit simulation events preserve cue cushion order and exclude object ball events', () => {
  const events = [
    { type: 'cushion', id: 'cue', wall: 'left', x: R, y: .3, t: .1 },
    { type: 'cushion', id: 'red1', wall: 'top', x: 2, y: R, t: .2 },
    { type: 'ball', id: 'cue', x: .5, y: .3, t: .3 },
    { type: 'cushion', id: 'cue', wall: 'bottom', x: .8, y: H - R, t: 1 }
  ];
  const sig = G.cushionSignature([{ x: .5, y: .5 }, { x: R, y: .3 }, { x: .8, y: H - R }], events);
  assert.deepEqual(sig.map(c => c.wall), ['left', 'bottom']); near(sig[0].s, .3 - R);
});

test('normalization anchors the true cue start, does not mutate input, and defaults to no smoothing', () => {
  const route = [{ x: .5, y: .5 }, { x: 1, y: .7 }, { x: 1.5, y: .5 }], original = structuredClone(route);
  const n = G.normalizePath(route, { start: { x: .49, y: .51 } });
  assert.deepEqual(n.start, { x: .49, y: .51 }); assert.deepEqual(n.points[1], route[1]);
  assert.deepEqual(route, original); assert.deepEqual(n.end, route[2]);
  assert.equal(n.sampleStep, .01); assert.equal(n.cushions.length, 0);
});

test('degenerate, duplicate and invalid paths have explicit behaviour', () => {
  assert.deepEqual(G.normalizePath([]).samples, []);
  assert.equal(G.resamplePath([{ x: 1, y: 1 }, { x: 1, y: 1 }]).length, 1);
  assert.throws(() => G.normalizePath([{ x: NaN, y: 1 }]), /non-finite/);
  assert.throws(() => G.resamplePath([{ x: 0, y: 0 }, { x: 1, y: 1 }], 0), /greater than zero/);
});

test('unobstructed target has zero blocked angle and paper distance exposure', () => {
  const o = G.occlusion({ x: .5, y: .5 }, { x: 2, y: .5 });
  assert.equal(o.valid, true); near(o.deltaRadians, 0); near(o.exposure, Math.exp(-1.5 / .75));
  near(o.angularWidth, 2 * Math.asin(2 * R / 1.5));
});

test('a centred foreground colour fully occludes the target collision cone', () => {
  const o = G.occlusion({ x: .5, y: .5 }, { x: 2, y: .5 }, [{ x: 1, y: .5 }]);
  near(o.blockedFraction, 1); near(o.deltaRadians, o.angularWidth); near(o.exposure, 0);
});

test('a ball behind the target is not counted as an angular obstruction', () => {
  const o = G.occlusion({ x: .5, y: .5 }, { x: 2, y: .5 }, [{ x: 2.4, y: .5 }]);
  near(o.deltaRadians, 0); assert.equal(o.centreLineClear, true);
});

test('overlapping angular shadows are unioned rather than double-counted', () => {
  const cue = { x: .5, y: .5 }, target = { x: 2, y: .5 }, blocker = { x: 1, y: .55 };
  const once = G.occlusion(cue, target, [blocker]), twice = G.occlusion(cue, target, [blocker, { ...blocker }]);
  assert.ok(once.blockedFraction > 0 && once.blockedFraction < 1);
  near(once.deltaRadians, twice.deltaRadians);
  const union = G.occlusion(cue, target, [blocker, { x: 1, y: .45 }]);
  assert.ok(union.deltaRadians >= once.deltaRadians); assert.ok(union.deltaRadians <= union.angularWidth + 1e-10);
});

test('angular occlusion correctly unwraps a target direction across minus-pi/pi', () => {
  const o = G.occlusion({ x: 3, y: .5 }, { x: 1, y: .5 }, [{ x: 2, y: .5 }]);
  near(o.blockedFraction, 1); near(o.exposure, 0);
});

test('entry-depth partition agrees with dense independent ray sampling near intersecting exclusion disks', () => {
  const cue = { x: .5, y: .5 }, target = { x: 2, y: .5 }, blockers = [{ x: 1.96, y: .54 }, { x: 2.02, y: .55 }];
  const o = G.occlusion(cue, target, blockers), N = 20000;
  let blocked = 0;
  for (let i = 0; i < N; i++) {
    const a = o.theta - o.angularWidth / 2 + (i + .5) * o.angularWidth / N;
    if (blockers.some(b => G.rayCircleDistance(cue, a, b) < G.rayCircleDistance(cue, a, target) - 1e-10)) blocked++;
  }
  near(o.blockedFraction, blocked / N, .0002);
});

test('overlapping cue positions return an explicit invalid angle, never NaN', () => {
  const o = G.occlusion({ x: .5, y: .5 }, { x: .51, y: .5 }, []);
  assert.equal(o.valid, false); assert.ok(Number.isFinite(o.deltaRadians)); assert.equal(o.exposure, 1);
});

test('a bounce vertex near a corner counts as one contact on the nearer cushion', () => {
  const G2 = require('../src/geometry.js');
  const route = [{ x: 1.5, y: .4 }, { x: 3.54, y: .05 }, { x: 3.06, y: .22 }];
  assert.deepEqual(G2.cushionSignature(route).map(c => c.wall), ['right']);
});

test('aim preview finds the first ball, the cut angle, the object-ball line and the stun deflection', () => {
  const G2 = require('../src/geometry.js');
  const balls = [{ id: 'cue', x: 1, y: .9 }, { id: 'red1', x: 2, y: .9 }, { id: 'blue', x: 2.5, y: 1.4 }];
  const full = G2.aimPreview(balls, 'cue', 0);
  assert.equal(full.hit.id, 'red1');
  assert.ok(Math.abs(full.distance - (1 - 2 * G2.TABLE.radius)) < 1e-9);
  assert.ok(full.cutAngle < .01); assert.equal(full.cueDirection, null);
  assert.ok(Math.abs(full.objectDirection.x - 1) < 1e-9);
  const cut = G2.aimPreview(balls, 'cue', 0.5);
  assert.equal(cut.hit.id, 'red1');
  assert.ok(cut.cutAngle > 1 && cut.cutAngle < 90);
  assert.ok(cut.objectDirection.x > 0.9);
  const dot = cut.cueDirection.x * cut.objectDirection.x + cut.cueDirection.y * cut.objectDirection.y;
  assert.ok(Math.abs(dot) < 1e-9, 'stun deflection is perpendicular to the object-ball line');
  assert.ok(cut.cueDirection.x * cut.direction.x + cut.cueDirection.y * cut.direction.y > 0);
});

test('aim preview reports the first cushion and its mirror line when nothing is hit', () => {
  const G2 = require('../src/geometry.js');
  const balls = [{ id: 'cue', x: 1, y: .9 }];
  const preview = G2.aimPreview(balls, 'cue', -45);
  assert.equal(preview.hit, null); assert.equal(preview.wall, 'top');
  assert.ok(Math.abs(preview.end.y - G2.TABLE.radius) < 1e-9);
  assert.ok(preview.reflect.direction.y > 0 && preview.reflect.direction.x > 0);
  assert.equal(G2.aimPreview([{ id: 'cue', x: 1, y: .9, potted: true }], 'cue', 0), null);
});
