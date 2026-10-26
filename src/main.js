/* Start-up: apply settings, wire the shared chrome, open the right screen. */
(function (root) {
  'use strict';
  const Coach = root.Coach, ui = Coach.ui, { $ } = ui;

  ui.applySettings();

  const dlg = $('#dialog');
  dlg.addEventListener('close', () => { const cb = ui.dialog.onClose; ui.dialog.onClose = null; if (cb) cb(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('#dialog-close').onclick = () => dlg.close();
  $('#open-guide').onclick = () => Coach.guide.open();

  // Surface unexpected errors instead of failing silently; the learner's work stays in memory.
  root.addEventListener('error', () => ui.toast('Something unexpected happened. Your work is safe; try that again.', { tone: 'warn', ms: 6000 }));

  ui.router.start();
  if (!ui.store.get('onboarded', false) && ui.router.path().name === 'home') setTimeout(() => Coach.guide.open(), 600);
})(globalThis);
