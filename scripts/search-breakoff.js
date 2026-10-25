'use strict';
const fs = require('node:fs');
const path = require('node:path');
const P = require('../src/physics.js');
const G = require('../src/geometry.js');
const S = require('../src/scoring.js');
const started = Date.now();
const timeBudget = Number(process.argv[2]) || 240000;
function rack(x = .57, y = 1.05) {
  const b = [{ id: 'cue', color: 'white', x, y }, { id: 'yellow', color: 'yellow', x: .737, y: 1.181 },
    { id: 'green', color: 'green', x: .737, y: .597 }, { id: 'brown', color: 'brown', x: .737, y: .889 },
    { id: 'blue', color: 'blue', x: 1.7845, y: .889 }, { id: 'pink', color: 'pink', x: 2.67675, y: .889 },
    { id: 'black', color: 'black', x: 3.245, y: .889 }];
  for (let row = 0, id = 1; row < 5; row++) for (let j = 0; j <= row; j++, id++)
    b.push({ id: 'red' + id, color: 'red', x: 2.733 + row * .0459, y: .889 + (j - row / 2) * .053 });
  return b.map(P.createBall);
}
let best = null, count = 0, legalCount = 0, successful = 0;
const top = [], cache = new Set();
function evaluate(x, y, shot) {
  if (Date.now() - started > timeBudget || x > .737 || Math.hypot(x - .737, y - .889) > .292 || Math.hypot(shot.top, shot.side) > .5) return;
  const key = [x, y, shot.angle, shot.cueSpeed, shot.top, shot.side].map(v => v.toFixed(5)).join('/');
  if (cache.has(key)) return; cache.add(key);
  const balls = rack(x, y);
  if (balls.slice(1).some(b => G.distance(balls[0], b) < .053)) return;
  const result = P.simulate(balls, shot, P.DEFAULTS, { recordFrames: false });
  count++;
  const p = { balls, targetId: 'red15', legalTargetIds: balls.filter(b => b.color === 'red').map(b => b.id), objective: { type: 'distance' } };
  if (!S.checkResult(p, result).valid) return;
  legalCount++;
  const cue = result.balls[0];
  const redDisplacement = result.balls.filter(b => b.color === 'red').reduce((n, b) => n + G.distance(b, balls.find(a => a.id === b.id)), 0);
  const colourDisplacement = result.balls.filter(b => b.color !== 'red' && b.id !== 'cue').reduce((n, b) => n + G.distance(b, balls.find(a => a.id === b.id)), 0);
  const rail = Math.min(cue.x - P.TABLE.radius, cue.y - P.TABLE.radius, P.TABLE.height - P.TABLE.radius - cue.y);
  const good = cue.x <= .737;
  if (good) successful++;
  const value = (good ? 0 : 10 + 6 * (cue.x - .737)) + .3 * cue.x + .4 * Math.max(0, rail) + .8 * redDisplacement + 3 * colourDisplacement;
  const summary = { value, cue: { x: cue.x, y: cue.y }, redDisplacement, colourDisplacement, rail,
    firstTarget: S.checkResult(p, result).firstContactId, cushions: result.events.filter(e => e.id === 'cue' && e.type === 'cushion').map(e => e.wall), duration: result.duration };
  const candidate = { x, y, shot, summary };
  top.push(candidate); top.sort((a, b) => a.summary.value - b.summary.value); top.length = Math.min(10, top.length);
  if (!best || value < best.summary.value) {
    best = candidate;
    if (good) {
      const destination = path.resolve(__dirname, '../tmp/breakoff-candidate.json');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, JSON.stringify({ balls, shot, summary, result }, null, 2));
      console.log(JSON.stringify({ count, elapsed: (Date.now() - started) / 1000, ...summary, shot }));
    }
  }
}

// Bottom outside red: controls stay in the D. A thin contact approaches
// the red cluster from its lower outside edge, avoiding blue and pink.
for (const y of [1.05, 1.10, 1.00, 1.13]) {
  for (const x of [.57, .65, .71]) {
    for (const offset of [.050, .047, .044, .040, .036, .032, .025]) {
      const angle = Math.atan2(.995 + offset - y, 2.9166 - x) * 180 / Math.PI;
      for (const cueSpeed of [1.7, 2.1, 2.5, 2.9, 3.3, 3.7]) {
        for (const [topSpin, side] of [[0, 0], [.25, 0], [0, .3], [0, -.3], [.2, .3], [.2, -.3]]) {
          evaluate(x, y, { angle, cueSpeed, top: topSpin, side });
          if (Date.now() - started > timeBudget) break;
        }
        if (Date.now() - started > timeBudget) break;
      }
      if (Date.now() - started > timeBudget) break;
    }
    if (Date.now() - started > timeBudget) break;
  }
  if (Date.now() - started > timeBudget) break;
}

const seeds = top.slice(0, 5);
for (const seed of seeds) {
  let current = seed;
  for (const step of [1, .5, .25, .12]) {
    for (const key of ['angle', 'cueSpeed', 'top', 'side', 'x', 'y']) {
      for (const sign of [-1, 1]) {
        const shot = { ...current.shot };
        let x = current.x, y = current.y;
        if (key === 'x') x += sign * step * .02;
        else if (key === 'y') y += sign * step * .02;
        else shot[key] += sign * step * (key === 'angle' ? .15 : key === 'cueSpeed' ? .15 : .08);
        evaluate(x, y, shot);
        if (best.summary.value < current.summary.value) current = best;
        if (Date.now() - started > timeBudget) break;
      }
      if (Date.now() - started > timeBudget) break;
    }
    if (Date.now() - started > timeBudget) break;
  }
  if (Date.now() - started > timeBudget) break;
}

console.log(JSON.stringify({ count, legalCount, successful, elapsed: (Date.now() - started) / 1000, best }));
if (best && best.summary.cue.x <= .737) {
  const balls = rack(best.x, best.y), result = P.simulate(balls, best.shot, P.DEFAULTS, { recordFrames: false });
  const same = Math.hypot(result.balls[0].x - best.summary.cue.x, result.balls[0].y - best.summary.cue.y) < 1e-10;
  if (!same || result.balls.some(b => b.potted) || !result.completed) throw new Error('Forward verification failed');
  fs.writeFileSync(path.resolve(__dirname, '../tmp/breakoff-candidate.json'), JSON.stringify({ balls, shot: best.shot, summary: { ...best.summary, forwardVerified: same }, result }, null, 2));
}
