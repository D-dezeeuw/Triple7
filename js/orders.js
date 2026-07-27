/* Triple7 — orders.js  (Plan II Feature 33.1: "Juice-Stand Orders")
 * Three cozy request slots beside the match-3 board. No timers, no expiry,
 * no penalty — an order from last month is exactly as valid as today's.
 *
 * Determinism contract (§10.9 pattern): an order is a PURE FUNCTION of
 * (UTC day string, deck index). The deck index only ever counts up, so
 * rerolls are free *variety* (the next deterministic card), never re-rolled
 * *value*, and a clock rewind deals the identical deck. Rewards are flat
 * raw-Juice gifts; tools/simulate.js asserts steady-play order income stays
 * within the published ≤21% budget (≤7% per slot) of base match-3 Juice.
 *
 * Hand moves only: the Auto-Juicer never progresses an order (pillar 3 —
 * hands beat robots, gently). match3.js's finishMove enforces that by only
 * calling apply() for non-auto moves.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./data.js'), require('./rng.js'));
  } else {
    root.T7 = root.T7 || {};
    root.T7.orders = factory(root.T7.util, root.T7.data, root.T7.rng);
  }
})(typeof self !== 'undefined' ? self : this, function (U, D, R) {
  'use strict';

  var FRUIT_PLURAL = {
    cherry: 'cherries', lemon: 'lemons', melon: 'melons',
    berry: 'berries', orange: 'oranges', plum: 'plums'
  };

  // Deal card `idx` of `day`'s deck — pure, stable across platforms (fnv1a).
  function roll(day, idx) {
    var seed = parseInt(U.fnv1a('orders|' + day + '|' + idx), 16) >>> 0;
    var rng = new R.Rng(seed);
    var tpl = D.ORDERS.TEMPLATES[rng.int(0, D.ORDERS.TEMPLATES.length - 1)];
    var o = { day: day, idx: idx, kind: tpl.kind, n: tpl.n, reward: tpl.reward, progress: 0 };
    if (tpl.kind === 'fruit') o.fruit = rng.int(0, D.MATCH3.FRUITS.length - 1);
    return o;
  }

  // How much one resolved move advances an order of this kind.
  function progressFor(o, res) {
    switch (o.kind) {
      case 'fruit':    return (res.byFruit && res.byFruit[o.fruit]) || 0;
      case 'tiles':    return res.tiles || 0;
      case 'moves':    return 1;
      case 'specials': return res.specialsMade || 0;
      case 'cascade':  return (res.chain || 0) >= o.n ? o.n : 0;
      case 'golden':   return res.goldens || 0;
      case 'juice':    return res.juice || 0;
    }
    return 0;
  }

  function label(o) {
    switch (o.kind) {
      case 'fruit':    return 'Clear ' + o.n + ' ' + (FRUIT_PLURAL[D.MATCH3.FRUITS[o.fruit].id] || 'fruit');
      case 'tiles':    return 'Clear ' + o.n + ' fruit';
      case 'moves':    return 'Make ' + o.n + ' squeezes';
      case 'specials': return 'Craft ' + o.n + ' Bursts or Rainbows';
      case 'cascade':  return 'Reach a ×' + o.n + ' cascade';
      case 'golden':   return 'Clear ' + (o.n === 1 ? 'a Sun-Ripened fruit' : o.n + ' Sun-Ripened fruit');
      case 'juice':    return 'Squeeze ' + o.n + ' Juice';
    }
    return '?';
  }

  // Fill empty slots from the deck (fresh saves, and after completions).
  function ensure(game) {
    var os = game.s.orders;
    var day = game.utcDayStr();
    while (os.slots.length < D.ORDERS.SLOTS) os.slots.push(roll(day, os.idx++));
  }

  // Free reroll: swap a slot for the deck's next card. Same-value variety.
  function reroll(game, slotIdx) {
    var os = game.s.orders;
    if (slotIdx < 0 || slotIdx >= os.slots.length) return null;
    os.slots[slotIdx] = roll(game.utcDayStr(), os.idx++);
    game.emit('orders');
    return os.slots[slotIdx];
  }

  // Advance every slot with one hand-move's result; pay & replace completed
  // orders. Returns the completed orders (also emitted as 'orderDone' each).
  function apply(game, res) {
    var os = game.s.orders;
    var done = [];
    for (var i = 0; i < os.slots.length; i++) {
      var o = os.slots[i];
      o.progress += progressFor(o, res);
      if (o.progress >= o.n) {
        game.gain('juice', o.reward, true);   // flat gift, like the Daily Squeeze
        game.s.stats.ordersDone++;
        done.push(o);
        os.slots[i] = roll(game.utcDayStr(), os.idx++);
      }
    }
    if (done.length) {
      game.checkAchievements();
      for (var d = 0; d < done.length; d++) game.emit('orderDone', done[d]);
      game.emit('orders');
    }
    return done;
  }

  return { roll: roll, progressFor: progressFor, label: label,
           ensure: ensure, reroll: reroll, apply: apply };
});
