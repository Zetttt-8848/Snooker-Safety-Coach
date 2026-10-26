'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
require('../src/geometry.js'); require('../src/scoring.js');
const SF = require('../src/store.js');
const C = require('../src/courses.js');
const E = require('../src/editor.js');
const puzzles = require('../data/puzzles.json');

const memory = (initial = {}) => { const m = new Map(Object.entries(initial)); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const plain = v => JSON.parse(JSON.stringify(v));

test('stock baseline upgrades its drag but custom and explicitly chosen cloth stays intact', () => {
  for(const [preset,version,expected] of [['baseline',undefined,.014],['lively',undefined,.014],['custom',undefined,.011],['fast',undefined,.011],['baseline',3,.011]]) {
    const store=SF.createStore(memory({'ssc.settings':JSON.stringify({preset,physicsVersion:version,params:{...P.DEFAULTS,muRoll:.011}})}));
    assert.equal(store.settings().params.muRoll,expected);
  }
});

test('earlier-language progress keeps its attempts and maps grades to English', () => {
  // Built from code points so this test file stays free of non-English characters.
  const legacy = { excellent: String.fromCodePoint(0x4f18), promising: String.fromCodePoint(0x4e2d, 0x504f, 0x4f18), developing: String.fromCodePoint(0x4e2d) };
  const saved = { demo: { attempts: 4, best: 91, grade: legacy.excellent, lastGrade: legacy.promising }, other: { attempts: 1, best: 20, grade: legacy.developing, lastGrade: legacy.developing } };
  const store = SF.createStore(memory({ 'ssc.progress': JSON.stringify(saved) }));
  assert.deepEqual(plain(store.progress()), { demo: { attempts: 4, best: 91, grade: 'Excellent', lastGrade: 'Promising' }, other: { attempts: 1, best: 20, grade: 'Developing', lastGrade: 'Developing' } });
});

test('recording attempts counts them, keeps the best score and never lowers a grade', () => {
  const store = SF.createStore(memory());
  assert.equal(store.statusOf('a'), 'new');
  store.recordAttempt('a', { total: 80, grade: 'Promising' }, true);
  store.recordAttempt('a', { total: 40, grade: 'Developing' }, false);
  const entry = store.progress().a;
  assert.equal(entry.attempts, 2); assert.equal(entry.best, 80); assert.equal(entry.grade, 'Promising'); assert.equal(entry.lastGrade, 'Developing');
  assert.equal(entry.verifiedBest, 80); assert.equal(store.statusOf('a'), 'promising');
  store.recordAttempt('a', { total: 100, grade: 'Excellent' }, true);
  assert.equal(store.statusOf('a'), 'mastered');
  store.resetProgress(); assert.equal(store.statusOf('a'), 'new');
});

test('settings are clamped to the physical ranges and fall back safely', () => {
  const store = SF.createStore(memory({ 'ssc.settings': JSON.stringify({ params: { muSlide: 99, muRoll: -1, cushionRestitution: 'x' }, replaySpeed: 7, reduceMotion: 'sideways' }) }));
  const s = store.settings();
  assert.equal(s.params.muSlide, .35); assert.equal(s.params.muRoll, .005); assert.equal(s.params.cushionRestitution, P.DEFAULTS.cushionRestitution);
  assert.equal(s.replaySpeed, 1); assert.equal(s.reduceMotion, 'auto'); assert.equal(s.sound, true);
  const saved = store.saveSettings({ params: { muSlide: .25 }, sound: false });
  assert.equal(saved.params.muSlide, .25); assert.equal(saved.sound, false); assert.equal(store.settings().sound, false);
});

test('blocked storage is reported once and never breaks the app', () => {
  let errors = 0;
  const store = SF.createStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }, () => errors++);
  assert.deepEqual(plain(store.progress()), {}); assert.equal(store.settings().sound, true);
  assert.equal(store.set('x', 1), false); store.set('y', 2); assert.equal(errors, 1);
});

test('corrupt saved data is ignored rather than thrown', () => {
  const store = SF.createStore(memory({ 'ssc.progress': '{nope', 'ssc.custom-puzzles': '"text"', 'ssc.settings': '[]' }));
  assert.deepEqual(plain(store.progress()), {}); assert.deepEqual(store.customPuzzles(), []); assert.equal(store.settings().replaySpeed, 1);
});

test('every table preset stays inside the published parameter ranges', () => {
  for (const preset of SF.PRESETS) {
    const params = SF.sanitizeParams({ ...P.DEFAULTS, ...preset.params });
    for (const spec of SF.PARAM_SPEC) assert.equal(params[spec.key], { ...P.DEFAULTS, ...preset.params }[spec.key], `${preset.id} ${spec.key}`);
  }
  assert.equal(SF.PRESETS[0].id, 'baseline');
});

test('old cushion gains migrate without losing cloth settings or reinstating artificial spin boosts', () => {
  const input={...P.DEFAULTS,muRoll:.008,cushionRestitution:.7,cushionTangent:.6,spinCushion:2};
  const p=SF.sanitizeParams(input);
  assert.equal(p.muRoll,.008);assert.equal(p.cushionFriction,.14);assert.equal(p.cushionRestitution,.98);
  assert.equal('spinCushion' in p,false);assert.equal('cushionTangent' in p,false);
  assert.equal(SF.sanitizeParams('corrupt').cushionRestitution,.98);
  assert.equal(SF.sanitizeParams({cushionFriction:.2,cushionRestitution:.88}).cushionRestitution,.88);
});

test('course helpers group by level, find neighbours and recommend the first unmastered puzzle', () => {
  const groups = C.byLevel(puzzles);
  assert.deepEqual(groups.map(g => g.level), [1, 2, 3, 4, 5]);
  assert.equal(groups.reduce((n, g) => n + g.puzzles.length, 0), puzzles.length);
  const done = new Set(puzzles.slice(0, 3).map(p => p.id));
  const statusOf = id => done.has(id) ? 'mastered' : 'new';
  assert.equal(C.recommended(puzzles, statusOf).id, puzzles[3].id);
  assert.deepEqual(plain(C.counts(puzzles, statusOf)), { total: puzzles.length, tried: 3, mastered: 3 });
  assert.equal(C.recommended(puzzles, () => 'mastered').id, puzzles[0].id);
  const n = C.neighbours(puzzles, puzzles[5].id);
  assert.equal(n.previous.id, puzzles[4].id); assert.equal(n.next.id, puzzles[6].id);
  assert.equal(C.neighbours(puzzles, puzzles[0].id).previous, null);
  assert.equal(C.neighbours(puzzles, puzzles.at(-1).id).next, null);
});

const captured = () => {
  const initial = [{ id: 'cue', color: 'white', x: .7, y: .68 }, { id: 'red1', color: 'red', x: 1.2, y: .68 }];
  const result = P.simulate(initial, { angle: 0, cueSpeed: .7, top: 0, side: 0 }, { ...P.DEFAULTS, muRoll: .02 }, { recordFrames: false });
  return { initial, shot: result.shot, result };
};

test('a captured Free Table shot becomes a puzzle verified on the standard table, whatever table it was taken on', () => {
  const capture = captured();
  const input = E.fromCapture(capture, { title: ' Mine ', targetId: 'red1', type: 'distance', zoneRadius: .2 });
  const { puzzle, result } = E.validateAndSimulate(input);
  assert.equal(puzzle.title, 'Mine'); assert.equal(puzzle.tactic, 'control'); assert.equal(puzzle.level, 0);
  assert.match(puzzle.brief, /^Hit the red first/);
  const standard = P.simulate(capture.initial, capture.shot, P.DEFAULTS, { recordFrames: false });
  assert.ok(Math.hypot(input.objective.cueZone.x - standard.balls[0].x, input.objective.cueZone.y - standard.balls[0].y) < 1e-9, 'the zone is centred on the standard-table finish');
  assert.equal(result.completed, true);
});

test('default instructions name the ball that must be hit first', () => {
  assert.match(E.defaultBrief('snooker', 'brown'), /Hit the brown first/);
  assert.match(E.defaultBrief('target'), /red/);
  const initial = [{ id: 'cue', color: 'white', x: .7, y: .68 }, { id: 'brown', color: 'brown', x: 1.2, y: .68 }];
  const input = E.fromCapture({ initial, shot: { angle: 0, cueSpeed: .7, top: 0, side: 0 } }, { targetId: 'brown', type: 'distance' });
  assert.match(E.validatePuzzle(input).brief, /brown/);
});

test('custom puzzles carry the same interface fields as built-in ones', () => {
  const input = E.fromCapture(captured(), { targetId: 'red1', type: 'rail', zoneRadius: .2 });
  const puzzle = E.validatePuzzle(input);
  for (const key of ['brief', 'learn', 'tactic', 'focus', 'tags', 'level']) assert.ok(key in puzzle, key);
  assert.equal(puzzle.focus.id, 'red1'); assert.equal(puzzle.custom, true);
  assert.ok(Object.values(C.TACTIC_FOR_OBJECTIVE).includes(puzzle.tactic));
});
