'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the shipped app and training scripts, substituting only browser
// surfaces. These checks exercise production handlers and shared state.
function boot(saved = {}) {
  const nodes = new Map(), timers = new Map(), raf = [];
  let timerId = 0;
  function element(id) {
    if (!nodes.has(id)) {
      const classes = new Set(), captures = new Set();
      nodes.set(id, {
        id, hidden: false, value: '', textContent: '', innerHTML: '', style: {}, checked: false, disabled: false,
        classList: {
          add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value),
          toggle(value, force) { const on = force === undefined ? !classes.has(value) : force; on ? classes.add(value) : classes.delete(value); return on; }
        },
        listeners: {},
        addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); },
        getContext() {
          return new Proxy({ createRadialGradient() { return { addColorStop() {} }; } }, {
            get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true)
          });
        },
        setPointerCapture: pointerId => captures.add(pointerId), releasePointerCapture: pointerId => captures.delete(pointerId),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 180, height: 180 }),
        showModal() {}, close() {}
      });
    }
    return nodes.get(id);
  }
  const context = vm.createContext({
    console, performance: { now: () => 0 },
    document: { getElementById: element, querySelectorAll: () => [], querySelector: element, body: element('body') },
    localStorage: { getItem: key => saved[key] ?? null, setItem() {} },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: callback => raf.push(callback),
    Coach: { renderer: { colors: { white: '#fff' }, TableRenderer: class {
      draw() {} unproject(e) { return { x: e.clientX, y: e.clientY }; }
    } } }
  });
  for (const name of ['physics', 'geometry', 'app', 'training']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name + '.js'), 'utf8'), context, { filename: name + '.js' });
  }
  function dispatch(type, attributes = {}) {
    const event = { pointerId: 1, preventDefault() {}, ...attributes }, target = element('table');
    target['on' + type]?.(event);
    for (const callback of target.listeners[type] || []) callback(event);
  }
  return { A: context.Coach.app, T: context.Coach.training.state, training: context.Coach.training, element, dispatch, timers, raf };
}
const plain = value => JSON.parse(JSON.stringify(value));
test('English upgrade preserves attempts and maps legacy grades without deleting progress', () => {
  const env = boot({'ssc.progress':JSON.stringify({demo:{attempts:4,best:91,grade:'\u4f18',lastGrade:'\u4e2d\u504f\u4f18'}})});
  assert.deepEqual(plain(env.A.storage.get('progress',{})),{demo:{attempts:4,best:91,grade:'Excellent',lastGrade:'Promising'}});
});
function gradedRoute(env) {
  env.T.route = [{ x: .7, y: .68 }, { x: 1, y: .68 }, { x: 1.3, y: .68 }];
  env.T.editing = true; env.T.activeHandle = 1; env.T.report = { score: 100 }; env.T.showReference = true;
  env.element('analysis-panel').hidden = false; env.element('reference-legend').hidden = false;
}

test('redraw resets selected handles and the next arrow key cannot dereference a deleted point', () => {
  const env = boot(); gradedRoute(env);
  env.training.clear();
  assert.equal(env.T.activeHandle, -1); assert.equal(env.T.handle, -1);
  assert.equal(env.T.editing, false); assert.equal(env.T.drawing, false);
  assert.doesNotThrow(() => env.dispatch('keydown', { key: 'ArrowRight' }));
  assert.equal(env.T.route.length, 0);
});

for (const mutation of ['keyboard move', 'keyboard delete', 'context delete', 'double click insert', 'drag']) {
  test(mutation + ' invalidates the visible report and reference overlay', () => {
    const env = boot(); gradedRoute(env);
    if (mutation === 'keyboard move') env.dispatch('keydown', { key: 'ArrowRight' });
    if (mutation === 'keyboard delete') env.dispatch('keydown', { key: 'Delete' });
    if (mutation === 'context delete') env.dispatch('contextmenu', { clientX: 1, clientY: .68 });
    if (mutation === 'double click insert') env.dispatch('dblclick', { clientX: 1.15, clientY: .68 });
    if (mutation === 'drag') {
      env.dispatch('pointerdown', { clientX: 1, clientY: .68 });
      env.dispatch('pointermove', { clientX: 1.02, clientY: .68 });
    }
    assert.equal(env.T.report, null); assert.equal(env.T.showReference, false);
    assert.equal(env.element('analysis-panel').hidden, true);
    assert.equal(env.element('reference-legend').hidden, true);
  });
}

test('an in-flight assessment freezes route edits, redraw and mode switches', () => {
  const env = boot(); gradedRoute(env); env.T.busy = true;
  const before = plain(env.T.route);
  env.training.clear();
  env.dispatch('contextmenu', { clientX: 1, clientY: .68 });
  env.dispatch('keydown', { key: 'Delete' });
  env.dispatch('dblclick', { clientX: 1.15, clientY: .68 });
  env.T.drawing = true; env.T.raw = env.T.route;
  env.dispatch('pointermove', { clientX: 2, clientY: .68 });
  env.dispatch('pointerup');
  env.element('sandbox-mode').onclick();
  assert.deepEqual(plain(env.T.route), before);
  assert.equal(env.T.report.score, 100); assert.equal(env.A.state.mode, 'puzzle');
  assert.equal(env.T.drawing, false);
});

test('switching modes preserves the sandbox layout and its own replay, never a puzzle reference', () => {
  const env = boot(), S = env.A.state;
  env.element('sandbox-mode').onclick();
  S.balls = S.balls.slice(0, 2); S.balls[0].x = .44;
  S.before = plain(S.balls); S.selected = 'cue'; S.placing = true;
  S.shot.cueSpeed = 1.7;
  S.last = { balls: plain(S.balls), frames: [], duration: 0, marker: 'sandbox' };
  S.prediction = [{ x: .44, y: .99 }, { x: .8, y: .99 }];
  const saved = plain({ balls: S.balls, before: S.before, last: S.last, prediction: S.prediction });
  env.element('puzzle-mode').onclick();
  S.last = env.T.reference;
  env.element('sandbox-mode').onclick();
  assert.deepEqual(plain({ balls: S.balls, before: S.before, last: S.last, prediction: S.prediction }), saved);
  assert.equal(S.selected, 'cue'); assert.equal(S.placing, true); assert.equal(S.shot.cueSpeed, 1.7);
  assert.equal(S.last.marker, 'sandbox');
  env.element('replay').onclick();
  assert.equal(S.balls.length, 2);
});

test('clicking the already-active mode leaves drawn routes and sandbox positions intact', () => {
  const env = boot(); gradedRoute(env);
  const route = plain(env.T.route);
  env.element('puzzle-mode').onclick();
  assert.deepEqual(plain(env.T.route), route); assert.equal(env.T.report.score, 100);
  env.element('sandbox-mode').onclick(); env.A.state.balls[0].x = .38;
  env.element('sandbox-mode').onclick();
  assert.equal(env.A.state.balls[0].x, .38);
});

test('leaving an animated sandbox shot stores the completed physical state and keeps undo available', () => {
  const env = boot(), S = env.A.state;
  env.element('sandbox-mode').onclick();
  const before = plain(S.balls);
  const final = plain(S.balls); final[0].x = .92;
  S.before = before; S.last = { balls: final, frames: [], duration: 2, marker: 'sandbox' };
  S.playing = true; S.balls[0].x = .75; S.balls[0].vx = 1;
  env.element('puzzle-mode').onclick(); env.element('sandbox-mode').onclick();
  assert.equal(S.balls[0].x, .92); assert.equal(S.balls[0].vx, 0); assert.equal(S.playing, false);
  env.element('undo-shot').onclick();
  assert.deepEqual(plain(S.balls), before);
});
