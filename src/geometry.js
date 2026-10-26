(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const TABLE = Coach.physics?.TABLE || { width: 3.569, height: 1.778, radius: .02625 };
  const EPS = 1e-10;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const copy = p => Number.isFinite(p.t) ? { x: p.x, y: p.y, t: p.t } : { x: p.x, y: p.y };

  function cleanPath(points) {
    if (!Array.isArray(points)) throw new TypeError('The route must be an array of coordinate points.');
    const out = [];
    for (const p of points) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new TypeError('The route contains non-finite coordinates.');
      if (!out.length || distance(p, out[out.length - 1]) > EPS) out.push(copy(p));
      else if (Number.isFinite(p.t)) out[out.length - 1].t = p.t;
    }
    return out;
  }

  function pointSegmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, squared = dx * dx + dy * dy;
    if (squared <= EPS * EPS) return distance(p, a);
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / squared, 0, 1);
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i]);
    return length;
  }

  function wallDistance(p, wall) {
    const R = TABLE.radius;
    return ({ top: p.y - R, right: TABLE.width - R - p.x,
      bottom: TABLE.height - R - p.y, left: p.x - R })[wall];
  }

  function wallPoint(p, wall) {
    const R = TABLE.radius;
    if (wall === 'top' || wall === 'bottom') {
      const x = clamp(p.x, R, TABLE.width - R);
      return { x, y: wall === 'top' ? R : TABLE.height - R, s: x - R };
    }
    const y = clamp(p.y, R, TABLE.height - R);
    return { x: wall === 'left' ? R : TABLE.width - R, y, s: y - R };
  }

  function supportIndex(points, index, direction, span = .035) {
    let accumulated = 0, j = index;
    while (j + direction >= 0 && j + direction < points.length && accumulated < span) {
      accumulated += distance(points[j], points[j + direction]);
      j += direction;
    }
    return j;
  }

  function turningAngle(a, b, c) {
    const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
    const n = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return n > EPS ? Math.acos(clamp((ux * vx + uy * vy) / n, -1, 1)) : 0;
  }

  // A contact is a near-rail local extremum followed by a return into the table.
  // Finishing at a rail, or travelling parallel to it, is not a cushion rebound.
  function inferredContacts(points, tolerance = .035) {
    const contacts = [];
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i], a = points[supportIndex(points, i, -1)], b = points[supportIndex(points, i, 1)];
      // One vertex is one bounce: near a corner, only the closer cushion counts.
      let nearest = null;
      for (const wall of ['top', 'right', 'bottom', 'left']) {
        const d = wallDistance(p, wall), da = wallDistance(a, wall), db = wallDistance(b, wall);
        if (Math.abs(d) > tolerance || da <= d + .001 || db <= d + .001) continue;
        if (wallDistance(points[i - 1], wall) < d - EPS || wallDistance(points[i + 1], wall) < d - EPS) continue;
        if (turningAngle(a, p, b) < .08) continue;
        if (!nearest || Math.abs(d) < nearest.d) nearest = { wall, d: Math.abs(d) };
      }
      for (const wall of nearest ? [nearest.wall] : []) {
        const d = wallDistance(p, wall);
        const projected = wallPoint(p, wall);
        const last = contacts[contacts.length - 1];
        // Nearby hand jitter around one contact is one event, not several banks.
        if (last && last.wall === wall && i - last.index <= 4 && distance(last, projected) < .06) {
          if (Math.abs(d) < last.error) contacts[contacts.length - 1] = { wall, ...projected, index: i, error: Math.abs(d) };
        } else contacts.push({ wall, ...projected, index: i, error: Math.abs(d) });
      }
    }
    return contacts;
  }

  function smoothPath(points, options = {}) {
    const input = cleanPath(points);
    if (input.length < 3) return input;
    const protectedIndices = new Set([0, input.length - 1]);
    for (const contact of inferredContacts(input, options.railTolerance ?? .035)) protectedIndices.add(contact.index);
    // Compare longer chords so sampling jitter does not make every point a cusp.
    for (let i = 1; i < input.length - 1; i++) {
      const a = input[supportIndex(input, i, -1)], b = input[supportIndex(input, i, 1)];
      if (turningAngle(a, input[i], b) > (options.cornerThreshold ?? .65)) protectedIndices.add(i);
    }
    return input.map((p, i) => {
      if (protectedIndices.has(i)) return copy(p);
      const a = input[i - 1], b = input[i + 1];
      return { ...copy(p), x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 };
    });
  }

  function simplifyPath(points, tolerance = .008) {
    const input = cleanPath(points);
    if (input.length < 3 || tolerance <= 0) return input;
    const keep = new Set([0, input.length - 1]);
    // Splitting Douglas-Peucker at rail contacts preserves shallow bank vertices.
    inferredContacts(input).forEach(c => keep.add(c.index));
    const anchors = [...keep].sort((a, b) => a - b), stack = [];
    for (let i = 1; i < anchors.length; i++) stack.push([anchors[i - 1], anchors[i]]);
    while (stack.length) {
      const [first, last] = stack.pop();
      let furthest = -1, largest = tolerance;
      for (let i = first + 1; i < last; i++) {
        const d = pointSegmentDistance(input[i], input[first], input[last]);
        if (d > largest) { largest = d; furthest = i; }
      }
      if (furthest >= 0) { keep.add(furthest); stack.push([first, furthest], [furthest, last]); }
    }
    return [...keep].sort((a, b) => a - b).map(i => copy(input[i]));
  }

  function resamplePath(points, step = .01) {
    if (!(step > 0) || !Number.isFinite(step)) throw new RangeError('Resampling distance must be greater than zero.');
    const input = cleanPath(points);
    if (input.length < 2) return input;
    const total = pathLength(input);
    if (total / step > 20000) throw new RangeError('The route is too long. Remove some turns and try again.');
    const out = [copy(input[0])];
    let travelled = 0, next = step;
    for (let i = 1; i < input.length; i++) {
      const a = input[i - 1], b = input[i], length = distance(a, b);
      while (next < travelled + length - EPS) {
        const t = (next - travelled) / length;
        const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
        if (Number.isFinite(a.t) && Number.isFinite(b.t)) p.t = a.t + t * (b.t - a.t);
        out.push(p); next += step;
      }
      if (Math.abs(next - (travelled + length)) <= EPS && next < total - EPS) { out.push(copy(b)); next += step; }
      travelled += length;
    }
    if (distance(out[out.length - 1], input[input.length - 1]) > EPS) out.push(copy(input[input.length - 1]));
    return out;
  }

  function cushionSignature(points, events, options = {}) {
    const input = cleanPath(points);
    if (Array.isArray(events)) {
      return events.filter(e => e.type === 'cushion' && (!e.id || e.id === (options.ballId || 'cue')))
        .filter(e => ['top', 'right', 'bottom', 'left'].includes(e.wall))
        .map(e => {
          let index = 0, closest = Infinity;
          input.forEach((p, i) => { const d = Number.isFinite(e.t) && Number.isFinite(p.t) ? Math.abs(e.t - p.t) : distance(p, e); if (d < closest) { closest = d; index = i; } });
          return { wall: e.wall, ...wallPoint(e, e.wall), index, ...(Number.isFinite(e.t) ? { t: e.t } : {}) };
        });
    }
    return inferredContacts(input, options.tolerance ?? .035).map(({ error, ...c }) => c);
  }

  function normalizePath(points, options = {}) {
    let canonical = cleanPath(points);
    if (options.start) {
      if (!Number.isFinite(options.start.x) || !Number.isFinite(options.start.y)) throw new TypeError('Invalid cue-ball starting position.');
      if (!canonical.length) canonical = [copy(options.start)];
      else canonical[0] = { ...canonical[0], x: options.start.x, y: options.start.y };
    }
    if (options.smooth === true) canonical = smoothPath(canonical, options);
    canonical = simplifyPath(canonical, options.simplifyTolerance ?? .004);
    if (!Array.isArray(options.events) && options.snapCushions !== false) {
      for (const c of cushionSignature(canonical)) canonical[c.index] = { ...canonical[c.index], x: c.x, y: c.y };
    }
    const cushions = cushionSignature(canonical, options.events);
    const samples = resamplePath(canonical, options.sampleStep ?? .01);
    return { points: canonical, samples, length: pathLength(canonical),
      start: canonical[0] ? copy(canonical[0]) : null, end: canonical.length ? copy(canonical[canonical.length - 1]) : null,
      cushions, sampleStep: options.sampleStep ?? .01 };
  }

  function rayCircleDistance(origin, angle, centre, radius = 2 * TABLE.radius) {
    const dx = centre.x - origin.x, dy = centre.y - origin.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    const discriminant = radius * radius - (dx * dx + dy * dy - along * along);
    if (discriminant < -1e-12) return Infinity;
    const halfChord = Math.sqrt(Math.max(0, discriminant));
    const enter = along - halfChord, leave = along + halfChord;
    return leave < -EPS ? Infinity : Math.max(0, enter);
  }

  // Teaching extension approved by the author. This delta is an angular
  // measure, NOT the paper's model-error delta or a calibrated probability.
  // All disks are expanded by the moving cue's radius (Minkowski sum).
  function occlusion(cue, target, blockers = []) {
    const rho = 2 * TABLE.radius, d = distance(cue, target);
    const invalid = reason => ({ valid: false, reason, deltaRadians: 0, deltaDegrees: 0,
      angularWidth: 0, blockedFraction: 0, exposure: 1, intervals: [], distance: d });
    if (!Number.isFinite(d) || d < rho - 1e-9) return invalid('The cue and target overlap; the collision cone is undefined.');
    const active = blockers.filter(b => !b.potted && b !== cue && b !== target &&
      !(b.id !== undefined && (b.id === cue.id || b.id === target.id)));
    if (active.some(b => distance(cue, b) < rho - 1e-9)) return invalid('The cue ball overlaps a blocker.');
    const theta = Math.atan2(target.y - cue.y, target.x - cue.x);
    const alpha = Math.asin(clamp(rho / d, 0, 1)), cuts = [-alpha, alpha];
    const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    const addAngle = a => {
      const relative = wrap(a - theta);
      if (relative > -alpha + 1e-12 && relative < alpha - 1e-12) cuts.push(relative);
    };
    for (const b of active) {
      const db = distance(cue, b), beta = Math.atan2(b.y - cue.y, b.x - cue.x);
      const half = Math.asin(clamp(rho / Math.max(db, rho), 0, 1));
      addAngle(beta - half); addAngle(beta + half);
      // Entry-depth ordering changes only where the two exclusion-circle
      // boundaries intersect. Tangent endpoints alone are not sufficient.
      const between = distance(target, b);
      if (between > EPS && between <= 2 * rho + EPS) {
        const mx = (target.x + b.x) / 2, my = (target.y + b.y) / 2;
        const height = Math.sqrt(Math.max(0, rho * rho - between * between / 4));
        const px = -(b.y - target.y) / between, py = (b.x - target.x) / between;
        addAngle(Math.atan2(my + height * py - cue.y, mx + height * px - cue.x));
        addAngle(Math.atan2(my - height * py - cue.y, mx - height * px - cue.x));
      }
    }
    const sorted = cuts.sort((a, b) => a - b).filter((a, i, list) => !i || a - list[i - 1] > 1e-12);
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const lo = sorted[i - 1], hi = sorted[i], angle = theta + (lo + hi) / 2;
      const targetEntry = rayCircleDistance(cue, angle, target, rho);
      if (active.some(b => rayCircleDistance(cue, angle, b, rho) < targetEntry - 1e-10)) {
        const previous = intervals[intervals.length - 1];
        if (previous && Math.abs(previous.end - lo) < 1e-10) previous.end = hi;
        else intervals.push({ start: lo, end: hi });
      }
    }
    const delta = intervals.reduce((sum, interval) => sum + interval.end - interval.start, 0);
    // Eq. (37) from the paper: a binary, expanded-disk centre-line test.
    const centreLineClear = !active.some(b => pointSegmentDistance(b, cue, target) <= rho + 1e-10);
    return { valid: true, deltaRadians: delta, deltaDegrees: delta * 180 / Math.PI,
      angularWidth: 2 * alpha, blockedFraction: clamp(delta / (2 * alpha), 0, 1),
      exposure: centreLineClear ? Math.exp(-d / .75) : 0, centreLineClear,
      theta, intervals, distance: d };
  }

  // Distance along a ray from `origin` until a ball centre would meet a cushion.
  function rayToCushion(origin, angle) {
    const R = TABLE.radius, dx = Math.cos(angle), dy = Math.sin(angle);
    const options = [];
    if (dx > EPS) options.push([(TABLE.width - R - origin.x) / dx, 'right']);
    if (dx < -EPS) options.push([(R - origin.x) / dx, 'left']);
    if (dy > EPS) options.push([(TABLE.height - R - origin.y) / dy, 'bottom']);
    if (dy < -EPS) options.push([(R - origin.y) / dy, 'top']);
    const [distance, wall] = options.filter(o => o[0] >= 0).sort((a, b) => a[0] - b[0])[0] || [0, null];
    return { distance, wall };
  }

  // Everything an aiming overlay needs for one shot direction: where the cue ball first meets a ball
  // (the "ghost ball"), where that object ball is sent, the straight-line cue-ball deflection, and
  // otherwise the first cushion with its ideal mirror line. Pure geometry, no spin or friction.
  function aimPreview(balls, cueId, angleDegrees) {
    const cue = balls.find(b => b.id === cueId && !b.potted);
    if (!cue) return null;
    const angle = angleDegrees * Math.PI / 180, direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let hit = null;
    for (const ball of balls) {
      if (ball === cue || ball.potted) continue;
      const travel = rayCircleDistance(cue, angle, ball, 2 * TABLE.radius);
      if (Number.isFinite(travel) && travel > 1e-9 && (!hit || travel < hit.distance)) hit = { ball, distance: travel };
    }
    const rail = rayToCushion(cue, angle);
    if (hit && hit.distance <= rail.distance) {
      const ghost = { x: cue.x + direction.x * hit.distance, y: cue.y + direction.y * hit.distance };
      const nx = hit.ball.x - ghost.x, ny = hit.ball.y - ghost.y, length = Math.hypot(nx, ny) || 1;
      const objectDirection = { x: nx / length, y: ny / length };
      // Cut angle: 0 is a full-ball hit, 90 a feather touch.
      const cross = direction.x * objectDirection.y - direction.y * objectDirection.x;
      const cutAngle = Math.abs(Math.asin(clamp(cross, -1, 1))) * 180 / Math.PI;
      // After a smooth equal-mass collision the cue ball keeps only the part of its motion that is
      // perpendicular to the line of centres (a stun shot with no spin).
      const along = direction.x * objectDirection.x + direction.y * objectDirection.y;
      const tx = direction.x - along * objectDirection.x, ty = direction.y - along * objectDirection.y, tl = Math.hypot(tx, ty);
      const cueDirection = cutAngle < 0.5 || tl < EPS ? null : { x: tx / tl, y: ty / tl };
      return { cue, direction, distance: hit.distance, end: ghost, hit: { id: hit.ball.id, color: hit.ball.color, x: hit.ball.x, y: hit.ball.y },
        objectDirection, cueDirection, cutAngle, wall: null, reflect: null };
    }
    const end = { x: cue.x + direction.x * rail.distance, y: cue.y + direction.y * rail.distance };
    const reflected = rail.wall === 'left' || rail.wall === 'right' ? { x: -direction.x, y: direction.y } : { x: direction.x, y: -direction.y };
    return { cue, direction, distance: rail.distance, end, hit: null, objectDirection: null, cueDirection: null, cutAngle: null,
      wall: rail.wall, reflect: rail.wall ? { from: end, direction: reflected } : null };
  }

  const api = { TABLE, distance, pointSegmentDistance, pathLength, smoothPath, simplifyPath,
    resamplePath, cushionSignature, normalizePath, turningAngle, wallPoint, rayCircleDistance, occlusion, rayToCushion, aimPreview };
  Coach.geometry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
