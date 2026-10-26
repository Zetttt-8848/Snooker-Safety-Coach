(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  const R = 0.02625;
  const W = 3.569, H = 1.778, JAW = .010;
  // Six finite cushion noses with rounded ends. Corner mouth width is
  // measured diagonally BETWEEN the rubber surfaces, not along either rail.
  const CORNER = (.089 + 2 * JAW) / Math.SQRT2 - JAW;
  const MIDDLE = .102 / 2 + JAW;
  const cushions = [
    ['top', CORNER, -JAW, W/2-MIDDLE, -JAW, 0, 1],
    ['top', W/2+MIDDLE, -JAW, W-CORNER, -JAW, 0, 1],
    ['bottom', CORNER, H+JAW, W/2-MIDDLE, H+JAW, 0, -1],
    ['bottom', W/2+MIDDLE, H+JAW, W-CORNER, H+JAW, 0, -1],
    ['left', -JAW, CORNER, -JAW, H-CORNER, 1, 0],
    ['right', W+JAW, CORNER, W+JAW, H-CORNER, -1, 0]
  ].map(([wall,ax,ay,bx,by,nx,ny],id) => Object.freeze({id,wall,ax,ay,bx,by,nx,ny,radius:JAW}));
  const TABLE = Object.freeze({
    width: 3.569, height: 1.778, radius: R, mass: 0.142,
    baulk: 0.737, dRadius: 0.292, blackOffset: 0.324,
    cushions: Object.freeze(cushions),
    // radius describes the visible mouth/placement exclusion, not capture.
    // Capture happens beyond a throat line, after the ball clears the jaws.
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
    muSlide: 0.20, muRoll: 0.014, cushionRestitution: 0.98,
    cushionFriction: 0.14, ballRestitution: 0.94,
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
  // Mathavan, Jackson & Parkin (2010), Eqs. (3), (4), (12)-(14), (16).
  // Local x is along the rail; y points INTO it. z is the algebraic vertical.
  // Integrate normal impulse / mass, with the nose 1.4R above the bed.
  // Compression stores work; restitution returns e^2 of that work. This e is
  // energetic restitution, NOT a multiplier on horizontal normal velocity.
  function cushionImpulse(b, nx, ny, p, subdivisions = 512) {
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return false;
    const tx = -ny, ty = nx;
    const s = .4, c = Math.sqrt(1 - s * s);
    const mu = clamp(p.cushionFriction ?? DEFAULTS.cushionFriction, 0, .3);
    const cloth = clamp(p.muSlide, 0, .35), e = clamp(p.cushionRestitution, 0, 1);
    // Angular components are stored here as surface speeds R*omega.
    let v = [b.vx * tx + b.vy * ty, -vn,
      R * (b.wx * tx + b.wy * ty), -R * (b.wx * nx + b.wy * ny), R * b.wz];
    const steps = Math.max(32, Math.min(16384, Math.floor(subdivisions) || 512));
    const dj = -vn / (c * steps);
    function increment(start, j) {
      let [x, y, wx, wy, wz] = start;
      const half = c * j / 2;
      // Symmetric normal/friction split. Accumulate exact normal work in
      // both half kicks; friction only dissipates the intervening energy.
      let work = half * (y - half / 2);
      y -= half;
      const ux = x + s * wy - c * wz, uq = -s * y + wx;
      const slip = Math.hypot(ux, uq);
      // The 1/6 bound regularises sticking without reversing contact slip.
      // 6 exceeds the largest eigenvalue of the two-contact inverse-mass
      // matrix for h=1.4R; the coupled friction kick is passive.
      const grip = slip > 0 ? Math.min(mu * j / slip, 1 / 6) : 0;
      const jx = -ux * grip, jq = -uq * grip;
      const bedNormal = Math.max(0, s * j - c * jq);
      const hx = x - wy, hy = y + wx, bedSlip = Math.hypot(hx, hy);
      const bedGrip = bedSlip > 0 ? Math.min(cloth * bedNormal / bedSlip, 1 / 6) : 0;
      const jcx = -hx * bedGrip, jcy = -hy * bedGrip;
      x += jx + jcx; y += -s * jq + jcy;
      wx += 2.5 * (jq + jcy);
      wy += 2.5 * (s * jx - jcx);
      wz -= 2.5 * c * jx;
      work += half * (y - half / 2);
      y -= half;
      return { v: [x, y, wx, wy, wz], work };
    }
    let stored = 0;
    // Locate the end of compression within the last impulse interval.
    for (let i = 0; i < steps * 4 + 64; i++) {
      let step = increment(v, dj);
      if (step.v[1] <= 0) {
        let lo = 0, hi = dj;
        for (let k = 0; k < 32; k++) { const mid = (lo + hi) / 2; if (increment(v, mid).v[1] > 0) lo = mid; else hi = mid; }
        step = increment(v, (lo + hi) / 2);
        stored += step.work; v = step.v; break;
      }
      stored += step.work; v = step.v;
    }
    let remaining = e * e * stored;
    for (let i = 0; remaining > 1e-16 && i < steps * 4 + 64; i++) {
      let step = increment(v, dj);
      if (-step.work >= remaining) {
        let lo = 0, hi = dj;
        for (let k = 0; k < 32; k++) { const mid = (lo + hi) / 2; if (-increment(v, mid).work < remaining) lo = mid; else hi = mid; }
        step = increment(v, (lo + hi) / 2); v = step.v; remaining = 0;
      } else { remaining += step.work; v = step.v; }
    }
    b.vx = v[0] * tx - v[1] * nx; b.vy = v[0] * ty - v[1] * ny;
    b.wx = (v[2] * tx - v[3] * nx) / R; b.wy = (v[2] * ty - v[3] * ny) / R;
    b.wz = v[4] / R;
    return true;
  }
  function pocketAndRails(world, b, time) {
    if (b.potted) return;
    for (const pocket of TABLE.pockets) {
      if (insidePocket(b, pocket)) {
        b.potted = true; stopHorizontal(b); b.wz = 0;
        world.events.push({ type: 'pocket', id: b.id, pocket: pocket.id, x: b.x, y: b.y, t: time });
        return;
      }
    }
    for (const rail of cushions) {
      const dx=rail.bx-rail.ax,dy=rail.by-rail.ay;
      const f=clamp(((b.x-rail.ax)*dx+(b.y-rail.ay)*dy)/(dx*dx+dy*dy),0,1);
      const x=rail.ax+f*dx,y=rail.ay+f*dy,d=Math.hypot(b.x-x,b.y-y),radius=R+JAW;
      if(d>=radius-1e-10) continue;
      const nx=d>EPS?(b.x-x)/d:rail.nx,ny=d>EPS?(b.y-y)/d:rail.ny;
      b.x=x+nx*(radius+1e-10);b.y=y+ny*(radius+1e-10);
      if(cushionImpulse(b,nx,ny,world.params))
        world.events.push({type:'cushion',id:b.id,wall:rail.wall,jaw:f===0||f===1,x:b.x,y:b.y,t:time});
    }
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
  function pocketGate(p) {
    const middle=p.id[1]==='M',nx=middle?0:(p.x===0?1:-1),ny=p.y===0?1:-1;
    return {nx,ny,offset:nx*p.x+ny*p.y+(middle?-.010:.020)};
  }
  function inPocketSpan(b,p) {
    return p.id[1]==='M' ? Math.abs(b.x-p.x)<=.051+EPS && Math.abs(b.y-p.y)<.13 : Math.hypot(b.x-p.x,b.y-p.y)<.14;
  }
  function insidePocket(b,p) {
    const g=pocketGate(p);
    return g.nx*b.x+g.ny*b.y<=g.offset+EPS && inPocketSpan(b,p);
  }
  // Shared by swept simulation and the geometric aiming guide. Finite noses
  // and round jaw caps prevent both closed-corner walls and middle-pocket suction.
  function traceBoundary(b,delta) {
    const q={x:b.x+delta.x,y:b.y+delta.y};
    const interior=a=>a.x>R&&a.x<W-R&&a.y>R&&a.y<H-R;
    if(interior(b)&&interior(q))return null;
    let first=null;
    function offer(f,event) {
      if(f!==null&&f>=0&&f<=1&&(!first||f<first.fraction-1e-12))first={fraction:f,...event};
    }
    // Rubber wins a simultaneous jaw/throat contact.
    for(const rail of cushions) {
      const normalTravel=delta.x*rail.nx+delta.y*rail.ny;
      if(normalTravel < -EPS) {
        const d=(b.x-rail.ax)*rail.nx+(b.y-rail.ay)*rail.ny;
        const f=(R+JAW-d)/normalTravel;
        if(f>=-EPS&&f<=1) {
          const x=b.x+f*delta.x,y=b.y+f*delta.y;
          const along=(x-rail.ax)*(rail.bx-rail.ax)+(y-rail.ay)*(rail.by-rail.ay);
          if(along>=0&&along<=(rail.bx-rail.ax)**2+(rail.by-rail.ay)**2)
            offer(Math.max(0,f),{type:'cushion',wall:rail.wall,nx:rail.nx,ny:rail.ny,jaw:false});
        }
      }
      for(const [x,y] of [[rail.ax,rail.ay],[rail.bx,rail.by]]) {
        const f=entryFraction(b.x-x,b.y-y,delta.x,delta.y,R+JAW);
        if(f===null)continue;
        const rx=b.x+f*delta.x-x,ry=b.y+f*delta.y-y,d=Math.hypot(rx,ry);
        if(d>EPS&&delta.x*rx+delta.y*ry < -EPS)
          offer(f,{type:'cushion',wall:rail.wall,nx:rx/d,ny:ry/d,jaw:true});
      }
    }
    for(const pocket of TABLE.pockets) {
      const g=pocketGate(pocket),travel=g.nx*delta.x+g.ny*delta.y;
      if(travel>=-EPS)continue;
      const f=(g.offset-g.nx*b.x-g.ny*b.y)/travel;
      if(f>=0&&f<=1&&inPocketSpan({x:b.x+f*delta.x,y:b.y+f*delta.y},pocket))offer(f,{type:'pocket',pocket});
    }
    return first;
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
        const boundary=traceBoundary(b,{x:dx,y:dy});
        if(boundary)offer(boundary.fraction,{...boundary,i});
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
      // Keep the actual curved-jaw contact, rather than snapping it onto an
      // imaginary full-length rail. Separate by a sub-nanometre to avoid repeats.
      b.x += event.nx*1e-10; b.y += event.ny*1e-10;
      if (cushionImpulse(b, event.nx, event.ny, world.params))
        world.events.push({ type: 'cushion', id: b.id, wall: event.wall, jaw:event.jaw, x: b.x, y: b.y, t: time });
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
    slip, energy, advanceFree, cushionImpulse, collidePair, snapshot, traceBoundary };
  Coach.physics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
