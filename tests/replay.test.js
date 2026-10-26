'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const R = require('../src/replay.js');

const balls = [P.createBall({ id: 'cue', color: 'white', x: .7, y: .68 }), P.createBall({ id: 'red1', color: 'red', x: 1.2, y: .68 })];
const result = P.simulate(balls, { angle: 0, cueSpeed: 1, top: 0, side: 0 });
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);

test('stateAt returns the start, the end and interpolated positions in between', () => {
  near(R.stateAt(result, 0).balls[0].x, .7);
  const end = R.stateAt(result, result.duration + 5);
  near(end.balls[0].x, result.balls[0].x, 1e-9); near(end.balls[1].x, result.balls[1].x, 1e-9);
  const frames = result.frames, i = Math.floor(frames.length / 2);
  const mid = (frames[i].t + frames[i + 1].t) / 2, state = R.stateAt(result, mid);
  near(state.balls[1].x, (frames[i].balls[1].x + frames[i + 1].balls[1].x) / 2, 1e-9);
});

test('stateAt does not mutate the recorded frames', () => {
  const before = JSON.stringify(result.frames[3]);
  R.stateAt(result, result.frames[3].t + .001).balls[0].x = 99;
  assert.equal(JSON.stringify(result.frames[3]), before);
});

test('trails only include points travelled so far and end at the ball', () => {
  const half = R.trailsAt(result, result.duration / 2);
  const now = R.stateAt(result, result.duration / 2).balls[0];
  const cue = half.cue;
  assert.ok(cue.length >= 2);
  near(cue[cue.length - 1].x, now.x); near(cue[cue.length - 1].y, now.y);
  const full = R.trailsAt(result, result.duration);
  assert.ok(full.cue.length >= cue.length);
});

test('markers list the real contacts in time order', () => {
  const markers = R.markers(result);
  assert.ok(markers.some(m => m.kind === 'ball' && m.ids.includes('cue') && m.ids.includes('red1')));
  for (let i = 1; i < markers.length; i++) assert.ok(markers[i].t >= markers[i - 1].t);
});

function manual(speed = 1) {
  const seen = [], frames = [];
  const player = new R.Player(result, { speed, onFrame: (s, t) => frames.push(t), onEvent: e => seen.push(e), onEnd: () => seen.push('end'), raf: () => {} });
  return { player, seen, frames };
}

test('advance fires each contact once and reports the end', () => {
  const { player, seen } = manual();
  let finished = false;
  for (let i = 0; i < 1000 && !finished; i++) finished = player.advance(.05);
  assert.equal(finished, true);
  const contacts = R.markers(result);
  assert.equal(seen.length, contacts.length);
  near(player.time, player.duration);
});

test('speed scales the clock and seeking backwards re-arms later contacts', () => {
  const { player, seen } = manual(2);
  player.advance(1);
  near(player.time, 2);
  const before = seen.length;
  player.seek(0);
  player.advance(player.duration);
  assert.ok(seen.length >= before);
  assert.equal(seen.length, R.markers(result).length + before);
});

test('seek clamps to the recording and emits a frame', () => {
  const { player, frames } = manual();
  player.seek(-4); near(player.time, 0);
  player.seek(1e6); near(player.time, player.duration);
  assert.equal(frames.length, 2);
});

test('the player drives itself from the supplied frame callback and stops at the end', () => {
  const queue = [];
  const frames = [];
  let ended = false;
  const player = new R.Player(result, { raf: cb => queue.push(cb), onFrame: (s, t) => frames.push(t), onEnd: () => { ended = true; } });
  player.play();
  let now = 1000;
  while (queue.length && !ended) { const cb = queue.shift(); now += 50; cb(now); }
  assert.equal(ended, true); assert.equal(player.playing, false);
  assert.ok(frames.length > 10);
});

test('pausing cancels the scheduled frame loop', () => {
  const queue = [];
  const player = new R.Player(result, { raf: cb => queue.push(cb) });
  player.play(); const first = queue.shift(); first(1000);
  player.pause();
  const t = player.time;
  while (queue.length) queue.shift()(2000);
  near(player.time, t);
});
