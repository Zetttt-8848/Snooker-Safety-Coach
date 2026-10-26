'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const G = require('../src/geometry.js');
const { RouteEditor, snapPoint } = require('../src/route-editor.js');

const balls = [
  { id: 'cue', color: 'white', x: .7, y: .68 },
  { id: 'red1', color: 'red', x: 1.2, y: .68 },
  { id: 'blue', color: 'blue', x: 1.9, y: 1.15 }
];
const make = () => new RouteEditor({ start: { x: .7, y: .68 }, balls });
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
function draw(editor, points) {
  editor.beginStroke();
  for (const p of points) editor.extendStroke(p);
  return editor.endStroke();
}
const line = [{ x: .8, y: .68 }, { x: .9, y: .68 }, { x: 1.0, y: .68 }, { x: 1.1, y: .68 }, { x: 1.3, y: .68 }, { x: 1.6, y: .9 }];

test('a freehand stroke is anchored to the cue ball and becomes an editable route', () => {
  const editor = make();
  assert.equal(draw(editor, line), true);
  assert.ok(editor.hasRoute);
  near(editor.points[0].x, .7); near(editor.points[0].y, .68);
  assert.equal(editor.selected, -1, 'a finished stroke selects nothing, so no controls cover the table');
  assert.equal(editor.drawing, false);
});

test('a tap that never becomes a stroke leaves no route and no undo entry', () => {
  const editor = make();
  editor.beginStroke(); editor.extendStroke({ x: .701, y: .68 });
  assert.equal(editor.endStroke(), false);
  assert.equal(editor.points.length, 0);
  assert.equal(editor.canUndo, false);
});

test('drawing starts only near the cue ball', () => {
  const editor = make();
  assert.equal(editor.nearStart({ x: .75, y: .7 }), true);
  assert.equal(editor.nearStart({ x: 2, y: .7 }), false);
});

test('points near a cushion snap onto it and stay inside the ball-centre area', () => {
  const R = P.TABLE.radius;
  const snapped = snapPoint({ x: 1, y: R + .03 });
  near(snapped.y, R); assert.equal(snapped.onCushion, true);
  const outside = snapPoint({ x: -3, y: 9 });
  near(outside.x, R); near(outside.y, P.TABLE.height - R);
  assert.equal(snapPoint({ x: 1, y: .9 }).onCushion, false);
});

test('dragging a handle moves only that point, and undo restores the route', () => {
  const editor = make(); draw(editor, line);
  const before = JSON.parse(JSON.stringify(editor.points));
  const index = editor.hitHandle(editor.points[1]);
  assert.ok(index >= 1);
  assert.equal(editor.beginDrag(index), true);
  editor.dragTo({ x: editor.points[index].x, y: editor.points[index].y + .2 });
  editor.endDrag();
  assert.notDeepEqual(editor.points[index], before[index]);
  for (let i = 0; i < before.length; i++) if (i !== index) assert.deepEqual(editor.points[i], before[i]);
  assert.equal(editor.undo(), true);
  assert.deepEqual(editor.points, before);
  assert.equal(editor.redo(), true);
  assert.notDeepEqual(editor.points[index], before[index]);
});

test('the start point is never a draggable handle', () => {
  const editor = make(); draw(editor, line);
  assert.equal(editor.hitHandle({ x: .7, y: .68 }), -1);
  assert.equal(editor.beginDrag(0), false);
});

test('tapping a segment inserts a point that can be removed again', () => {
  const editor = make(); draw(editor, line);
  const count = editor.points.length;
  const hit = editor.hitSegment({ x: .95, y: .69 });
  assert.ok(hit);
  editor.insert(hit.index, { x: .95, y: .69 });
  assert.equal(editor.points.length, count + 1);
  assert.equal(editor.selected, hit.index);
  assert.equal(editor.removeSelected(), true);
  assert.equal(editor.points.length, count);
});

test('midpoint insertion gives keyboard and touch users a way to add points', () => {
  const editor = make(); editor.setPoints([{ x: .7, y: .68 }, { x: 1.7, y: .68 }]);
  editor.select(1);
  const index = editor.insertMidpoint();
  assert.equal(index, 1);
  near(editor.points[1].x, 1.2); near(editor.points[1].y, .68);
});

test('keyboard nudges move one point by exact steps and undo as a single step', () => {
  const editor = make(); editor.setPoints([{ x: .7, y: .68 }, { x: 1.5, y: .9 }]);
  editor.select(1);
  const x = editor.points[1].x;
  editor.nudge(.001, 0); editor.nudge(.001, 0); editor.nudge(.005, 0);
  near(editor.points[1].x, x + .007, 1e-12);
  editor.undo();
  near(editor.points[1].x, x, 1e-12);
});

test('clear, undo and redo form a safe history that never loses the route', () => {
  const editor = make(); draw(editor, line);
  const route = JSON.parse(JSON.stringify(editor.points));
  assert.equal(editor.clear(), true);
  assert.equal(editor.points.length, 0);
  assert.equal(editor.clear(), false);
  assert.equal(editor.undo(), true);
  assert.deepEqual(editor.points, route);
  assert.equal(editor.redo(), true);
  assert.equal(editor.points.length, 0);
});

test('a new action after undo discards the redo branch', () => {
  const editor = make(); draw(editor, line);
  editor.undo();
  assert.equal(editor.canRedo, true);
  draw(editor, line.slice(0, 4));
  assert.equal(editor.canRedo, false);
});

test('the starter route aims from the cue ball to just short of the target', () => {
  const editor = make();
  editor.starterRoute(balls[1]);
  assert.equal(editor.points.length, 2);
  near(G.distance(editor.points[1], balls[1]), 2 * P.TABLE.radius, 1e-9);
});

test('the live summary names cushion contacts and flags a blocked first contact', () => {
  const editor = make();
  editor.setPoints([{ x: .7, y: .68 }, { x: 1.9, y: 1.15 }]);
  let summary = editor.summary(['red1']);
  assert.equal(summary.first, 'blue'); assert.equal(summary.firstLegal, false);
  editor.setPoints([{ x: .7, y: .68 }, { x: 1.1, y: .68 }]);
  assert.equal(editor.summary(['red1']).first, null, 'a line that stops short has no contact yet');
  editor.setPoints([{ x: .7, y: .68 }, { x: 1.2, y: .68 }]);
  summary = editor.summary(['red1']);
  assert.equal(summary.first, 'red1'); assert.equal(summary.firstLegal, true);
  editor.setPoints([{ x: .7, y: .68 }, { x: 1.4, y: R_TOP() }, { x: 2.1, y: .68 }]);
  summary = editor.summary(['red1']);
  assert.deepEqual(summary.cushions.map(c => c.wall), ['top']);
});
function R_TOP() { return P.TABLE.radius; }

test('stepSelection walks the handles in order and stops at the ends', () => {
  const editor = make(); editor.setPoints([{ x: .7, y: .68 }, { x: 1, y: .8 }, { x: 1.4, y: .9 }]);
  assert.equal(editor.stepSelection(1), 1);
  assert.equal(editor.stepSelection(1), 2);
  assert.equal(editor.stepSelection(1), -1);
  assert.equal(editor.stepSelection(-1), 1);
});

test('a noisy freehand bounce keeps its cushion contacts and becomes a handful of editable points', () => {
  const R = P.TABLE.radius;
  // Down to the top cushion at a shallow angle and back, with a few millimetres of hand jitter.
  const editor = new RouteEditor({ start: { x: .7, y: .9 }, balls: [{ id: 'cue', color: 'white', x: .7, y: .9 }, { id: 'red1', color: 'red', x: 2.6, y: .9 }] });
  const stroke = [];
  for (let i = 1; i <= 80; i++) {
    const depth = i <= 40 ? i / 40 : (80 - i) / 40; // 0 at the ends, 1 at the cushion
    stroke.push({ x: .7 + i * .0275, y: Math.max(R, .9 - depth * (.9 - R - .01) + .004 * Math.sin(i * 2.3)) });
  }
  editor.beginStroke(); for (const p of stroke) editor.extendStroke(p); editor.endStroke();
  assert.ok(editor.points.length <= 8, 'few handles: ' + editor.points.length);
  const walls = editor.summary(['red1']).cushions.map(c => c.wall);
  assert.deepEqual(walls, ['top']);
});

test('drawing never snaps a point onto a cushion, but dragging a handle does', () => {
  const R = P.TABLE.radius, editor = new RouteEditor({ start: { x: .7, y: .9 }, balls: [] });
  editor.beginStroke(); editor.extendStroke({ x: 1, y: R + .03 });
  assert.ok(Math.abs(editor.raw.at(-1).y - (R + .03)) < 1e-12);
  editor.setPoints([{ x: .7, y: .9 }, { x: 1.4, y: .6 }]); editor.beginDrag(1);
  assert.equal(editor.dragTo({ x: 1.4, y: R + .03 }), true);
  assert.ok(Math.abs(editor.points[1].y - R) < 1e-12);
});
