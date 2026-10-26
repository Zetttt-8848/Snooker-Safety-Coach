/* The how-it-works guide: three animated slides, shown once on the first visit and on request. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, { $, $$, icon } = ui;

  const table = inner => `<svg class="guide-art" viewBox="0 0 320 180" role="img" aria-label="__ALT__"><defs>
      <radialGradient id="g-felt" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#2f8264"/><stop offset="1" stop-color="#154a39"/></radialGradient>
      <radialGradient id="g-white" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9cfbd"/></radialGradient>
      <radialGradient id="g-red" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ff7468"/><stop offset="1" stop-color="#8e1f19"/></radialGradient></defs>
    <rect x="2" y="2" width="316" height="176" rx="14" fill="#4a2a14"/><rect x="16" y="16" width="288" height="148" rx="6" fill="url(#g-felt)"/>${inner}</svg>`;
  const SLIDES = [
    { title: 'Draw the route', text: 'Drag from the white ball. Add every cushion and where it should stop.',
      art: table(`<path d="M70 112 C 120 112 150 44 208 62" fill="none" stroke="#59d0ff" stroke-width="4" stroke-linecap="round" stroke-dasharray="190" class="g-draw"/>
        <circle cx="208" cy="62" r="7" fill="url(#g-red)"/><circle cx="70" cy="112" r="7" fill="url(#g-white)"/>
        <circle cx="70" cy="112" r="14" fill="none" stroke="#59d0ff" stroke-width="2" class="g-pulse"/>`), alt: 'A cyan line is drawn from the white ball towards a red ball' },
    { title: 'We test it for real', text: 'A matching shot is played on a physics table. Nothing is guessed.',
      art: table(`<path d="M70 112 C 120 112 150 44 200 64" fill="none" stroke="#59d0ff" stroke-opacity=".45" stroke-width="3" stroke-dasharray="5 6"/>
        <circle cx="214" cy="60" r="7" fill="url(#g-red)"><animate attributeName="cx" values="214;214;262;262" keyTimes="0;.62;.85;1" dur="3s" repeatCount="indefinite"/><animate attributeName="cy" values="60;60;48;48" keyTimes="0;.62;.85;1" dur="3s" repeatCount="indefinite"/></circle>
        <circle r="7" fill="url(#g-white)"><animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;.85;1" keyTimes="0;.62;1" calcMode="linear" path="M70 112 C 120 112 150 44 200 64 L 226 84"/></circle>`), alt: 'The white ball rolls along the line, hits the red ball and both roll on' },
    { title: 'Learn from the leave', text: 'See your score, compare with the reference and find the one thing to change.',
      art: table(`<g transform="translate(86 90)"><circle r="34" fill="none" stroke="#ffffff22" stroke-width="9"/><circle r="34" fill="none" stroke="#e3b94f" stroke-width="9" stroke-linecap="round" stroke-dasharray="214" stroke-dashoffset="214" transform="rotate(-90)" class="g-ring"/><text y="8" text-anchor="middle" font-size="22" font-weight="700" fill="#f4eedb" font-family="Georgia,serif">86</text></g>
        <g font-family="Segoe UI,system-ui,sans-serif" font-size="9" fill="#f4eedb"><text x="150" y="58">Safety</text><rect x="196" y="51" width="90" height="7" rx="3.5" fill="#ffffff22"/><rect x="196" y="51" width="80" height="7" rx="3.5" fill="#7be0a4" class="g-bar"/>
        <text x="150" y="84">Finish</text><rect x="196" y="77" width="90" height="7" rx="3.5" fill="#ffffff22"/><rect x="196" y="77" width="64" height="7" rx="3.5" fill="#7be0a4" class="g-bar"/>
        <text x="150" y="110">Route</text><rect x="196" y="103" width="90" height="7" rx="3.5" fill="#ffffff22"/><rect x="196" y="103" width="48" height="7" rx="3.5" fill="#e3b94f" class="g-bar"/></g>`), alt: 'A score ring reading 86 with three progress bars' }
  ];

  let step = 0;
  function show() {
    const s = SLIDES[step], last = step === SLIDES.length - 1;
    $('#guide-art').innerHTML = s.art.replace('__ALT__', s.alt);
    $('#guide-title').textContent = s.title; $('#guide-text').textContent = s.text;
    $('#guide-count').textContent = `Step ${step + 1} of ${SLIDES.length}`;
    $('#guide-dots').innerHTML = SLIDES.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
    $('#guide-back').hidden = step === 0;
    $('#guide-next').innerHTML = last ? `Start practising${icon('arrow-right')}` : `Next${icon('arrow-right')}`;
  }
  function open() {
    step = 0;
    ui.dialog.open(`<div class="guide"><div id="guide-art" class="guide-frame"></div>
      <p class="eyebrow" id="guide-count"></p><h2 id="guide-title"></h2><p id="guide-text" class="lede"></p>
      <div class="guide-foot"><div class="dots-nav" id="guide-dots" aria-hidden="true"></div>
        <div class="button-row"><button class="btn btn-ghost" id="guide-skip" type="button">Skip</button><button class="btn btn-ghost" id="guide-back" type="button">${icon('arrow-left')}Back</button><button class="btn btn-primary" id="guide-next" type="button" data-autofocus></button></div></div></div>`,
      { label: 'How Snooker Safety Coach works', onClose: () => ui.store.set('onboarded', true) });
    show();
    $('#guide-skip').onclick = () => ui.dialog.close();
    $('#guide-back').onclick = () => { step = Math.max(0, step - 1); show(); };
    $('#guide-next').onclick = () => {
      if (step < SLIDES.length - 1) { step++; show(); return; }
      ui.dialog.close();
      const next = Coach.courses.recommended(ui.builtIn(), id => ui.store.statusOf(id));
      if (next) ui.router.go('practice/' + encodeURIComponent(next.id));
    };
  }
  Coach.guide = { open };
})(globalThis);
