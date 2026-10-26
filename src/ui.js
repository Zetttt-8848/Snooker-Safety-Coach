/* Shared interface plumbing: DOM helpers, icons, toasts, dialogs, settings and the screen router. */
(function (root) {
  'use strict';
  const Coach = root.Coach, P = Coach.physics;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clone = x => JSON.parse(JSON.stringify(x));
  const ui = { $, $$, esc, clamp, clone };

  // ---------- icons ----------
  ui.icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  // ---------- toasts ----------
  let toastTimer = 0;
  ui.toast = function toast(message, options = {}) {
    const region = $('#toast-region');
    if (!region) return;
    region.innerHTML = `<div class="toast toast-${options.tone || 'info'}">${options.tone === 'good' ? ui.icon('check') : options.tone === 'warn' ? ui.icon('info') : ''}<span>${esc(message)}</span></div>`;
    region.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => region.classList.remove('show'), options.ms || 4200);
  };

  // ---------- storage and settings ----------
  function pickBackend() {
    try {
      const probe = '__ssc_probe__';
      root.localStorage.setItem(probe, '1'); root.localStorage.removeItem(probe);
      return root.localStorage;
    } catch {
      const memory = new Map();
      return { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
    }
  }
  ui.store = Coach.storeFactory.createStore(pickBackend(), () => ui.toast('Saving is unavailable in this browser. You can still practise, but progress will not be kept.', { tone: 'warn', ms: 6000 }));
  ui.settings = ui.store.settings();
  ui.tableParams = () => ({ ...P.DEFAULTS, ...ui.settings.params });
  ui.reducedMotion = () => ui.settings.reduceMotion === 'reduce' || (ui.settings.reduceMotion === 'auto' && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  ui.applySettings = function () {
    document.documentElement.dataset.motion = ui.reducedMotion() ? 'reduce' : 'full';
    Coach.sound.setEnabled(ui.settings.sound);
    Coach.renderer.config.colourLabels = ui.settings.colourLabels;
  };
  ui.saveSettings = function (patch) {
    ui.settings = ui.store.saveSettings(patch);
    ui.applySettings();
    return ui.settings;
  };

  // ---------- puzzles ----------
  // Built-in lessons followed by the learner's own, always in course order.
  ui.customPuzzles = function () {
    const saved = ui.store.customPuzzles(), valid = [];
    for (const p of saved.slice(0, 50)) { try { valid.push({ ...Coach.editor.validatePuzzle(p), recording: p.recording }); } catch { /* skip a damaged entry */ } }
    return valid;
  };
  ui.builtIn = () => Coach.puzzles || [];
  ui.allPuzzles = () => Coach.courses.order(ui.builtIn(), ui.customPuzzles());
  ui.puzzle = id => ui.allPuzzles().find(p => p.id === id) || null;

  // ---------- dialog ----------
  const dialogEl = () => $('#dialog');
  ui.dialog = {
    open(html, { label = '', wide = false, onClose } = {}) {
      const dlg = dialogEl();
      $('#dialog-body').innerHTML = html;
      dlg.classList.toggle('wide', wide);
      dlg.setAttribute('aria-label', label || 'Dialog');
      ui.dialog.onClose = onClose || null;
      if (!dlg.open) dlg.showModal();
      const first = $('[data-autofocus]', dlg) || $('h2', dlg);
      if (first) { if (!first.hasAttribute('tabindex') && !/^(BUTTON|INPUT|A)$/.test(first.tagName)) first.tabIndex = -1; first.focus({ preventScroll: true }); }
      return dlg;
    },
    close() { const dlg = dialogEl(); if (dlg.open) dlg.close(); },
    confirm({ title, body, confirmLabel, cancelLabel = 'Cancel', danger = false }) {
      return new Promise(resolve => {
        let answered = false;
        const done = value => { if (answered) return; answered = true; ui.dialog.close(); resolve(value); };
        ui.dialog.open(`<div class="confirm"><h2>${esc(title)}</h2><p>${esc(body)}</p><div class="button-row"><button class="btn btn-ghost" data-cancel>${esc(cancelLabel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok data-autofocus>${esc(confirmLabel)}</button></div></div>`,
          { label: title, onClose: () => done(false) });
        $('[data-ok]', dialogEl()).onclick = () => done(true);
        $('[data-cancel]', dialogEl()).onclick = () => done(false);
      });
    }
  };

  // ---------- router ----------
  const views = new Map();
  let current = null;
  function parseHash() {
    const parts = (location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', params: parts.slice(1) };
  }
  ui.router = {
    register(view) { views.set(view.id, view); },
    go(path) { const target = '#/' + path; if (location.hash === target) ui.router.render(); else location.hash = target; },
    path() { return parseHash(); },
    render() {
      const { name, params } = parseHash();
      let view = views.get(name) || views.get('home');
      if (!views.has(name)) { history.replaceState(null, '', '#/home'); }
      if (current && current !== view) { current.leave?.(); current.el.hidden = true; }
      view.el.hidden = false;
      const previous = current;
      current = view;
      const ok = view.enter ? view.enter(params, { from: previous?.id }) : true;
      if (ok === false) { current = previous; view.el.hidden = true; if (previous) previous.el.hidden = false; ui.router.go('puzzles'); return; }
      $$('[data-nav]').forEach(link => { if (link.dataset.nav === view.nav) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
      document.title = (view.title?.() || 'Snooker Safety Coach') + ' · Snooker Safety Coach';
      if (previous !== view || params.join('/') !== view.lastParams) {
        window.scrollTo(0, 0);
        const heading = $('[data-focus]', view.el);
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      }
      view.lastParams = params.join('/');
    },
    start() { root.addEventListener('hashchange', () => ui.router.render()); ui.router.render(); }
  };

  // State shared between screens in this visit.
  ui.session = { assessment: null, capture: null, drafts: new Map() };

  Coach.ui = ui;
})(globalThis);
