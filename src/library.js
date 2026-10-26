/* Screen: browse all puzzles by level and tactic. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, C = Coach.courses, { $, $$, esc, icon } = ui;
  const el = $('#view-puzzles');
  let filter = 'all', hideDone = false, renderers = [];

  el.innerHTML = `
    <header class="view-head">
      <div><p class="eyebrow">Choose a puzzle</p><h1 data-focus>Puzzles</h1></div>
      <div class="progress-pill" id="lib-progress"></div>
    </header>
    <div class="filter-bar">
      <div class="chip-row" id="lib-filters" role="group" aria-label="Filter puzzles by tactic"></div>
      <label class="switch-chip"><input type="checkbox" id="lib-hide-done"><span class="switch-box" aria-hidden="true"></span><span>Hide mastered</span></label>
    </div>
    <div id="lib-body"></div>`;

  const dots = level => `<span class="dots" role="img" aria-label="Difficulty ${level} of 5">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= level ? 'on' : ''}"></i>`).join('')}</span>`;
  const STATUS = {
    new: { text: 'New', icon: '' },
    tried: { text: 'Practising', icon: 'route' },
    promising: { text: 'Promising', icon: 'star' },
    mastered: { text: 'Mastered', icon: 'check' }
  };

  function card(p, number, status, isNext) {
    const tactic = C.tacticOf(p.tactic), s = STATUS[status];
    const tags = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    const level = p.level ? `Level ${p.level}` : 'Your puzzle';
    return `<a class="puzzle-card" href="#/practice/${encodeURIComponent(p.id)}" data-status="${status}" aria-label="${esc(`${number ? 'Puzzle ' + number + ': ' : ''}${p.title}. ${level}. ${s.text}.${isNext ? ' Up next.' : ''}`)}">
      <div class="card-thumb"><canvas data-thumb="${esc(p.id)}" aria-hidden="true"></canvas>
        <span class="card-tactic">${icon(tactic.icon)}${esc(tactic.label)}</span>
        <span class="card-state state-${status}">${s.icon ? icon(s.icon) : ''}${s.text}</span>
        ${isNext ? '<span class="card-next">Up next</span>' : ''}</div>
      <div class="card-body"><h3>${number ? `<span class="card-number">${String(number).padStart(2, '0')}</span>` : ''}${esc(p.title)}</h3>
        <p>${esc(p.learn || p.brief || '')}</p>
        <div class="card-meta">${p.level ? dots(p.level) : ''}${tags}</div></div></a>`;
  }

  function render() {
    renderers.forEach(r => r.destroy());
    renderers = [];
    const builtIn = ui.builtIn(), custom = ui.customPuzzles(), progress = ui.store.progress();
    const statusOf = id => ui.store.statusOf(id, progress);
    const counts = C.counts(builtIn, statusOf), next = C.recommended(builtIn, statusOf);
    const numberOf = new Map(builtIn.map((p, i) => [p.id, i + 1]));

    $('#lib-progress').innerHTML = `<div class="progress-text"><strong>${counts.mastered}</strong> of ${counts.total} mastered<span>${counts.tried} tried</span></div>
      <div class="meter" role="img" aria-label="${counts.mastered} of ${counts.total} puzzles mastered"><i style="width:${counts.total ? counts.mastered / counts.total * 100 : 0}%"></i></div>
      ${next ? `<a class="btn btn-primary btn-small" href="#/practice/${encodeURIComponent(next.id)}">${counts.tried ? 'Continue' : 'Start'} puzzle ${numberOf.get(next.id)}${icon('arrow-right')}</a>` : ''}`;

    $('#lib-filters').innerHTML = [{ id: 'all', label: 'All', icon: 'grid' }, ...C.TACTICS].map(t => {
      const n = t.id === 'all' ? builtIn.length : builtIn.filter(p => p.tactic === t.id).length;
      return `<button class="chip" aria-pressed="${filter === t.id}" data-filter="${t.id}">${icon(t.icon)}<span>${esc(t.label)}</span><b>${n}</b></button>`;
    }).join('');

    const matches = p => (filter === 'all' || p.tactic === filter) && !(hideDone && statusOf(p.id) === 'mastered');
    let html = '';
    for (const group of C.byLevel(builtIn)) {
      const list = group.puzzles.filter(matches);
      if (!list.length) continue;
      const done = group.puzzles.filter(p => statusOf(p.id) === 'mastered').length;
      html += `<section class="level-block" aria-labelledby="level-${group.level}">
        <div class="level-head"><h2 id="level-${group.level}"><span class="level-badge">${group.level}</span>${esc(group.name)}</h2><p>${esc(group.blurb)}</p><span class="level-count">${done}/${group.puzzles.length}</span></div>
        <div class="card-grid">${list.map(p => card(p, numberOf.get(p.id), statusOf(p.id), next && p.id === next.id)).join('')}</div></section>`;
    }
    if (!html) html = `<div class="empty"><p>No puzzles match these filters.</p><button class="btn btn-ghost" id="lib-reset">Show all puzzles</button></div>`;
    if (filter === 'all' && !hideDone) {
      html += `<section class="level-block" aria-labelledby="level-custom"><div class="level-head"><h2 id="level-custom"><span class="level-badge custom">${icon('create')}</span>Your puzzles</h2><p>Made on the Free Table</p></div>
        <div class="card-grid">${custom.map(p => card(p, 0, statusOf(p.id), false)).join('')}
        <a class="puzzle-card create-card" href="#/create"><div class="create-art">${icon('plus', 'big')}</div><div class="card-body"><h3>Create a puzzle</h3><p>Take a shot on the Free Table, then turn it into a challenge.</p></div></a></div></section>`;
    }
    $('#lib-body').innerHTML = html;

    for (const canvas of $$('canvas[data-thumb]', el)) {
      const puzzle = ui.puzzle(canvas.dataset.thumb);
      if (puzzle) renderers.push(Coach.renderer.thumbnail(canvas, puzzle));
    }
    $$('[data-filter]', el).forEach(b => { b.onclick = () => { filter = b.dataset.filter; render(); $(`[data-filter="${filter}"]`, el)?.focus(); }; });
    const reset = $('#lib-reset');
    if (reset) reset.onclick = () => { filter = 'all'; hideDone = false; $('#lib-hide-done').checked = false; render(); };
  }

  $('#lib-hide-done').onchange = e => { hideDone = e.target.checked; render(); };

  ui.router.register({
    id: 'puzzles', nav: 'puzzles', el, title: () => 'Puzzles',
    enter() { render(); },
    leave() { renderers.forEach(r => r.destroy()); renderers = []; }
  });
  Coach.library = { render };
})(globalThis);
