/* Screen: turn a shot from the Free Table into a puzzle, and manage the puzzles you have made. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, E = Coach.editor, C = Coach.courses;
  const { $, $$, esc, icon, clone } = ui;
  const el = $('#view-create');
  const LIMIT = 50;

  el.innerHTML = `
    <header class="view-head"><div><p class="eyebrow">Make your own</p><h1 data-focus>Create a puzzle</h1></div></header>
    <div id="cr-body"></div>
    <section class="mine" aria-labelledby="mine-title">
      <div class="section-row"><h2 id="mine-title" class="section-title">Your puzzles</h2>
        <div class="button-row"><button class="btn btn-ghost" id="cr-import" type="button">${icon('upload')}<span>Import puzzles</span></button>
        <button class="btn btn-ghost" id="cr-export" type="button">${icon('download')}<span>Export all</span></button>
        <button class="btn btn-ghost" id="cr-restore" type="button" hidden>${icon('undo')}<span>Restore last removed</span></button></div></div>
      <div id="cr-list"></div>
      <input type="file" id="cr-file" accept=".json,application/json" hidden>
    </section>`;

  let renderer = null, preview = null, saved = null;

  function download(data, name) {
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ---------- list of saved puzzles ----------
  function renderList() {
    const mine = ui.customPuzzles(), trash = ui.store.trash();
    $('#cr-export').disabled = !mine.length;
    $('#cr-restore').hidden = !trash.length;
    $('#cr-list').innerHTML = mine.length ? `<ul class="mine-list">${mine.map(p => {
      const t = C.tacticOf(p.tactic);
      return `<li><span class="mine-icon">${icon(t.icon)}</span><span class="mine-text"><strong>${esc(p.title)}</strong><small>${esc(p.brief)}</small></span>
        <a class="btn btn-ghost btn-small" href="#/practice/${encodeURIComponent(p.id)}">${icon('play')}<span>Play</span></a>
        <button class="btn btn-ghost btn-small" data-remove="${esc(p.id)}" type="button" aria-label="Remove ${esc(p.title)}">${icon('trash')}<span>Remove</span></button></li>`;
    }).join('')}</ul>` : `<div class="empty small"><p>You have not made any puzzles yet. Take a shot on the Free Table and it will appear here.</p></div>`;
    $$('[data-remove]', el).forEach(b => b.onclick = () => removePuzzle(b.dataset.remove));
  }
  async function removePuzzle(id) {
    const all = ui.customPuzzles(), p = all.find(q => q.id === id);
    if (!p) return;
    const ok = await ui.dialog.confirm({ title: 'Remove this puzzle?', body: `“${p.title}” moves to local trash. You can restore the most recent removal at any time.`, confirmLabel: 'Remove puzzle', danger: true });
    if (!ok) return;
    if (ui.store.set('custom-trash', [...ui.store.trash(), p]) && ui.store.set('custom-puzzles', all.filter(q => q.id !== id))) { ui.toast('Puzzle removed. You can restore it.'); renderList(); }
  }
  function restoreLast() {
    const trash = ui.store.trash().slice(), all = ui.customPuzzles();
    if (!trash.length) return;
    if (all.length >= LIMIT) { ui.toast(`You can keep up to ${LIMIT} puzzles. Export or remove one first.`, { tone: 'warn' }); return; }
    const p = trash.pop();
    if (ui.store.set('custom-puzzles', [...all, p]) && ui.store.set('custom-trash', trash)) { ui.toast('Puzzle restored.', { tone: 'good' }); renderList(); }
  }
  async function importFile(file) {
    try {
      if (file.size > 5e6) throw Error('The file must be smaller than 5 MB.');
      const input = JSON.parse(await file.text()), items = Array.isArray(input) ? input : input.puzzles;
      if (!Array.isArray(items) || !items.length || items.length > LIMIT) throw Error(`The file must contain 1–${LIMIT} puzzles.`);
      const all = ui.customPuzzles();
      if (all.length + items.length > LIMIT) throw Error(`This would pass the ${LIMIT}-puzzle limit. Remove some first.`);
      const checked = [];
      for (let i = 0; i < items.length; i++) {
        const q = E.validateAndSimulate({ ...items[i], id: 'custom-import-' + Date.now() + '-' + i });
        checked.push({ ...q.puzzle, recording: E.snapshot(q.result) });
        if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
      }
      if (ui.store.set('custom-puzzles', all.concat(checked))) { ui.toast(`Verified and imported ${checked.length} puzzle${checked.length === 1 ? '' : 's'}.`, { tone: 'good' }); renderList(); }
    } catch (error) { ui.toast('Import failed: ' + error.message, { tone: 'warn', ms: 6500 }); }
  }

  // ---------- builder ----------
  function emptyState() {
    $('#cr-body').innerHTML = `<div class="empty hero-empty"><div class="empty-art">${icon('table', 'xl')}</div>
      <h2>Start with a shot</h2><p>Set up the balls on the Free Table, take the shot you want to teach, then come back here.</p>
      <div class="button-row center"><a class="btn btn-primary btn-xl" href="#/free">${icon('table')}Go to the Free Table</a></div></div>`;
  }

  function builder(capture) {
    const initial = capture.initial.filter(b => !b.potted), targets = initial.filter(b => b.id !== 'cue');
    const first = capture.result.events.find(e => e.type === 'ball' && e.ids.includes('cue'));
    const firstId = first ? first.ids.find(id => id !== 'cue') : null;
    const defaultTarget = targets.find(b => b.id === firstId) || targets[0];
    const types = Object.entries(E.OBJECTIVE_LABELS);
    const icons = { distance: 'gauge', rail: 'rail', snooker: 'eye-off', escape: 'bounce', target: 'target' };
    $('#cr-body').innerHTML = `<form class="builder" id="cr-form" novalidate>
      <div class="builder-preview"><div class="table-frame"><canvas id="cr-canvas" aria-label="Preview of your shot and the target zone"></canvas></div>
        <p class="fine" id="cr-differs" hidden></p></div>
      <div class="builder-fields">
        <label class="field"><span>Puzzle name</span><input id="cr-title" maxlength="60" value="My safety puzzle" autocomplete="off"></label>
        <fieldset class="field"><legend>What should the learner do?</legend>
          <div class="radio-cards">${types.map(([id, label], i) => `<label class="radio-card"><input type="radio" name="type" value="${id}" ${i === 0 ? 'checked' : ''}><span>${icon(icons[id])}<b>${esc(label)}</b></span></label>`).join('')}</div></fieldset>
        <div class="field-row">
          <label class="field"><span>Ball to hit first</span><select id="cr-target">${targets.map(b => `<option value="${esc(b.id)}" ${b === defaultTarget ? 'selected' : ''}>${esc(b.color.charAt(0).toUpperCase() + b.color.slice(1))} ball (${esc(b.id)})</option>`).join('')}</select></label>
          <label class="field"><span>Target area size <output id="cr-radius-out">18 cm</output></span><input id="cr-radius" type="range" min="5" max="60" value="18" aria-label="Target area radius in centimetres"></label>
        </div>
        <label class="field"><span>Instruction shown to learners</span><input id="cr-brief" maxlength="140" autocomplete="off"></label>
        <label class="field"><span>Coach’s note <small>(optional)</small></span><textarea id="cr-note" rows="3" maxlength="600" placeholder="What should the learner notice?"></textarea></label>
        <p class="form-error" id="cr-error" role="alert" hidden></p>
        <div class="button-row"><button class="btn btn-primary btn-xl" id="cr-save" type="submit">${icon('check')}<span>Check and save puzzle</span></button></div>
      </div></form>`;
    renderer = new Coach.renderer.TableRenderer($('#cr-canvas'));
    const form = () => ({ title: $('#cr-title').value, targetId: $('#cr-target').value, type: $('#cr-form [name=type]:checked').value, zoneRadius: Number($('#cr-radius').value) / 100, brief: $('#cr-brief').value, note: $('#cr-note').value });
    const updatePreview = () => {
      const f = form(), draft = E.fromCapture(capture, { ...f, id: 'preview' });
      preview = { draft, rerun: P.simulate(draft.balls, draft.referenceShot, P.DEFAULTS, { recordFrames: false }) };
      const cueEnd = preview.rerun.balls.find(b => b.id === 'cue');
      renderer.draw({ balls: draft.balls.map(P.createBall), shotPath: preview.rerun.path,
        rings: [{ id: f.targetId, tone: 'warn', pulse: false }],
        zones: [{ x: cueEnd.x, y: cueEnd.y, radius: f.zoneRadius, label: 'Target area', tone: 'gold' }],
        labels: [{ id: f.targetId, text: 'Hit first', tone: 'warn' }], animate: true });
      $('#cr-radius-out').textContent = Math.round(f.zoneRadius * 100) + ' cm';
    };
    const syncBrief = () => {
      if ($('#cr-brief').dataset.touched) return;
      const target = initial.find(b => b.id === $('#cr-target').value);
      $('#cr-brief').value = E.defaultBrief($('#cr-form [name=type]:checked').value, target?.color);
    };
    $('#cr-brief').oninput = () => { $('#cr-brief').dataset.touched = '1'; };
    syncBrief();
    $$('#cr-form [name=type]').forEach(r => r.onchange = () => { syncBrief(); updatePreview(); });
    $('#cr-target').onchange = () => { syncBrief(); updatePreview(); }; $('#cr-radius').oninput = updatePreview;
    const differs = JSON.stringify(ui.settings.params) !== JSON.stringify(sanitized(P.DEFAULTS));
    $('#cr-differs').hidden = !differs;
    $('#cr-differs').textContent = 'Puzzles always use the standard table. The path above is replayed on it, so it may differ slightly from what you saw on your own table settings.';
    updatePreview();
    $('#cr-form').onsubmit = ev => {
      ev.preventDefault();
      const err = $('#cr-error');
      try {
        const f = form(), input = E.fromCapture(capture, f), checked = E.validateAndSimulate(input), all = ui.customPuzzles();
        if (all.length >= LIMIT) throw Error(`You can keep up to ${LIMIT} puzzles. Export a backup, then remove some.`);
        if (!ui.store.set('custom-puzzles', [...all, { ...checked.puzzle, recording: E.snapshot(checked.result) }])) return;
        err.hidden = true; saved = checked.puzzle;
        renderList(); success();
      } catch (error) { err.hidden = false; err.textContent = error.message; err.focus?.(); }
    };
  }
  const sanitized = params => Coach.storeFactory.sanitizeParams(params);

  function success() {
    $('#cr-body').innerHTML = `<div class="empty hero-empty good"><div class="empty-art">${icon('check', 'xl')}</div>
      <h2>“${esc(saved.title)}” is saved</h2><p>It was replayed on the standard table and passed every check.</p>
      <div class="button-row center"><a class="btn btn-primary btn-xl" href="#/practice/${encodeURIComponent(saved.id)}">${icon('play')}Play it now</a>
      <a class="btn btn-ghost btn-xl" href="#/free">${icon('table')}Make another</a></div></div>`;
    Coach.sound.play('success');
  }

  function wire() {
    $('#cr-import').onclick = () => $('#cr-file').click();
    $('#cr-file').onchange = e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; };
    $('#cr-export').onclick = () => {
      const mine = ui.customPuzzles();
      if (!mine.length) { ui.toast('You have no puzzles to export yet.'); return; }
      download({ format: 'snooker-safety-coach', version: 1, puzzles: mine }, 'snooker-custom-puzzles.json');
      ui.toast(`Exported ${mine.length} puzzle${mine.length === 1 ? '' : 's'}.`, { tone: 'good' });
    };
    $('#cr-restore').onclick = restoreLast;
  }

  let wired = false;
  ui.router.register({
    id: 'create', nav: 'create', el, title: () => 'Create a puzzle',
    enter() {
      if (!wired) { wire(); wired = true; }
      if (renderer) { renderer.destroy(); renderer = null; }
      saved = null;
      const capture = ui.session.capture;
      capture && capture.result ? builder(capture) : emptyState();
      renderList();
      return true;
    },
    leave() { if (renderer) { renderer.animate(false); } }
  });
})(globalThis);
