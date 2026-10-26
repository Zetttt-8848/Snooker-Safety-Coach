/* Replay of a recorded shot: pure sampling functions plus a small player that owns the clock.
   The player is DOM-free; the caller supplies requestAnimationFrame so tests can drive time by hand. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const copyBall = b => ({ ...b });

  // Interpolated ball positions at time t (seconds). Frames are recorded every 1/60 s.
  function stateAt(result, t) {
    const frames = result.frames;
    if (!frames || !frames.length) return { t: 0, balls: (result.balls || []).map(copyBall) };
    if (t <= frames[0].t) return { t: frames[0].t, balls: frames[0].balls.map(copyBall) };
    const last = frames[frames.length - 1];
    if (t >= last.t) return { t: last.t, balls: last.balls.map(copyBall) };
    let lo = 0, hi = frames.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (frames[mid].t <= t) lo = mid; else hi = mid; }
    const a = frames[lo], b = frames[hi], f = clamp((t - a.t) / ((b.t - a.t) || 1), 0, 1);
    return { t, balls: a.balls.map((ball, i) => ({ ...ball,
      x: ball.x + (b.balls[i].x - ball.x) * f, y: ball.y + (b.balls[i].y - ball.y) * f,
      potted: f >= 1 ? b.balls[i].potted : ball.potted })) };
  }

  // Path travelled so far, per ball, ending exactly at the interpolated position.
  function trailsAt(result, t, now = stateAt(result, t)) {
    const trails = {};
    for (const [id, track] of Object.entries(result.tracks || {})) {
      const points = [];
      for (const p of track) { if (p.t > t) break; points.push({ x: p.x, y: p.y }); }
      const ball = now.balls.find(b => b.id === id);
      if (ball && !ball.potted && points.length) points.push({ x: ball.x, y: ball.y });
      if (points.length > 1) trails[id] = points;
    }
    return trails;
  }

  // Contacts worth marking on a timeline, in time order.
  function markers(result) {
    return (result.events || []).filter(e => e.type === 'ball' || e.type === 'cushion' || e.type === 'pocket')
      .map(e => ({ t: e.t, kind: e.type, ids: e.ids || [e.id], wall: e.wall || null, x: e.x, y: e.y, strength: e.impulse || 0 }))
      .sort((a, b) => a.t - b.t);
  }

  class Player {
    constructor(result, options = {}) {
      this.result = result;
      this.duration = result.duration || (result.frames?.length ? result.frames[result.frames.length - 1].t : 0);
      this.time = 0;
      this.speed = options.speed || 1;
      this.playing = false;
      this.onFrame = options.onFrame || (() => {});
      this.onEvent = options.onEvent || (() => {});
      this.onEnd = options.onEnd || (() => {});
      this.raf = options.raf || (typeof requestAnimationFrame === 'function' ? cb => requestAnimationFrame(cb) : null);
      this.cancel = options.cancel || (typeof cancelAnimationFrame === 'function' ? id => cancelAnimationFrame(id) : () => {});
      this.events = markers(result);
      this.nextEvent = 0;
      this.token = 0;
      this.last = 0;
    }
    snapshot() { return stateAt(this.result, this.time); }
    emit() { this.onFrame(this.snapshot(), this.time, this.duration); }
    // Move the clock forward by dt real seconds and report any contacts crossed.
    advance(dt) {
      const from = this.time;
      this.time = clamp(this.time + dt * this.speed, 0, this.duration);
      while (this.nextEvent < this.events.length && this.events[this.nextEvent].t <= this.time) {
        if (this.events[this.nextEvent].t >= from - 1e-9) this.onEvent(this.events[this.nextEvent]);
        this.nextEvent++;
      }
      this.emit();
      return this.time >= this.duration;
    }
    play() {
      if (this.playing) return;
      if (this.time >= this.duration) this.seek(0);
      this.playing = true;
      const token = ++this.token;
      this.last = 0;
      const step = now => {
        if (token !== this.token || !this.playing) return;
        const dt = this.last ? Math.min(0.25, (now - this.last) / 1000) : 0;
        this.last = now;
        if (this.advance(dt)) { this.playing = false; this.onEnd(); return; }
        this.raf(step);
      };
      if (this.raf) this.raf(step);
    }
    pause() { this.playing = false; this.token++; }
    toggle() { this.playing ? this.pause() : this.play(); return this.playing; }
    seek(t) {
      this.time = clamp(t, 0, this.duration);
      this.nextEvent = this.events.findIndex(e => e.t > this.time);
      if (this.nextEvent < 0) this.nextEvent = this.events.length;
      this.emit();
    }
    setSpeed(speed) { this.speed = clamp(speed, 0.1, 8); }
    dispose() { this.pause(); }
  }

  const api = { stateAt, trailsAt, markers, Player };
  Coach.replay = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
