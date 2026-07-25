/* Triple7 — util.js
 * Shared helpers. Loads in the browser as a classic script (attaches to window.T7)
 * and in Node via module.exports so tools/simulate.js can reuse the exact game logic.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.T7 = root.T7 || {}, root.T7.util = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Easing used by tweens across all three mini-games.
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }
  function easeOutBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  }

  // Big-number formatting: 1234 -> "1.23K". Idle games live and die by this.
  var SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return (n % 1 === 0) ? String(n) : n.toFixed(1);
    var tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
    var scaled = n / Math.pow(10, tier * 3);
    return (scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(2)) + SUFFIXES[tier];
  }
  function fmtInt(n) { return fmt(Math.floor(n)); }

  // FNV-1a 32-bit hash — save-file checksum.
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  // Unicode-safe base64 (btoa chokes on non-latin1).
  function b64encode(str) {
    if (typeof btoa === 'function') {
      return btoa(unescape(encodeURIComponent(str)));
    }
    return Buffer.from(str, 'utf8').toString('base64');
  }
  function b64decode(b64) {
    if (typeof atob === 'function') {
      return decodeURIComponent(escape(atob(b64)));
    }
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  return {
    clamp: clamp, lerp: lerp,
    easeOutCubic: easeOutCubic, easeInCubic: easeInCubic,
    easeOutBack: easeOutBack, easeOutElastic: easeOutElastic,
    fmt: fmt, fmtInt: fmtInt,
    fnv1a: fnv1a, b64encode: b64encode, b64decode: b64decode,
    deepClone: deepClone
  };
});
