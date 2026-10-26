'use strict';
// Bounded, deterministic re-tuning after a physics revision. Never relaxes a
// lesson's zones or acceptance checks. Selected shots are saved and verified
// again by generate-puzzles.js and the independent test run.
const fs = require('node:fs');
const path = require('node:path');
const P = require('../src/physics.js'), G = require('../src/geometry.js');
const gen = require('./generate-puzzles.js');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'scripts/calibrated-shots.json');
const puzzles = JSON.parse(fs.readFileSync(path.join(root, 'data/puzzles.json')));
const selected = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output)) : {};
const names = process.argv.slice(2);
let seed = 26102026;
const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-8, random()))) * Math.cos(2 * Math.PI * random());
const excess = (v, lo, hi, scale = 1) => (Math.max(lo - v, 0, v - hi) / scale) ** 2;
for (const puzzle of puzzles.filter(p => names.includes(p.id))) {
  let best = null, found = null, count = 0;
  function assess(shot) {
    if (Math.hypot(shot.top, shot.side) > .5 || shot.cueSpeed < .1 || shot.cueSpeed > 6) return null;
    const result = gen.simulate(puzzle.balls, shot); count++;
    const p = gen.makeProof(puzzle, result), a = puzzle.acceptance;
    const cue = result.balls.find(b => b.id === 'cue'), target = result.balls.find(b => b.id === puzzle.targetId);
    let cost = result.completed ? 0 : 1000;
    if (!p.legalFirstContact || (a.preContactCushions !== undefined && p.preContactCushions.length !== a.preContactCushions)) {
      let distance = 5, rails = 0;
      const contacts = result.events.filter(e => e.type === 'cushion' && e.id === 'cue');
      const t = puzzle.balls.find(b => b.id === puzzle.targetId);
      for (let i = 1; i < result.path.length; i++) {
        while (rails < contacts.length && contacts[rails].t < result.path[i].t - 1e-9) rails++;
        if (a.preContactCushions === undefined || rails === a.preContactCushions)
          distance = Math.min(distance, G.pointSegmentDistance(t, result.path[i-1], result.path[i]));
      }
      cost += 50 + distance * 100;
    }
    cost += p.pockets.length * 50;
    if(a.preContactCushions) cost += gen.beforeContact(result).filter(e=>e.jaw).length*20;
    for (const [point, zone] of [[cue, puzzle.objective.cueZone], [target, puzzle.objective.targetZone]])
      if (zone) cost += excess(G.distance(point, zone), 0, zone.radius * .8, .12);
    const mins = { separation: a.minSeparation, targetPocketDistance: a.minTargetPocketDistance, pocketDistanceGain: a.minPocketDistanceGain };
    const maxs = { cueRailDistance: a.maxCueRailDistance, targetTravel: a.maxTargetTravel, redTotalTravel: a.maxRedTotalTravel };
    for (const [k,v] of Object.entries(mins)) if (v !== undefined) cost += excess(p[k], v + .01, Infinity, .12);
    for (const [k,v] of Object.entries(maxs)) if (v !== undefined) cost += excess(p[k], 0, v * .9, k === 'cueRailDistance' ? .025 : .12);
    if (a.cueCushions !== undefined) cost += Math.abs(a.cueCushions - p.allCueCushions.length) * 20;
    if (a.cueBaulk) cost += excess(cue.x, 0, P.TABLE.baulk - .04, .15);
    if (puzzle.id === 'break-off') cost += excess(cue.x - P.TABLE.radius, 0, .007, .025);
    const item = { shot, result, cost, proof: p };
    if (!best || cost < best.cost) best = item;
    try {
      gen.verify(puzzle, result);
      if (puzzle.id !== 'break-off' || (cue.x - P.TABLE.radius < .009 && result.balls.filter(b => b.id !== 'cue' && b.color !== 'red').every(b => G.distance(b, puzzle.balls.find(a => a.id === b.id)) < 1e-8))) found = item;
    } catch { /* This candidate does not meet the unchanged task. */ }
    return item;
  }
  const base = selected[puzzle.id]?.referenceShot || puzzle.referenceShot;
  assess(base);
  for (let restart = 0; !found && restart < 36; restart++) {
    const centre = best.shot;
    let at = best;
    if (restart) {
      const spread = restart % 4 === 0 ? 2 : .5;
      at = assess({ angle: centre.angle + normal() * (puzzle.id === 'break-off' ? .025 : .8) * spread,
        cueSpeed: centre.cueSpeed + normal() * .4 * spread, top: centre.top + normal() * .09 * spread, side: centre.side + normal() * .09 * spread });
    }
    at = at || best;
    for (let level = 0; !found && level < 5; level++) {
      const scales = { angle: (puzzle.id === 'break-off' ? .025 : .5) * .5 ** level, cueSpeed: .25 * .5 ** level, top: .10 * .5 ** level, side: .10 * .5 ** level };
      for (let round = 0; !found && round < 10; round++) {
        const previous = at.cost;
        for (const [key, step] of Object.entries(scales)) for (const sign of [-1, 1]) {
          const candidate = assess({ ...at.shot, [key]: at.shot[key] + sign * step });
          if (candidate && candidate.cost < at.cost) at = candidate;
          if (found) break;
        }
        if (at.cost >= previous - 1e-12) break;
      }
    }
    if (restart % 4 === 0) console.log(puzzle.id, 'searched', count, 'cost', best.cost.toFixed(4));
  }
  if (found) {
    selected[puzzle.id] = { balls: puzzle.balls, referenceShot: found.shot,
      method: 'bounded deterministic search; original zones and acceptance preserved; forward verified', evaluations: count };
    fs.writeFileSync(output, JSON.stringify(selected, null, 2) + '\n');
    console.log('VERIFIED', puzzle.id, count, JSON.stringify(found.shot));
  } else {
    fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(root, 'tmp', 'calibration-' + puzzle.id + '.json'), JSON.stringify(best, null, 2));
    console.log('UNRESOLVED', puzzle.id, count, best.cost, JSON.stringify(best.shot));
  }
}
