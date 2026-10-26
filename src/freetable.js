/* Screen: a sandbox table. Aim, set power and spin, take shots, and rearrange the balls. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, G = Coach.geometry, R = Coach.replay;
  const { $, $$, esc, icon, clone, clamp } = ui;
  const el = $('#view-free');

  el.innerHTML = `
    <div class="view-head tight">
      <div><p class="eyebrow">Experiment</p><h1 data-focus>Free table</h1></div>
      <div class="mode-switch segmented" role="group" aria-label="Mode">
        <button type="button" id="ft-mode-aim" aria-label="Aim and shoot" aria-pressed="true">${icon('target')}<span>Aim and shoot</span></button>
        <button type="button" id="ft-mode-arrange" aria-label="Arrange balls" aria-pressed="false">${icon('table')}<span>Arrange balls</span></button>
      </div>
    </div>
    <div class="free-layout"><div class="free-main">
    <div class="stage">
      <div class="table-frame">
        <canvas id="ft-canvas" class="interactive" tabindex="0" aria-label="Snooker table. Drag to aim the cue. Press Space to take the shot. In arrange mode, drag balls to move them."></canvas>
      </div>
      <div class="route-chips" id="ft-summary" aria-live="polite"></div>
      <div class="safe-legend" id="ft-safe-legend" hidden><div><span class="safe-key">Low exposure</span><span class="safe-key hidden-key">95%+ hidden</span></div><p>Final layout · all remaining reds</p><small>Paper exposure ≤ 0.30; 2 cm samples. Geometry only, not guaranteed shot reachability.</small></div>
    </div>
    <div class="toolbar" role="toolbar" aria-label="Table actions">
      <button class="btn btn-ghost" id="ft-new" type="button">${icon('table')}<span>New frame</span></button>
      <button class="btn btn-ghost" id="ft-replay" type="button">${icon('restart')}<span>Replay last shot</span></button>
      <button class="btn btn-ghost" id="ft-undo" type="button">${icon('undo')}<span>Undo shot</span></button>
      <button class="btn btn-ghost" id="ft-safety" type="button" aria-pressed="false">${icon('shield')}<span>Review safe leaves</span></button>
      <span class="grow"></span>
      <label class="switch-chip" title="Geometric guide: no spin or cushion friction. Use Predict path for the simulated route."><input type="checkbox" id="ft-guide"><span class="switch-box" aria-hidden="true"></span><span>Aim guide</span></label>
      <label class="switch-chip"><input type="checkbox" id="ft-predict"><span class="switch-box" aria-hidden="true"></span><span>Predict path</span></label>
      <button class="btn btn-ghost" id="ft-save" type="button">${icon('create')}<span>Save as puzzle</span></button>
    </div>
    </div><div class="free-side">
    <div class="dock" id="ft-dock">
      <section class="dock-card" aria-labelledby="ft-aim-h">
        <h2 id="ft-aim-h">${icon('target')}Aim</h2>
        <div class="angle-row">
          <button class="icon-btn" type="button" data-turn="-1" aria-label="Turn aim left by 1 degree">${icon('minus')}</button>
          <label class="angle-field"><span class="sr-only">Aim angle in degrees</span><input id="ft-angle" type="number" step="0.1" min="-180" max="180" inputmode="decimal"><i>°</i></label>
          <button class="icon-btn" type="button" data-turn="1" aria-label="Turn aim right by 1 degree">${icon('plus')}</button>
        </div>
      </section>
      <section class="dock-card" aria-labelledby="ft-power-h">
        <h2 id="ft-power-h">${icon('gauge')}Power <output id="ft-power-out"></output></h2>
        <input id="ft-power" class="power-range" type="range" min="0.1" max="6" step="0.05" aria-label="Cue speed in metres per second">
        <div class="chip-row small" role="group" aria-label="Power presets">
          <button class="chip" type="button" data-power="0.4">Soft</button><button class="chip" type="button" data-power="0.8">Medium</button>
          <button class="chip" type="button" data-power="1.3">Firm</button><button class="chip" type="button" data-power="1.8">Break-off</button>
        </div>
      </section>
      <section class="dock-card spin-card" aria-labelledby="ft-spin-h">
        <h2 id="ft-spin-h">${icon('spin')}Spin</h2>
        <div class="spin-layout">
          <canvas id="ft-spin" width="132" height="132" tabindex="0" aria-label="Cue-ball strike point. Drag to choose spin. Arrow keys make small changes."></canvas>
          <div class="spin-side"><p id="ft-spin-label">Centre ball</p>
            <div class="chip-row small" role="group" aria-label="Spin presets">
              <button class="chip" type="button" data-spin="0,0">Centre</button><button class="chip" type="button" data-spin="0.3,0">Top</button>
              <button class="chip" type="button" data-spin="-0.3,0">Back</button><button class="chip" type="button" data-spin="0,-0.3">Left</button><button class="chip" type="button" data-spin="0,0.3">Right</button>
            </div></div>
        </div>
      </section>
      <button class="btn btn-primary btn-xl shoot" id="ft-shoot" type="button">${icon('play')}<span>Take shot</span></button>
    </div>
    <div class="arrange" id="ft-arrange" hidden>
      <section class="dock-card wide" aria-labelledby="ft-arr-h">
        <h2 id="ft-arr-h">${icon('table')}Add or select a ball</h2>
        <div class="palette" id="ft-palette" role="group" aria-label="Balls"></div>
        <p class="fine" id="ft-arr-help">Drag a ball to move it. Choose a colour to add that ball.</p>
        <div class="button-row">
          <button class="btn btn-ghost" id="ft-remove" type="button">${icon('trash')}<span>Remove selected ball</span></button>
          <button class="btn btn-ghost" data-layout="pair" type="button"><span>Two balls</span></button>
          <button class="btn btn-ghost" data-layout="colours" type="button"><span>Colours on spots</span></button>
          <button class="btn btn-ghost" data-layout="frame" type="button"><span>Full frame</span></button>
          <span class="grow"></span>
          <button class="btn btn-primary" id="ft-done" type="button">${icon('check')}<span>Done arranging</span></button>
        </div>
      </section>
    </div>
    </div></div>`;

  // ---------- layouts ----------
  const ball = (id, color, x, y) => ({ id, color, x, y });
  const SPOTS = { yellow: [.737, 1.181], green: [.737, .597], brown: [.737, .889], blue: [1.7845, .889], pink: [2.67675, .889], black: [3.245, .889] };
  function layout(kind) {
    const list = [];
    if (kind === 'pair') return [ball('cue', 'white', .9, .889), ball('red1', 'red', 2.2, .75)].map(P.createBall);
    list.push(ball('cue', 'white', .57, .99));
    for (const [color, [x, y]] of Object.entries(SPOTS)) list.push(ball(color, color, x, y));
    if (kind === 'colours') list.push(ball('red1', 'red', 2.2, .75), ball('red2', 'red', 2.6, 1.2));
    else for (let row = 0, id = 1; row < 5; row++) for (let j = 0; j <= row; j++, id++) list.push(ball('red' + id, 'red', 2.733 + row * .0459, .889 + (j - row / 2) * .053));
    return list.map(P.createBall);
  }

  // ---------- state ----------
  const openingShot = () => ({ angle: 0, cueSpeed: 1.1, top: 0, side: 0 });
  const S = { balls: layout('frame'), before: null, shot: openingShot(), last: null, mode: 'aim', selected: null, drag: null, aiming: false, prediction: null, player: null, playing: false, summary: null };
  S.before = clone(S.balls);
  let renderer = null, spinCtx = null, predictTimer = 0, wired = false, spinDrag = false;
  let safetyMap = null, reviewingSafety = false;

  // Pointer capture can fail for synthetic or already-released pointers; aiming still works without it.
  const capture = (el, id) => { try { el.setPointerCapture(id); } catch { /* not capturable */ } };
  const cue = () => S.balls.find(b => b.id === 'cue' && !b.potted);
  const canReviewSafety = () => !S.playing && S.mode === 'aim' && S.last?.completed &&
    S.balls.length === S.last.balls.length && S.balls.every(b => S.last.balls.some(f => f.id === b.id && f.x === b.x && f.y === b.y && f.potted === b.potted)) &&
    S.balls.some(b => b.color === 'red' && !b.potted);
  const names = { white: 'White', red: 'Red', yellow: 'Yellow', green: 'Green', brown: 'Brown', blue: 'Blue', pink: 'Pink', black: 'Black' };

  function describeSpin(top, side) {
    const r = Math.hypot(top, side);
    if (r < .04) return 'Centre ball';
    const vertical = Math.abs(top) > Math.abs(side) * .5 ? (top > 0 ? 'Top' : 'Back') : '';
    const horizontal = Math.abs(side) > Math.abs(top) * .5 ? (side > 0 ? 'right' : 'left') : '';
    const text = [vertical, horizontal].filter(Boolean).join(' + ');
    return `${text.charAt(0).toUpperCase()}${text.slice(1)} spin`.replace('Back spin', 'Backspin').replace('Top spin', 'Topspin');
  }

  function aimPreview() {
    const c = cue();
    if (!c || S.mode !== 'aim') return null;
    return G.aimPreview(S.balls, 'cue', S.shot.angle);
  }

  function draw() {
    if (!renderer) return;
    const aim = S.mode === 'aim' && !S.playing, c = cue();
    const state = { balls: S.balls, selectedId: S.mode === 'arrange' ? S.selected : null };
    const review = reviewingSafety && safetyMap && !S.playing && S.mode === 'aim';
    if (review) state.safeLeaves = safetyMap;
    if (aim && !review && ui.settings.aimGuide) state.aim = aimPreview();
    if (aim && c && !review) state.stick = { cue: c, angle: S.shot.angle, pull: clamp(S.shot.cueSpeed / 6, 0, 1) };
    if (aim && !review && ui.settings.predict && S.prediction) state.predicted = S.prediction;
    $('#ft-safe-legend').hidden = !review;
    if (S.playing && S.player) state.trails = R.trailsAt(S.player.result, S.player.time, S.player.snapshot());
    renderer.draw(state);
  }

  function schedulePrediction() {
    clearTimeout(predictTimer);
    if (!ui.settings.predict || S.mode !== 'aim' || S.playing || !cue()) { S.prediction = null; draw(); return; }
    predictTimer = setTimeout(() => {
      try { S.prediction = P.simulate(S.balls, S.shot, ui.tableParams(), { recordFrames: false, maxTime: 12 }).path; } catch { S.prediction = null; }
      draw();
    }, 70);
  }

  function drawSpin() {
    const c = spinCtx, size = 132, r = 56, mid = size / 2;
    c.clearRect(0, 0, size, size);
    const g = c.createRadialGradient(mid - 18, mid - 20, 4, mid, mid, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9cfbd');
    c.fillStyle = g; c.beginPath(); c.arc(mid, mid, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(30,50,40,.35)'; c.lineWidth = 1; c.stroke();
    c.setLineDash([3, 4]); c.beginPath(); c.arc(mid, mid, r * .5, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(mid - r, mid); c.lineTo(mid + r, mid); c.moveTo(mid, mid - r); c.lineTo(mid, mid + r); c.stroke();
    c.fillStyle = 'rgba(30,50,40,.55)'; c.font = '600 10px "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('TOP', mid, mid - r + 11); c.fillText('BACK', mid, mid + r - 11); c.fillText('L', mid - r + 9, mid); c.fillText('R', mid + r - 9, mid);
    const dx = mid + S.shot.side / .5 * (r * .5), dy = mid - S.shot.top / .5 * (r * .5);
    c.fillStyle = '#1b6a50'; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(dx, dy, 8, 0, Math.PI * 2); c.fill(); c.stroke();
    $('#ft-spin-label').textContent = describeSpin(S.shot.top, S.shot.side);
  }

  function syncControls() {
    $('#ft-angle').value = S.shot.angle.toFixed(1);
    $('#ft-power').value = S.shot.cueSpeed;
    $('#ft-power-out').textContent = `${S.shot.cueSpeed.toFixed(2)} m/s`;
    $$('[data-power]', el).forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.power) - S.shot.cueSpeed) < .001)));
    $$('[data-spin]', el).forEach(b => { const [t, s] = b.dataset.spin.split(',').map(Number); b.setAttribute('aria-pressed', String(Math.abs(t - S.shot.top) < .001 && Math.abs(s - S.shot.side) < .001)); });
    drawSpin();
    $('#ft-guide').checked = ui.settings.aimGuide; $('#ft-predict').checked = ui.settings.predict;
    const busy = S.playing;
    $('#ft-shoot').disabled = busy || !cue() || S.mode !== 'aim';
    $('#ft-replay').disabled = busy || !S.last;
    $('#ft-undo').disabled = busy || !S.last;
    $('#ft-save').disabled = busy || !S.last;
    $('#ft-safety').disabled = !canReviewSafety();
    $('#ft-safety').setAttribute('aria-pressed', String(reviewingSafety));
    $('#ft-save').title = S.last ? '' : 'Take a shot first, then save it as a puzzle.';
    $('#ft-summary').innerHTML = S.summary || (S.mode === 'aim' ? `<span class="chip-static">${icon('target')}Drag on the table to aim. Press Space to take the shot.</span>` : `<span class="chip-static">${icon('table')}Drag a ball to move it.</span>`);
  }
  function update() { syncControls(); draw(); schedulePrediction(); }

  // ---------- shots ----------
  function summarise(result, before) {
    const first = result.events.find(e => e.type === 'ball' && e.ids.includes('cue')), cushions = result.events.filter(e => e.type === 'cushion' && e.id === 'cue').length;
    const potted = result.balls.filter(b => b.potted && !before.find(o => o.id === b.id)?.potted);
    const chips = [];
    if (first) { const id = first.ids.find(x => x !== 'cue'), b = before.find(o => o.id === id); chips.push(`<span class="chip-static">${icon('check')}First hit: ${esc((names[b?.color] || id).toLowerCase())}</span>`); }
    else chips.push(`<span class="chip-static warn">${icon('info')}The white hit nothing</span>`);
    chips.push(`<span class="chip-static">${icon('bounce')}${cushions} cushion${cushions === 1 ? '' : 's'}</span>`);
    for (const b of potted) {
      const isCue = b.id === 'cue';
      chips.push(`<span class="chip-static ${isCue ? 'bad' : 'good'}">${icon(isCue ? 'info' : 'target')}${isCue ? 'White potted (a foul)' : esc(names[b.color]) + ' potted'}</span>`);
    }
    if (!result.completed) chips.push(`<span class="chip-static warn">${icon('info')}Some balls were still moving at the time limit</span>`);
    return chips.join('');
  }

  function stopPlayback() { if (S.player) S.player.dispose(); S.playing = false; S.player = null; }
  function playResult(result, announce) {
    stopPlayback();
    reviewingSafety = false; safetyMap = null;
    S.summary = '';
    if (!result.frames?.length || !result.duration) { S.balls = clone(result.balls); update(); return; }
    S.playing = true;
    S.player = new R.Player(result, {
      speed: ui.settings.replaySpeed,
      onFrame: frame => { S.balls = frame.balls; draw(); },
      onEvent: e => { if (e.kind === 'ball') Coach.sound.play('ball', Math.min(1, e.strength / .25)); else if (e.kind === 'cushion') Coach.sound.play('cushion'); else Coach.sound.play('pocket'); },
      onEnd: () => {
        S.playing = false; S.balls = clone(result.balls);
        S.summary = summarise(result, S.before);
        S.player = null; update();
        if (announce) ui.toast('Shot complete. Check where both balls finished.', { ms: 2600 });
      }
    });
    Coach.sound.play('shot');
    S.player.play(); update();
  }

  function shoot() {
    if (S.playing || S.mode !== 'aim') return;
    if (!cue()) { ui.toast('Put the white ball back on the table first.', { tone: 'warn' }); return; }
    try {
      S.before = clone(S.balls).map(b => ({ ...b, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0 }));
      S.last = P.simulate(S.balls, S.shot, ui.tableParams());
      ui.session.capture = { initial: clone(S.before), shot: clone(S.last.shot), result: S.last };
      S.prediction = null;
      playResult(S.last, true);
    } catch (error) { ui.toast(error.message, { tone: 'warn' }); }
  }
  function restore(balls) { stopPlayback(); reviewingSafety = false; safetyMap = null; S.balls = clone(balls).map(b => ({ ...b, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0 })); S.summary = ''; update(); }

  // ---------- arranging ----------
  function safePosition(p, id) {
    const r = P.TABLE.radius;
    return p.x >= r && p.x <= P.TABLE.width - r && p.y >= r && p.y <= P.TABLE.height - r &&
      !P.TABLE.pockets.some(k => Math.hypot(p.x - k.x, p.y - k.y) < k.radius + r * .6) &&
      !S.balls.some(b => b.id !== id && !b.potted && Math.hypot(b.x - p.x, b.y - p.y) < 2 * r + .0005);
  }
  function addBall(color) {
    const existing = color !== 'red' && S.balls.find(b => b.color === color);
    if (existing && !existing.potted) { S.selected = existing.id; ui.toast(`${names[color]} selected. Drag it to move it.`, { ms: 2200 }); update(); return; }
    const id = color === 'white' ? 'cue' : color === 'red' ? 'red' + Date.now().toString(36) : color;
    let spot = null;
    for (let x = .45; x < 3.2 && !spot; x += .12) for (let y = .3; y < 1.5; y += .12) if (safePosition({ x, y })) { spot = { x, y }; break; }
    if (!spot) { ui.toast('There is no free space left for another ball.', { tone: 'warn' }); return; }
    if (existing) Object.assign(existing, P.createBall({ id: existing.id, color, ...spot }));
    else S.balls.push(P.createBall({ id, color, ...spot }));
    S.selected = existing?.id || id; S.last = null; S.summary = ''; S.before = clone(S.balls); update();
    renderPalette();
  }
  function renderPalette() {
    $('#ft-palette').innerHTML = Object.keys(Coach.renderer.colors).map(color => {
      const existing = color !== 'red' && S.balls.find(b => b.color === color), present = existing && !existing.potted;
      const label = existing?.potted ? `Restore the ${color} ball` : present ? `Select the ${color} ball` : `Add a ${color} ball`;
      return `<button type="button" class="palette-ball" data-color="${color}" aria-label="${label}" style="--ball:${Coach.renderer.colors[color]}"><i></i><span>${names[color]}</span>${present ? '<b aria-hidden="true">✓</b>' : ''}</button>`;
    }).join('');
    $$('[data-color]', el).forEach(b => b.onclick = () => addBall(b.dataset.color));
  }
  function setMode(mode) {
    if (S.playing) return;
    reviewingSafety = false; safetyMap = null;
    S.mode = mode;
    $('#ft-mode-aim').setAttribute('aria-pressed', String(mode === 'aim'));
    $('#ft-mode-arrange').setAttribute('aria-pressed', String(mode === 'arrange'));
    $('#ft-dock').hidden = mode !== 'aim'; $('#ft-arrange').hidden = mode !== 'arrange';
    if (mode === 'arrange') renderPalette(); else { S.selected = null; S.before = clone(S.balls); }
    update();
  }

  // ---------- input ----------
  function setAimFrom(e) {
    const c = cue();
    if (!c) return;
    const p = renderer.unproject(e);
    if (Math.hypot(p.x - c.x, p.y - c.y) < .02) return;
    S.shot.angle = Math.round(Math.atan2(p.y - c.y, p.x - c.x) * 1800 / Math.PI) / 10;
    syncControls(); draw(); schedulePrediction();
  }
  function onPointerDown(e) {
    if (S.playing || e.button > 0) return;
    const canvas = renderer.canvas;
    canvas.focus({ preventScroll: true });
    if (S.mode === 'aim') { S.aiming = true; capture(canvas, e.pointerId); setAimFrom(e); return; }
    const p = renderer.unproject(e), reach = e.pointerType === 'touch' ? .07 : .045;
    const hit = S.balls.filter(b => !b.potted).map(b => ({ b, d: Math.hypot(b.x - p.x, b.y - p.y) })).filter(x => x.d < reach).sort((a, b) => a.d - b.d)[0];
    S.selected = hit ? hit.b.id : null; S.drag = hit ? hit.b.id : null;
    if (hit) capture(canvas, e.pointerId);
    draw();
  }
  function onPointerMove(e) {
    if (S.aiming) { setAimFrom(e); return; }
    if (!S.drag) return;
    const p = renderer.unproject(e), b = S.balls.find(x => x.id === S.drag);
    if (b && safePosition(p, b.id)) { b.x = p.x; b.y = p.y; S.last = null; S.summary = ''; draw(); }
  }
  function onPointerUp() {
    if (S.drag) { S.before = clone(S.balls); S.drag = null; update(); }
    S.aiming = false;
  }
  function onKeyDown(e) {
    if (S.playing) return;
    if (S.mode === 'aim') {
      const fine = e.shiftKey ? 1 : .1;
      if (e.key === 'ArrowLeft') { e.preventDefault(); S.shot.angle = Math.round((S.shot.angle - fine) * 10) / 10; if (S.shot.angle < -180) S.shot.angle += 360; update(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); S.shot.angle = Math.round((S.shot.angle + fine) * 10) / 10; if (S.shot.angle > 180) S.shot.angle -= 360; update(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); S.shot.cueSpeed = clamp(Math.round((S.shot.cueSpeed + .05) * 100) / 100, .1, 6); update(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); S.shot.cueSpeed = clamp(Math.round((S.shot.cueSpeed - .05) * 100) / 100, .1, 6); update(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot(); }
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected) { e.preventDefault(); $('#ft-remove').click(); }
  }

  function setSpin(top, side) {
    const r = Math.hypot(top, side);
    if (r > .5) { top *= .5 / r; side *= .5 / r; }
    // Rounding both components can move a valid diagonal tip point outside
    // the 0.5R circle and make the next shot throw. Round display, not state.
    S.shot.top = top; S.shot.side = side; update();
  }
  function spinFromEvent(e) {
    const rect = $('#ft-spin').getBoundingClientRect(), r = 56 * rect.width / 132;
    setSpin(-(e.clientY - rect.top - rect.height / 2) / r, (e.clientX - rect.left - rect.width / 2) / r);
  }

  function wire() {
    const canvas = $('#ft-canvas');
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('keydown', onKeyDown);
    $('#ft-mode-aim').onclick = () => setMode('aim');
    $('#ft-mode-arrange').onclick = () => setMode('arrange');
    $('#ft-done').onclick = () => setMode('aim');
    $('#ft-shoot').onclick = shoot;
    $('#ft-angle').oninput = e => {
      const v = Number(e.target.value);
      if (e.target.value !== '' && Number.isFinite(v)) { S.shot.angle = clamp(v, -180, 180); draw(); schedulePrediction(); }
    };
    $('#ft-angle').onchange = e => { const v = Number(e.target.value); S.shot.angle = Number.isFinite(v) ? clamp(Math.round(v * 10) / 10, -180, 180) : S.shot.angle; update(); };
    $$('[data-turn]', el).forEach(b => b.onclick = () => { S.shot.angle = Math.round(clamp(S.shot.angle + Number(b.dataset.turn), -180, 180) * 10) / 10; update(); });
    $('#ft-power').oninput = e => { S.shot.cueSpeed = Number(e.target.value); update(); };
    $$('[data-power]', el).forEach(b => b.onclick = () => { S.shot.cueSpeed = Number(b.dataset.power); update(); });
    $$('[data-spin]', el).forEach(b => b.onclick = () => { const [t, s] = b.dataset.spin.split(',').map(Number); setSpin(t, s); });
    const spin = $('#ft-spin');
    spinCtx = spin.getContext('2d');
    spin.onpointerdown = e => { spinDrag = true; capture(spin, e.pointerId); spinFromEvent(e); };
    spin.onpointermove = e => { if (spinDrag) spinFromEvent(e); };
    spin.onpointerup = () => { spinDrag = false; };
    spin.onpointercancel = () => { spinDrag = false; };
    spin.onkeydown = e => {
      const d = { ArrowLeft: [0, -.01], ArrowRight: [0, .01], ArrowUp: [.01, 0], ArrowDown: [-.01, 0] }[e.key];
      if (d) { e.preventDefault(); setSpin(S.shot.top + d[0], S.shot.side + d[1]); }
    };
    $('#ft-guide').onchange = e => { ui.saveSettings({ aimGuide: e.target.checked }); draw(); };
    $('#ft-predict').onchange = e => { ui.saveSettings({ predict: e.target.checked }); schedulePrediction(); };
    $('#ft-replay').onclick = () => { if (S.last && !S.playing) { S.balls = clone(S.before); playResult(S.last, false); } };
    $('#ft-new').onclick = () => {
      stopPlayback(); S.balls=layout('frame'); S.before=clone(S.balls); S.shot=openingShot();
      S.last=null; S.summary=''; S.selected=null; S.drag=null; S.aiming=false;
      reviewingSafety=false; safetyMap=null; ui.session.capture=null; setMode('aim');
      renderPalette(); update(); ui.toast('New frame: 15 reds, colours on their spots, white in the D.');
    };
    $('#ft-undo').onclick = () => { if (!S.playing) { restore(S.before); } };
    $('#ft-safety').onclick = () => {
      if (!canReviewSafety()) return;
      reviewingSafety = !reviewingSafety;
      if (reviewingSafety) safetyMap = Coach.safeLeaves.analyse(S.balls, S.balls.filter(b => b.color === 'red' && !b.potted).map(b => b.id));
      syncControls(); draw();
    };
    $('#ft-remove').onclick = () => {
      if (!S.selected) { ui.toast('Select a ball first.', { tone: 'warn' }); return; }
      S.balls = S.balls.filter(b => b.id !== S.selected); S.selected = null; S.last = null; S.summary = ''; S.before = clone(S.balls); renderPalette(); update();
    };
    $$('[data-layout]', el).forEach(b => b.onclick = () => { stopPlayback(); S.balls = layout(b.dataset.layout); S.before = clone(S.balls); S.selected = null; S.last = null; S.summary = ''; renderPalette(); update(); });
    $('#ft-save').onclick = () => { if (S.last) ui.router.go('create'); };
    document.addEventListener('keydown', e => {
      if (el.hidden || S.mode !== 'aim' || S.playing) return;
      if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); shoot(); }
    });
  }

  ui.router.register({
    id: 'free', nav: 'free', el, title: () => 'Free table',
    enter() {
      if (!renderer) renderer = new Coach.renderer.TableRenderer($('#ft-canvas'));
      if (!wired) { wire(); wired = true; }
      renderer.resize();
      update();
      return true;
    },
    leave() { if (S.player) { S.player.pause(); S.playing = false; S.balls = clone(S.last?.balls || S.balls); S.player = null; S.summary = S.last ? summarise(S.last, S.before) : ''; } }
  });
  Coach.freeTable = { state: S };
})(globalThis);
