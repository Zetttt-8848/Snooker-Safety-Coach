(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const P = Coach.physics || (typeof require !== 'undefined' ? require('./physics.js') : null);
  const G = Coach.geometry || (typeof require !== 'undefined' ? require('./geometry.js') : null);
  const R = P.TABLE.radius, DIAGONAL = Math.hypot(P.TABLE.width, P.TABLE.height);
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const safe = v => Number.isFinite(v) ? clamp(v) : 0;
  const WALL_NAMES = { top: 'top cushion', right: 'right cushion', bottom: 'bottom cushion', left: 'left cushion' };
  const cueBall = balls => balls.find(b => b.id === 'cue') || balls.find(b => b.color === 'white');
  const targetIds = puzzle => puzzle.legalTargetIds?.length ? puzzle.legalTargetIds : [puzzle.targetId];

  function rank({ E, P: path, C, O, objectivelyBetter = false, structureDifferent = false, valid = true }) {
    if (!valid) return 'Developing';
    if (E >= .90 && path >= .85 && C >= .80 && O >= .90) return 'Excellent';
    if (((path < .85 || C < .80 || structureDifferent) && (E >= .90 || O >= .90)) || (objectivelyBetter && O >= .95)) return 'Promising';
    return 'Developing';
  }

  function discreteFrechet(a, b) {
    if (!a.length || !b.length) return Infinity;
    let previous = new Float64Array(b.length); previous.fill(Infinity);
    for (let i = 0; i < a.length; i++) {
      const row = new Float64Array(b.length);
      for (let j = 0; j < b.length; j++) {
        const d = G.distance(a[i], b[j]);
        if (!i && !j) row[j] = d;
        else row[j] = Math.max(d, Math.min(i ? previous[j] : Infinity,
          j ? row[j - 1] : Infinity, i && j ? previous[j - 1] : Infinity));
      }
      previous = row;
    }
    return previous[b.length - 1];
  }

  function dtwMean(a, b) {
    if (!a.length || !b.length) return Infinity;
    let previous = new Float64Array(b.length + 1); previous.fill(Infinity); previous[0] = 0;
    let counts = new Uint32Array(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
      const row = new Float64Array(b.length + 1); row.fill(Infinity);
      const rowCounts = new Uint32Array(b.length + 1);
      for (let j = 1; j <= b.length; j++) {
        let cost = previous[j - 1], count = counts[j - 1];
        if (previous[j] < cost) { cost = previous[j]; count = counts[j]; }
        if (row[j - 1] < cost) { cost = row[j - 1]; count = rowCounts[j - 1]; }
        row[j] = cost + G.distance(a[i - 1], b[j - 1]); rowCounts[j] = count + 1;
      }
      previous = row; counts = rowCounts;
    }
    return previous[b.length] / counts[b.length];
  }

  function sequenceDistance(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) row[j] = Math.min(previous[j] + 1, row[j - 1] + 1,
        previous[j - 1] + (a[i - 1].wall === b[j - 1].wall ? 0 : 1));
      previous = row;
    }
    return previous[b.length];
  }

  function cushionScore(a, b) {
    if (!a.length && !b.length) return 1;
    if (!a.length || !b.length) return 0;
    const count = Math.exp(-Math.abs(a.length - b.length));
    const sequence = clamp(1 - sequenceDistance(a, b) / Math.max(a.length, b.length));
    let coordinates = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i].wall === b[i].wall) coordinates += Math.exp(-(((a[i].s - b[i].s) / .10) ** 2));
    }
    coordinates /= Math.max(a.length, b.length);
    return .25 * count + .35 * sequence + .40 * coordinates;
  }

  function endpointValidity(cue, balls) {
    if (!cue || cue.potted) return { valid: false, reason: 'First, adjust the shot to keep the cue ball out of the pocket.' };
    if (!Number.isFinite(cue.x) || !Number.isFinite(cue.y) || cue.x < R - 1e-5 ||
      cue.x > P.TABLE.width - R + 1e-5 || cue.y < R - 1e-5 || cue.y > P.TABLE.height - R + 1e-5)
      return { valid: false, reason: 'First, move the predicted finish inside the playable ball-centre boundary.' };
    if (balls.some(b => b.id !== cue.id && !b.potted && G.distance(cue, b) < 2 * R - 1e-5))
      return { valid: false, reason: 'First, separate overlapping balls by at least one ball diameter.' };
    return { valid: true, reason: '' };
  }

  function firstContact(result) {
    const event = result.events?.find(e => e.type === 'ball' && (e.ids?.includes('cue') || e.id === 'cue' || e.otherId === 'cue'));
    return event ? (event.ids?.find(id => id !== 'cue') || (event.id === 'cue' ? event.otherId : event.id)) : null;
  }

  function checkResult(puzzle, result) {
    if (!result?.completed) return { valid: false, reason: 'First, allow the balls to stop before assessing the leave.', firstContactId: null };
    const cue = cueBall(result.balls), endpoint = endpointValidity(cue, result.balls);
    if (!endpoint.valid) return { ...endpoint, firstContactId: firstContact(result) };
    const first = firstContact(result), legal = targetIds(puzzle);
    if (!first) return { valid: false, reason: 'First, adjust the opening direction to hit a legal target.', firstContactId: null };
    if (!legal.includes(first)) return { valid: false, reason: 'First, avoid the blocker so that the red is your first contact.', firstContactId: first };
    if (result.balls.some(b => b.potted && !puzzle.balls.find(old => old.id === b.id)?.potted))
      return { valid: false, reason: 'First, keep every ball out of the pockets. This puzzle requires a legal, non-potting safety.', firstContactId: first };
    return { valid: true, reason: '', firstContactId: first };
  }

  function firstPathContact(points, balls) {
    let travelled = 0, best = null;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = G.distance(a, b);
      if (length < 1e-9) continue;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (const ball of balls) {
        if (ball.id === 'cue' || ball.color === 'white' || ball.potted) continue;
        const entry = G.rayCircleDistance(a, angle, ball, 2 * R + .004);
        if (entry <= length + 1e-9 && (!best || travelled + entry < best.distance)) best = { id: ball.id, distance: travelled + entry };
      }
      travelled += length;
    }
    return best?.id || null;
  }

  function zoneQuality(point, zone) {
    if (!zone) return 0;
    const radius = Math.max(zone.radius || .15, .025);
    return Math.exp(-((Math.max(0, G.distance(point, zone) - radius) / radius) ** 2));
  }

  function outcomeMetrics(puzzle, balls, options = {}) {
    const cue = cueBall(balls), legalIds = targetIds(puzzle), legality = endpointValidity(cue, balls);
    const targets = balls.filter(b => legalIds.includes(b.id) && !b.potted);
    if (!legality.valid || !targets.length) return { valid: false, reason: legality.reason || 'No target ball remains on the table.',
      deltaDegrees: 0, deltaRadians: 0, blockedFraction: 0, exposure: 1, cueRail: 0, cueRailDistance: Infinity,
      separation: 0, cueZone: 0, targetSafety: 0, targetPocketDistance: 0, views: [], verified: !!options.verified };
    const blockers = balls.filter(b => b.id !== cue.id && !legalIds.includes(b.id) && !b.potted);
    const views = targets.map(target => ({ targetId: target.id, ...G.occlusion(cue, target, blockers) }));
    const railDistance = Math.max(0, Math.min(cue.x - R, P.TABLE.width - R - cue.x, cue.y - R, P.TABLE.height - R - cue.y));
    const target = targets.find(b => b.id === puzzle.targetId) || targets[0];
    const pocketDistance = Math.min(...P.TABLE.pockets.map(p => G.distance(target, p)));
    // Near-cushion object balls are NOT universally safer (the big-ball effect).
    // Only an author-declared target zone adds that tactical preference.
    const targetSafety = puzzle.objective?.targetZone ? zoneQuality(target, puzzle.objective.targetZone) : clamp(pocketDistance / .65);
    const exposure = Math.max(...views.map(v => v.exposure));
    return { valid: views.every(v => v.valid), reason: views.find(v => !v.valid)?.reason || '',
      deltaDegrees: Math.min(...views.map(v => v.deltaDegrees)), deltaRadians: Math.min(...views.map(v => v.deltaRadians)),
      blockedFraction: Math.min(...views.map(v => v.blockedFraction)), exposure, separation: 1 - exposure,
      cueRail: Math.exp(-railDistance / .12), cueRailDistance: railDistance,
      cueZone: zoneQuality(cue, puzzle.objective?.cueZone), targetSafety, targetPocketDistance: pocketDistance,
      views, verified: !!options.verified };
  }

  function outcomeScore(puzzle, candidate, reference) {
    if (!candidate.valid) return { score: 0, objectivelyBetter: false, equivalent: false, components: {} };
    const defaults = {
      snooker: { occlusion: .50, separation: .15, cueZone: .10, cueRail: .10, targetSafety: .15 },
      rail: { cueRail: .45, separation: .30, targetSafety: .20, occlusion: .05 },
      escape: { separation: .40, targetSafety: .25, cueZone: .15, occlusion: .10, cueRail: .10 },
      distance: { separation: .50, targetSafety: .25, cueZone: .10, occlusion: .05, cueRail: .10 },
      target: { targetSafety: .60, separation: .20, cueRail: .10, occlusion: .05, cueZone: .05 }
    };
    const weights = { ...(puzzle.objective?.weights || defaults[puzzle.objective?.type] || defaults.escape) };
    if (!puzzle.objective?.cueZone && weights.cueZone) { weights.separation = (weights.separation || 0) + weights.cueZone; delete weights.cueZone; }
    if (reference.deltaRadians < 1e-9 && weights.occlusion) { weights.separation = (weights.separation || 0) + weights.occlusion; delete weights.occlusion; }
    const components = {}; let sum = 0, totalWeight = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (!(weight > 0)) continue;
      const cv = key === 'occlusion' ? candidate.deltaRadians : candidate[key];
      const rv = key === 'occlusion' ? reference.deltaRadians : reference[key];
      if (!Number.isFinite(cv) || !Number.isFinite(rv)) continue;
      const value = rv <= 1e-9 ? (cv >= rv ? 1 : 0) : clamp(cv / rv);
      components[key] = { value, weight, actual: cv, reference: rv };
      sum += weight * value; totalWeight += weight;
    }
    const comparable = [
      [candidate.deltaDegrees, reference.deltaDegrees, .02],
      [candidate.cueRail, reference.cueRail, .005],
      [candidate.targetSafety, reference.targetSafety, .005],
      [candidate.separation, reference.separation, .005]
    ];
    const noWorse = comparable.every(([a, b, tolerance]) => a >= b - tolerance);
    const strictlyBetter = comparable.some(([a, b, tolerance]) => a > b + tolerance);
    return { score: totalWeight ? clamp(sum / totalWeight) : 0, objectivelyBetter: noWorse && strictlyBetter,
      equivalent: noWorse, components };
  }

  function cushionErrors(student, reference) {
    const out = [];
    for (let i = 0; i < Math.max(student.length, reference.length); i++) {
      const a = student[i], b = reference[i];
      if (!a || !b || a.wall !== b.wall) {
        const point = a || b;
        out.push({ x: point.x, y: point.y, wall: point.wall, index: i, distance: null, differentWall: true,
          text: !a ? `Contact ${i + 1}: missing ${WALL_NAMES[b.wall]}` : !b ? `Extra cushion contact ${i + 1}` : `Contact ${i + 1}: ${WALL_NAMES[a.wall]} / reference: ${WALL_NAMES[b.wall]}` });
      } else {
        const signed = a.s - b.s, direction = a.wall === 'top' || a.wall === 'bottom' ? (signed > 0 ? 'right' : 'left') : (signed > 0 ? 'down' : 'up');
        out.push({ x: a.x, y: a.y, wall: a.wall, index: i, distance: Math.abs(signed), signed, direction,
          text: `Contact ${i + 1}: ${Math.abs(signed) < .001 ? 'matched' : `${(Math.abs(signed) * 100).toFixed(1)} cm ${direction}`}` });
      }
    }
    return out;
  }

  // The single most useful correction for this attempt, phrased as an instruction.
  function coachAction(result) {
    const { diagnostics: d, reference } = result, keyError = d.cushionErrors.find(e => e.differentWall || e.distance > .01);
    const dx = d.scoredEndpoint.x - reference.end.x, dy = d.scoredEndpoint.y - reference.end.y;
    const horizontal = Math.abs(dx) > .005 ? (dx > 0 ? 'left' : 'right') : '', vertical = Math.abs(dy) > .005 ? (dy > 0 ? 'up' : 'down') : '';
    const direction = [horizontal,vertical].filter(Boolean).join(' and ');
    if (!d.legality.valid) return d.legality.reason;
    if (keyError?.differentWall) return `First, check turn ${keyError.index + 1}: the ball must reach a cushion before rebounding.`;
    if (keyError) {
      const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' }[keyError.direction];
      return `First, move cushion contact ${keyError.index + 1} about ${(keyError.distance * 100).toFixed(1)} cm ${opposite}, then try again.`;
    }
    if (d.endpointDistance > .01) return `First, move your predicted finish about ${(d.endpointDistance * 100).toFixed(1)} cm ${direction} and check the final segment.`;
    return 'First, check where both balls finish after legal contact, then refine the red-ball safety zone.';
  }

  const COMPONENT_LABELS = { occlusion: 'hiding the red', separation: 'distance from the red', cueZone: 'finishing in the target area',
    cueRail: 'staying close to the cushion', targetSafety: 'leaving the red safe' };
  // One plain sentence per score dimension, for the results screen.
  function explainScores(result) {
    const { diagnostics: d, outcome, student, reference } = result;
    const cm = v => (v * 100).toFixed(v < .1 ? 1 : 0);
    const parts = Object.entries(outcome.components || {}).filter(([, c]) => c.weight > 0).sort((a, b) => a[1].value - b[1].value);
    let O;
    if (!d.legality.valid) O = d.legality.reason.replace(/^First, /, '').replace(/^./, c => c.toUpperCase());
    else if (!parts.length) O = 'No safety measures were available for this layout.';
    else if (parts[0][1].value >= .97) O = 'Every safety measure matches or beats the reference.';
    else O = `Weakest part: ${COMPONENT_LABELS[parts[0][0]]} (${Math.round(parts[0][1].value * 100)}% of the reference).`;
    const E = d.endpointDistance <= .0105 ? 'Your leave is within about 1 cm of the reference leave.'
      : `Your cue ball finished ${cm(d.endpointDistance)} cm from the reference finish.`;
    const P = d.pathDistance <= .02 ? 'Your line follows the reference line closely.'
      : `At its widest, your line is ${cm(d.pathDistance)} cm from the reference line.`;
    const a = student.cushions.length, b = reference.cushions.length;
    const C = a === b && !d.cushionErrors.some(e => e.differentWall || e.distance > .01)
      ? (a ? `All ${a} cushion contact${a > 1 ? 's' : ''} match the reference.` : 'Neither route touches a cushion.')
      : `You planned ${a} cushion contact${a === 1 ? '' : 's'}; the reference has ${b}.`;
    return { O, E, P, C };
  }

  // A one-line verdict. A grade never hides the next thing to try.
  function headline(result) {
    const { grade, diagnostics: d, outcome } = result;
    if (!d.legality.valid) return coachAction(result);
    if (result.alternative) return 'A different route that works: your leave is as safe as the reference.';
    if (grade === 'Excellent') return 'Precise route, precise leave. Try the next puzzle.';
    if (grade === 'Promising') return outcome.objectivelyBetter ? 'Your leave beats the reference. Keep that idea.' : coachAction(result);
    return coachAction(result);
  }

  function coachFeedback(result) {
    const { grade, diagnostics: d, outcome, student, reference } = result;
    const messages = [], keyError = d.cushionErrors.find(e => e.differentWall || e.distance > .01);
    const dx = d.scoredEndpoint.x - reference.end.x, dy = d.scoredEndpoint.y - reference.end.y;
    const action = coachAction(result);
    if (grade === 'Developing') messages.push(action);
    const count = student.cushions.length, sequence = student.cushions.map(c => WALL_NAMES[c.wall]).join(' → ');
    messages.push(`You chose ${count ? `a ${count}-cushion route (${sequence})` : 'a direct route without a cushion'}, finishing at your intended cue-ball leave.`);
    if (keyError) messages.push(`First key difference: ${keyError.text}. ${keyError.differentWall ? 'A different cushion sequence can work; the real rebounds and final safety are what matter.' : 'This is the distance along the cushion from the reference contact, not a claim that only one route is correct.'}`);
    else messages.push('Your cushion sequence and contact points are close. Now check separation and obstruction after contact.');
    if ((grade === 'Promising' && result.O >= .90) || outcome.objectivelyBetter) {
      const quality = outcome.objectivelyBetter ? 'equivalent to or better than the reference' : 'equivalent to the reference';
      messages.push(`${outcome.actual.verified ? 'This shot is' : 'In this geometric estimate, the route is'} ${quality}. The endpoint differs by ${(d.endpointDistance * 100).toFixed(1)} cm, but ${outcome.actual.verified ? 'the safety outcome is comparable. Keep the effective leave rather than copying the line.' : 'the assumed final layout gives comparable metrics. Object-ball movement still needs physical verification.'}`);
    } else if (d.endpointDistance <= .001) {
      messages.push('Your endpoint matches. Keep the same speed and angle.');
    } else {
      const points = reference.points, a = points[Math.max(0, points.length - 2)], b = reference.end;
      const length = G.distance(a, b), along = length ? (dx * (b.x - a.x) + dy * (b.y - a.y)) / length : 0;
      const tenths = Math.max(.2, Math.min(4, Math.abs(Math.sqrt(Math.max(.1, 1 + along / Math.max(reference.length, .1))) - 1) * 10));
      messages.push(`Endpoint error: ${(d.endpointDistance * 100).toFixed(1)} cm. ${Math.abs(along) > .01 ? `You ${along > 0 ? 'overshot' : 'finished short'} along the final direction. Try ${along > 0 ? 'reducing' : 'increasing'} speed by about ${(tenths*10).toFixed(0)}%, then test it. This is an estimate for the same route only.` : 'The error is mainly lateral. Adjust the last cushion angle or contact thickness before changing speed.'}`);
    }
    if (!outcome.actual.verified) messages.push('This is a geometric estimate only. Object-ball movement is unverified; the reference red-ball finish has not been copied into your result.');
    messages.push(grade === 'Excellent' ? 'A controlled route and a precise leave. Keep that rhythm and try the next puzzle.' : 'Keep choosing the leave before the route. Change one contact point at a time so you can see what improves.');
    return messages;
  }

  function evaluate({ puzzle, studentPath, reference, realized = null, feasibility = null }) {
    const initialCue = cueBall(puzzle.balls);
    const startDistance = studentPath.length ? G.distance(studentPath[0], initialCue) : Infinity;
    const student = G.normalizePath(studentPath, { start: initialCue });
    const ref = G.normalizePath(reference.path, { start: initialCue, events: reference.events });
    if (!student.end || !ref.end) throw new Error('A route needs both a start and an endpoint.');
    const scoredEndpoint = realized ? cueBall(realized.balls) : student.end;
    const endpointDistance = scoredEndpoint ? G.distance(scoredEndpoint, ref.end) : Infinity;
    const E = Math.exp(-((endpointDistance / R) ** 2));
    const pathDistance = discreteFrechet(student.samples, ref.samples);
    const pathScore = Math.exp(-((pathDistance / (DIAGONAL * .08)) ** 2));
    const C = cushionScore(student.cushions, ref.cushions);
    const referenceMetrics = outcomeMetrics(puzzle, reference.balls, { verified: true });
    const hypothetical = puzzle.balls.map(b => b.id === initialCue.id ? { ...b, x: student.end.x, y: student.end.y } : { ...b });
    const actual = outcomeMetrics(puzzle, realized?.balls || hypothetical, { verified: !!realized });
    let legality;
    if (realized) legality = checkResult(puzzle, realized);
    else {
      const first = firstPathContact(student.points, puzzle.balls), endpoint = endpointValidity(cueBall(hypothetical), hypothetical);
      legality = !endpoint.valid ? endpoint : !first ? { valid: false, reason: 'First, route the cue ball to a legal target, then plan the leave.' } :
        !targetIds(puzzle).includes(first) ? { valid: false, reason: 'First, avoid the blocker in the opening segment and make first contact with a red.' } : { valid: true, reason: '', unverified: true };
      legality.firstContactId = first;
    }
    if (startDistance > R) legality = { valid: false, reason: 'First, start near the cue-ball centre and draw the complete route.', firstContactId: legality.firstContactId };
    const outcome = { ...outcomeScore(puzzle, actual, referenceMetrics), actual, reference: referenceMetrics };
    if (!legality.valid) { outcome.score = 0; outcome.objectivelyBetter = false; outcome.equivalent = false; }
    const O = outcome.score, grade = rank({ E, P: pathScore, C, O, objectivelyBetter: outcome.objectivelyBetter,
      structureDifferent: !sameSignature(student.cushions, ref.cushions), valid: legality.valid });
    const result = { E: safe(E), P: safe(pathScore), C: safe(C), O: safe(O),
      total: 100 * (.45 * safe(O) + .25 * safe(E) + .20 * safe(pathScore) + .10 * safe(C)), grade,
      student, reference: ref, outcome, feasibility,
      diagnostics: { endpointDistance, startDistance, pathDistance, normalizedPathDistance: pathDistance / DIAGONAL,
        cushionErrors: cushionErrors(student.cushions, ref.cushions), scoredEndpoint: scoredEndpoint || student.end,
        legality, inferredShot: realized?.shot || feasibility?.shot || null, endpointToleranceFor90: R * Math.sqrt(-Math.log(.9)) } };
    // A verified, legal shot whose safety is at least as good as the reference but whose route
    // differs is an alternative that works, not a near miss.
    const differs = !sameSignature(student.cushions, ref.cushions) || safe(pathScore) < .85 || safe(E) < .9;
    result.verification = realized ? (feasibility?.status === 'approximate' ? 'approximate' : 'verified') : 'estimate';
    result.alternative = !!realized && legality.valid && outcome.equivalent && safe(O) >= .9 && differs;
    result.feedback = coachFeedback(result);
    result.explain = explainScores(result);
    result.headline = headline(result);
    return result;
  }

  function sameSignature(a, b) { return a.length === b.length && a.every((c, i) => c.wall === b[i].wall); }
  function sparse(points, count = 65) { const length = G.pathLength(points); return G.resamplePath(points, Math.max(.01, length / (count - 1))); }
  function projectShot(shot) {
    let top = clamp(Number(shot.top) || 0, -.5, .5), side = clamp(Number(shot.side) || 0, -.5, .5);
    const offset = Math.hypot(top, side); if (offset > .5) { top *= .5 / offset; side *= .5 / offset; }
    return { angle: Math.atan2(Math.sin(shot.angle * Math.PI / 180), Math.cos(shot.angle * Math.PI / 180)) * 180 / Math.PI,
      cueSpeed: clamp(shot.cueSpeed, .025, 6), top, side };
  }

  async function invert({ puzzle, path, reference, params = P.DEFAULTS, onProgress, maxEvaluations = 240, signal }) {
    params = { ...P.DEFAULTS, ...params };
    if (!path.length || G.distance(path[0], cueBall(puzzle.balls)) > R) return { status: 'invalid', evaluations: 0, message: 'The route must start near the cue-ball centre.' };
    const normalized = G.normalizePath(path, { start: cueBall(puzzle.balls) });
    if (normalized.points.length < 2 || normalized.length < .015) return { status: 'invalid', evaluations: 0, message: 'The route is too short. Draw from the cue ball to the intended finish.' };
    if (normalized.points.some(p => p.x < R - .005 || p.x > P.TABLE.width - R + .005 || p.y < R - .005 || p.y > P.TABLE.height - R + .005))
      return { status: 'invalid', evaluations: 0, message: 'The route crosses the ball-centre boundary. A ball can leave through a pocket, but cannot rebound outside the table.' };
    let budget = Math.max(0, Math.min(600, Math.floor(maxEvaluations)));
    const drawnSparse = sparse(normalized.points), cache = new Set(), candidates = [];
    // Loose acceptance for the "closest physical shot" tier: same cushion order, legal contact, and the
    // simulated line stays within a few centimetres of the drawing. Used only when no strict match exists.
    const APPROXIMATE = { endpoint: .06, path: .06 };
    const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
    let evaluations = 0, best = null, success = null, nearest = null, lastYield = clock();
    function measure(result, shot) {
      const simulated = G.normalizePath(result.path, { events: result.events }), cue = cueBall(result.balls);
      const endError = cue ? G.distance(cue, normalized.end) : 10;
      const pathError = dtwMean(drawnSparse, sparse(simulated.points));
      const signatureMatches = sameSignature(normalized.cushions, simulated.cushions);
      const legal = checkResult(puzzle, result);
      const value = pathError + .75 * endError + .12 * sequenceDistance(normalized.cushions, simulated.cushions) + (legal.valid ? 0 : .25);
      return { value, result, shot, endError, pathError, signatureMatches, legal, simulated };
    }
    async function trial(rawShot) {
      if (evaluations >= budget || signal?.aborted) return null;
      const shot = projectShot(rawShot), key = [shot.angle, shot.cueSpeed, shot.top, shot.side].map(x => x.toFixed(5)).join('/');
      if (cache.has(key)) return null; cache.add(key);
      const result = P.simulate(puzzle.balls, shot, params, { recordFrames: false }); evaluations++;
      const candidate = measure(result, shot); candidates.push(candidate);
      candidates.sort((a, b) => a.value - b.value); candidates.length = Math.min(candidates.length, 8);
      if (!best || candidate.value < best.value) best = candidate;
      if (candidate.endError <= .025 && candidate.pathError <= .035 && candidate.signatureMatches && candidate.legal.valid) {
        const strictError = dtwMean(normalized.samples, candidate.simulated.samples);
        const maximumError = discreteFrechet(normalized.samples, candidate.simulated.samples);
        if (strictError <= .025 && maximumError <= .08) success = { ...candidate, pathError: strictError, maximumError };
      }
      if (candidate.legal.valid && candidate.signatureMatches && candidate.endError <= APPROXIMATE.endpoint &&
        candidate.pathError <= APPROXIMATE.path && (!nearest || candidate.value < nearest.value)) nearest = candidate;
      // A near-exact candidate after a fair search is good enough: stop instead of polishing for another second.
      if (nearest && nearest.endError <= .02 && nearest.pathError <= .035 && evaluations >= 40 && !success) budget = evaluations;
      // Yield to the page by elapsed time, so heavy layouts such as the full rack never freeze the interface.
      if (clock() - lastYield > 10 || evaluations % 4 === 0) {
        onProgress?.({ evaluations, maxEvaluations: budget, bestError: best.pathError, phase: 'search' });
        if (clock() - lastYield > 10) { await new Promise(resolve => setTimeout(resolve, 0)); lastYield = clock(); }
      }
      return candidate;
    }
    // A forward-generated reference is one warm start, never the whole search.
    if (reference?.shot || puzzle.referenceShot) await trial(reference?.shot || puzzle.referenceShot);
    const directionPoint = G.resamplePath(normalized.points, Math.min(.12, normalized.length))[1] || normalized.end;
    const angleTo = p => Math.atan2(p.y - normalized.start.y, p.x - normalized.start.x) * 180 / Math.PI;
    const angle = angleTo(directionPoint);
    // The first vertex of a simplified route is usually the first cushion contact: aiming straight at
    // it is more accurate than following the first 12 cm of a hand-drawn curve.
    const vertexAngle = normalized.points.length > 2 && G.distance(normalized.points[1], normalized.start) > .05 ? angleTo(normalized.points[1]) : angle;
    const estimate = Math.sqrt(2 * params.muRoll * params.gravity * normalized.length) * 1.4 / 1.36 * 1.13 ** normalized.cushions.length;
    const speeds = [...new Set([estimate * .6, estimate * .85, estimate, estimate * 1.2, estimate * 1.6, .6, 1.2, 2.2, 3.6].map(v => clamp(v, .06, 6).toFixed(3)))].map(Number);
    const spins = [{ top: 0, side: 0 }, { top: .3, side: 0 }, { top: -.3, side: 0 }, { top: 0, side: .3 }, { top: 0, side: -.3 }];
    for (const spin of spins) {
      if (success || signal?.aborted) break;
      for (const speed of speeds) { await trial({ angle, cueSpeed: speed, ...spin }); if (success || evaluations >= budget) break; }
      if (Math.abs(vertexAngle - angle) > .15) for (const speed of speeds) { await trial({ angle: vertexAngle, cueSpeed: speed, ...spin }); if (success || evaluations >= budget) break; }
    }
    for (const offset of [-3, 3, -1, 1]) {
      if (success || evaluations >= budget || signal?.aborted) break;
      for (const speed of [estimate * .8, estimate, estimate * 1.3]) { await trial({ angle: angle + offset, cueSpeed: speed, top: 0, side: 0 }); if (success) break; }
    }
    const starts = candidates.slice().sort((a, b) => a.value - b.value).slice(0, 3);
    for (const start of starts) {
      if (success || evaluations >= budget || signal?.aborted) break;
      let current = start, steps = { angle: 1.5, cueSpeed: .14, top: .12, side: .12 };
      for (let round = 0; round < 7 && !success && evaluations < budget; round++) {
        const before = current;
        for (const key of ['angle', 'cueSpeed', 'top', 'side']) {
          for (const sign of [-1, 1]) {
            const candidate = await trial({ ...current.shot, [key]: current.shot[key] + sign * steps[key] });
            if (candidate && candidate.value < current.value) current = candidate;
            if (success || evaluations >= budget || signal?.aborted) break;
          }
          if (success || evaluations >= budget || signal?.aborted) break;
        }
        if (current === before || round % 2 === 1) for (const key of Object.keys(steps)) steps[key] *= .48;
      }
    }
    onProgress?.({ evaluations, maxEvaluations: budget, bestError: best?.pathError ?? Infinity, phase: 'done' });
    if (success) {
      const result = P.simulate(puzzle.balls, success.shot, params);
      return { status: 'feasible', evaluations, shot: success.shot, result,
        errors: { endpoint: success.endError, path: success.pathError, maximum: success.maximumError, cushionSequenceMatches: true },
        message: `A matching shot was found: cue speed ${success.shot.cueSpeed.toFixed(2)} m/s, angle ${success.shot.angle.toFixed(2)}°. The endpoint score uses the simulated finish.` };
    }
    if (nearest && !signal?.aborted) {
      const result = P.simulate(puzzle.balls, nearest.shot, params);
      return { status: 'approximate', evaluations, shot: nearest.shot, result,
        errors: { endpoint: nearest.endError, path: nearest.pathError, cushionSequenceMatches: true },
        message: `Your line was not exact, so the closest legal shot was played instead: cue speed ${nearest.shot.cueSpeed.toFixed(2)} m/s, angle ${nearest.shot.angle.toFixed(2)}°. Its finish is ${(nearest.endError * 100).toFixed(1)} cm from where you drew it, and the score uses what really happened.` };
    }
    const nearLimit = best && (Math.hypot(best.shot.top, best.shot.side) > .47 || best.shot.cueSpeed > 5.8);
    return { status: 'unresolved', evaluations, shot: best?.shot || null, closest: best ? { path: best.result.path, endpoint: best.endError } : null,
      errors: best ? { endpoint: best.endError, path: best.pathError, cushionSequenceMatches: best.signatureMatches } : null,
      message: signal?.aborted ? 'Search cancelled. Physical feasibility has not been established.' :
        `No legal shot matched both route and endpoint after ${evaluations} bounded simulations. ${nearLimit ? 'The closest candidate is near the 0.5R spin or 6 m/s speed limit. Try a gentler cushion angle. ' : 'Try moving the first cushion point or removing turns without a ball or cushion contact. '}This is not proof of impossibility; the scores below are geometric estimates only.` };
  }

  const api = { rank, evaluate, invert, discreteFrechet, dtwMean, cushionScore, outcomeMetrics, outcomeScore,
    checkResult, firstPathContact, coachFeedback, coachAction, explainScores, headline, WALL_NAMES };
  Coach.scoring = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
