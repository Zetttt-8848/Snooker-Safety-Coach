/* Tiny synthesised sound effects (no audio files, so the app stays a single offline page).
   Sound starts only after the first click or key press, as browsers require. */
(function (root) {
  'use strict';
  const Coach = root.Coach = root.Coach || {};
  let context = null, enabled = true, master = null, last = 0;

  function ensure() {
    if (!enabled) return null;
    const Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return null;
    if (!context) {
      try { context = new Ctx(); master = context.createGain(); master.gain.value = .5; master.connect(context.destination); } catch { return null; }
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }
  function noise(ctx, length) {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * length)), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    return buffer;
  }
  function tone(ctx, { type = 'sine', from, to = from, length, gain, delay = 0 }) {
    const now = ctx.currentTime + delay, osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + length);
    amp.gain.setValueAtTime(gain, now); amp.gain.exponentialRampToValueAtTime(.0001, now + length);
    osc.connect(amp).connect(master); osc.start(now); osc.stop(now + length + .02);
  }
  function burst(ctx, { length, frequency, q = 1, gain, filter = 'bandpass' }) {
    const source = ctx.createBufferSource(), band = ctx.createBiquadFilter(), amp = ctx.createGain(), now = ctx.currentTime;
    source.buffer = noise(ctx, length); band.type = filter; band.frequency.value = frequency; band.Q.value = q;
    amp.gain.setValueAtTime(gain, now); amp.gain.exponentialRampToValueAtTime(.0001, now + length);
    source.connect(band).connect(amp).connect(master); source.start(now);
  }

  const sounds = {
    ball(strength = .5) { const ctx = ensure(); if (!ctx) return; const g = .15 + .5 * Math.min(1, strength); burst(ctx, { length: .05, frequency: 3200, q: 1.4, gain: g }); tone(ctx, { from: 1500, to: 900, length: .06, gain: g * .5 }); },
    cushion(strength = .5) { const ctx = ensure(); if (!ctx) return; const g = .12 + .4 * Math.min(1, strength); burst(ctx, { length: .09, frequency: 420, q: .8, gain: g, filter: 'lowpass' }); tone(ctx, { from: 160, to: 90, length: .1, gain: g * .8 }); },
    pocket() { const ctx = ensure(); if (!ctx) return; tone(ctx, { from: 420, to: 130, length: .28, gain: .3 }); burst(ctx, { length: .2, frequency: 300, gain: .15, filter: 'lowpass' }); },
    shot() { const ctx = ensure(); if (!ctx) return; burst(ctx, { length: .04, frequency: 2400, q: 1.2, gain: .35 }); tone(ctx, { from: 700, to: 400, length: .05, gain: .25 }); },
    tick() { const ctx = ensure(); if (!ctx) return; tone(ctx, { from: 900, to: 700, length: .035, gain: .08 }); },
    success() { const ctx = ensure(); if (!ctx) return; [523.25, 659.25, 783.99].forEach((f, i) => tone(ctx, { from: f, length: .5, gain: .12, delay: i * .09 })); },
    notice() { const ctx = ensure(); if (!ctx) return; tone(ctx, { from: 440, to: 520, length: .14, gain: .1 }); }
  };

  function play(name, strength) {
    if (!enabled || !sounds[name]) return;
    const now = Date.now();
    // Many simultaneous contacts would stack into noise.
    if ((name === 'ball' || name === 'cushion') && now - last < 30) return;
    last = now;
    sounds[name](strength);
  }
  function setEnabled(value) { enabled = !!value; if (!enabled && context && context.state === 'running') context.suspend().catch(() => {}); }

  Coach.sound = { play, setEnabled, get enabled() { return enabled; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
