(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const R = 0.02625;
  const TABLE = Object.freeze({
    width: 3.569, height: 1.778, radius: R, mass: 0.142,
    baulk: 0.737, dRadius: 0.292, blackOffset: 0.324,
    // Simplified circular capture regions, not WPBSA pocket templates.
    pockets: Object.freeze([
      { id: 'TL', x: 0, y: 0, radius: 0.0445 },
      { id: 'TM', x: 1.7845, y: 0, radius: 0.051 },
      { id: 'TR', x: 3.569, y: 0, radius: 0.0445 },
      { id: 'BL', x: 0, y: 1.778, radius: 0.0445 },
      { id: 'BM', x: 1.7845, y: 1.778, radius: 0.051 },
      { id: 'BR', x: 3.569, y: 1.778, radius: 0.0445 }
    ])
  });
  const DEFAULTS = Object.freeze({
    muSlide: 0.20, muRoll: 0.011, cushionRestitution: 0.70,
    cushionTangent: 0.60, spinCushion: 1, ballRestitution: 0.94,
    spinDecay: 8, gravity: 9.81
  });
  const DT = 0.001;
  const EPS = 1e-10;
  const STOP = 1e-5;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const copyBall = b => ({ ...b });
  function createBall(b) {
    return {
      id: b.id || 'cue', color: b.color || 'white', x: b.x, y: b.y,
      vx: b.vx || 0, vy: b.vy || 0, wx: b.wx || 0, wy: b.wy || 0,
      wz: b.wz || 0, potted: !!b.potted
    };
  }
  function createWorld(balls, params = DEFAULTS) {
    return { balls: balls.map(createBall), params: { ...DEFAULTS, ...params }, time: 0, events: [], shot: null, _sanitized: false };
  }
  // x right, y down. The algebraic angular-velocity coordinates obey
  // u=(vx-R*wy, vy+R*wx); pure rolling has (wx,wy)=(-vy/R,vx/R).
  function slip(b) { return { x: b.vx - R * b.wy, y: b.vy + R * b.wx }; }
  function energy(b) {
    const I = 0.4 * TABLE.mass * R * R;
    return 0.5 * TABLE.mass * (b.vx * b.vx + b.vy * b.vy) +
      0.5 * I * (b.wx * b.wx + b.wy * b.wy + b.wz * b.wz);
  }
  function strike(world, shot) {
    const cue = world.balls.find(b => b.id === 'cue') || world.balls.find(b => b.color === 'white');
    if (!cue || cue.potted) throw new Error('Put the cue ball back on the table first.');
    if (isMoving(world)) throw new Error('Wait for all balls to stop.');
    let top = Number(shot.top) || 0, side = Number(shot.side) || 0;
    const offset = Math.hypot(top, side);
    if (offset > 0.5 + 1e-9) throw new RangeError('Combined tip offset must not exceed 0.5R.');
    const cueSpeed = Number(shot.cueSpeed);
    if (!Number.isFinite(cueSpeed) || cueSpeed < 0 || cueSpeed > 6) throw new RangeError('Cue speed must be between 0 and 6 m/s.');
    const angle = Number(shot.angle) || 0, a = angle * Math.PI / 180;
    // Ideal horizontal impulse from a 0.50 kg cue, tip restitution 0.75.
    // The off-centre term is the sphere's rotational effective mass.
    // v_ball = (1+e_tip)*v_cue / (1+m_ball/m_cue+2.5*(b/R)^2).
    const speed = 1.75 * cueSpeed / (1 + TABLE.mass / 0.5 + 2.5 * (top * top + side * side));
    cue.vx = speed * Math.cos(a); cue.vy = speed * Math.sin(a);
    cue.wx = -2.5 * top * cue.vy / R;
    cue.wy = 2.5 * top * cue.vx / R;
    cue.wz = -2.5 * side * speed / R;
    world.shot = { angle, cueSpeed, top, side, initialBallSpeed: speed };
    return world.shot;
  }
  function stopHorizontal(b) { b.vx = b.vy = b.wx = b.wy = 0; }
  function advanceFree(b, duration, p) {
    if (b.potted) return;
    if (b.vx === 0 && b.vy === 0 && b.wx === 0 && b.wy === 0 && b.wz === 0) return;
    let remaining = duration;
    const u = slip(b), magnitude = Math.hypot(u.x, u.y);
    const slideAcceleration = Math.max(0, p.muSlide) * p.gravity;
    if (magnitude > EPS && slideAcceleration > 0) {
      const transition = magnitude / (3.5 * slideAcceleration);
      const h = Math.min(remaining, transition);
      const ax = -slideAcceleration * u.x / magnitude;
      const ay = -slideAcceleration * u.y / magnitude;
      b.x += b.vx * h + 0.5 * ax * h * h;
      b.y += b.vy * h + 0.5 * ay * h * h;
      b.vx += ax * h; b.vy += ay * h;
      b.wx += 2.5 * ay * h / R;
      b.wy -= 2.5 * ax * h / R;
      remaining -= h;
      if (h >= transition - 1e-14) { b.wx = -b.vy / R; b.wy = b.vx / R; }
    } else if (magnitude > EPS) {
      // Zero-friction diagnostic case: never force a rolling transition.
      b.x += b.vx * remaining; b.y += b.vy * remaining; remaining = 0;
    }
    if (remaining > 0) {
      const speed = Math.hypot(b.vx, b.vy), deceleration = Math.max(0, p.muRoll) * p.gravity;
      if (speed > EPS) {
        const h = deceleration > 0 ? Math.min(remaining, speed / deceleration) : remaining;
        const travel = speed * h - 0.5 * deceleration * h * h;
        b.x += travel * b.vx / speed; b.y += travel * b.vy / speed;
        const nextSpeed = Math.max(0, speed - deceleration * h);
        b.vx *= nextSpeed / speed; b.vy *= nextSpeed / speed;
        b.wx = -b.vy / R; b.wy = b.vx / R;
      } else { stopHorizontal(b); }
    }
    if (Math.hypot(b.vx, b.vy) < STOP && Math.hypot(slip(b).x, slip(b).y) < STOP) stopHorizontal(b);
    const spinChange = Math.max(0, p.spinDecay) * duration;
    b.wz = Math.sign(b.wz) * Math.max(0, Math.abs(b.wz) - spinChange);
  }
  function cushionImpulse(b, nx, ny, p) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return false;
    const tx = -ny, ty = nx;
    const vt = b.vx * tx + b.vy * ty;
    const trueSlip = vt - R * b.wz;
    let change = -(1 - clamp(p.cushionTangent, 0, 1)) * (vt - Math.max(0, p.spinCushion) * R * b.wz);
    // A passive tangential impulse cannot add kinetic energy. For a solid
    // sphere ΔE/m = change*trueSlip + (7/4)*change². The bound also prevents
    // an extreme user coefficient from making the rail an energy source.
    if (change * trueSlip > 0) change = 0;
    change = Math.sign(change) * Math.min(Math.abs(change), 2 * Math.abs(trueSlip) / 3.5);
    const newNormal = -clamp(p.cushionRestitution, 0, 1) * vn;
    b.vx = newNormal * nx + (vt + change) * tx;
    b.vy = newNormal * ny + (vt + change) * ty;
    b.wz -= 2.5 * change / R;
    return true;
  }
  function pocketAndRails(world, b, time) {
    if (b.potted) return;
    for (const pocket of TABLE.pockets) {
      if (Math.hypot(b.x - pocket.x, b.y - pocket.y) <= pocket.radius) {
        b.potted = true; stopHorizontal(b); b.wz = 0;
        world.events.push({ type: 'pocket', id: b.id, pocket: pocket.id, x: b.x, y: b.y, t: time });
        return;
      }
    }
    function hit(wall, nx, ny) {
      if (cushionImpulse(b, nx, ny, world.params))
        world.events.push({ type: 'cushion', id: b.id, wall, x: b.x, y: b.y, t: time });
    }
    if (b.x < R) { b.x = R; hit('left', 1, 0); }
    if (b.x > TABLE.width - R) { b.x = TABLE.width - R; hit('right', -1, 0); }
    if (b.y < R) { b.y = R; hit('top', 0, 1); }
    if (b.y > TABLE.height - R) { b.y = TABLE.height - R; hit('bottom', 0, -1); }
  }
  function collidePair(a, b, restitution) {
    let dx = b.x - a.x, dy = b.y - a.y;
    const square = dx * dx + dy * dy;
    if (square >= 4 * R * R - 1e-14) return null;
    const distance = Math.sqrt(square);
    const nx = distance > EPS ? dx / distance : 1, ny = distance > EPS ? dy / distance : 0;
    const penetration = 2 * R - distance;
    // Symmetric positional correction; no spurious change of momentum.
    const correction = (penetration + 1e-10) * 0.5;
    a.x -= nx * correction; a.y -= ny * correction;
    b.x += nx * correction; b.y += ny * correction;
    const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (closing <= EPS) return null;
    const impulsePerMass = 0.5 * (1 + clamp(restitution, 0, 1)) * closing;
    a.vx -= impulsePerMass * nx; a.vy -= impulsePerMass * ny;
    b.vx += impulsePerMass * nx; b.vy += impulsePerMass * ny;
    return { nx, ny, impulse: TABLE.mass * impulsePerMass };
  }
  function recordContact(world, a, b, contact, time) {
    if (!contact) return;
    world.events.push({ type: 'ball', ids: [a.id, b.id], id: a.id, otherId: b.id,
      x: a.x, y: a.y, positions: { [a.id]: { x: a.x, y: a.y }, [b.id]: { x: b.x, y: b.y } },
      t: time, ...contact });
  }
  function correctOverlaps(world, time, passes = 4) {
    // Invalid user layouts are separated without inventing an impact when
    // the relative normal velocity is zero or already separating.
    for (let pass = 0; pass < passes; pass++) {
      let corrected = false;
      for (let i = 0; i < world.balls.length; i++) {
        const a = world.balls[i]; if (a.potted) continue;
        for (let j = i + 1; j < world.balls.length; j++) {
          const b = world.balls[j]; if (b.potted) continue;
          if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 < 4 * R * R - 1e-14) {
            corrected = true;
            recordContact(world, a, b, collidePair(a, b, world.params.ballRestitution), time);
          }
        }
      }
      if (!corrected) break;
    }
  }
  function entryFraction(rx, ry, dx, dy, radius) {
    const a = dx * dx + dy * dy, b = rx * dx + ry * dy;
    const c = rx * rx + ry * ry - radius * radius;
    if (c < -1e-13) return 0;
    if (a < 1e-24 || b >= 0) return null;
    if (c <= 1e-14) return 0;
    const discriminant = b * b - a * c;
    // An exactly tangent path has no normal impulse and is not an impact.
    if (discriminant <= 0) return null;
    const fraction = c / (-b + Math.sqrt(discriminant));
    return fraction >= 0 && fraction <= 1 ? fraction : null;
  }
  function firstSweptEvent(world, projected) {
    let first = null;
    function offer(fraction, event) {
      if (fraction !== null && fraction >= 0 && fraction <= 1 && (!first || fraction < first.fraction - 1e-12))
        first = { fraction, ...event };
    }
    for (let i = 0; i < world.balls.length; i++) {
      const b = world.balls[i], q = projected[i]; if (b.potted) continue;
      const dx = q.x - b.x, dy = q.y - b.y;
      if (dx !== 0 || dy !== 0) {
        for (const pocket of TABLE.pockets) {
          offer(entryFraction(b.x - pocket.x, b.y - pocket.y, dx, dy, pocket.radius), { type: 'pocket', i, pocket });
        }
        if (dx < -EPS && q.x < R) offer(Math.max(0, (R - b.x) / dx), { type: 'cushion', i, wall: 'left', nx: 1, ny: 0 });
        if (dx > EPS && q.x > TABLE.width - R) offer(Math.max(0, (TABLE.width - R - b.x) / dx), { type: 'cushion', i, wall: 'right', nx: -1, ny: 0 });
        if (dy < -EPS && q.y < R) offer(Math.max(0, (R - b.y) / dy), { type: 'cushion', i, wall: 'top', nx: 0, ny: 1 });
        if (dy > EPS && q.y > TABLE.height - R) offer(Math.max(0, (TABLE.height - R - b.y) / dy), { type: 'cushion', i, wall: 'bottom', nx: 0, ny: -1 });
      }
      for (let j = i + 1; j < world.balls.length; j++) {
        const other = world.balls[j], next = projected[j]; if (other.potted) continue;
        if (q === b && next === other) continue;
        const rx = other.x - b.x, ry = other.y - b.y;
        const rdx = next.x - other.x - dx, rdy = next.y - other.y - dy;
        const fraction = entryFraction(rx, ry, rdx, rdy, 2 * R);
        if (fraction !== null) {
          const nx = rx + rdx * fraction, ny = ry + rdy * fraction;
          if ((b.vx - other.vx) * nx + (b.vy - other.vy) * ny > EPS)
            offer(fraction, { type: 'ball', i, j });
        }
      }
    }
    return first;
  }
  function applySweptEvent(world, event, time) {
    const b = world.balls[event.i];
    if (event.type === 'pocket') {
      b.potted = true; stopHorizontal(b); b.wz = 0;
      world.events.push({ type: 'pocket', id: b.id, pocket: event.pocket.id, x: b.x, y: b.y, t: time });
    } else if (event.type === 'cushion') {
      if (event.wall === 'left') b.x = R;
      if (event.wall === 'right') b.x = TABLE.width - R;
      if (event.wall === 'top') b.y = R;
      if (event.wall === 'bottom') b.y = TABLE.height - R;
      if (cushionImpulse(b, event.nx, event.ny, world.params))
        world.events.push({ type: 'cushion', id: b.id, wall: event.wall, x: b.x, y: b.y, t: time });
    } else {
      const other = world.balls[event.j], dx = other.x - b.x, dy = other.y - b.y;
      const distance = Math.hypot(dx, dy);
      if (distance > EPS) {
        // Sweep uses the free-motion chord. Correct its sub-micrometre
        // acceleration error to the contact manifold before the impulse.
        const adjustment = (distance - 2 * R + 1e-10) / 2;
        b.x += adjustment * dx / distance; b.y += adjustment * dy / distance;
        other.x -= adjustment * dx / distance; other.y -= adjustment * dy / distance;
      }
      recordContact(world, b, other, collidePair(b, other, world.params.ballRestitution), time);
    }
  }
  function step(world, dt = DT) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) throw new RangeError('Physics step must be in (0, 0.1] seconds.');
    // Even callers advancing a larger chunk use the same <=1 ms integration.
    const count = Math.ceil(dt / DT - 1e-12), h = dt / count;
    for (let tick = 0; tick < count; tick++) {
      const end = world.time + h;
      if (!world._sanitized) {
        correctOverlaps(world, world.time, 24);
        for (const b of world.balls) pocketAndRails(world, b, world.time);
        world._sanitized = true;
      }
      let remaining = h, subdivisions = 0, hadEvent = false;
      while (remaining > 1e-12 && subdivisions++ < 64) {
        const projected = world.balls.map(b => {
          if (b.potted || (b.vx === 0 && b.vy === 0 && b.wx === 0 && b.wy === 0 && b.wz === 0)) return b;
          const next = copyBall(b); advanceFree(next, remaining, world.params); return next;
        });
        const event = firstSweptEvent(world, projected);
        if (!event) {
          world.balls.forEach((b, i) => { if (b !== projected[i]) Object.assign(b, projected[i]); });
          world.time += remaining; remaining = 0;
        } else {
          hadEvent = true;
          const elapsed = remaining * event.fraction;
          for (const b of world.balls) advanceFree(b, elapsed, world.params);
          world.time += elapsed;
          applySweptEvent(world, event, world.time);
          remaining -= elapsed;
        }
      }
      // Dense multi-contact packs remain a sequential approximation. The
      // bounded fallback prevents a zero-time contact cluster from stalling.
      if (remaining > 0) for (const b of world.balls) advanceFree(b, remaining, world.params);
      if (hadEvent || remaining > 0) {
        correctOverlaps(world, end);
        for (const b of world.balls) pocketAndRails(world, b, end);
      }
      world.time = end;
    }
    return world;
  }
  function isMoving(world) {
    return world.balls.some(b => !b.potted && (Math.hypot(b.vx, b.vy) > STOP ||
      Math.hypot(b.wx, b.wy) * R > STOP));
  }
  // Pure vertical spin does not move any centre. We end centre-trajectory
  // replay when translation/horizontal rotation stop, retaining residual wz.
  function snapshot(world) { return { t: world.time, balls: world.balls.map(copyBall) }; }
  function simulate(balls, shot, params = DEFAULTS, options = {}) {
    const world = createWorld(balls, params);
    strike(world, shot);
    const cueId = (world.balls.find(b => b.id === 'cue') || world.balls.find(b => b.color === 'white')).id;
    const tracks = {};
    for (const b of world.balls) tracks[b.id] = [{ x: b.x, y: b.y, t: 0 }];
    const frames = options.recordFrames === false ? [] : [snapshot(world)];
    const maxTime = options.maxTime === undefined ? 60 : Math.min(60, Math.max(0, options.maxTime));
    const maxSteps = Math.ceil(maxTime / DT);
    let lastFrame = 0, lastSample = 0, lastEvent = 0;
    function record(b, x = b.x, y = b.y, t = world.time) {
      const list = tracks[b.id], prior = list[list.length - 1];
      if (Math.hypot(x - prior.x, y - prior.y) > 1e-10 || Math.abs(t - prior.t) > 0.1) list.push({ x, y, t });
    }
    let iteration = 0;
    while (isMoving(world) && iteration < maxSteps) {
      step(world);
      for (; lastEvent < world.events.length; lastEvent++) {
        const e = world.events[lastEvent];
        if (e.type === 'ball') {
          for (const id of e.ids) { const b = world.balls.find(item => item.id === id); record(b, e.positions[id].x, e.positions[id].y, e.t); }
        } else { const b = world.balls.find(item => item.id === e.id); record(b, e.x, e.y, e.t); }
      }
      for (const b of world.balls) {
        const previous = tracks[b.id][tracks[b.id].length - 1];
        if (Math.hypot(b.x - previous.x, b.y - previous.y) >= 0.01 ||
          (world.time - lastSample >= 0.02 - EPS && Math.hypot(b.vx, b.vy) > STOP)) record(b);
      }
      if (world.time - lastSample >= 0.02 - EPS) lastSample = world.time;
      if (options.recordFrames !== false && world.time - lastFrame >= 1 / 60 - EPS) {
        frames.push(snapshot(world)); lastFrame = world.time;
      }
      iteration++;
    }
    for (const b of world.balls) record(b);
    if (options.recordFrames !== false && (!frames.length || frames[frames.length - 1].t !== world.time)) frames.push(snapshot(world));
    return { balls: world.balls.map(copyBall), path: tracks[cueId], tracks, frames,
      events: world.events, duration: world.time, shot: world.shot, params: { ...world.params },
      completed: !isMoving(world) };
  }
  const api = { TABLE, DEFAULTS, DT, createBall, createWorld, strike, step, isMoving, simulate,
    slip, energy, advanceFree, cushionImpulse, collidePair, snapshot };
  Coach.physics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
