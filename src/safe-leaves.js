/* Post-shot geometry: paper Eq. (37), threshold from Eq. (38), plus the
   author's approved angular-occlusion teaching extension. No reachability or
   success-probability claim is made by this map. All lengths are metres. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || require('./physics.js');
  const G = Coach.geometry || require('./geometry.js');
  const R = P.TABLE.radius, T = P.TABLE;
  const DEFAULT_THRESHOLD = .30;

  function context(balls, legalIds) {
    const objects = balls.filter(b => b.id !== 'cue' && b.color !== 'white' && !b.potted);
    const targets = objects.filter(b => legalIds.includes(b.id));
    return { objects, targets, blockers: objects.filter(b => !legalIds.includes(b.id)) };
  }

  function evaluate(point, ctx, threshold = DEFAULT_THRESHOLD, clearance = 0) {
    const inside = Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= R + clearance && point.x <= T.width - R - clearance &&
      point.y >= R + clearance && point.y <= T.height - R - clearance;
    if (!inside || !ctx.targets.length || ctx.objects.some(b => G.distance(point, b) < 2 * R + clearance - 1e-10) ||
        T.pockets.some(p => G.distance(point, p) <= p.radius + clearance))
      return { valid: false, safe: false, hidden: false, exposure: 1, blockedFraction: 0 };
    let exposure = 0, allScreened = true;
    for (const target of ctx.targets) {
      const clear = !ctx.blockers.some(b => G.pointSegmentDistance(b, point, target) <= 2 * R + 1e-10);
      const e = clear ? Math.exp(-G.distance(point, target) / .75) : 0;
      exposure = Math.max(exposure, e);
      allScreened = allScreened && !clear;
    }
    let blockedFraction = 0;
    if (allScreened) blockedFraction = Math.min(...ctx.targets.map(t => G.occlusion(point, t, ctx.blockers).blockedFraction));
    return { valid: true, safe: exposure <= threshold + 1e-12, hidden: blockedFraction >= .95,
      exposure, blockedFraction };
  }

  function analyse(balls, legalIds, options = {}) {
    const threshold = Math.max(0, Math.min(1, options.threshold ?? DEFAULT_THRESHOLD));
    const requestedStep = Math.max(.01, Math.min(.10, options.step || .02));
    const ctx = context(balls, legalIds), cue = balls.find(b => b.id === 'cue' || b.color === 'white');
    const cols = Math.ceil((T.width - 2 * R) / requestedStep), rows = Math.ceil((T.height - 2 * R) / requestedStep);
    const dx = (T.width - 2 * R) / cols, dy = (T.height - 2 * R) / rows;
    const cells = new Uint8Array(cols * rows), spans = [];
    let safeCount = 0, hiddenCount = 0, nearest = null, nearestDistance = Infinity;
    // Keep every painted square out of pockets and overlapping-ball positions.
    const clearance = Math.hypot(dx, dy) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const at = { x: R + (col + .5) * dx, y: R + (row + .5) * dy };
        // Boundary cells are omitted conservatively, like object/pocket cells.
        const v = evaluate(at, ctx, threshold, clearance);
        const kind = v.safe ? (v.hidden ? 2 : 1) : 0;
        cells[row * cols + col] = kind;
        if (kind) {
          safeCount++; if (kind === 2) hiddenCount++;
          const distance = cue ? G.distance(cue, at) : 0;
          if (distance < nearestDistance) { nearestDistance = distance; nearest = at; }
        }
      }
      for (let col = 0; col < cols;) {
        const kind = cells[row * cols + col], start = col;
        while (col < cols && cells[row * cols + col] === kind) col++;
        if (kind) spans.push({ x: R + start * dx, y: R + row * dy, width: (col - start) * dx, height: dy, kind });
      }
    }
    const actual = cue && !cue.potted ? evaluate(cue, ctx, threshold) : { valid: false, safe: false, hidden: false, exposure: 1 };
    return { threshold, step: requestedStep, cols, rows, dx, dy, cells, spans, safeCount, hiddenCount,
      area: safeCount * dx * dy, targetCount: ctx.targets.length, actual, nearest,
      model: 'paper-eq37-eq38-geometric-extension', reachable: false };
  }
  const api = { context, evaluate, analyse, DEFAULT_THRESHOLD };
  Coach.safeLeaves = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
