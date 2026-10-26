'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const { radius: R, mass: M } = P.TABLE;
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const ball = overrides => P.createBall({ id: 'cue', x: 1, y: .8, ...overrides });

test('nonspinning sliding reaches v=5v0/7 with 5/7 initial kinetic energy', () => {
  const b = ball({ vx: 1 });
  const initial = P.energy(b);
  const transition = 2 / (7 * P.DEFAULTS.muSlide * P.DEFAULTS.gravity);
  P.advanceFree(b, transition, P.DEFAULTS);
  near(b.vx, 5 / 7); near(R * b.wy, b.vx);
  near(P.energy(b) / initial, 5 / 7);
  near(P.slip(b).x, 0);
});
test('rolling travels v²/(2 μg) and stops without reversal', () => {
  const b = ball({ vx: .45, wy: .45 / R });
  const expected = 1 + .45 ** 2 / (2 * P.DEFAULTS.muRoll * P.DEFAULTS.gravity);
  for (let i = 0; i < 6000; i++) P.advanceFree(b, .001, P.DEFAULTS);
  near(b.x, expected, 1e-8); near(b.vx, 0); near(b.wy, 0);
});
test('sliding friction opposes contact slip rather than velocity: draw back is possible', () => {
  const b = ball({ vx: .1, wy: -40 });
  const initial = P.energy(b);
  for (let i = 0; i < 250; i++) P.advanceFree(b, .001, P.DEFAULTS);
  assert.ok(b.vx < 0); assert.ok(P.energy(b) < initial);
});
test('frictionless normal cushion impact reflects with prescribed restitution', () => {
  const b = ball({ vx: 1, vy: 0 });
  P.cushionImpulse(b, -1, 0, { ...P.DEFAULTS, muSlide: 0, cushionFriction: 0 });
  near(b.vx, -.98); near(b.vy, 0); near(b.wz, 0);
});
test('opposite side spin makes opposite rail deflection; impact remains passive', () => {
  const left = ball({ vx: 1, wz: 20 }), right = ball({ vx: 1, wz: -20 });
  const old = P.energy(left);
  P.cushionImpulse(left, -1, 0, P.DEFAULTS);
  P.cushionImpulse(right, -1, 0, P.DEFAULTS);
  assert.ok(left.vy < 0); assert.ok(right.vy > 0);
  near(left.vy, -right.vy); assert.ok(P.energy(left) <= old + 1e-12);
});

test('a modest check-side input no longer artificially reverses travel along a cushion', () => {
  // Incoming rolling ball: 1 m/s into the right rail, 0.14 m/s along it,
  // R*wz=0.25 m/s. The old 0.4*slip rule produced vy=-0.016 m/s.
  const b = ball({ vx: 1, vy: .14, wx: -.14/R, wy: 1/R, wz: .25/R });
  P.cushionImpulse(b, -1, 0, P.DEFAULTS);
  assert.ok(b.vx < 0); assert.ok(b.vy > 0 && b.vy < .14);
});

test('a grazing cushion cannot generate a large sideways impulse even with strong reverse spin', () => {
  const b = ball({ vx: .02, vy: 1, wx: -1/R, wy: .02/R, wz: 2/R });
  P.cushionImpulse(b, -1, 0, P.DEFAULTS);
  assert.ok(b.vx < 0); assert.ok(b.vy > .98 && b.vy <= 1);
});

test('the raised cushion nose changes topspin, and post-impact cloth slip settles to rolling', () => {
  const b = ball({ vx: 1, wy: 1/R });
  P.cushionImpulse(b, -1, 0, P.DEFAULTS);
  assert.ok(Math.abs(R*b.wy - 1) > .1);
  assert.ok(P.slip(b).x < 0);
  const t = Math.abs(P.slip(b).x) / (3.5 * P.DEFAULTS.muSlide * P.DEFAULTS.gravity);
  P.advanceFree(b, t + .001, P.DEFAULTS);
  near(P.slip(b).x, 0); assert.ok(b.vx < 0);
});

test('cushion integration converges, remains passive and has no left/right handedness bias', () => {
  for (const angle of [5,30,60,85]) for (const side of [-.4,0,.4]) {
    const a=angle*Math.PI/180, vx=Math.sin(a), vy=Math.cos(a);
    const seed={ vx,vy,wx:-vy/R,wy:vx/R,wz:side/R };
    const coarse=ball(seed),fine=ball(seed),mirror=ball({...seed,vy:-vy,wx:vy/R,wz:-side/R});
    const before=P.energy(coarse);
    P.cushionImpulse(coarse,-1,0,P.DEFAULTS,512);
    P.cushionImpulse(fine,-1,0,P.DEFAULTS,4096);
    P.cushionImpulse(mirror,-1,0,P.DEFAULTS,512);
    assert.ok(Math.hypot(coarse.vx-fine.vx,coarse.vy-fine.vy)<.002);
    assert.ok(R*Math.hypot(coarse.wx-fine.wx,coarse.wy-fine.wy,coarse.wz-fine.wz)<.004);
    assert.ok(P.energy(coarse)<=before+1e-10);
    near(coarse.vx,mirror.vx);near(coarse.vy,-mirror.vy);near(coarse.wz,-mirror.wz);
  }
});
test('extreme admissible cushion settings cannot add energy', () => {
  for (const cushionFriction of [0, .14, .3]) for (const muSlide of [0, .2, .35]) {
    for (const wz of [-100, -10, 0, 10, 100]) for (const vy of [-3, 0, 3]) {
      const b = ball({ vx: 2, vy, wz, wx: 8, wy: 11 });
      const before = P.energy(b);
      P.cushionImpulse(b, -1, 0, { ...P.DEFAULTS, cushionFriction, muSlide, cushionRestitution: 1 });
      assert.ok(P.energy(b) <= before + 1e-10);
    }
  }
});
test('equal-mass elastic head-on collision transfers velocity; momentum and energy conserved', () => {
  const a = ball({ vx: 1.2 }), b = ball({ id: 'red', x: 1 + 2 * R - 1e-6 });
  const before = P.energy(a) + P.energy(b);
  const momentum = M * (a.vx + b.vx);
  P.collidePair(a, b, 1);
  near(a.vx, 0); near(b.vx, 1.2);
  near(M * (a.vx + b.vx), momentum);
  near(P.energy(a) + P.energy(b), before);
});
test('inelastic head-on collision conserves momentum and loses prescribed normal energy', () => {
  const a = ball({ vx: 1 }), b = ball({ id: 'red', x: 1 + 2 * R - 1e-6 });
  P.collidePair(a, b, .94);
  near(a.vx, .03); near(b.vx, .97); near(a.vx + b.vx, 1);
});
test('glancing smooth collision leaves relative tangential velocity unchanged', () => {
  const a = ball({ vx: 1, vy: .3 }), b = ball({ id: 'red', x: 1 + 2 * R - 1e-6, vy: -.1 });
  P.collidePair(a, b, .94);
  near(a.vy, .3); near(b.vy, -.1);
});
test('middle pocket waits for the throat, then captures without an invisible rail', () => {
  const w = P.createWorld([ball({ x: P.TABLE.width / 2, y: .06, vy: -1, wx: 1 / R })]);
  for (let i = 0; i < 30; i++) P.step(w);
  assert.equal(w.balls[0].potted, false, 'no early capture on the cloth');
  for (let i = 0; i < 70; i++) P.step(w);
  assert.equal(w.balls[0].potted, true);
  assert.equal(w.events[0].type, 'pocket');
});
test('6 m/s cue input does not tunnel through a head-on target', () => {
  const result = P.simulate([ball({ x: .4 }), ball({ id: 'red', color: 'red', x: 1.2 })],
    { angle: 0, cueSpeed: 6, top: 0, side: 0 }, P.DEFAULTS, { recordFrames: false });
  assert.ok(result.events.some(e => e.type === 'ball' && e.ids.includes('red')));
  assert.ok(result.completed);
});
test('trajectory repeatability and independent output snapshots', () => {
  const initial = [ball({ x: 1.1, y: .65 })], shot = { angle: -32, cueSpeed: 1.2, top: 0, side: .1 };
  const a = P.simulate(initial, shot), b = P.simulate(initial, shot);
  assert.deepEqual(a, b); assert.ok(a.completed);
  assert.equal(initial[0].vx, 0); assert.equal(a.frames[0].balls[0].x, 1.1);
  assert.notEqual(a.frames[0].balls[0], a.balls[0]);
  const cues = a.events.filter(e => e.type === 'cushion' && e.id === 'cue');
  for (const e of cues) assert.ok(a.path.some(p => Math.abs(p.x - e.x) < 1e-12 && Math.abs(p.y - e.y) < 1e-12));
});
test('tip offset uses circular 0.5R limit and cue speed has physical bound', () => {
  const w = P.createWorld([ball({})]);
  assert.throws(() => P.strike(w, { cueSpeed: 1, top: .4, side: .4 }), RangeError);
  assert.throws(() => P.strike(w, { cueSpeed: 6.1, top: 0, side: 0 }), RangeError);
});
test('swept detection catches a thin grazing collision entirely between 1 ms samples', () => {
  const w = P.createWorld([
    ball({ x: 1, y: .8, vx: 8, wy: 8 / R }),
    ball({ id: 'red', x: 1.004, y: .8 + 2 * R - .00001 })
  ], { ...P.DEFAULTS, muSlide: 0, muRoll: 0 });
  // Both tick endpoints are outside the target exclusion disk. Merely
  // checking overlaps at the end of the tick would miss this contact.
  P.step(w);
  assert.ok(w.events.some(e => e.type === 'ball'));
  assert.ok(Math.hypot(w.balls[1].vx, w.balls[1].vy) > 0);
  assert.ok(w.events[0].t > 0 && w.events[0].t < .001);
});
test('swept capture locates a fast throat crossing between 1 ms samples', () => {
  const w = P.createWorld([ball({ x: P.TABLE.width / 2, y: -.006, vy: -8, wx: 8 / R })],
    { ...P.DEFAULTS, muSlide: 0, muRoll: 0 });
  P.step(w);
  assert.equal(w.balls[0].potted, true);
  assert.equal(w.events[0].type, 'pocket');
  assert.ok(w.events[0].t > 0 && w.events[0].t < .001);
});

test('all four corner pockets accept centred approaches over a range of angles and speeds', () => {
  for(const p of P.TABLE.pockets.filter(p=>p.id[1]!=='M')) for(const degrees of [30,45,60]) for(const speed of [.4,1,3,8]) {
    const a=degrees*Math.PI/180,sx=p.x===0?1:-1,sy=p.y===0?1:-1;
    const vx=-sx*speed*Math.cos(a),vy=-sy*speed*Math.sin(a);
    const w=P.createWorld([ball({x:p.x+sx*.22*Math.cos(a),y:p.y+sy*.22*Math.sin(a),vx,vy,wx:-vy/R,wy:vx/R})]);
    for(let i=0;i<2000&&P.isMoving(w);i++)P.step(w);
    assert.ok(w.balls[0].potted,`${p.id}, ${degrees} deg, ${speed} m/s`);
    assert.equal(w.events[0].type,'pocket','a clean corner approach meets no phantom wall');
    assert.equal(w.events[0].pocket,p.id);
  }
});

test('both middle pockets reject a near-mouth pass and an off-centre jaw hit', () => {
  for(const p of P.TABLE.pockets.filter(p=>p.id[1]==='M')) {
    const sy=p.y===0?1:-1;
    const pass=P.createWorld([ball({x:p.x-.1,y:p.y+sy*.05099,vx:1,wy:1/R})]);
    for(let i=0;i<250;i++)P.step(pass);
    assert.equal(pass.balls[0].potted,false,'passing near a visible hole is not entering it');
    const miss=P.createWorld([ball({x:p.x+.04,y:p.y+sy*.12,vy:-sy,wx:sy/R})]);
    const energy=P.energy(miss.balls[0]);
    for(let i=0;i<250;i++)P.step(miss);
    assert.equal(miss.events[0]?.type,'cushion');assert.equal(miss.events[0]?.jaw,true);
    assert.ok(P.energy(miss.balls[0])<energy);
  }
});

test('a shallow middle-pocket attempt meets a jaw while a central normal approach drops', () => {
  const p=P.TABLE.pockets[1];
  for(const dx of [0,.30]) {
    const origin={x:p.x-dx,y:.08},end={x:p.x,y:-.01};
    const hit=P.traceBoundary(origin,{x:end.x-origin.x,y:end.y-origin.y-.001});
    assert.equal(hit.type,dx===0?'pocket':'cushion');
  }
});

test('ball contacts dissipate the exact normal energy loss and cannot amplify a stationary object ball', () => {
  for(const angle of [0,15,45,75,85]) for(const speed of [.1,1,4]) {
    const theta=angle*Math.PI/180;
    const a=ball({vx:speed*Math.cos(theta),vy:speed*Math.sin(theta)}),b=ball({id:'red',x:1+2*R-1e-8});
    const before=P.energy(a),normal=a.vx,e=P.DEFAULTS.ballRestitution;
    P.collidePair(a,b,e);
    near(before-P.energy(a)-P.energy(b),M*(1-e*e)*normal*normal/4);
    assert.ok(P.energy(b)<=before+1e-12);
    near(b.vx,(1+e)*normal/2);
    if(angle===85)assert.ok(P.energy(b)<before*.01,'a feather touch transfers less than 1% here');
  }
});

test('the revised default drag shortens roll-out without altering the collision law', () => {
  const b=ball({vx:.5,wy:.5/R}),start=b.x;
  P.advanceFree(b,10,P.DEFAULTS);
  near(b.x-start,.5*.5/(2*.014*9.81));
  assert.ok(b.x-start<.92&&b.x-start>.90);
  const old=.5*.5/(2*.011*9.81);
  near((b.x-start)/old,.011/.014);
});
test('static overlaps are separated without false ball-collision events or kinetic energy', () => {
  const w = P.createWorld([ball({}), ball({ id: 'r1' }), ball({ id: 'r2', x: 1.03 })]);
  for (let i = 0; i < 30; i++) P.step(w);
  assert.equal(w.events.length, 0);
  assert.equal(P.isMoving(w), false);
  for (let i = 0; i < w.balls.length; i++) {
    near(P.energy(w.balls[i]), 0);
    for (let j = i + 1; j < w.balls.length; j++) {
      assert.ok(Math.hypot(w.balls[i].x - w.balls[j].x, w.balls[i].y - w.balls[j].y) >= 2 * R - 1e-7);
    }
  }
});
test('reversing spin coefficient does not bypass the circular tip offset limit', () => {
  const w = P.createWorld([ball({})]);
  const shot = P.strike(w, { angle: 0, cueSpeed: 2, top: .3, side: .4 });
  near(shot.initialBallSpeed, 3.5 / (1 + M / .5 + 2.5 * .25));
  assert.ok(w.balls[0].wy > 0); assert.ok(w.balls[0].wz < 0);
});
test('a multi-rail spin shot converges under halving the physics step', () => {
  function run(dt) {
    const w = P.createWorld([ball({ x: 1.1, y: .6 })]);
    P.strike(w, { angle: -27, cueSpeed: 1.7, top: .2, side: .1 });
    let ticks = 0;
    while (P.isMoving(w) && ticks++ < 50000) P.step(w, dt);
    assert.ok(!P.isMoving(w));
    return w;
  }
  const coarse = run(.001), fine = run(.0005);
  assert.ok(coarse.events.filter(e => e.type === 'cushion').length >= 2);
  assert.deepEqual(coarse.events.map(e => e.wall), fine.events.map(e => e.wall));
  assert.ok(Math.hypot(coarse.balls[0].x - fine.balls[0].x, coarse.balls[0].y - fine.balls[0].y) < .0001);
});
test('a dense fifteen-red pack remains finite, dissipative and inside the table at maximum cue speed', () => {
  const balls = [ball({ x: .5, y: P.TABLE.height / 2 })];
  for (let row = 0, id = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
    balls.push(ball({ id: 'red' + id++, color: 'red', x: 2.4 + row * Math.sqrt(3) * R,
      y: P.TABLE.height / 2 + (i - row / 2) * 2 * R }));
  }
  const w = P.createWorld(balls);
  P.strike(w, { angle: 0, cueSpeed: 6, top: 0, side: 0 });
  let lastEnergy = w.balls.reduce((s, b) => s + P.energy(b), 0);
  for (let tick = 0; tick < 5000; tick++) {
    P.step(w);
    const energy = w.balls.reduce((s, b) => s + P.energy(b), 0);
    assert.ok(energy <= lastEnergy + 1e-9);
    lastEnergy = energy;
  }
  assert.ok(w.events.some(e => e.type === 'ball'));
  for (const b of w.balls.filter(b => !b.potted)) {
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    assert.ok(b.x >= R - 1e-9 && b.x <= P.TABLE.width - R + 1e-9);
    assert.ok(b.y >= R - 1e-9 && b.y <= P.TABLE.height - R + 1e-9);
  }
});
