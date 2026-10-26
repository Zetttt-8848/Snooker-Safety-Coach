/* Screen: draw a route for one puzzle, adjust it, and send it for checking. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, G = Coach.geometry, S = Coach.scoring, C = Coach.courses;
  const { $, esc, icon, clone } = ui, { RouteEditor } = Coach.routeEditor;
  const el = $('#view-practice');

  el.innerHTML = `
    <div class="practice-head">
      <a class="back-link" href="#/puzzles">${icon('arrow-left')}<span>All puzzles</span></a>
      <div class="practice-title"><span class="level-chip" id="pr-level"></span><h1 data-focus id="pr-title">Puzzle</h1></div>
      <div class="practice-tools">
        <button class="icon-btn" id="pr-prev" type="button" aria-label="Previous puzzle">${icon('arrow-left')}</button>
        <span class="count" id="pr-count" aria-live="polite"></span>
        <button class="icon-btn" id="pr-next" type="button" aria-label="Next puzzle">${icon('arrow-right')}</button>
        <button class="btn btn-ghost" id="pr-notes" type="button" aria-label="Coach notes">${icon('book')}<span>Coach notes</span></button>
      </div>
    </div>
    <div class="practice-layout">
      <div class="practice-main">
    <div class="stage">
      <div class="table-frame">
        <canvas id="pr-canvas" class="interactive" tabindex="0" aria-label="Snooker table. Drag from the white ball to draw its route. Use Tab to select route points and arrow keys to move them."></canvas>
        <div class="stage-overlay">
          <button class="remove-point" id="pr-remove" type="button" hidden>${icon('trash')}<span>Remove point</span></button>
          <div class="start-bubble" id="pr-bubble"><span class="bubble-hand">${icon('route')}</span><span>Drag from the white ball to draw its path</span></div>
          <div class="check-overlay" id="pr-checking" role="status" hidden>
            <div class="check-card">
              <div class="rolling-ball" aria-hidden="true"></div>
              <h2 id="pr-check-title">Testing shots…</h2>
              <p id="pr-check-detail">Looking for a legal shot that matches your line.</p>
              <div class="meter big" aria-hidden="true"><i id="pr-check-bar"></i></div>
              <button class="btn btn-ghost" id="pr-cancel" type="button">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      <div class="route-chips" id="pr-chips" aria-live="polite"></div>
    </div>
      </div>
      <div class="practice-side">
    <div class="goal-strip"><span class="goal-icon" id="pr-goal-icon"></span><p id="pr-brief"></p></div>
    <p class="hint-line" id="pr-hint" hidden>${icon('bulb')}<span></span></p>
    <div class="status-row">
      <ol class="steps-line" aria-label="Progress">
        <li id="pr-step-1"><span>1</span>Draw</li><li id="pr-step-2"><span>2</span>Adjust</li><li id="pr-step-3"><span>3</span>Check</li>
      </ol>
      <p class="helper" id="pr-helper"></p>
      <button class="btn btn-ghost btn-small" id="pr-straight" type="button">${icon('route')}<span>Start with a straight line</span></button>
    </div>
    <div class="action-bar" role="toolbar" aria-label="Route actions">
      <div class="action-group">
        <button class="btn btn-ghost" id="pr-undo" type="button" aria-label="Undo">${icon('undo')}<span>Undo</span></button>
        <button class="btn btn-ghost hide-narrow" id="pr-redo" type="button" aria-label="Redo">${icon('redo')}<span>Redo</span></button>
        <button class="btn btn-ghost" id="pr-clear" type="button" aria-label="Clear route">${icon('trash')}<span>Clear route</span></button>
        <button class="btn btn-ghost hide-narrow" id="pr-add" type="button" aria-label="Add point">${icon('plus')}<span>Add point</span></button>
        <button class="btn btn-ghost" id="pr-hintbtn" type="button" aria-pressed="false" aria-label="Show hint">${icon('bulb')}<span>Show hint</span></button>
      </div>
      <button class="btn btn-primary btn-xl" id="pr-check" type="button"><span>Check my safety</span>${icon('arrow-right')}</button>
    </div>      </div>
    </div>`;

  // ---------- state ----------
  let renderer = null, puzzle = null, editor = null, reference = null, busy = false, controller = null;
  let hint = false, cursor = '', pointer = null;
  const references = new Map();

  const ballName = id => { const b = puzzle.balls.find(x => x.id === id); return b ? b.color : id; };
  const listIndex = () => ui.allPuzzles().findIndex(p => p.id === puzzle.id);
  function referenceFor(p) {
    if (!references.has(p.id)) references.set(p.id, P.simulate(p.balls.map(P.createBall), p.referenceShot, P.DEFAULTS));
    return references.get(p.id);
  }
  // Pointer capture can fail for synthetic or already-released pointers; drawing still works without it.
  const capture = (canvas, id) => { try { canvas.setPointerCapture(id); } catch { /* not capturable */ } };
  const touchy = () => pointer === 'touch' || pointer === 'pen';

  // ---------- drawing ----------
  function summary() { return editor.summary(puzzle.legalTargetIds || [puzzle.targetId]); }

  function tableState() {
    const info = editor.hasRoute || editor.drawing ? summary() : null;
    const focus = puzzle.focus || { id: puzzle.targetId, role: 'target', label: 'Hit first' };
    const labels = [], rings = [];
    if (focus.role === 'colour') {
      labels.push({ id: puzzle.targetId, text: 'Hit first', tone: 'warn' });
      labels.push({ id: focus.id, text: focus.label, tone: puzzle.tactic === 'hide' ? 'good' : 'bad', below: true });
      rings.push({ id: focus.id, tone: puzzle.tactic === 'hide' ? 'good' : 'bad', pulse: false });
    } else labels.push({ id: puzzle.targetId, text: focus.label || 'Hit first', tone: 'warn' });
    rings.push({ id: puzzle.targetId, tone: 'warn', pulse: !editor.hasRoute && !editor.drawing });
    if (info && info.first && info.firstLegal === false) rings.push({ id: info.first, tone: 'bad', pulse: true });
    const zones = [];
    if (hint) {
      const o = puzzle.objective || {};
      if (o.cueZone) zones.push({ ...o.cueZone, label: 'Suggested leave', tone: 'gold' });
      if (o.targetZone) zones.push({ ...o.targetZone, label: 'Safe area for the red', tone: 'good' });
    }
    return {
      balls: puzzle.balls.map(P.createBall), labels, rings, zones,
      animate: hint || (!editor.hasRoute && !editor.drawing) || !!(info && info.first && info.firstLegal === false),
      student: editor.drawing ? editor.raw : (editor.points.length ? editor.points : null), drawing: editor.drawing,
      handles: editor.hasRoute && !editor.drawing ? editor.points : null, activeHandle: editor.selected,
      cushionMarks: info ? info.cushions : null, startPulse: !editor.hasRoute && !editor.drawing
    };
  }

  function chipsHtml() {
    if (!editor.hasRoute) return '';
    const info = summary(), walls = info.cushions.map(c => c.wall);
    const chips = [`<span class="chip-static">${icon('bounce')}${walls.length ? `Cushions: ${walls.join(' → ')}` : 'No cushions'}</span>`];
    if (info.first && info.firstLegal) chips.push(`<span class="chip-static good">${icon('check')}First hit: ${esc(ballName(info.first))}</span>`);
    else if (info.first) chips.push(`<span class="chip-static bad">${icon('info')}Hits the ${esc(ballName(info.first))} first</span>`);
    else chips.push(`<span class="chip-static warn">${icon('info')}Does not reach a red yet</span>`);
    return chips.join('');
  }

  function helperText() {
    if (busy) return 'Testing shots on the physics table…';
    if (editor.drawing) return 'Keep going. Include every cushion and where the white stops.';
    if (!editor.hasRoute) return 'Drag from the white ball to draw its path, or start with a straight line.';
    const info = summary();
    if (info.first && !info.firstLegal) return `Your line hits the ${ballName(info.first)} first. Steer round it, then check.`;
    if (!info.first) return 'Carry the line on until it touches a red.';
    return 'Drag a numbered point to adjust. Tap the line to add one. Then check your safety.';
  }

  function refresh() {
    renderer.draw(tableState());
    $('#pr-chips').innerHTML = chipsHtml();
    $('#pr-helper').textContent = helperText();
    const has = editor.hasRoute;
    const step = busy ? 3 : has ? 2 : 1;
    for (let i = 1; i <= 3; i++) { const li = $('#pr-step-' + i); li.classList.toggle('active', i === step); li.classList.toggle('done', i < step); li.toggleAttribute('aria-current', i === step); }
    $('#pr-undo').disabled = busy || !editor.canUndo;
    $('#pr-redo').disabled = busy || !editor.canRedo;
    $('#pr-clear').disabled = busy || !has;
    $('#pr-add').disabled = busy || !has;
    $('#pr-add').hidden = !has;
    $('#pr-straight').hidden = has || editor.drawing;
    $('#pr-straight').disabled = busy;
    $('#pr-hintbtn').disabled = busy;
    $('#pr-check').disabled = busy || !has;
    $('#pr-bubble').hidden = has || editor.drawing || busy;
    $('#pr-check').title = has ? '' : 'Draw a route from the white ball to enable checking.';
    placeRemoveButton();
    $('#pr-canvas').style.cursor = busy ? 'progress' : cursor;
    if (puzzle) ui.session.drafts.set(puzzle.id, { points: clone(editor.points), selected: editor.selected });
  }

  function placeRemoveButton() {
    const button = $('#pr-remove');
    const show = !busy && editor.hasRoute && !editor.drawing && editor.dragging < 1 && editor.selected >= 1 && editor.points[editor.selected];
    button.hidden = !show;
    if (!show) return;
    const at = renderer.toPage(editor.points[editor.selected]);
    const width = renderer.canvas.getBoundingClientRect().width, flip = at.x > width - 190;
    button.style.left = (flip ? Math.max(8, at.x - 170) : at.x + 24) + 'px';
    button.style.top = Math.max(6, at.y - 20) + 'px';
  }

  function placeBubble() {
    const cue = puzzle.balls.find(b => b.id === 'cue'), at = renderer.toPage(cue), bubble = $('#pr-bubble'), width = renderer.canvas.getBoundingClientRect().width;
    const below = at.y < renderer.canvas.getBoundingClientRect().height * .42;
    bubble.classList.toggle('below', below);
    bubble.style.left = Math.max(8, Math.min(at.x + 30, width - 250)) + 'px';
    bubble.style.top = below ? Math.max(8, at.y + 34) + 'px' : Math.max(8, at.y - 74) + 'px';
  }

  // ---------- pointer input ----------
  function onPointerDown(e) {
    if (busy || e.button > 0) return;
    pointer = e.pointerType;
    const p = renderer.unproject(e), canvas = renderer.canvas, coarse = touchy();
    const handleRadius = coarse ? .08 : .042, segmentRadius = coarse ? .07 : .045;
    canvas.focus({ preventScroll: true });
    const nearBall = G.distance(p, editor.start) <= P.TABLE.radius * 1.5;
    if (editor.hasRoute && !nearBall) {
      const handle = editor.hitHandle(p, handleRadius);
      if (handle > 0) { capture(canvas, e.pointerId); editor.beginDrag(handle); cursor = 'grabbing'; return; }
      const segment = editor.hitSegment(p, segmentRadius);
      if (segment) {
        capture(canvas, e.pointerId);
        const index = editor.insert(segment.index, p);
        editor.beginDrag(index); cursor = 'grabbing'; Coach.sound.play('tick'); return;
      }
    }
    if (editor.nearStart(p, coarse ? .2 : .13)) {
      capture(canvas, e.pointerId);
      editor.beginStroke(); return;
    }
    if (editor.hasRoute) { editor.select(-1); return; }
    ui.toast('Start your drawing on the white ball.', { tone: 'warn', ms: 2600 });
  }
  function onPointerMove(e) {
    pointer = e.pointerType;
    if (busy) return;
    const p = renderer.unproject(e);
    if (editor.drawing) { editor.extendStroke(p); return; }
    if (editor.dragging > 0) { editor.dragTo(p); return; }
    let next = '';
    if (editor.hasRoute) {
      if (editor.hitHandle(p, .042) > 0) next = 'grab'; else if (editor.hitSegment(p, .045)) next = 'copy';
    }
    if (!next && (editor.hasRoute ? editor.nearStart(p, .06) : editor.nearStart(p, .13))) next = 'crosshair';
    if (next !== cursor) { cursor = next; renderer.canvas.style.cursor = next; }
  }
  function onPointerUp(e) {
    try { renderer.canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (editor.drawing) {
      const ok = editor.endStroke();
      if (!ok) ui.toast('Drag a longer line from the white ball.', { ms: 2600 });
      else Coach.sound.play('tick');
    } else if (editor.dragging > 0) editor.endDrag();
    cursor = '';
  }
  function onKeyDown(e) {
    if (busy) return;
    const step = e.shiftKey ? .005 : .001, moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key] && editor.selected > 0) { e.preventDefault(); editor.nudge(...moves[e.key]); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selected > 0) { e.preventDefault(); editor.removeSelected(); return; }
    if (e.key === 'Tab' && editor.hasRoute) { if (editor.stepSelection(e.shiftKey ? -1 : 1) > 0) e.preventDefault(); return; }
    if (e.key === 'Escape') { editor.select(-1); return; }
    if (e.key === 'Enter') { e.preventDefault(); check(); }
  }
  function onContextMenu(e) {
    e.preventDefault();
    if (busy || !editor.hasRoute) return;
    const handle = editor.hitHandle(renderer.unproject(e), .05);
    if (handle > 0) { editor.select(handle); editor.removeSelected(); }
  }

  // ---------- checking ----------
  function setBusy(value) {
    busy = value;
    $('#pr-checking').hidden = !value;
    $('#pr-check').classList.toggle('loading', value);
    if (value) { $('#pr-cancel').focus({ preventScroll: true }); }
    refresh();
  }

  async function check() {
    if (busy) return;
    if (!editor.hasRoute) { ui.toast('Draw a route from the white ball first.', { tone: 'warn' }); return; }
    controller = { aborted: false };
    const mine = controller;
    $('#pr-check-bar').style.width = '0%';
    $('#pr-check-title').textContent = 'Testing shots…';
    $('#pr-check-detail').textContent = 'Looking for a legal shot that matches your line.';
    setBusy(true);
    const route = clone(editor.points);
    try {
      const fit = await S.invert({
        puzzle, path: route, reference, params: P.DEFAULTS, maxEvaluations: 320, signal: mine,
        onProgress: ({ evaluations, maxEvaluations }) => {
          $('#pr-check-bar').style.width = Math.min(100, evaluations / maxEvaluations * 100) + '%';
          $('#pr-check-detail').textContent = `Shot ${evaluations} of up to ${maxEvaluations}`;
        }
      });
      if (mine.aborted) { ui.toast('Check cancelled. Your route is untouched.'); return; }
      if (fit.status === 'invalid') { ui.toast(fit.message, { tone: 'warn', ms: 6000 }); return; }
      const realized = fit.status === 'feasible' || fit.status === 'approximate' ? fit.result : null;
      const report = S.evaluate({ puzzle, studentPath: route, reference, realized, feasibility: fit });
      ui.store.recordAttempt(puzzle.id, report, !!realized);
      ui.session.assessment = { puzzleId: puzzle.id, route, reference, fit, report, at: Date.now() };
      ui.router.go('results');
    } catch (error) {
      ui.toast('The check could not finish: ' + error.message, { tone: 'warn', ms: 6000 });
    } finally {
      if (controller === mine) controller = null;
      setBusy(false);
    }
  }

  // ---------- loading a puzzle ----------
  function notes() {
    const p = puzzle, tactic = C.tacticOf(p.tactic);
    ui.dialog.open(`<div class="notes"><p class="eyebrow">${icon(tactic.icon)}${esc(tactic.label)}${p.level ? ' · Level ' + p.level : ''}</p><h2>${esc(p.title)}</h2>
      <dl class="notes-list">
        <div><dt>Your task</dt><dd>${esc(p.task)}</dd></div>
        <div><dt>What counts as success</dt><dd>${esc(p.goal)}</dd></div>
        <div><dt>What you will learn</dt><dd>${esc(p.learn || '')}</dd></div>
        <div><dt>Coach’s note</dt><dd>${esc(p.explanation)}</dd></div>
      </dl>
      <details class="soft"><summary>Keyboard controls</summary><ul class="plain"><li><kbd>Tab</kbd> steps through route points</li><li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> move a point 1 mm (<kbd>Shift</kbd> for 5 mm)</li><li><kbd>Delete</kbd> removes the selected point</li><li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes, <kbd>Enter</kbd> checks</li></ul></details>
      <p class="source">Source: ${esc(p.source)}</p>
      <div class="button-row"><button class="btn btn-primary" data-autofocus data-close>Got it</button></div></div>`, { label: 'Coach notes' });
    $('#dialog [data-close]').onclick = () => ui.dialog.close();
  }

  function load(id) {
    const found = ui.puzzle(id);
    if (!found) { ui.toast('That puzzle is not available.', { tone: 'warn' }); return false; }
    puzzle = found;
    reference = referenceFor(puzzle);
    const cue = puzzle.balls.find(b => b.id === 'cue');
    editor = new RouteEditor({ start: { x: cue.x, y: cue.y }, balls: puzzle.balls.map(P.createBall), onChange: refresh });
    const draft = ui.session.drafts.get(puzzle.id);
    if (draft && draft.points.length) { editor.points = clone(draft.points); editor.selected = draft.selected; }
    hint = false; cursor = '';
    const tactic = C.tacticOf(puzzle.tactic), list = ui.allPuzzles(), index = listIndex();
    $('#pr-title').textContent = puzzle.title;
    $('#pr-level').textContent = puzzle.level ? `Level ${puzzle.level}` : 'Your puzzle';
    $('#pr-brief').textContent = puzzle.brief || puzzle.task;
    $('#pr-goal-icon').innerHTML = icon(tactic.icon);
    $('#pr-count').textContent = `${index + 1} / ${list.length}`;
    $('#pr-prev').disabled = index <= 0; $('#pr-next').disabled = index >= list.length - 1;
    $('#pr-hint').hidden = true;
    $('#pr-hintbtn').setAttribute('aria-pressed', 'false'); $('#pr-hintbtn span').textContent = 'Show hint'; $('#pr-hintbtn').setAttribute('aria-label', 'Show hint');
    return true;
  }

  function wire() {
    const canvas = $('#pr-canvas');
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    $('#pr-undo').onclick = () => editor.undo();
    $('#pr-redo').onclick = () => editor.redo();
    $('#pr-clear').onclick = () => { editor.clear(); ui.toast('Route cleared. Undo brings it back.'); };
    $('#pr-add').onclick = () => { if (editor.insertMidpoint() > 0) canvas.focus({ preventScroll: true }); };
    $('#pr-straight').onclick = () => { editor.starterRoute(puzzle.balls.find(b => b.id === puzzle.targetId)); };
    $('#pr-remove').onclick = () => { editor.removeSelected(); canvas.focus({ preventScroll: true }); };
    $('#pr-hintbtn').onclick = () => {
      hint = !hint;
      $('#pr-hintbtn').setAttribute('aria-pressed', String(hint));
      $('#pr-hintbtn span').textContent = hint ? 'Hide hint' : 'Show hint';
      $('#pr-hintbtn').setAttribute('aria-label', hint ? 'Hide hint' : 'Show hint');
      $('#pr-hint').hidden = !hint; $('#pr-hint span').textContent = puzzle.hint || '';
      refresh();
    };
    $('#pr-check').onclick = check;
    $('#pr-cancel').onclick = () => { if (controller) controller.aborted = true; };
    $('#pr-notes').onclick = notes;
    $('#pr-prev').onclick = () => { const l = ui.allPuzzles(), i = listIndex(); if (i > 0) ui.router.go('practice/' + encodeURIComponent(l[i - 1].id)); };
    $('#pr-next').onclick = () => { const l = ui.allPuzzles(), i = listIndex(); if (i < l.length - 1) ui.router.go('practice/' + encodeURIComponent(l[i + 1].id)); };
    document.addEventListener('keydown', e => {
      if (el.hidden || busy || !(e.ctrlKey || e.metaKey)) return;
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? editor.redo() : editor.undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); editor.redo(); }
    });
    window.addEventListener('resize', () => { if (!el.hidden && puzzle) { placeBubble(); placeRemoveButton(); } });
  }

  let wired = false;
  ui.router.register({
    id: 'practice', nav: 'puzzles', el, title: () => puzzle ? puzzle.title : 'Practice',
    enter(params) {
      const id = params[0] || Coach.courses.recommended(ui.builtIn(), x => ui.store.statusOf(x))?.id;
      if (!renderer) renderer = new Coach.renderer.TableRenderer($('#pr-canvas'));
      if (!wired) { wire(); wired = true; }
      if (busy) return true;
      if (!puzzle || puzzle.id !== id) { if (!load(id)) return false; }
      renderer.resize();
      renderer.animate(true);
      placeBubble();
      refresh();
      return true;
    },
    leave() { if (controller) controller.aborted = true; renderer.animate(false); }
  });
  Coach.practice = { get editor() { return editor; }, get puzzle() { return puzzle; }, load };
})(globalThis);
