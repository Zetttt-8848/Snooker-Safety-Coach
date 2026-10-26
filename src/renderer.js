/* Canvas drawing for the snooker table. One renderer per canvas; the static table (wood, cloth,
   markings) is painted once per size and every frame only draws what changed on top of it. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || (typeof require !== 'undefined' ? require('./physics.js') : null);
  const TABLE = P.TABLE;
  const ASPECT = 1.83;
  const TAU = Math.PI * 2;

  const colors = { white: '#fbf8ee', red: '#cc352d', yellow: '#f1d03f', green: '#2e8b57', brown: '#8d5a2b', blue: '#3f7bd0', pink: '#f2a3ba', black: '#1e2423' };
  const letters = { yellow: 'Y', green: 'G', brown: 'Br', blue: 'B', pink: 'P', black: 'Bk' };
  const ink = { route: '#59d0ff', reference: '#ffc857', shot: '#f4f1e4', closest: '#c9a6ff', good: '#7be0a4', warn: '#ffb454', bad: '#ff8a73', zone: '#e3b94f', ivory: '#f4eedb' };
  const config = { colourLabels: true };
  const toneColor = tone => ({ info: ink.route, warn: ink.warn, bad: ink.bad, good: ink.good, gold: ink.zone }[tone] || ink.ivory);

  // Small deterministic generator so the wood grain and cloth speckle never change between redraws.
  function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  class TableRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.mini = !!options.mini;
      this.animated = false;
      this.motion = options.motion !== false;
      this.state = {};
      this.frame = 0;
      this.resize();
      if (typeof ResizeObserver === 'function') {
        this.observer = new ResizeObserver(() => { if (this.measure()) { this.resize(); this.draw(this.state); } });
        this.observer.observe(canvas);
      }
    }

    measure() {
      const width = Math.round(this.canvas.getBoundingClientRect().width);
      return width > 0 && width !== this.lastWidth;
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = rect.width || this.w || 900;
      this.lastWidth = Math.round(rect.width);
      this.h = this.w / ASPECT;
      this.dpr = Math.min((typeof devicePixelRatio === 'number' && devicePixelRatio) || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.pad = this.w * (this.mini ? .035 : .061);
      this.scale = (this.w - this.pad * 2) / TABLE.width;
      this.oy = (this.h - TABLE.height * this.scale) / 2;
      this.cache = null;
    }
    project(p) { return { x: this.pad + p.x * this.scale, y: this.oy + p.y * this.scale }; }
    unproject(e) {
      const b = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - b.left) * this.w / b.width - this.pad) / this.scale, y: ((e.clientY - b.top) * this.h / b.height - this.oy) / this.scale };
    }
    // Pixels on the page for a table point, relative to the canvas element (for overlays).
    toPage(p) {
      const q = this.project(p), b = this.canvas.getBoundingClientRect();
      return { x: q.x * b.width / this.w, y: q.y * b.height / this.h };
    }

    // ---------- static table ----------
    buildCache() {
      const w = this.w, h = this.h, scale = this.scale, x0 = this.pad, y0 = this.oy, tw = TABLE.width * scale, th = TABLE.height * scale;
      const layer = document.createElement('canvas');
      layer.width = Math.round(w * this.dpr); layer.height = Math.round(h * this.dpr);
      const c = layer.getContext('2d');
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const rand = lcg(7);
      const mini = this.mini, cushion = (mini ? .022 : .042) * scale;

      // Wooden frame with grain.
      const wood = c.createLinearGradient(0, 0, w, h);
      wood.addColorStop(0, '#5d3519'); wood.addColorStop(.5, '#42250f'); wood.addColorStop(1, '#2d1809');
      c.fillStyle = wood; roundRect(c, 0, 0, w, h, mini ? 6 : 14); c.fill();
      if (!mini) {
        c.save(); roundRect(c, 0, 0, w, h, 14); c.clip();
        for (let i = 0; i < 90; i++) {
          c.strokeStyle = `rgba(${rand() < .5 ? '255,225,170' : '20,8,0'},${.025 + rand() * .05})`;
          c.lineWidth = .6 + rand() * 1.4;
          const y = rand() * h; c.beginPath(); c.moveTo(0, y);
          c.bezierCurveTo(w * .3, y + (rand() - .5) * 14, w * .65, y + (rand() - .5) * 14, w, y + (rand() - .5) * 8); c.stroke();
        }
        c.restore();
        c.strokeStyle = 'rgba(255,225,170,.22)'; c.lineWidth = 1; roundRect(c, 1.5, 1.5, w - 3, h - 3, 13); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2; roundRect(c, x0 - cushion - 5, y0 - cushion - 5, tw + 2 * cushion + 10, th + 2 * cushion + 10, 6); c.stroke();
      }

      // Cushion rubber.
      const rubber = c.createLinearGradient(0, y0 - cushion, 0, y0 + th + cushion);
      rubber.addColorStop(0, '#0d3a2d'); rubber.addColorStop(.5, '#0a2c22'); rubber.addColorStop(1, '#0d3a2d');
      c.fillStyle = rubber; roundRect(c, x0 - cushion, y0 - cushion, tw + 2 * cushion, th + 2 * cushion, 5); c.fill();

      // Cloth with overhead lighting.
      const cloth = c.createRadialGradient(x0 + tw * .48, y0 + th * .42, th * .08, x0 + tw * .5, y0 + th * .5, tw * .66);
      cloth.addColorStop(0, '#2f8264'); cloth.addColorStop(.55, '#236b52'); cloth.addColorStop(1, '#154a39');
      c.fillStyle = cloth; c.fillRect(x0, y0, tw, th);
      if (!mini) {
        c.save(); c.beginPath(); c.rect(x0, y0, tw, th); c.clip();
        for (let i = 0; i < tw * th / 90; i++) {
          c.fillStyle = rand() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,20,10,.05)';
          c.fillRect(x0 + rand() * tw, y0 + rand() * th, 1.2, 1.2);
        }
        const edge = c.createLinearGradient(0, y0, 0, y0 + th);
        edge.addColorStop(0, 'rgba(0,0,0,.28)'); edge.addColorStop(.08, 'rgba(0,0,0,0)'); edge.addColorStop(.92, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,.28)');
        c.fillStyle = edge; c.fillRect(x0, y0, tw, th);
        c.restore();
      }

      // Markings: baulk line, the D and spots.
      c.strokeStyle = 'rgba(244,238,219,.38)'; c.lineWidth = mini ? .8 : 1.2;
      const baulk = x0 + TABLE.baulk * scale;
      c.beginPath(); c.moveTo(baulk, y0); c.lineTo(baulk, y0 + th); c.stroke();
      c.beginPath(); c.arc(baulk, y0 + th / 2, TABLE.dRadius * scale, Math.PI / 2, Math.PI * 1.5); c.stroke();
      if (!mini) {
        c.fillStyle = 'rgba(244,238,219,.5)';
        for (const [sx, sy] of [[.737, .889], [1.7845, .889], [2.67675, .889], [3.245, .889], [.737, .597], [.737, 1.181]]) {
          c.beginPath(); c.arc(x0 + sx * scale, y0 + sy * scale, Math.max(1.8, .005 * scale), 0, TAU); c.fill();
        }
      }

      // Pockets with brass rims.
      const mouth = this.pocketMouth = [];
      for (const [i, p] of TABLE.pockets.entries()) {
        const middle = i % 3 === 1, r = (middle ? .062 : .056) * scale;
        const ox = middle ? 0 : (p.x === 0 ? -1 : 1) * .018 * scale, oy = p.y === 0 ? -1 : 1;
        const cx = x0 + p.x * scale + ox, cy = y0 + p.y * scale + (middle ? oy * .016 * scale : oy * .018 * scale);
        mouth.push({ x: cx, y: cy, r });
        const hole = c.createRadialGradient(cx, cy, r * .2, cx, cy, r * 1.25);
        hole.addColorStop(0, '#020807'); hole.addColorStop(.75, '#06110d'); hole.addColorStop(1, '#173a2e');
        c.fillStyle = hole; c.beginPath(); c.arc(cx, cy, r * 1.12, 0, TAU); c.fill();
        c.strokeStyle = '#b8944a'; c.lineWidth = mini ? 1.2 : 2.4; c.beginPath(); c.arc(cx, cy, r * 1.12, 0, TAU); c.stroke();
        c.strokeStyle = 'rgba(255,240,190,.45)'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r * 1.12 + 1.5, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      }

      // Rail diamonds.
      if (!mini) {
        c.fillStyle = 'rgba(244,238,219,.82)';
        const diamond = (dx, dy) => { c.save(); c.translate(dx, dy); c.rotate(Math.PI / 4); c.fillRect(-2.6, -2.6, 5.2, 5.2); c.restore(); };
        const rail = (this.pad - cushion) / 2 + cushion;
        for (let i = 1; i < 8; i++) if (i !== 4) { diamond(x0 + tw * i / 8, y0 - rail); diamond(x0 + tw * i / 8, y0 + th + rail); }
        for (let j = 1; j < 4; j++) if (j !== 2 || true) { diamond(x0 - rail, y0 + th * j / 4); diamond(x0 + tw + rail, y0 + th * j / 4); }
      }
      this.cache = layer;
    }

    // ---------- primitives ----------
    path(points, color, width, dash = [], alpha = 1, glow = 0) {
      if (!points || points.length < 2) return;
      const c = this.ctx;
      c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash);
      if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
      c.beginPath();
      points.forEach((p, i) => { const q = this.project(p); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); });
      c.stroke(); c.restore();
    }
    arrowhead(points, color, size = 9, alpha = 1) {
      if (!points || points.length < 2) return;
      let tip = points[points.length - 1], from = null;
      for (let i = points.length - 2; i >= 0 && !from; i--) if (Math.hypot(points[i].x - tip.x, points[i].y - tip.y) > .01) from = points[i];
      if (!from) return;
      const a = this.project(from), b = this.project(tip), angle = Math.atan2(b.y - a.y, b.x - a.x), c = this.ctx;
      c.save(); c.globalAlpha = alpha; c.translate(b.x, b.y); c.rotate(angle); c.fillStyle = color;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-size, -size * .55); c.lineTo(-size * .7, 0); c.lineTo(-size, size * .55); c.closePath(); c.fill(); c.restore();
    }
    ring(p, radius, color, width = 2, dash = [], alpha = 1) {
      const q = this.project(p), c = this.ctx;
      c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash);
      c.beginPath(); c.arc(q.x, q.y, radius * this.scale, 0, TAU); c.stroke(); c.restore();
    }
    disc(p, radius, fill, alpha = 1) {
      const q = this.project(p), c = this.ctx;
      c.save(); c.globalAlpha = alpha; c.fillStyle = fill; c.beginPath(); c.arc(q.x, q.y, radius * this.scale, 0, TAU); c.fill(); c.restore();
    }
    tag(p, text, tone = 'info', offsetY = -1) {
      if (this.mini) return;
      const c = this.ctx, q = this.project(p), size = Math.max(11, Math.min(15, this.w * .0125));
      c.save(); c.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(text).width + 16, th = size + 9;
      const x = Math.max(4, Math.min(this.w - tw - 4, q.x - tw / 2)), y = Math.max(4, q.y + offsetY * (TABLE.radius * this.scale + th * .8 + 4) - th / 2);
      c.fillStyle = 'rgba(8,20,16,.88)'; roundRect(c, x, y, tw, th, th / 2); c.fill();
      c.strokeStyle = toneColor(tone); c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#f4eedb'; c.fillText(text, x + tw / 2, y + th / 2 + .5); c.restore();
    }
    drawBall(b, glow) {
      const c = this.ctx, q = this.project(b), r = Math.max(TABLE.radius * this.scale, 3), col = colors[b.color] || b.color || colors.red;
      c.save();
      c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(q.x + r * .22, q.y + r * .34, r * .98, r * .86, 0, 0, TAU); c.fill();
      if (glow) { c.shadowColor = glow; c.shadowBlur = r * 1.4; }
      const g = c.createRadialGradient(q.x - r * .35, q.y - r * .4, r * .08, q.x, q.y, r);
      g.addColorStop(0, '#fff'); g.addColorStop(.18, col); g.addColorStop(1, b.color === 'white' ? '#bfc6b3' : '#000');
      c.fillStyle = g; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill(); c.shadowBlur = 0;
      const shade = c.createRadialGradient(q.x - r * .3, q.y - r * .35, r * .1, q.x, q.y, r);
      shade.addColorStop(0, 'rgba(255,255,255,0)'); shade.addColorStop(.7, b.color === 'white' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,.12)'); shade.addColorStop(1, 'rgba(0,0,0,.34)');
      c.fillStyle = shade; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.82)'; c.beginPath(); c.ellipse(q.x - r * .34, q.y - r * .4, r * .22, r * .13, -.6, 0, TAU); c.fill();
      if (!this.mini && r >= 9 && letters[b.color] && config.colourLabels) {
        c.fillStyle = b.color === 'black' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)';
        c.font = `700 ${Math.round(r * .78)}px "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(letters[b.color], q.x + r * .06, q.y + r * .12);
      }
      c.restore();
    }
    cueStick(cue, angleDeg, pull) {
      const c = this.ctx, q = this.project(cue), a = angleDeg * Math.PI / 180, r = TABLE.radius * this.scale;
      const gap = r + (.02 + pull * .16) * this.scale, length = 1.55 * this.scale;
      c.save(); c.translate(q.x, q.y); c.rotate(a + Math.PI); c.translate(gap, 0);
      const stick = c.createLinearGradient(0, -5, 0, 5);
      stick.addColorStop(0, '#e9c58a'); stick.addColorStop(.5, '#b9854a'); stick.addColorStop(1, '#6e451f');
      c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
      c.fillStyle = stick; c.beginPath(); c.moveTo(0, -2.1); c.lineTo(length, -4.8); c.lineTo(length, 4.8); c.lineTo(0, 2.1); c.closePath(); c.fill();
      c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.fillStyle = '#8fc4e8'; c.fillRect(0, -2.1, 5, 4.2);
      c.fillStyle = '#f4eedb'; c.fillRect(5, -2.2, 3, 4.4);
      c.fillStyle = '#2b1a0e'; c.fillRect(length * .62, -4.4, length * .38, 8.8);
      c.restore();
    }

    // ---------- frame ----------
    draw(state = {}) {
      this.state = state;
      if (!this.cache) this.buildCache();
      const c = this.ctx, s = state, time = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
      const pulse = this.motion && !reduceMotion() ? .5 + .5 * Math.sin(time * 3.2) : .6;
      const px = Math.max(1, this.w / 900);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      c.drawImage(this.cache, 0, 0, this.w, this.h);
      const x0 = this.pad, y0 = this.oy, tw = TABLE.width * this.scale, th = TABLE.height * this.scale;
      c.save(); c.beginPath(); c.rect(x0 - 1, y0 - 1, tw + 2, th + 2); c.clip();

      if (s.safeLeaves) this.drawSafeLeaves(s.safeLeaves);
      if (s.zones) for (const z of s.zones) this.drawZone(z, pulse, time, px);
      if (s.cone) this.drawCone(s.cone);
      if (s.reference) {
        this.path(s.reference, ink.reference, .0525 * this.scale, [], .1);
        this.path(s.reference, ink.reference, 2.4 * px, [7 * px, 6 * px], .95);
        this.arrowhead(s.reference, ink.reference, 10 * px, .95);
      }
      if (s.closest) this.path(s.closest, ink.closest, 2 * px, [3 * px, 6 * px], .9);
      if (s.predicted) this.path(s.predicted, '#f4eedb', 1.6 * px, [4 * px, 6 * px], .6);
      if (s.trails) for (const [id, pts] of Object.entries(s.trails)) {
        const ball = (s.balls || []).find(b => b.id === id);
        this.path(pts, id === 'cue' ? ink.shot : (colors[ball?.color] || '#fff'), (id === 'cue' ? 2.6 : 2) * px, [], id === 'cue' ? .75 : .6, id === 'cue' ? 6 : 0);
      }
      if (s.shotPath) this.path(s.shotPath, ink.shot, 2.6 * px, [2 * px, 6 * px], .95);
      if (s.student) {
        this.path(s.student, ink.route, 3.6 * px, [], .98, 10);
        if (!s.drawing) this.arrowhead(s.student, ink.route, 11 * px);
      }
      if (s.gap) { this.path([s.gap.from, s.gap.to], ink.warn, 1.6 * px, [3 * px, 4 * px], .9); this.ring(s.gap.to, .018, ink.warn, 2 * px); }
      if (s.aim) this.drawAim(s.aim, px);
      if (s.stick) this.cueStick(s.stick.cue, s.stick.angle, s.stick.pull);

      // Ball highlights drawn under the balls: soft glow for the ball the lesson is about.
      if (s.rings) for (const r of s.rings) {
        const ball = (s.balls || []).find(b => b.id === r.id && !b.potted);
        if (!ball) continue;
        const col = toneColor(r.tone);
        this.ring(ball, TABLE.radius * (1.55 + (r.pulse ? pulse * .25 : 0)), col, 2.2 * px, r.dash === false ? [] : [4 * px, 4 * px], .95);
        if (r.pulse) this.disc(ball, TABLE.radius * (1.55 + pulse * .55), col, .12 + .08 * pulse);
      }
      for (const b of (s.balls || [])) if (!b.potted) this.drawBall(b, b.id === s.selectedId ? ink.zone : null);
      if (s.selectedId) { const sel = (s.balls || []).find(b => b.id === s.selectedId); if (sel && !sel.potted) this.ring(sel, TABLE.radius * 1.7, ink.zone, 2 * px); }
      c.restore();

      if (s.cushionMarks) s.cushionMarks.forEach((m, i) => this.drawCushionMark(m, i + 1, px));
      if (s.labels) for (const l of s.labels) {
        const ball = (s.balls || []).find(b => b.id === l.id && !b.potted);
        if (ball) this.tag(ball, l.text, l.tone, l.below ? 1 : -1);
      }
      if (s.points) for (const p of s.points) this.tag(p.at, p.text, p.tone, p.below ? 1 : -1);
      if (s.handles) this.drawHandles(s.handles, s.activeHandle, px);
      if (s.startPulse) {
        const cue = (s.balls || []).find(b => b.id === 'cue');
        if (cue) { this.ring(cue, TABLE.radius * (2.2 + pulse * 1.0), ink.route, 2.2 * px, [], .35 + .5 * (1 - pulse)); this.ring(cue, TABLE.radius * 1.6, ink.route, 2.4 * px, [5 * px, 4 * px]); }
      }
      if (s.vignette) { c.fillStyle = 'rgba(5,14,11,.35)'; c.fillRect(0, 0, this.w, this.h); }
    }

    drawSafeLeaves(map) {
      // Cache by map identity and table size: the geometry is never recomputed
      // by an animation frame, and source switching cannot reuse another shot.
      const width = Math.ceil(TABLE.width * this.scale), height = Math.ceil(TABLE.height * this.scale);
      if (!this.safeCache || this.safeCache.map !== map || this.safeCache.width !== width) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        for (const span of map.spans) {
          ctx.fillStyle = span.kind === 2 ? 'rgba(206,167,255,.68)' : 'rgba(111,244,204,.27)';
          ctx.fillRect(span.x * this.scale, span.y * this.scale, span.width * this.scale + .3, span.height * this.scale + .3);
        }
        ctx.strokeStyle = 'rgba(206,255,240,.64)'; ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let row = 0; row < map.rows; row++) for (let col = 0; col < map.cols; col++) {
          const i = row * map.cols + col, kind = map.cells[i]; if (!kind) continue;
          const x = (TABLE.radius + col * map.dx) * this.scale, y = (TABLE.radius + row * map.dy) * this.scale;
          const w = map.dx * this.scale, h = map.dy * this.scale;
          if (!row || map.cells[i - map.cols] !== kind) { ctx.moveTo(x,y); ctx.lineTo(x+w,y); }
          if (!col || map.cells[i - 1] !== kind) { ctx.moveTo(x,y); ctx.lineTo(x,y+h); }
          if (row === map.rows-1 || !map.cells[i+map.cols]) { ctx.moveTo(x,y+h); ctx.lineTo(x+w,y+h); }
          if (col === map.cols-1 || !map.cells[i+1]) { ctx.moveTo(x+w,y); ctx.lineTo(x+w,y+h); }
        }
        ctx.stroke(); this.safeCache = { map, width, canvas };
      }
      this.ctx.drawImage(this.safeCache.canvas, this.pad, this.oy);
    }

    drawZone(z, pulse, time, px) {
      const q = this.project(z), r = z.radius * this.scale, c = this.ctx, col = toneColor(z.tone || 'gold');
      const fill = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
      fill.addColorStop(0, col + '55'); fill.addColorStop(.7, col + '26'); fill.addColorStop(1, col + '10');
      c.fillStyle = fill; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill();
      c.save(); c.strokeStyle = col; c.lineWidth = 2.2 * px; c.setLineDash([8 * px, 6 * px]);
      c.lineDashOffset = this.motion && !reduceMotion() ? -time * 14 : 0;
      c.globalAlpha = .65 + .3 * pulse; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.stroke(); c.restore();
      // Above the circle, so the label never sits on top of the balls that finish inside it.
      if (z.label) this.tag({ x: z.x, y: z.y - z.radius }, z.label, z.tone || 'gold', -1);
    }

    drawCone(cone) {
      const { cue, target, view } = cone, c = this.ctx;
      if (!view || !view.valid) return;
      const q = this.project(cue), reach = (view.distance + .5) * this.scale, alpha = Math.asin(Math.min(1, 2 * TABLE.radius / view.distance));
      const wedge = (from, to, fill) => {
        c.fillStyle = fill; c.beginPath(); c.moveTo(q.x, q.y);
        c.arc(q.x, q.y, reach, view.theta + from, view.theta + to); c.closePath(); c.fill();
      };
      c.save();
      // Open directions in green, blocked directions in coral. Drawn side by side so the colours never blend.
      let from = -alpha;
      for (const interval of [...view.intervals].sort((a, b) => a.start - b.start)) {
        if (interval.start > from + 1e-9) wedge(from, interval.start, 'rgba(123,224,164,.30)');
        wedge(interval.start, interval.end, 'rgba(255,138,115,.55)');
        from = Math.max(from, interval.end);
      }
      if (from < alpha - 1e-9) wedge(from, alpha, 'rgba(123,224,164,.30)');
      c.strokeStyle = 'rgba(123,224,164,.7)'; c.lineWidth = 1.4; c.setLineDash([5, 5]);
      for (const a of [-alpha, alpha]) { c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + Math.cos(view.theta + a) * reach, q.y + Math.sin(view.theta + a) * reach); c.stroke(); }
      c.restore();
    }

    drawAim(aim, px) {
      const d = aim.direction, from = aim.cue, end = aim.end;
      this.path([from, end], '#f4eedb', 1.6 * px, [7 * px, 6 * px], .85);
      if (aim.hit) {
        this.ring(end, TABLE.radius, '#f4eedb', 1.6 * px, [], .8);
        const o = aim.objectDirection, start = { x: aim.hit.x, y: aim.hit.y };
        this.path([start, { x: start.x + o.x * .9, y: start.y + o.y * .9 }], ink.warn, 2.4 * px, [], .95);
        this.arrowhead([start, { x: start.x + o.x * .9, y: start.y + o.y * .9 }], ink.warn, 8 * px);
        if (aim.cueDirection) {
          const t = aim.cueDirection;
          this.path([end, { x: end.x + t.x * .45, y: end.y + t.y * .45 }], '#f4eedb', 1.6 * px, [3 * px, 5 * px], .75);
        }
      } else if (aim.reflect) {
        const r = aim.reflect;
        this.ring(end, .014, '#f4eedb', 1.6 * px, [], .6);
        this.path([r.from, { x: r.from.x + r.direction.x * 1.1, y: r.from.y + r.direction.y * 1.1 }], '#f4eedb', 1.3 * px, [2 * px, 7 * px], .55);
      }
      void d;
    }

    drawCushionMark(m, number, px) {
      const q = this.project(m), c = this.ctx, size = 8 * px;
      const dx = m.wall === 'left' ? -1 : m.wall === 'right' ? 1 : 0, dy = m.wall === 'top' ? -1 : m.wall === 'bottom' ? 1 : 0;
      const cx = q.x + dx * (TABLE.radius * this.scale + 5), cy = q.y + dy * (TABLE.radius * this.scale + 5);
      c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4);
      c.fillStyle = ink.zone; c.strokeStyle = '#1b1405'; c.lineWidth = 1.5;
      c.fillRect(-size / 2, -size / 2, size, size); c.strokeRect(-size / 2, -size / 2, size, size); c.restore();
      c.save(); c.fillStyle = '#1b1405'; c.font = `700 ${Math.round(8.5 * px)}px "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(number), cx, cy + .5); c.restore();
    }

    drawHandles(points, active, px) {
      const c = this.ctx, coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
      const r = Math.max(coarse ? 13 : 9, .02 * this.scale);
      points.forEach((p, i) => {
        if (i === 0) return;
        const q = this.project(p), on = i === active;
        c.save();
        c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6;
        c.fillStyle = on ? ink.zone : '#0d241d'; c.strokeStyle = on ? '#fff3c9' : ink.route; c.lineWidth = on ? 3 : 2.4;
        c.beginPath(); c.arc(q.x, q.y, on ? r + 2 : r, 0, TAU); c.fill(); c.stroke(); c.shadowBlur = 0;
        c.fillStyle = on ? '#1b1405' : '#e8f8ff'; c.font = `700 ${Math.round(Math.max(10, r * .95))}px "Segoe UI", system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i), q.x, q.y + .5); c.restore();
      });
    }

    // Redraw continuously while pulses are visible; stops itself when asked or when the canvas is hidden.
    animate(on) {
      this.animated = on;
      if (!on || this.loop) return;
      const tick = () => {
        if (!this.animated) { this.loop = 0; return; }
        if (this.canvas.offsetParent !== null && this.state.animate) this.draw(this.state);
        this.loop = requestAnimationFrame(tick);
      };
      this.loop = requestAnimationFrame(tick);
    }
    destroy() { this.animated = false; this.observer?.disconnect(); }
  }

  // A static preview of a puzzle layout for cards and the editor.
  function thumbnail(canvas, puzzle) {
    const renderer = new TableRenderer(canvas, { mini: true, motion: false });
    const focus = puzzle.focus || {};
    renderer.draw({ balls: puzzle.balls.map(P.createBall),
      rings: [{ id: puzzle.targetId, tone: 'warn', pulse: false }, ...(focus.role === 'colour' ? [{ id: focus.id, tone: 'info', pulse: false, dash: false }] : [])] });
    return renderer;
  }

  Coach.renderer = { TableRenderer, thumbnail, colors, ink, roundRect, ASPECT, config };
  if (typeof module !== 'undefined' && module.exports) module.exports = Coach.renderer;
})(typeof globalThis !== 'undefined' ? globalThis : window);
