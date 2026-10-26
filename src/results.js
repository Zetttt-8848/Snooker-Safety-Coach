/* Screen: what happened. Score, plain-language reasons, and a replay you can scrub. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, G = Coach.geometry, R = Coach.replay, C = Coach.courses;
  const { $, $$, esc, icon, clamp } = ui;
  const el = $('#view-results');

  el.innerHTML = `
    <div class="results-head">
      <a class="back-link" id="rs-back" href="#/puzzles">${icon('arrow-left')}<span>Back to the puzzle</span></a>
      <h1 data-focus id="rs-title">Results</h1>
    </div>
    <div class="results-grid">
      <section class="results-stage" aria-label="Replay">
        <div class="table-frame"><canvas id="rs-canvas" aria-label="Table showing your route, the reference route and the replay of the shot"></canvas></div>
        <div class="replay-bar" role="group" aria-label="Replay controls">
          <div class="segmented" role="group" aria-label="Which shot to replay">
            <button type="button" id="rs-src-mine" aria-pressed="true">Your shot</button>
            <button type="button" id="rs-src-ref" aria-pressed="false">Reference shot</button>
          </div>
          <button class="btn btn-primary btn-round" id="rs-play" type="button" aria-label="Play">${icon('play')}</button>
          <button class="icon-btn" id="rs-restart" type="button" aria-label="Restart replay">${icon('restart')}</button>
          <button class="btn btn-ghost" id="rs-finish" type="button">Final leave</button>
          <div class="scrub">
            <input id="rs-scrub" type="range" min="0" max="1000" value="0" aria-label="Replay position">
            <div class="scrub-marks" id="rs-marks" aria-hidden="true"></div>
          </div>
          <output class="time" id="rs-time" aria-hidden="true">0.0 s</output>
          <div class="segmented small" role="group" aria-label="Replay speed" id="rs-speed"></div>
        </div>
        <p class="note-line" id="rs-note" hidden></p>
        <div class="chip-row layers" role="group" aria-label="Show on the table" id="rs-layers"></div>
        <div class="safe-legend" id="rs-safe-legend" hidden aria-live="polite"></div>
      </section>
      <section class="score-card score-summary" aria-label="Score summary">
        <div class="score-top">
          <div class="ring" id="rs-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" cx="60" cy="60" r="52"/></svg><div class="ring-text"><strong id="rs-total">0</strong><span>of 100</span></div></div>
          <div class="score-title"><p class="eyebrow" id="rs-puzzle"></p><h2 id="rs-grade"></h2><span class="pill" id="rs-verify"></span></div>
        </div>
        <p class="tip" id="rs-tip"></p>
        <div class="alt-badge" id="rs-alt" hidden>${icon('star')}<span>Alternative route recognised. It does not have to match the reference to count.</span></div>
        <div class="button-row">
          <button class="btn btn-primary btn-xl" id="rs-next" type="button"><span>Next puzzle</span>${icon('arrow-right')}</button>
          <button class="btn btn-ghost" id="rs-retry" type="button">${icon('restart')}<span>Try again</span></button>
        </div>
      </section>
      <section class="score-card score-detail" aria-label="Score details">
        <h2 class="detail-title">Why this score</h2>
        <ul class="meters" id="rs-meters"></ul>
        <p class="fine" id="rs-search"></p>
        <details class="soft"><summary>How this score works</summary><div id="rs-detail"></div></details>
      </section>
    </div>`;

  const METERS = [
    { key: 'O', name: 'Safety of the leave', weight: 45, icon: 'shield' },
    { key: 'E', name: 'Finish spot', weight: 25, icon: 'pin' },
    { key: 'P', name: 'Route shape', weight: 20, icon: 'route' },
    { key: 'C', name: 'Cushion contacts', weight: 10, icon: 'bounce' }
  ];
  const SPEEDS = [.25, .5, 1, 2];
  let renderer = null, data = null, player = null, source = 'mine', layers = {}, wired = false, markersFor = null;
  let safeMap = null;
  const safeMaps = new WeakMap();

  const tone = v => v >= .9 ? 'good' : v >= .6 ? 'mid' : 'low';
  const gradeLabel = { Excellent: 'Excellent', Promising: 'Promising', Developing: 'Developing' };

  function sources() {
    const mine = data.fit.result || null;
    return { mine, ref: data.reference };
  }

  function tableState(frame) {
    const { puzzle, route, reference, fit, report } = data, s = sources(), atEnd = player && player.time >= player.duration - 1e-6;
    const result = source === 'mine' && s.mine ? s.mine : s.ref;
    const now = frame || player.snapshot(), t = player ? player.time : 0;
    const state = { balls: now.balls, labels: [], rings: [] };
    if (layers.safe && atEnd && safeMap) {
      state.safeLeaves = safeMap;
      const cue = now.balls.find(b => b.id === 'cue' && !b.potted);
      if (cue && !safeMap.actual.safe && safeMap.nearest) {
        state.points = [{ at: safeMap.nearest, text: 'Lower exposure', tone: 'good', below: true }];
      }
    }
    if (layers.route) state.student = route;
    if (layers.reference) state.reference = reference.path;
    if (layers.zone) {
      const o = puzzle.objective || {};
      state.zones = [];
      if (o.cueZone) state.zones.push({ ...o.cueZone, label: 'Target area', tone: 'gold' });
      if (o.targetZone) state.zones.push({ ...o.targetZone, label: 'Safe area for the red', tone: 'good' });
    }
    if (layers.trails) state.trails = R.trailsAt(result, t, now);
    if (fit.status === 'unresolved' && fit.closest?.path) state.closest = fit.closest.path;
    if (layers.cone && atEnd) {
      const cue = now.balls.find(b => b.id === 'cue'), target = now.balls.find(b => b.id === puzzle.targetId);
      if (cue && target && !cue.potted && !target.potted) {
        const blockers = now.balls.filter(b => b.id !== 'cue' && !(puzzle.legalTargetIds || [puzzle.targetId]).includes(b.id) && !b.potted);
        const view = G.occlusion(cue, target, blockers);
        state.cone = { cue, target, view };
        if (view.valid) (state.points = state.points || []).push({ at: target, below: true, tone: view.blockedFraction >= .95 ? 'good' : 'warn',
          text: view.blockedFraction >= .95 ? 'Red is hidden' : `${Math.round(view.blockedFraction * 100)}% of the red hidden` });
      }
    }
    if (atEnd && layers.reference && source === 'mine' && s.mine) {
      const mineCue = s.mine.balls.find(b => b.id === 'cue'), refCue = s.ref.balls.find(b => b.id === 'cue');
      if (mineCue && refCue) {
        state.gap = { from: refCue, to: mineCue };
        state.points = [...(state.points || []), { at: refCue, text: 'Reference finish', tone: 'gold', below: true }, { at: mineCue, text: 'Your finish', tone: 'info' }];
        if (state.zones) state.zones.forEach(z => { delete z.label; });
      }
    }
    return state;
  }

  function draw(frame) {
    renderer.draw(tableState(frame));
    const legend = $('#rs-safe-legend'), atEnd = player && player.time >= player.duration - 1e-6;
    legend.hidden = !layers.safe || !atEnd || !safeMap;
    if (!legend.hidden) {
      const name = source === 'mine' ? 'Your final layout' : 'Reference final layout';
      legend.innerHTML = `<div><span class="safe-key">Low exposure</span><span class="safe-key hidden-key">95%+ hidden</span></div>
        <p>${name} · ${safeMap.targetCount} legal target${safeMap.targetCount === 1 ? '' : 's'} · ${safeMap.actual.valid ? (safeMap.actual.safe ? 'The white finishes in a low-exposure area.' : 'Try a highlighted landing area.') : 'No valid cue-ball finish.'}</p>
        <small>${!safeMap.safeCount ? 'No qualifying area found at this resolution. ' : ''}Paper exposure ≤ 0.30, sampled every 2 cm. Geometry only; reaching these positions needs a legal shot.</small>`;
    }
  }

  function updateTransport() {
    const playing = !!player && player.playing, atEnd = player && player.time >= player.duration - 1e-6;
    const button = $('#rs-play');
    button.innerHTML = icon(playing ? 'pause' : 'play');
    button.setAttribute('aria-label', playing ? 'Pause' : atEnd ? 'Replay' : 'Play');
    if (player) {
      $('#rs-scrub').value = player.duration ? Math.round(player.time / player.duration * 1000) : 0;
      $('#rs-time').textContent = `${player.time.toFixed(1)} s`;
    }
  }

  function choose(which) {
    const s = sources(), result = which === 'mine' && s.mine ? s.mine : s.ref;
    source = which === 'mine' && s.mine ? 'mine' : 'ref';
    if (result.completed) {
      if (!safeMaps.has(result)) safeMaps.set(result, Coach.safeLeaves.analyse(result.balls, data.puzzle.legalTargetIds || [data.puzzle.targetId]));
      safeMap = safeMaps.get(result);
    } else safeMap = null;
    $('#rs-src-mine').setAttribute('aria-pressed', String(source === 'mine'));
    $('#rs-src-ref').setAttribute('aria-pressed', String(source === 'ref'));
    if (player) player.dispose();
    player = new R.Player(result, {
      speed: ui.settings.replaySpeed,
      onFrame: frame => { draw(frame); updateTransport(); },
      onEvent: e => {
        if (e.kind === 'ball') Coach.sound.play('ball', Math.min(1, e.strength / .25));
        else if (e.kind === 'cushion') Coach.sound.play('cushion');
        else Coach.sound.play('pocket');
      },
      onEnd: () => { draw(); updateTransport(); }
    });
    markersFor = R.markers(result);
    $('#rs-marks').innerHTML = markersFor.map(m => `<i class="mark ${m.kind}" style="left:${m.t / (player.duration || 1) * 100}%"></i>`).join('');
    updateTransport();
  }

  function play(restart) {
    if (!player) return;
    if (restart || player.time >= player.duration - 1e-6) player.seek(0);
    Coach.sound.play('shot');
    player.play(); updateTransport();
  }

  function layerChips() {
    const defs = [
      ['route', 'Your drawn route', 'route', true], ['reference', 'Reference route', 'route', true],
      ['safe', 'Safe leaves', 'shield', true], ['zone', 'Target area', 'target', true], ['trails', 'Ball trails', 'play', true]
    ];
    if (data.puzzle.tactic === 'hide') defs.push(['cone', 'Blocked view', 'eye-off', true]);
    $('#rs-layers').innerHTML = defs.map(([key, label, ic]) => `<button type="button" class="chip layer-${key}" aria-pressed="${!!layers[key]}" data-layer="${key}">${icon(ic)}<span>${label}</span></button>`).join('');
    $$('[data-layer]', el).forEach(b => {
      b.onclick = () => {
        layers[b.dataset.layer] = !layers[b.dataset.layer]; b.setAttribute('aria-pressed', String(layers[b.dataset.layer]));
        if (b.dataset.layer === 'safe' && layers.safe && player) { player.pause(); player.seek(player.duration); updateTransport(); }
        draw();
      };
    });
  }

  function fill() {
    const { puzzle, report, fit } = data;
    const verification = report.verification;
    $('#rs-title').textContent = 'Your result';
    $('#rs-puzzle').textContent = puzzle.title;
    $('#rs-grade').textContent = gradeLabel[report.grade];
    $('#rs-ring').dataset.grade = report.grade;
    const pill = $('#rs-verify');
    pill.className = 'pill ' + ({ verified: 'good', approximate: 'info', estimate: 'warn' }[verification]);
    pill.innerHTML = {
      verified: icon('check') + 'Verified on the physics table',
      approximate: icon('check') + 'Closest legal shot played',
      estimate: icon('info') + 'Estimate: no matching shot found'
    }[verification];
    $('#rs-tip').innerHTML = `<span class="tip-label">${report.grade === 'Developing' || !report.diagnostics.legality.valid ? 'Try this next' : 'Coach'}</span>${esc(report.headline)}`;
    $('#rs-alt').hidden = !report.alternative;
    $('#rs-meters').innerHTML = METERS.map(m => `<li class="meter-row ${tone(report[m.key])}">
        <div class="meter-top"><span class="meter-name">${icon(m.icon)}${m.name}<small>${m.weight}%</small></span><strong>${Math.round(report[m.key] * 100)}</strong></div>
        <div class="meter"><i style="width:${Math.round(report[m.key] * 100)}%"></i></div>
        <p>${esc(report.explain[m.key])}</p></li>`).join('');
    $('#rs-search').textContent = fit.status === 'feasible' ? '' : fit.message;
    $('#rs-search').hidden = fit.status === 'feasible';
    const d = report.diagnostics, a = report.outcome.actual, ref = report.outcome.reference;
    const rows = [];
    if (a && a.valid !== false) {
      rows.push(['Share of the red’s directions blocked', `${(a.blockedFraction * 100).toFixed(0)}% (reference ${(ref.blockedFraction * 100).toFixed(0)}%)`]);
      rows.push(['Blocked angle', `${a.deltaDegrees.toFixed(1)}° (reference ${ref.deltaDegrees.toFixed(1)}°)`]);
      rows.push(['Gap between the white and a cushion', `${(a.cueRailDistance * 100).toFixed(1)} cm`]);
      rows.push(['Direct-line exposure of the red', a.exposure.toFixed(2)]);
    }
    rows.push(['Finish error', `${(d.endpointDistance * 100).toFixed(1)} cm`]);
    if (fit.shot) rows.push([fit.status === 'unresolved' ? 'Closest shot tried (unverified)' : 'Shot played', `${fit.shot.cueSpeed.toFixed(2)} m/s · ${fit.shot.angle.toFixed(1)}° · top/back ${fit.shot.top.toFixed(2)} · side ${fit.shot.side.toFixed(2)}`]);
    $('#rs-detail').innerHTML = `<p>Total = 45% safety of the leave + 25% finish spot + 20% route shape + 10% cushion contacts.</p>
      <ul class="plain"><li><b>Excellent</b>: finish and safety at 90% or better, route 85%, cushions 80%.</li><li><b>Promising</b>: a different route that still leaves the red safe.</li><li><b>Developing</b>: the next step is always shown first.</li></ul>
      <dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="fine">A reference shot is one good answer, not the only one. A failed search never proves a route is impossible.</p>
      <p class="fine">Safe leaves hold the selected replay’s final object balls fixed. For each possible white-ball position, the map takes the largest Eq. (37) exposure over all legal targets and applies the paper’s Eq. (38) threshold of 0.30. Purple uses the approved occlusion-angle teaching extension. This does not calculate the paper’s certified return probabilities, shot reachability, potting risk or match value.</p>
      <ul class="plain">${report.feedback.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    // Score ring and count-up.
    const fillCircle = $('.ring-fill', el), circumference = 2 * Math.PI * 52, value = clamp(report.total, 0, 100);
    fillCircle.style.strokeDasharray = circumference;
    const total = $('#rs-total');
    if (ui.reducedMotion()) { fillCircle.style.strokeDashoffset = circumference * (1 - value / 100); total.textContent = Math.round(value); }
    else {
      fillCircle.style.strokeDashoffset = circumference; total.textContent = '0';
      const start = performance.now();
      requestAnimationFrame(() => { fillCircle.style.strokeDashoffset = circumference * (1 - value / 100); });
      const tick = now => { const f = Math.min(1, (now - start) / 900); total.textContent = Math.round(value * (1 - Math.pow(1 - f, 3))); if (f < 1 && !el.hidden) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    const list = ui.allPuzzles(), next = C.neighbours(list, puzzle.id).next;
    $('#rs-next').hidden = !next;
    $('#rs-next span').textContent = next ? `Next: ${next.title}` : 'Next puzzle';
    // Move on when the puzzle is mastered; otherwise the best next step is another attempt.
    const mastered = report.grade === 'Excellent';
    $('#rs-next').className = 'btn btn-xl ' + (mastered ? 'btn-primary' : 'btn-ghost');
    $('#rs-retry').className = 'btn ' + (mastered ? 'btn-ghost' : 'btn-primary btn-xl');
    $('#rs-next').onclick = () => ui.router.go('practice/' + encodeURIComponent(next.id));
    $('#rs-retry').onclick = () => ui.router.go('practice/' + encodeURIComponent(puzzle.id));
    $('#rs-back').href = '#/practice/' + encodeURIComponent(puzzle.id);
    if (report.grade === 'Excellent') Coach.sound.play('success');
  }

  function wire() {
    $('#rs-play').onclick = () => { if (player.playing) { player.pause(); updateTransport(); } else play(false); };
    $('#rs-restart').onclick = () => { player.pause(); play(true); };
    $('#rs-finish').onclick = () => { player.pause(); player.seek(player.duration); updateTransport(); };
    $('#rs-src-mine').onclick = () => { choose('mine'); play(true); };
    $('#rs-src-ref').onclick = () => { choose('ref'); play(true); };
    $('#rs-scrub').oninput = e => { player.pause(); player.seek(Number(e.target.value) / 1000 * player.duration); updateTransport(); };
    $('#rs-speed').innerHTML = SPEEDS.map(v => `<button type="button" data-speed="${v}" aria-pressed="${v === ui.settings.replaySpeed}">${v}×</button>`).join('');
    $$('[data-speed]', el).forEach(b => b.onclick = () => {
      const speed = Number(b.dataset.speed);
      ui.saveSettings({ replaySpeed: speed });
      player?.setSpeed(speed);
      $$('[data-speed]', el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    });
    $('#rs-canvas').addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('#rs-play').click(); }
    });
  }

  ui.router.register({
    id: 'results', nav: 'puzzles', el, title: () => 'Results',
    enter() {
      const assessment = ui.session.assessment;
      if (!assessment) { ui.toast('Check a route first to see its results.'); return false; }
      if (!renderer) { renderer = new Coach.renderer.TableRenderer($('#rs-canvas')); wire(); }
      if (data === assessment) { renderer.resize(); draw(); return true; }
      data = assessment;
      layers = { route: true, reference: true, zone: false, trails: true, safe: true, cone: false };
      data.puzzle = ui.puzzle(assessment.puzzleId);
      renderer.resize();
      fill();
      layerChips();
      const mine = !!data.fit.result;
      $('#rs-src-mine').disabled = !mine;
      $('#rs-src-mine').title = mine ? '' : 'Your route could not be matched to a legal shot, so there is nothing to replay.';
      const note = $('#rs-note');
      note.hidden = mine;
      note.innerHTML = mine ? '' : icon('info') + 'No legal shot matched your line, so only the reference can be replayed.';
      choose(mine ? 'mine' : 'ref');
      if (ui.reducedMotion()) { player.seek(player.duration); updateTransport(); draw(); }
      else { draw(); play(true); }
      return true;
    },
    leave() { if (player) { player.pause(); } }
  });
})(globalThis);
