/* Screen: table feel, comfort options and your saved data. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, SF = Coach.storeFactory;
  const { $, $$, esc, icon } = ui;
  const el = $('#view-settings');

  el.innerHTML = `
    <header class="view-head"><div><p class="eyebrow">Make it yours</p><h1 data-focus>Settings</h1></div></header>
    <div class="settings-grid">
      <section class="panel" aria-labelledby="st-table"><h2 id="st-table">${icon('table')}Table feel</h2>
        <p class="fine">Applies to the Free Table only. Puzzles are always scored on the standard table, so results stay comparable.</p>
        <div class="preset-grid" id="st-presets" role="group" aria-label="Table presets"></div>
        <details class="soft" id="st-fine"><summary>Fine-tune the physics</summary><div id="st-sliders"></div>
          <div class="button-row"><button class="btn btn-ghost" id="st-reset-params" type="button">${icon('restart')}<span>Back to the standard table</span></button></div></details>
      </section>
      <section class="panel" aria-labelledby="st-comfort"><h2 id="st-comfort">${icon('settings')}Comfort</h2>
        <label class="row-switch"><span><b>Sound effects</b><small>Ball clicks, cushion thuds and pocket drops</small></span><input type="checkbox" id="st-sound"><span class="switch-box" aria-hidden="true"></span></label>
        <label class="row-switch"><span><b>Label coloured balls</b><small>Adds a letter to each colour, such as Y for yellow</small></span><input type="checkbox" id="st-labels"><span class="switch-box" aria-hidden="true"></span></label>
        <label class="row-switch"><span><b>Aim guide on the Free Table</b><small>Shows the contact point and where each ball goes</small></span><input type="checkbox" id="st-guide"><span class="switch-box" aria-hidden="true"></span></label>
        <div class="row-select"><span><b>Animation</b><small>Follows your device unless you choose otherwise</small></span>
          <div class="segmented" role="group" aria-label="Animation" id="st-motion"><button type="button" data-motion="auto">Automatic</button><button type="button" data-motion="full">Full</button><button type="button" data-motion="reduce">Reduced</button></div></div>
        <div class="row-select"><span><b>Replay speed</b><small>Used by every replay</small></span>
          <div class="segmented" role="group" aria-label="Replay speed" id="st-speed">${[.25, .5, 1, 2].map(v => `<button type="button" data-speed="${v}">${v}×</button>`).join('')}</div></div>
      </section>
      <section class="panel" aria-labelledby="st-data"><h2 id="st-data">${icon('download')}Your data</h2>
        <p class="fine">Everything is stored in this browser only. Nothing is uploaded.</p>
        <div class="button-row stack">
          <button class="btn btn-ghost" id="st-guide-open" type="button">${icon('info')}<span>Show the how-it-works guide</span></button>
          <button class="btn btn-ghost" id="st-model" type="button">${icon('book')}<span>About the physics model</span></button>
          <button class="btn btn-danger" id="st-reset-progress" type="button">${icon('trash')}<span>Reset my progress</span></button>
        </div>
      </section>
    </div>`;

  function sliders() {
    $('#st-sliders').innerHTML = SF.PARAM_SPEC.map(s => `<label class="slider-row"><span><b>${esc(s.label)}</b><small>${esc(s.hint)}</small></span>
      <input type="range" data-param="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" aria-label="${esc(s.label)}"><output data-out="${s.key}"></output></label>`).join('');
    $$('[data-param]', el).forEach(input => {
      input.oninput = () => {
        const key = input.dataset.param;
        ui.saveSettings({ params: { [key]: Number(input.value) }, preset: 'custom' });
        sync();
      };
    });
  }
  const fmt = (spec, value) => (spec.step < .01 ? value.toFixed(3) : spec.step < 1 ? value.toFixed(2) : value.toFixed(1)) + spec.unit;

  function sync() {
    const s = ui.settings;
    $('#st-presets').innerHTML = SF.PRESETS.map(p => `<button type="button" class="preset" data-preset="${p.id}" aria-pressed="${s.preset === p.id}"><b>${esc(p.label)}</b><small>${esc(p.blurb)}</small></button>`).join('');
    $$('[data-preset]', el).forEach(b => b.onclick = () => {
      const preset = SF.PRESETS.find(p => p.id === b.dataset.preset);
      ui.saveSettings({ preset: preset.id, params: { ...P.DEFAULTS, ...preset.params } });
      ui.toast(`${preset.label} applied to the Free Table.`, { tone: 'good', ms: 2400 });
      sync();
    });
    for (const spec of SF.PARAM_SPEC) {
      const input = $(`[data-param="${spec.key}"]`, el);
      if (input) { input.value = s.params[spec.key]; $(`[data-out="${spec.key}"]`, el).textContent = fmt(spec, s.params[spec.key]); }
    }
    $('#st-sound').checked = s.sound; $('#st-labels').checked = s.colourLabels; $('#st-guide').checked = s.aimGuide;
    $$('[data-motion]', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.motion === s.reduceMotion)));
    $$('#st-speed [data-speed]', el).forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.replaySpeed)));
  }

  function wire() {
    sliders();
    $('#st-sound').onchange = e => { ui.saveSettings({ sound: e.target.checked }); if (e.target.checked) Coach.sound.play('tick'); };
    $('#st-labels').onchange = e => ui.saveSettings({ colourLabels: e.target.checked });
    $('#st-guide').onchange = e => ui.saveSettings({ aimGuide: e.target.checked });
    $$('[data-motion]', el).forEach(b => b.onclick = () => { ui.saveSettings({ reduceMotion: b.dataset.motion }); sync(); });
    $$('#st-speed [data-speed]', el).forEach(b => b.onclick = () => { ui.saveSettings({ replaySpeed: Number(b.dataset.speed) }); sync(); });
    $('#st-reset-params').onclick = () => { ui.saveSettings({ preset: 'baseline', params: { ...P.DEFAULTS } }); ui.toast('Standard table restored.', { tone: 'good', ms: 2400 }); sync(); };
    $('#st-guide-open').onclick = () => Coach.guide.open();
    $('#st-model').onclick = () => { ui.dialog.open(`<div class="notes"><p class="eyebrow">${icon('book')}Behind the scenes</p><h2>About the physics model</h2>
      <ul class="plain"><li>Balls slide, then roll. Raised cushion contact couples side spin, topspin and cloth friction, with grip limited by the impact.</li>
      <li>The standard table is a <b>teaching baseline</b> inside published ranges. It is not a measurement of a real match table.</li>
      <li>Pockets have openings and rounded jaws. Vertical pocket bounce, jumps, swerve and cloth nap are omitted; packed balls are approximate.</li>
      <li>The “blocked angle” is a teaching measure of how much of the red a colour hides. It is not a probability.</li>
      <li>Safe-leave maps apply the paper’s direct-line exposure threshold to the final layout. They show geometric candidates, not guaranteed reachable positions.</li>
      <li>A search that finds no matching shot never proves a route is impossible.</li></ul>
      <div class="button-row"><button class="btn btn-primary" data-autofocus data-close>Close</button></div></div>`, { label: 'About the physics model' });
      $('#dialog [data-close]').onclick = () => ui.dialog.close(); };
    $('#st-reset-progress').onclick = async () => {
      const ok = await ui.dialog.confirm({ title: 'Reset your progress?', body: 'This clears your scores and mastered badges on every puzzle. Your own puzzles and settings are kept.', confirmLabel: 'Reset progress', danger: true });
      if (ok) { ui.store.resetProgress(); ui.session.drafts.clear(); ui.session.assessment = null; ui.toast('Progress cleared.', { tone: 'good' }); }
    };
  }

  let wired = false;
  ui.router.register({
    id: 'settings', nav: 'settings', el, title: () => 'Settings',
    enter() { if (!wired) { wire(); wired = true; } sync(); return true; }
  });
})(globalThis);
