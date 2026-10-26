/* The learner's drawn route as a small editable model: freehand strokes, draggable points,
   undo and redo. Contains no DOM code, so every interaction rule can be tested directly. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || (typeof require !== 'undefined' ? require('./physics.js') : null);
  const G = Coach.geometry || (typeof require !== 'undefined' ? require('./geometry.js') : null);
  const S = Coach.scoring || (typeof require !== 'undefined' ? require('./scoring.js') : null);
  const R = P.TABLE.radius;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clone = points => points.map(p => ({ x: p.x, y: p.y }));
  const SNAP = 0.045;
  const HISTORY_LIMIT = 60;
  const STROKE_TOLERANCE = 0.02;

  // Keep a point inside the ball-centre area and pull it onto a cushion when it is close.
  function snapPoint(p) {
    let x = clamp(p.x, R, P.TABLE.width - R), y = clamp(p.y, R, P.TABLE.height - R);
    const railed = { x: false, y: false };
    if (x < R + SNAP) { x = R; railed.x = true; }
    if (x > P.TABLE.width - R - SNAP) { x = P.TABLE.width - R; railed.x = true; }
    if (y < R + SNAP) { y = R; railed.y = true; }
    if (y > P.TABLE.height - R - SNAP) { y = P.TABLE.height - R; railed.y = true; }
    return { x, y, onCushion: railed.x || railed.y };
  }

  // While drawing freehand, only keep the point inside the table. Snapping every nearby point onto a
  // cushion would flatten a shallow bounce into a run along the rail, and the bounce would be lost.
  function clampPoint(p) { return { x: clamp(p.x, R, P.TABLE.width - R), y: clamp(p.y, R, P.TABLE.height - R) }; }

  class RouteEditor {
    constructor(options = {}) {
      this.start = options.start || { x: 0, y: 0 };
      this.balls = options.balls || [];
      this.points = [];
      this.raw = [];
      this.drawing = false;
      this.selected = -1;
      this.dragging = -1;
      this.past = [];
      this.future = [];
      this.onChange = options.onChange || (() => {});
      this.lastNudge = null;
    }

    // ---- state ----
    get hasRoute() { return this.points.length > 1; }
    get busy() { return this.drawing || this.dragging > 0; }
    changed() { this.onChange(this); }
    remember() {
      this.past.push({ points: clone(this.points), selected: this.selected });
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
    }
    restore(entry) {
      this.points = clone(entry.points);
      this.selected = Math.min(entry.selected, this.points.length - 1);
      this.raw = [];
      this.drawing = false;
      this.dragging = -1;
    }
    get canUndo() { return this.past.length > 0; }
    get canRedo() { return this.future.length > 0; }
    undo() {
      if (!this.canUndo) return false;
      this.future.push({ points: clone(this.points), selected: this.selected });
      this.restore(this.past.pop());
      this.lastNudge = null;
      this.changed();
      return true;
    }
    redo() {
      if (!this.canRedo) return false;
      this.past.push({ points: clone(this.points), selected: this.selected });
      this.restore(this.future.pop());
      this.lastNudge = null;
      this.changed();
      return true;
    }
    clear() {
      if (!this.points.length && !this.drawing) return false;
      this.remember();
      this.points = [];
      this.raw = [];
      this.drawing = false;
      this.selected = -1;
      this.dragging = -1;
      this.lastNudge = null;
      this.changed();
      return true;
    }
    setPoints(points) {
      this.remember();
      this.points = clone(points);
      this.selected = -1;
      this.changed();
    }
    // A single straight segment from the cue ball to just short of a ball: a starting point for editing.
    starterRoute(target) {
      const dx = target.x - this.start.x, dy = target.y - this.start.y, d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(0, d - 2 * R);
      this.setPoints([this.start, { x: this.start.x + dx / d * reach, y: this.start.y + dy / d * reach }]);
      this.selected = 1;
      this.changed();
    }

    // ---- freehand drawing ----
    nearStart(p, radius = 0.14) { return G.distance(p, this.start) <= radius; }
    beginStroke() {
      this.remember();
      this.drawing = true;
      this.raw = [{ x: this.start.x, y: this.start.y }];
      this.points = this.raw;
      this.selected = -1;
      this.lastNudge = null;
      this.changed();
    }
    extendStroke(p) {
      if (!this.drawing) return false;
      const q = clampPoint(p), last = this.raw[this.raw.length - 1];
      if (G.distance(q, last) <= 0.005) return false;
      this.raw.push({ x: q.x, y: q.y });
      this.changed();
      return true;
    }
    endStroke() {
      if (!this.drawing) return false;
      this.drawing = false;
      const usable = this.raw.length > 2 && G.pathLength(this.raw) > 0.03;
      if (!usable) {
        // A tap, not a route: undo the placeholder history entry as well.
        this.points = this.past.length ? clone(this.past.pop().points) : [];
        this.raw = [];
        this.changed();
        return false;
      }
      // A hand-drawn line has hundreds of samples. Keep only the turns, so there are few points to adjust.
      this.points = clone(G.normalizePath(this.raw, { start: this.start, smooth: true, simplifyTolerance: STROKE_TOLERANCE }).points);
      this.raw = [];
      this.selected = -1;
      this.changed();
      return this.points.length > 1;
    }

    // ---- point editing ----
    hitHandle(p, radius = 0.045) {
      let best = -1, bestDistance = radius;
      for (let i = 1; i < this.points.length; i++) {
        const d = G.distance(p, this.points[i]);
        if (d <= bestDistance) { best = i; bestDistance = d; }
      }
      return best;
    }
    hitSegment(p, radius = 0.05) {
      let best = null;
      for (let i = 1; i < this.points.length; i++) {
        const d = G.pointSegmentDistance(p, this.points[i - 1], this.points[i]);
        if (d <= radius && (!best || d < best.distance)) best = { index: i, distance: d };
      }
      return best;
    }
    select(index) { this.selected = index >= 1 && index < this.points.length ? index : -1; this.changed(); }
    insert(index, p) {
      if (index < 1 || index > this.points.length) return -1;
      this.remember();
      const q = snapPoint(p);
      this.points.splice(index, 0, { x: q.x, y: q.y });
      this.selected = index;
      this.lastNudge = null;
      this.changed();
      return index;
    }
    // Insert at the middle of the longest segment: a keyboard- and touch-friendly way to add a point.
    insertMidpoint() {
      if (this.points.length < 2) return -1;
      const after = this.selected > 0 ? this.selected : this.points.length - 1;
      const a = this.points[after - 1], b = this.points[after];
      return this.insert(after, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    }
    beginDrag(index) {
      if (index < 1 || index >= this.points.length) return false;
      this.remember();
      this.dragging = index;
      this.selected = index;
      this.lastNudge = null;
      this.changed();
      return true;
    }
    dragTo(p) {
      if (this.dragging < 1) return false;
      const q = snapPoint(p);
      this.points[this.dragging] = { x: q.x, y: q.y };
      this.changed();
      return q.onCushion;
    }
    endDrag() {
      if (this.dragging < 1) return false;
      this.dragging = -1;
      this.changed();
      return true;
    }
    removeSelected() {
      if (this.selected < 1) return false;
      this.remember();
      this.points.splice(this.selected, 1);
      this.selected = Math.min(this.selected, this.points.length - 1);
      if (this.selected < 1) this.selected = -1;
      this.lastNudge = null;
      this.changed();
      return true;
    }
    // Millimetre-level movement for keyboard users. Repeated nudges of one point form one undo step.
    nudge(dx, dy) {
      if (this.selected < 1) return false;
      if (this.lastNudge !== this.selected) { this.remember(); this.lastNudge = this.selected; }
      const p = this.points[this.selected];
      this.points[this.selected] = { x: clamp(p.x + dx, R, P.TABLE.width - R), y: clamp(p.y + dy, R, P.TABLE.height - R) };
      this.changed();
      return true;
    }
    stepSelection(direction) {
      if (this.points.length < 2) return -1;
      const next = this.selected < 1 ? (direction > 0 ? 1 : this.points.length - 1) : this.selected + direction;
      if (next < 1 || next >= this.points.length) return -1;
      this.selected = next;
      this.changed();
      return next;
    }

    // ---- live feedback while drawing ----
    summary(legalTargetIds = []) {
      const pts = this.drawing ? this.raw : this.points;
      if (pts.length < 2) return { length: 0, cushions: [], first: null, firstLegal: null };
      const shaped = this.drawing ? pts : G.normalizePath(pts, { start: this.start }).points;
      const cushions = G.cushionSignature(shaped).map(c => ({ wall: c.wall, x: c.x, y: c.y }));
      const first = S.firstPathContact(shaped, this.balls);
      return { length: G.pathLength(shaped), cushions, first, firstLegal: first ? legalTargetIds.includes(first) : null };
    }
  }

  const api = { RouteEditor, snapPoint, clampPoint, SNAP, STROKE_TOLERANCE };
  Coach.routeEditor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
