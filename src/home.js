/* Screen: the front door. A looping demo on the real physics engine shows draw, test, learn at a glance. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, P = Coach.physics, G = Coach.geometry, R = Coach.replay, C = Coach.courses, { $, esc, icon } = ui;
  const el = $('#view-home');

  el.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Snooker safety training</p>
        <h1 data-focus>Leave your opponent <em>nothing.</em></h1>
        <p class="lede">Draw where the white ball will go. We test it on a physics table and show you what you left behind.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-xl" id="home-start" href="#/puzzles">Start puzzle 1${icon('arrow-right')}</a>
          <a class="btn btn-ghost btn-xl" href="#/puzzles">${icon('grid')}Browse puzzles</a>
        </div>
        <p class="hero-note">${icon('check')}Works offline · Saves in this browser · No account</p>
      </div>
      <div class="hero-demo" aria-label="Animated example: a route is drawn, played on the table, and the white ball hides behind the brown">
        <div class="table-frame demo-frame"><canvas id="home-canvas" aria-hidden="true"></canvas></div>
        <ol class="demo-steps" id="demo-steps">
          <li data-step="0">${icon('route')}<span>1 · Draw</span></li>
          <li data-step="1">${icon('play')}<span>2 · Test</span></li>
          <li data-step="2">${icon('eye-off')}<span>3 · Learn</span></li>
        </ol>
      </div>
    </section>
    <section class="steps" aria-labelledby="how-title">
      <h2 id="how-title" class="section-title">How it works</h2>
      <div class="step-grid">
        <article class="step-card"><div class="step-art">${icon('route', 'xl')}</div><h3>Draw</h3><p>Sketch the white ball’s route, every cushion and where it stops.</p></article>
        <article class="step-card"><div class="step-art">${icon('gauge', 'xl')}</div><h3>Test</h3><p>We find a legal shot that matches your line and play it for real.</p></article>
        <article class="step-card"><div class="step-art">${icon('target', 'xl')}</div><h3>Learn</h3><p>Compare your leave with the reference and see what to change.</p></article>
      </div>
    </section>
    <section class="path" aria-labelledby="path-title">
      <h2 id="path-title" class="section-title">Your path</h2>
      <div class="path-grid">
        <a class="next-card" id="home-next" href="#/puzzles"></a>
        <div class="level-strip" id="home-levels"></div>
      </div>
    </section>
    <section class="more" aria-labelledby="more-title">
      <h2 id="more-title" class="section-title">More ways to practise</h2>
      <div class="more-grid">
        <a class="tile" href="#/free"><span class="tile-icon">${icon('table')}</span><span><strong>Free table</strong><small>Try any shot on any layout</small></span>${icon('arrow-right')}</a>
        <a class="tile" href="#/create"><span class="tile-icon">${icon('create')}</span><span><strong>Create a puzzle</strong><small>Turn your own shot into a challenge</small></span>${icon('arrow-right')}</a>
        <button class="tile" id="home-guide" type="button"><span class="tile-icon">${icon('info')}</span><span><strong>How it works</strong><small>A 30-second visual guide</small></span>${icon('arrow-right')}</button>
      </div>
    </section>`;

  // ---------- demo ----------
  const DEMO_ID = 'hide-brown';
  let renderer = null, demo = null, raf = 0, startedAt = 0, running = false;
  const DRAW = 1.7, HOLD = 2.2;

  function prepare() {
    const puzzle = ui.builtIn().find(p => p.id === DEMO_ID) || ui.builtIn()[0];
    if (!puzzle) return null;
    const balls = puzzle.balls.map(P.createBall), result = P.simulate(balls, puzzle.referenceShot, P.DEFAULTS);
    const route = G.simplifyPath(result.path, .01), total = G.pathLength(route);
    const cue = result.balls.find(b => b.id === 'cue'), target = result.balls.find(b => b.id === puzzle.targetId);
    const blockers = result.balls.filter(b => b.id !== 'cue' && b.id !== puzzle.targetId);
    return { puzzle, balls, result, route, total, view: G.occlusion(cue, target, blockers), cue, target, cycle: DRAW + result.duration + HOLD };
  }
  function prefix(route, total, fraction) {
    const limit = total * fraction, out = [route[0]];
    let walked = 0;
    for (let i = 1; i < route.length; i++) {
      const d = G.distance(route[i - 1], route[i]);
      if (walked + d >= limit) { const t = d ? (limit - walked) / d : 0; out.push({ x: route[i - 1].x + (route[i].x - route[i - 1].x) * t, y: route[i - 1].y + (route[i].y - route[i - 1].y) * t }); return out; }
      walked += d; out.push(route[i]);
    }
    return out;
  }
  function frame(seconds) {
    const d = demo, t = seconds % d.cycle;
    let state, step;
    if (t < DRAW) {
      step = 0;
      state = { balls: d.balls, student: prefix(d.route, d.total, Math.min(1, t / (DRAW * .9))), startPulse: t < .5 };
    } else if (t < DRAW + d.result.duration) {
      step = 1;
      const u = t - DRAW, now = R.stateAt(d.result, u);
      state = { balls: now.balls, student: d.route, trails: R.trailsAt(d.result, u, now) };
    } else {
      step = 2;
      const last = R.stateAt(d.result, d.result.duration);
      state = { balls: last.balls, student: d.route, cone: { cue: d.cue, target: d.target, view: d.view },
        zones: [{ ...d.puzzle.objective.cueZone, tone: 'good', label: 'Red is hidden' }] };
    }
    state.targetId = d.puzzle.targetId;
    renderer.draw(state);
    document.querySelectorAll('#demo-steps li').forEach(li => li.classList.toggle('active', Number(li.dataset.step) === step));
  }
  function loop(now) {
    if (!running) return;
    frame((now - startedAt) / 1000);
    raf = requestAnimationFrame(loop);
  }
  function startDemo() {
    if (!demo) { demo = prepare(); if (!demo) return; }
    if (!renderer) renderer = new Coach.renderer.TableRenderer($('#home-canvas'));
    stopDemo();
    if (ui.reducedMotion()) { frame(demo.cycle - 1); return; }
    running = true; startedAt = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stopDemo() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopDemo(); else if (!el.hidden) startDemo(); });

  function summary() {
    const builtIn = ui.builtIn(), progress = ui.store.progress(), statusOf = id => ui.store.statusOf(id, progress);
    const counts = C.counts(builtIn, statusOf), next = C.recommended(builtIn, statusOf), number = builtIn.indexOf(next) + 1;
    const fresh = counts.tried === 0;
    $('#home-start').innerHTML = (fresh ? 'Start puzzle 1' : `Continue puzzle ${number}`) + icon('arrow-right');
    $('#home-start').href = '#/practice/' + encodeURIComponent(next.id);
    const nextCard = $('#home-next');
    nextCard.href = '#/practice/' + encodeURIComponent(next.id);
    nextCard.innerHTML = `<div class="next-thumb"><canvas data-next aria-hidden="true"></canvas></div><div class="next-body"><p class="eyebrow">${fresh ? 'Start here' : 'Up next'}</p><h3>${esc(next.title)}</h3><p>${esc(next.brief)}</p><span class="btn btn-primary btn-small">${fresh ? 'Start' : 'Continue'}${icon('arrow-right')}</span></div>`;
    Coach.renderer.thumbnail($('[data-next]', nextCard), next);
    $('#home-levels').innerHTML = C.byLevel(builtIn).map(l => {
      const done = l.puzzles.filter(p => statusOf(p.id) === 'mastered').length;
      return `<a class="level-row" href="#/puzzles"><span class="level-badge">${l.level}</span><span class="level-name"><strong>${esc(l.name)}</strong><small>${esc(l.blurb)}</small></span><span class="meter" role="img" aria-label="${done} of ${l.puzzles.length} mastered"><i style="width:${done / l.puzzles.length * 100}%"></i></span><span class="level-count">${done}/${l.puzzles.length}</span></a>`;
    }).join('');
  }

  $('#home-guide').onclick = () => Coach.guide.open();
  ui.router.register({
    id: 'home', nav: 'home', el, title: () => 'Home',
    enter() { summary(); startDemo(); },
    leave() { stopDemo(); }
  });
})(globalThis);
