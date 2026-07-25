/* Triple7 — audio.js
 * Zero-asset WebAudio synth: every sound is a tiny oscillator envelope.
 * Keeps the repo asset-free and GH-Pages-instant.
 */
(function () {
  'use strict';
  var ctx = null, master = null, enabled = true;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, type, delay, vol, slide) {
    if (!enabled || !ensure()) return;
    var t0 = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.8, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, delay, vol) {
    if (!enabled || !ensure()) return;
    var t0 = ctx.currentTime + (delay || 0);
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = vol || 0.25;
    src.connect(g); g.connect(master);
    src.start(t0);
  }

  var SFX = {
    select:   function () { tone(660, 0.06, 'sine', 0, 0.3); },
    swap:     function () { tone(440, 0.08, 'sine', 0, 0.35, 1.4); },
    bad:      function () { tone(180, 0.15, 'square', 0, 0.2, 0.7); },
    match:    function () { tone(523, 0.1, 'sine', 0, 0.5); tone(659, 0.12, 'sine', 0.05, 0.5); },
    cascade:  function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.12, 'sine', i * 0.06, 0.5); }); },
    spin:     function () { tone(220, 0.25, 'sawtooth', 0, 0.12, 2.2); },
    reelstop: function () { tone(330, 0.07, 'square', 0, 0.25); noise(0.04, 0, 0.12); },
    win:      function () { [659, 784, 1047].forEach(function (f, i) { tone(f, 0.14, 'triangle', i * 0.07, 0.5); }); },
    nowin:    function () { tone(240, 0.1, 'sine', 0, 0.15, 0.85); },
    jackpot:  function () {
      [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(f, 0.18, 'triangle', i * 0.09, 0.6); });
      noise(0.5, 0.7, 0.2);
    },
    drop:     function () { tone(500, 0.08, 'sine', 0, 0.4, 0.6); },
    coinfall: function () { tone(880, 0.09, 'triangle', 0, 0.5); tone(1175, 0.12, 'triangle', 0.05, 0.4); },
    gutter:   function () { tone(200, 0.12, 'sine', 0, 0.12, 0.6); },
    special:  function () { [784, 988, 1319].forEach(function (f, i) { tone(f, 0.15, 'triangle', i * 0.07, 0.55); }); },
    sparkle:  function () { tone(1568, 0.1, 'sine', 0, 0.25); },
    buy:      function () { tone(587, 0.09, 'triangle', 0, 0.4); tone(880, 0.11, 'triangle', 0.06, 0.4); },
    achieve:  function () { [659, 880, 1319].forEach(function (f, i) { tone(f, 0.16, 'triangle', i * 0.08, 0.55); }); }
  };

  window.T7 = window.T7 || {};
  window.T7.audio = {
    play: function (name) { if (SFX[name]) SFX[name](); },
    setEnabled: function (on) { enabled = !!on; },
    unlock: ensure
  };
})();
