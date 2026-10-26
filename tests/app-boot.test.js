'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the shipped scripts, in index.html order, against a stand-in for the browser. Only the browser
// surfaces are replaced; routing, state, storage, scoring and the physics engine are the real code.
function boot(options = {}) {
  const store = new Map(Object.entries(options.storage || {}));
  const frames = [];
  const cache = new WeakMap();
  const context2d = () => new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 40 }) },
    { get: (t, k) => k in t ? t[k] : () => {}, set: () => true });
  function element(name = 'node') {
    const classes = new Set(), children = new Map();
    const el = {
      name, hidden: false, value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, checked: false, disabled: false, title: '', offsetParent: {},
      classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v), toggle(v, f) { const on = f === undefined ? !classes.has(v) : f; on ? classes.add(v) : classes.delete(v); return on; } },
      querySelector(selector) { if (!children.has(selector)) children.set(selector, element(selector)); return children.get(selector); },
      querySelectorAll: selector => options.selectors?.[selector] || [], closest: () => null, contains: () => false,
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, toggleAttribute() {}, hasAttribute: () => false, focus() {}, blur() {}, remove() {}, append() {},
      setPointerCapture() {}, releasePointerCapture() {}, scrollIntoView() {}, showModal() {}, close() {},
      getContext: () => context2d(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 492 })
    };
    return el;
  }
  const document = { ...element('document'), documentElement: element('html'), body: element('body'), createElement: () => element('created'), addEventListener() {}, hidden: false };
  const sandbox = {
    console, document, performance, URL, Blob: class {}, setTimeout, clearTimeout, setInterval, clearInterval, structuredClone,
    location: { hash: options.hash || '' }, history: { replaceState() {} },
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    matchMedia: () => ({ matches: false }), devicePixelRatio: 1,
    requestAnimationFrame: cb => { frames.push(cb); return frames.length; }, cancelAnimationFrame() {}
  };
  sandbox.window = sandbox; sandbox.scrollTo = () => {}; sandbox.addEventListener = () => {};
  const context = vm.createContext(sandbox);
  const order = [...fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  for (const file of order) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  return { C: context.Coach, context, document, store, frames, nodes: id => document.querySelector(id) };
}
const plain = v => JSON.parse(JSON.stringify(v));

test('every script in index.html loads and seven screens are registered', () => {
  const env = boot();
  assert.ok(env.C.ui && env.C.practice && env.C.freeTable && env.C.library && env.C.guide);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const id of ['home', 'puzzles', 'practice', 'results', 'free', 'create', 'settings']) assert.ok(html.includes(`id="view-${id}"`), id);
});

test('the puzzle library lists every built-in lesson, grouped by level, with all tactics filterable', () => {
  const env = boot({ hash: '#/puzzles' });
  env.C.ui.router.render();
  const body = env.nodes('#lib-body').innerHTML;
  assert.equal((body.match(/class="puzzle-card"/g) || []).length, env.C.puzzles.length);
  for (let level = 1; level <= 5; level++) assert.ok(body.includes(`id="level-${level}"`), 'level ' + level);
  assert.ok(env.nodes('#lib-filters').innerHTML.includes('Hide behind a colour'));
  assert.match(env.nodes('#lib-progress').innerHTML, /0<\/strong> of 23 mastered/);
});

test('opening a puzzle loads its reference, an empty editor and a plain-English goal', () => {
  const env = boot({ hash: '#/practice/hide-brown' });
  env.C.ui.router.render();
  assert.equal(env.C.practice.puzzle.id, 'hide-brown');
  assert.equal(env.C.practice.editor.points.length, 0);
  assert.equal(env.nodes('#pr-brief').textContent, 'Clip the red, then hide the white behind the brown.');
  assert.equal(env.nodes('#pr-check').disabled, true, 'checking is disabled until a route exists');
});

test('an unknown puzzle sends the learner back to the library instead of a blank screen', () => {
  const env = boot({ hash: '#/practice/not-a-puzzle' });
  env.C.ui.router.render();
  assert.equal(env.context.location.hash, '#/puzzles');
});

test('drawing, checking and reading the result: the whole main journey runs on the real engine', async () => {
  const env = boot({ hash: '#/practice/one-rail-blue' });
  const { C } = env;
  C.ui.router.render();
  const puzzle = C.practice.puzzle, P = C.physics, G = C.geometry;
  const reference = P.simulate(puzzle.balls, puzzle.referenceShot, P.DEFAULTS, { recordFrames: false });
  const route = G.simplifyPath(reference.path, .02).map((q, i, a) => i === 0 || i === a.length - 1 ? q : { x: q.x + Math.sin(i * 7.1) * .03, y: q.y + Math.cos(i * 5.3) * .03 });
  C.practice.editor.setPoints(route);
  assert.equal(env.nodes('#pr-check').disabled, false);
  await env.nodes('#pr-check').onclick();
  const result = C.ui.session.assessment;
  assert.ok(result, 'the check produced an assessment');
  assert.equal(result.puzzleId, 'one-rail-blue');
  assert.ok(['feasible', 'approximate'].includes(result.fit.status));
  assert.equal(result.report.grade, 'Excellent');
  assert.equal(C.ui.store.progress()['one-rail-blue'].attempts, 1);
  assert.equal(C.ui.store.statusOf('one-rail-blue'), 'mastered');
  C.ui.router.go('results');
  C.ui.router.render();
  assert.equal(env.nodes('#rs-grade').textContent, 'Excellent');
  assert.match(env.nodes('#rs-meters').innerHTML, /Safety of the leave/);
  env.nodes('#rs-finish').onclick();
  assert.equal(env.nodes('#rs-safe-legend').hidden,false);
  assert.match(env.nodes('#rs-safe-legend').innerHTML,/Your final layout/);
  env.nodes('#rs-src-ref').onclick();
  assert.equal(env.nodes('#rs-safe-legend').hidden,true,'the map is not shown over moving balls');
  env.nodes('#rs-finish').onclick();
  assert.match(env.nodes('#rs-safe-legend').innerHTML,/Reference final layout/);
});

test('results without a checked route redirect to the library rather than showing empty scores', () => {
  const env = boot({ hash: '#/results' });
  env.C.ui.router.render();
  assert.equal(env.context.location.hash, '#/puzzles');
});

test('a route typed into the editor survives a trip to another screen and back', () => {
  const env = boot({ hash: '#/practice/hide-brown' });
  const { C } = env;
  C.ui.router.render();
  const cue = C.practice.puzzle.balls.find(b => b.id === 'cue');
  C.practice.editor.setPoints([{ x: cue.x, y: cue.y }, { x: cue.x - .1, y: cue.y + .5 }]);
  env.context.location.hash = '#/settings'; C.ui.router.render();
  env.context.location.hash = '#/practice/hide-brown'; C.ui.router.render();
  assert.equal(C.practice.editor.points.length, 2, 'the draft is restored');
});

test('the free table takes a shot and records it so it can become a puzzle', () => {
  const env = boot({ hash: '#/free' });
  const { C } = env;
  C.ui.router.render();
  const S = C.freeTable.state;
  assert.ok(S.balls.some(b => b.id === 'cue'));
  env.nodes('#ft-shoot').onclick();
  assert.equal(S.playing, true);
  const capture = C.ui.session.capture;
  assert.ok(capture && capture.result.completed && capture.initial.length === S.before.length);
  for (let t = 1000; env.frames.length && S.playing && t < 1e6; t += 250) env.frames.shift()(t);
  assert.equal(S.playing, false, 'the replay finishes');
  assert.ok(!S.balls.some(b => b.vx));
  assert.equal(env.nodes('#ft-safety').disabled,false);
  env.nodes('#ft-safety').onclick();
  assert.equal(env.nodes('#ft-safe-legend').hidden,false);
  env.nodes('#ft-undo').onclick();
  assert.equal(env.nodes('#ft-safe-legend').hidden,true);
  assert.equal(env.nodes('#ft-safety').disabled,true,'undo cannot label the initial layout as a final leave');
});

test('dragging a diagonal tip point to the limit still permits a physical shot', () => {
  const env=boot({hash:'#/free'});env.C.ui.router.render();
  const spin=env.nodes('#ft-spin'),radius=56*900/132;
  spin.onpointerdown({clientX:450+.36*radius,clientY:246-.35*radius,pointerId:1});
  spin.onpointerup();
  const s=env.C.freeTable.state;
  assert.ok(Math.hypot(s.shot.top,s.shot.side)<=.5+1e-12);
  env.nodes('#ft-shoot').onclick();assert.ok(s.last?.completed);assert.ok(s.playing);
});

test('the ball palette restores a potted white without duplicating it', () => {
  const button={dataset:{color:'white'}};
  const env=boot({hash:'#/free',selectors:{'[data-color]':[button]}});env.C.ui.router.render();
  const s=env.C.freeTable.state, cue=s.balls.find(b=>b.id==='cue');
  cue.potted=true;cue.wz=4;
  env.nodes('#ft-mode-arrange').onclick();
  assert.match(env.nodes('#ft-palette').innerHTML,/Restore the white ball/);
  button.onclick();
  assert.equal(s.balls.filter(b=>b.color==='white').length,1);
  assert.equal(cue.potted,false);assert.equal(cue.wz,0);
  env.nodes('#ft-mode-aim').onclick();
  assert.equal(env.nodes('#ft-shoot').disabled,false);
});

test('typing an angle updates the next shot even before the field loses focus', () => {
  const env=boot({hash:'#/free'});env.C.ui.router.render();
  env.nodes('#ft-angle').oninput({target:{value:'-45.1'}});
  env.nodes('#ft-shoot').onclick();
  assert.equal(env.C.ui.session.capture.shot.angle,-45.1);
});

test('an unresolved drawing shows only the explicitly labelled reference safe-leave map', () => {
  const env=boot(), C=env.C, puzzle=C.puzzles.find(p=>p.id==='hide-brown');
  const reference=C.physics.simulate(puzzle.balls,puzzle.referenceShot), route=reference.path;
  const fit={status:'unresolved',message:'No matching shot found.'};
  const report=C.scoring.evaluate({puzzle,studentPath:route,reference,feasibility:fit});
  C.ui.session.assessment={puzzleId:puzzle.id,puzzle,reference,route,fit,report};
  env.context.location.hash='#/results';C.ui.router.render();
  env.nodes('#rs-finish').onclick();
  assert.equal(env.nodes('#rs-src-mine').disabled,true);
  assert.match(env.nodes('#rs-safe-legend').innerHTML,/Reference final layout/);
  assert.doesNotMatch(env.nodes('#rs-safe-legend').innerHTML,/Your final layout/);
});

test('the English-only interface: no Han characters anywhere in the shipped page, styles or scripts', () => {
  const root = path.resolve(__dirname, '..');
  const files = ['index.html', 'styles.css', 'data/puzzles.js', ...fs.readdirSync(path.join(root, 'src')).map(n => 'src/' + n)];
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\p{Script=Han}/u, file);
  assert.deepEqual(plain(boot().C.ui.settings.params).muSlide, .2);
});
