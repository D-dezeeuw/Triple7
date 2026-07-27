/* Triple7 — rng.js
 * Casino-grade-enough randomness for a free game:
 *  - mulberry32: fast, well-distributed 32-bit seeded PRNG (passes gjrand smallcrush).
 *  - Seeded from crypto.getRandomValues when available, so outcomes are not
 *    predictable from load time alone.
 *  - Every draw goes through one PRNG stream; the simulator (tools/simulate.js)
 *    uses the same code with fixed seeds to reproduce and verify the published EV math.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.T7 = root.T7 || {}, root.T7.rng = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0];
    }
    return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }

  // Inlined mulberry32 step (bit-identical to the mulberry32() closure above)
  // so a stream's exact position is a single uint32 an instance can expose
  // and restore — needed to persist named per-system streams across saves.
  function Rng(seed) {
    this.seed = (seed === undefined ? randomSeed() : seed) >>> 0;
    this.a = this.seed;
  }
  Rng.prototype.float = function () {
    var a = this.a;
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    this.a = a;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Exposing/restoring the raw state lets a persistent named stream (match3,
  // slots, dozer, charms — see main.js) resume its exact position across a
  // save/load instead of reseeding, so streams stay independent forever.
  Rng.prototype.getState = function () { return this.a >>> 0; };
  Rng.prototype.setState = function (a) { this.a = a >>> 0; };
  Rng.prototype.range = function (min, max) { return min + this.float() * (max - min); };
  Rng.prototype.int = function (min, maxIncl) { return min + Math.floor(this.float() * (maxIncl - min + 1)); };
  Rng.prototype.chance = function (p) { return this.float() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.float() * arr.length)]; };

  // Weighted pick over [{w: number, ...}] — the core of the slot's virtual reel
  // and the dozer's prize spawner. O(n) linear scan; n is tiny everywhere we use it.
  Rng.prototype.weighted = function (items, weightKey) {
    var key = weightKey || 'w';
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += items[i][key];
    var roll = this.float() * total;
    for (i = 0; i < items.length; i++) {
      roll -= items[i][key];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  };
  Rng.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(this.float() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  return { Rng: Rng, mulberry32: mulberry32, randomSeed: randomSeed };
});
