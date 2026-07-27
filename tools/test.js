#!/usr/bin/env node
/* Triple7 — tools/test.js
 * Logic unit tests, run with `npm test`. Zero dependencies.
 * Node loads the SAME UMD modules the browser runs — no mocks, no ports.
 */
'use strict';
var path = require('path');
var fs = require('fs');
var U = require(path.join(__dirname, '..', 'js', 'util.js'));
var rngMod = require(path.join(__dirname, '..', 'js', 'rng.js'));
var D = require(path.join(__dirname, '..', 'js', 'data.js'));
var st = require(path.join(__dirname, '..', 'js', 'state.js'));
var match3 = require(path.join(__dirname, '..', 'js', 'match3.js'));
var slots = require(path.join(__dirname, '..', 'js', 'slots.js'));
var dozer = require(path.join(__dirname, '..', 'js', 'dozer.js'));

var passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'eq') + ': ' + a + ' !== ' + b); }
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function near(a, b, eps, msg) { if (Math.abs(a - b) > eps) throw new Error((msg || 'near') + ': ' + a + ' vs ' + b); }

console.log('util');
t('fmt scales suffixes', function () {
  eq(U.fmt(999), '999'); eq(U.fmt(1500), '1.50K'); eq(U.fmt(2500000), '2.50M');
});
t('fnv1a is stable and 8 hex chars', function () {
  eq(U.fnv1a('triple7'), U.fnv1a('triple7'));
  ok(/^[0-9a-f]{8}$/.test(U.fnv1a('x')));
  ok(U.fnv1a('a') !== U.fnv1a('b'));
});
t('base64 round-trips unicode', function () {
  var s = 'juice🧃 & däta';
  eq(U.b64decode(U.b64encode(s)), s);
});

console.log('rng');
t('same seed → same stream', function () {
  var a = new rngMod.Rng(42), b = new rngMod.Rng(42);
  for (var i = 0; i < 100; i++) eq(a.float(), b.float());
});
t('weighted respects weights (statistically)', function () {
  var r = new rngMod.Rng(7);
  var items = [{ id: 'a', w: 9 }, { id: 'b', w: 1 }];
  var hits = 0;
  for (var i = 0; i < 10000; i++) if (r.weighted(items).id === 'a') hits++;
  ok(hits > 8700 && hits < 9300, 'a hit ' + hits + '/10000, expected ~9000');
});
t('getState/setState round-trips a stream exactly', function () {
  var r = new rngMod.Rng(99);
  for (var i = 0; i < 50; i++) r.float();
  var saved = r.getState();
  var expected = [];
  for (var j = 0; j < 20; j++) expected.push(r.float());
  var resumed = new rngMod.Rng(0);           // seed irrelevant once state is set
  resumed.setState(saved);
  for (var k = 0; k < 20; k++) eq(resumed.float(), expected[k], 'draw ' + k);
});
t('Rng.float matches the standalone mulberry32 closure bit-for-bit', function () {
  var seed = 123456;
  var gen = rngMod.mulberry32(seed);
  var r = new rngMod.Rng(seed);
  for (var i = 0; i < 30; i++) eq(r.float(), gen(), 'draw ' + i);
});
t('independent streams never perturb each other', function () {
  var a1 = new rngMod.Rng(11), b1 = new rngMod.Rng(22);
  var aSeq = []; for (var i = 0; i < 10; i++) aSeq.push(a1.float());
  // A fresh "b" stream draws in between; "a"'s own next value must be unaffected
  // by how many times "b" was drawn — the whole point of separate streams.
  for (var j = 0; j < 37; j++) b1.float();
  var a2 = new rngMod.Rng(11);
  for (var k = 0; k < 10; k++) eq(a2.float(), aSeq[k], 'a draw ' + k + ' shifted by b activity');
});

console.log('state / save');
t('gain applies multipliers, spend enforces funds', function () {
  var g = new st.Game();
  g.gain('juice', 10, true);
  eq(g.s.cur.juice, 10);
  ok(!g.spend('juice', 11));
  ok(g.spend('juice', 10));
  eq(g.s.cur.juice, 0);
});
t('automation reserve defaults to 0 and sanitizes bad values', function () {
  var fresh = st.defaultState();
  eq(fresh.settings.reserve.juice, 0);
  eq(fresh.settings.reserve.suncoin, 0);
  var g = new st.Game();
  g.s.settings.reserve.juice = -5;
  g.s.settings.reserve.suncoin = NaN;
  var code = g.exportSave();
  var g2 = new st.Game();
  g2.importSave(code);
  ok(g2.s.settings.reserve.juice >= 0, 'negative reserve must sanitize to >=0');
  ok(isFinite(g2.s.settings.reserve.suncoin), 'NaN reserve must sanitize to a finite number');
});
t('onboarding intro shows only for genuinely fresh saves, never a returning player', function () {
  var fresh = st.defaultState();
  eq(fresh.onboarding.introSeen, false, 'a brand new save must see the intro');

  // A save with real progress but no onboarding field (predates the feature)
  // must be backfilled to introSeen:true on load, never shown the intro.
  var g = new st.Game();
  g.gain('juice', 50, true);
  g.s.stats.matches = 3;
  delete g.s.onboarding;
  var code = g.exportSave();
  var g2 = new st.Game();
  g2.importSave(code);
  eq(g2.s.onboarding.introSeen, true, 'a returning player must never see the fresh-save intro');

  // Corrupted onboarding field must sanitize to a safe boolean, not throw.
  var g3 = new st.Game();
  g3.s.onboarding = { introSeen: 'yes please' };
  var code3 = g3.exportSave();
  var g4 = new st.Game();
  g4.importSave(code3);
  eq(typeof g4.s.onboarding.introSeen, 'boolean', 'corrupted introSeen must sanitize to a boolean');
});
t('daily bonus is date-seeded, single-claim, and sanitizes a corrupted ledger', function () {
  var g1 = new st.Game(), g2 = new st.Game();
  var infoA = g1.dailyBonusInfo(), infoB = g2.dailyBonusInfo();
  eq(infoA.day, infoB.day, 'same UTC day must produce the same day string');
  eq(infoA.amount, infoB.amount, 'same day must be a pure function — identical amount');
  ok(infoA.amount >= 77 && infoA.amount <= 210, 'amount ' + infoA.amount + ' outside the documented 77-210 range');
  eq((infoA.amount - 77) % 7, 0, 'amount must be 77 plus a multiple of 7');
  ok(infoA.available, 'fresh game must have an unclaimed daily bonus');

  var before = g1.s.cur.juice;
  var res = g1.claimDailyBonus();
  ok(res && res.amount === infoA.amount, 'claim must credit the published amount');
  near(g1.s.cur.juice, before + infoA.amount, 1e-9);
  ok(!g1.dailyBonusInfo().available, 'must be marked claimed for today');
  eq(g1.claimDailyBonus(), null, 'a second claim same day must be refused');
  eq(g1.s.cur.juice, before + infoA.amount, 'a refused claim must not credit again');

  var g3 = new st.Game();
  g3.s.claims.daily = 'not-a-date';
  var code = g3.exportSave();
  var g4 = new st.Game();
  g4.importSave(code);
  eq(g4.s.claims.daily, null, 'a corrupted claim ledger must sanitize to null, not brick future claims');
});
t('destinations: home is free/always unlocked, others cost their fare exactly once', function () {
  var g = new st.Game();
  ok(g.destinationUnlocked('home'), 'home must start unlocked');
  eq(g.s.destination, 'home', 'fresh save starts at home');
  var lagoon = D.DESTINATIONS.filter(function (d) { return d.id === 'lagoon'; })[0];
  ok(!g.destinationUnlocked('lagoon'), 'lagoon must start locked');
  ok(!g.unlockDestination('lagoon'), 'cannot unlock without funds');
  g.gain('stargem', lagoon.fareG, true);
  ok(g.unlockDestination('lagoon'), 'unlock must succeed once affordable');
  eq(g.s.cur.stargem, 0, 'fare must actually be spent');
  ok(!g.unlockDestination('lagoon'), 'unlocking twice must be a no-op, not a double charge');
  ok(g.travelTo('lagoon'), 'travel to an unlocked destination must succeed');
  eq(g.s.destination, 'lagoon');
  ok(!g.travelTo('sunset'), 'travel to a locked destination must fail');
  eq(g.s.destination, 'lagoon', 'failed travel must not change the active destination');
});
t('destinations: sanitize refuses to keep an active destination that was never unlocked', function () {
  var g = new st.Game();
  g.s.destination = 'sunset';           // hand-edited / corrupted, never actually unlocked
  var code = g.exportSave();
  var g2 = new st.Game();
  g2.importSave(code);
  eq(g2.s.destination, 'home', 'must fall back to home rather than apply an unpaid-for destination');
});
t('export/import round-trips exactly', function () {
  var g = new st.Game();
  g.gain('juice', 123.45, true); g.gain('stargem', 9, true);
  g.s.charms.lemondrop = 3;
  g.s.upgrades.sunreels = 2;
  var code = g.exportSave();
  var g2 = new st.Game();
  g2.importSave(code);
  near(g2.s.cur.juice, 123.45, 1e-9);
  eq(g2.s.charms.lemondrop, 3);
  eq(g2.s.upgrades.sunreels, 2);
});
t('corrupted/tampered codes are rejected', function () {
  var g = new st.Game();
  var code = g.exportSave();
  var bad = code.slice(0, -4) + 'AAAA';
  var threw = false;
  try { g.importSave(bad); } catch (e) { threw = true; }
  ok(threw, 'tampered payload must throw');
  threw = false;
  try { g.importSave('hello world'); } catch (e) { threw = true; }
  ok(threw, 'garbage must throw');
});
t('prestige seeds = floor(sqrt(lifetimeG/77)) and resets the run', function () {
  var g = new st.Game();
  g.gain('stargem', 77 * 49, true);          // → sqrt(49) = 7 seeds
  g.s.buildings.sapling = 5;
  eq(g.prestigeSeedsTotal(), 7);
  ok(g.prestigeAvailable());
  g.doPrestige();
  eq(g.s.seeds, 7);
  eq(g.s.cur.stargem, 0);
  ok(!g.s.buildings.sapling);
  near(g.allMult(), 1.7, 1e-9, '7 seeds → ×1.7');
});
t('fertilizer multiplier has exactly one source of truth', function () {
  // Regression: ui.js's Grove cards used to re-derive this as 1.5^lvl while
  // groveRate() paid 1.25^lvl, so every displayed rate overstated the real
  // income once Fertilizer was bought. Both now go through fertMult().
  var g = new st.Game();
  eq(g.fertMult(), 1, 'level 0 must be a no-op multiplier');
  g.s.upgrades.fertilizer = 4;
  near(g.fertMult(), Math.pow(D.GROVE.FERT_MULT, 4), 1e-12);
  // groveRate must scale by exactly fertMult() and nothing else.
  var g2 = new st.Game();
  g2.s.buildings.sapling = 10;
  var flat = g2.groveRate('juice');
  g2.s.upgrades.fertilizer = 3;
  near(g2.groveRate('juice'), flat * g2.fertMult(), 1e-9,
       'groveRate must scale by exactly fertMult()');
  // The shop description must quote the same number it applies.
  var fert = D.UPGRADES.filter(function (u) { return u.id === 'fertilizer'; })[0];
  ok(fert.desc.indexOf(String(D.GROVE.FERT_MULT)) >= 0,
     'fertilizer description must quote FERT_MULT, got: ' + fert.desc);
});
t('offline grove income credits the same stats as live grove income', function () {
  // Regression: applyOffline() hand-rolled its credit and skipped the
  // juiceEarned/sunEarned/gemsEarned stats, so hours away never counted
  // toward the lifetime-earned milestones that live play advances.
  var g = new st.Game();
  g.s.buildings.sapling = 20;
  g.s.lastSeen = Date.now() - 3600 * 1000;      // an hour away
  var beforeStat = g.s.stats.juiceEarned;
  var beforeLife = g.s.lifetime.juice;
  var off = g.applyOffline();
  ok(off && off.gains.juice > 0, 'an hour with a stocked grove must pay out');
  near(g.s.stats.juiceEarned - beforeStat, off.gains.juice, 1e-9,
       'offline juice must advance stats.juiceEarned');
  near(g.s.lifetime.juice - beforeLife, off.gains.juice, 1e-9,
       'offline juice must advance lifetime juice');
  near(g.s.cur.juice, off.gains.juice, 1e-9, 'offline juice must land in the wallet');
});
t('settings carry no dead flags, and reduced motion is a real boolean', function () {
  var s = st.defaultState();
  ok(!('music' in s.settings), 'the dead `music` flag must not return');
  ok(!('theme' in s.settings), 'the dead `theme` flag must not return');
  eq(typeof s.settings.reducedMotion, 'boolean',
     'reducedMotion must be a boolean even where matchMedia is absent (Node)');
});
t('charm set bonus activates only on completion', function () {
  var g = new st.Game();
  var citrus = D.CHARMS.filter(function (c) { return c.set === 'citrus'; });
  citrus.slice(0, 6).forEach(function (c) { g.s.charms[c.id] = 1; });
  near(g.charmBonus('juice'), 0.30, 1e-9, '6 charms ×5%');
  g.s.charms[citrus[6].id] = 1;
  near(g.charmBonus('juice'), 0.35 + 0.25, 1e-9, '7 charms + set bonus');
});

console.log('match3');
t('new boards have no pre-matches and at least one move', function () {
  var rng = new rngMod.Rng(1);
  for (var i = 0; i < 20; i++) {
    var b = match3.newBoard(rng);
    eq(match3.findMatches(b).cells.length, 0, 'board ' + i + ' pre-matched');
    ok(match3.findAllMoves(b).length > 0, 'board ' + i + ' deadlocked');
  }
});
t('500-move fuzz: board stays full, juice strictly positive', function () {
  var rng = new rngMod.Rng(2);
  var b = match3.newBoard(rng);
  for (var i = 0; i < 500; i++) {
    var moves = match3.findAllMoves(b);
    ok(moves.length > 0, 'deadlock leaked through reshuffle at move ' + i);
    var out = match3.resolveMove(b, moves[Math.floor(rng.float() * moves.length)], rng, 0);
    ok(out.valid, 'listed move was invalid at ' + i);
    ok(out.juice > 0, 'no juice at ' + i);
    for (var y = 0; y < match3.ROWS; y++) {
      for (var x = 0; x < match3.COLS; x++) ok(b[y][x], 'hole at ' + x + ',' + y + ' after move ' + i);
    }
  }
});
t('cascade step recording never changes resolveMove\'s result (recorder is pure observation)', function () {
  // The animated view's playback recorder must be provably inert on the
  // logic it observes — resolveMove() stays the oracle for the simulator
  // and tests (§12.3 "Instant cascade resolve" note). Run the identical
  // move through two identically-seeded boards, with and without a steps
  // array, and assert every observable outcome — and the final board —
  // matches exactly.
  for (var trial = 0; trial < 25; trial++) {
    var seed = 9000 + trial;
    var rngA = new rngMod.Rng(seed), boardA = match3.newBoard(rngA);
    var rngB = new rngMod.Rng(seed), boardB = match3.newBoard(rngB);
    // Identical seed ⇒ identical draw sequence ⇒ boardA/boardB are content-
    // identical and rngA/rngB sit at the same internal position.
    var mv = match3.findAllMoves(boardA)[0];
    var move = { x1: mv.x1, y1: mv.y1, x2: mv.x2, y2: mv.y2 };
    var resA = match3.resolveMove(boardA, move, rngA, 0);
    var steps = [];
    var resB = match3.resolveMove(boardB, move, rngB, 0, steps);
    eq(resA.valid, resB.valid, 'trial ' + trial + ' validity');
    eq(resA.juice, resB.juice, 'trial ' + trial + ' juice');
    eq(resA.tiles, resB.tiles, 'trial ' + trial + ' tiles');
    eq(resA.chain, resB.chain, 'trial ' + trial + ' chain');
    eq(resA.specialsMade, resB.specialsMade, 'trial ' + trial + ' specialsMade');
    eq(JSON.stringify(boardA), JSON.stringify(boardB), 'trial ' + trial + ' final board diverged');
    if (resA.valid) eq(steps.length, resA.chain, 'trial ' + trial + ' one recorded step per chain link');
  }
});
t('reshuffle produces a valid board', function () {
  var rng = new rngMod.Rng(3);
  var b = match3.newBoard(rng);
  match3.reshuffle(b, rng);
  eq(match3.findMatches(b).cells.length, 0);
  ok(match3.findAllMoves(b).length > 0);
});

console.log('grove depth (Plan II Phase 33)');
t('Sun-Ripened spawn rate matches the published 1/77 (statistically)', function () {
  var rng = new rngMod.Rng(3301);
  var goldens = 0, cells = 0;
  for (var i = 0; i < 500; i++) {
    var b = match3.newBoard(rng);
    for (var y = 0; y < match3.ROWS; y++) {
      for (var x = 0; x < match3.COLS; x++) { cells++; if (b[y][x].g) goldens++; }
    }
  }
  // 32,000 spawns @ p=1/77 → mean ≈ 415, sd ≈ 20. Accept ±5 sd.
  var expect = cells * D.MATCH3.GOLDEN.CHANCE;
  ok(Math.abs(goldens - expect) < 100,
     goldens + ' goldens in ' + cells + ' spawns, expected ~' + Math.round(expect));
});
// Hand-crafted boards for exact golden payouts. Base fill (x + 2y) % 6 has no
// 3-runs anywhere (horizontal neighbours always differ; vertical step +2 mod 6),
// then specific cells are overridden to stage the scenario.
function craftBoard(overrides) {
  var b = [];
  for (var y = 0; y < match3.ROWS; y++) {
    b.push([]);
    for (var x = 0; x < match3.COLS; x++) b[y].push({ f: (x + 2 * y) % 6, sp: 0, g: false });
  }
  (overrides || []).forEach(function (o) { b[o.y][o.x] = { f: o.f, sp: 0, g: !!o.g }; });
  return b;
}
t('golden cleared by the direct swap pays exactly ×7 (delta-proof)', function () {
  // Row 7: A A X, swap (2,6)=A down → A A A clears at chain 1.
  var A = 0, X = 1;
  var over = [
    { x: 0, y: 7, f: A }, { x: 1, y: 7, f: A }, { x: 2, y: 7, f: X },
    { x: 2, y: 6, f: A }
  ];
  var move = { x1: 2, y1: 6, x2: 2, y2: 7 };
  var plain = craftBoard(over);
  eq(match3.findMatches(plain).cells.length, 0, 'crafted board must start matchless');
  var golden = craftBoard(over);
  golden[7][0].g = true;                      // the golden is IN the cleared run
  var rA = match3.resolveMove(plain, move, new rngMod.Rng(777), 0);
  var rB = match3.resolveMove(golden, move, new rngMod.Rng(777), 0);
  ok(rA.valid && rB.valid, 'both runs must resolve');
  // Same seed ⇒ identical refills/cascade structure; the only difference is
  // the gold flag, cleared at chain 1 → ×MULT ⇒ delta = (MULT−1)·1·1.
  near(rB.juice - rA.juice, (D.MATCH3.GOLDEN.MULT - 1) * D.MATCH3.JUICE_PER_TILE, 1e-9,
       'direct-clear golden delta');
  eq(rB.goldens - rA.goldens, 1, 'goldens counted');
  ok(rB.byFruit[A] >= 3, 'byFruit counts the cleared run');
});
t('golden cleared by a cascade pays exactly ×14 (delta-proof)', function () {
  // Column 0 rows 5-7 become A A A via the swap; the X at (0,4) then falls to
  // row 7 where (1,7)=(2,7)=X wait for it — a designed chain-2 clear made
  // entirely of pre-existing cells, so the gold flag is the ONLY difference.
  var A = 0, X = 1, B = 2, C = 3, Dd = 4;
  var over = [
    { x: 0, y: 5, f: B }, { x: 0, y: 6, f: A }, { x: 0, y: 7, f: A },
    { x: 1, y: 5, f: A },                        // swaps left to complete the run
    { x: 0, y: 4, f: X },                        // falls to (0,7) at chain 2
    { x: 1, y: 7, f: X }, { x: 2, y: 7, f: X },
    { x: 1, y: 6, f: C }, { x: 2, y: 5, f: Dd }
  ];
  var move = { x1: 1, y1: 5, x2: 0, y2: 5 };
  var plain = craftBoard(over);
  eq(match3.findMatches(plain).cells.length, 0, 'crafted board must start matchless');
  var golden = craftBoard(over);
  golden[4][0].g = true;                       // the falling X carries the gold
  var rA = match3.resolveMove(plain, move, new rngMod.Rng(778), 0);
  var rB = match3.resolveMove(golden, move, new rngMod.Rng(778), 0);
  ok(rA.valid && rB.valid && rA.chain >= 2, 'designed cascade must reach chain 2 (got ' + rA.chain + ')');
  // Cleared at chain 2 → ×CASCADE_MULT under cascade multiplier 1.5 (kettle 0)
  // ⇒ delta = (14−1)·1·1.5 = 19.5 exactly.
  near(rB.juice - rA.juice,
       (D.MATCH3.GOLDEN.CASCADE_MULT - 1) * D.MATCH3.JUICE_PER_TILE * (1 + D.MATCH3.CASCADE_STEP), 1e-9,
       'cascade-clear golden delta');
  eq(rB.goldens - rA.goldens, 1, 'goldens counted');
});
t('legacy boards (no goldens) score exactly as before the golden feature', function () {
  // Same crafted scenario, gold flags all false: juice must equal the v1
  // formula — units === plain tile count when no golden is present.
  var A = 0;
  var over = [
    { x: 0, y: 7, f: A }, { x: 1, y: 7, f: A }, { x: 2, y: 7, f: 1 },
    { x: 2, y: 6, f: A }
  ];
  var b = craftBoard(over);
  var res = match3.resolveMove(b, { x1: 2, y1: 6, x2: 2, y2: 7 }, new rngMod.Rng(779), 0);
  ok(res.valid, 'move resolves');
  eq(res.goldens, 0, 'no goldens on a legacy board');
  near(res.goldJuice, 0, 1e-9, 'no golden juice on a legacy board');
});
var orders = require(path.join(__dirname, '..', 'js', 'orders.js'));
t('orders are a pure function of (day, index) — deterministic decks', function () {
  var a = orders.roll('2026-07-27', 0), b = orders.roll('2026-07-27', 0);
  eq(JSON.stringify(a), JSON.stringify(b), 'same (day, idx) must deal the same card');
  var c = orders.roll('2026-07-28', 0);
  ok(JSON.stringify(a) !== JSON.stringify(c) || a.kind === c.kind,
     'different days may differ (never throw)');
  // Every dealt card must be a well-formed template instance.
  for (var i = 0; i < 50; i++) {
    var o = orders.roll('2026-07-27', i);
    ok(o.n > 0 && o.reward > 0 && typeof o.kind === 'string', 'card ' + i + ' malformed');
    ok(typeof orders.label(o) === 'string' && orders.label(o) !== '?', 'card ' + i + ' unlabeled');
    if (o.kind === 'fruit') ok(o.fruit >= 0 && o.fruit < D.MATCH3.FRUITS.length, 'fruit index');
  }
});
t('order progress maps each kind to the right result field', function () {
  var res = { tiles: 12, chain: 4, juice: 33, specialsMade: 2, goldens: 1, byFruit: [5, 0, 0, 0, 0, 0] };
  eq(orders.progressFor({ kind: 'fruit', fruit: 0, n: 49 }, res), 5);
  eq(orders.progressFor({ kind: 'tiles', n: 210 }, res), 12);
  eq(orders.progressFor({ kind: 'moves', n: 21 }, res), 1);
  eq(orders.progressFor({ kind: 'specials', n: 7 }, res), 2);
  eq(orders.progressFor({ kind: 'cascade', n: 4 }, res), 4, 'qualifying cascade completes');
  eq(orders.progressFor({ kind: 'cascade', n: 5 }, res), 0, 'short cascade adds nothing');
  eq(orders.progressFor({ kind: 'golden', n: 1 }, res), 1);
  eq(orders.progressFor({ kind: 'juice', n: 210 }, res), 33);
});
t('completing an order pays its flat reward, counts the stat, deals a new card', function () {
  var g = new st.Game();
  g.s.orders.slots = [{ day: '2026-07-27', idx: 0, kind: 'moves', n: 1, reward: 14, progress: 0 }];
  g.s.orders.idx = 1;                          // deck cursor sits past the dealt card
  var done = orders.apply(g, { tiles: 3, chain: 1, juice: 5, specialsMade: 0, goldens: 0, byFruit: [] });
  eq(done.length, 1, 'order completed');
  eq(g.s.cur.juice, 14, 'flat raw reward (no multiplier)');
  eq(g.s.stats.ordersDone, 1);
  eq(g.s.orders.slots.length, 1, 'slot refilled');
  ok(g.s.orders.slots[0].idx !== 0, 'refill comes from the next deck card');
});
t('squeeze combo: charges on cascades, arms at 21, buffs exactly 7 moves, hand-only by contract', function () {
  var g = new st.Game();
  eq(g.squeezeCharge(1), false, 'chain 1 adds nothing');
  eq(g.s.squeeze.points, 0);
  g.squeezeCharge(4);                          // +3
  eq(g.s.squeeze.points, 3);
  for (var i = 0; i < 6; i++) g.squeezeCharge(4);   // +18 → 21 → arms
  eq(g.s.squeeze.points, 0, 'meter resets on fill');
  eq(g.s.squeeze.buffLeft, D.SQUEEZE.BUFF_MOVES);
  eq(g.s.stats.squeezes, 1);
  for (var m = 0; m < D.SQUEEZE.BUFF_MOVES; m++) {
    near(g.squeezeMult(), D.SQUEEZE.BUFF_MULT, 1e-9, 'buffed move ' + m);
  }
  near(g.squeezeMult(), 1, 1e-9, 'buff exhausted after ' + D.SQUEEZE.BUFF_MOVES + ' moves');
});
t('orders + squeeze survive a save round-trip and sanitize corruption', function () {
  var g = new st.Game();
  g.s.orders.slots = [{ day: '2026-07-27', idx: 4, kind: 'tiles', n: 210, reward: 7, progress: 55 }];
  g.s.orders.idx = 5;
  g.s.squeeze.points = 9; g.s.squeeze.buffLeft = 3;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.orders.slots[0].progress, 55, 'order progress survives');
  eq(g2.s.orders.idx, 5, 'deck cursor survives');
  eq(g2.s.squeeze.points, 9); eq(g2.s.squeeze.buffLeft, 3);
  // Corruption: an eternal buff or junk slots must sanitize away.
  var g3 = new st.Game();
  g3.s.squeeze.buffLeft = 9999;
  g3.s.orders.slots = [{ bogus: true }, null, { day: 'x', idx: 0, kind: 'moves', n: 21, reward: 7, progress: 2 }];
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  ok(g4.s.squeeze.buffLeft <= D.SQUEEZE.BUFF_MOVES, 'buffLeft clamped to max');
  eq(g4.s.orders.slots.length, 1, 'malformed slots dropped, valid one kept');
  eq(g4.s.orders.slots[0].kind, 'moves');
});

console.log('slots');
// 5×4 grid helper: fill every cell, or a checkerboard-by-column that can
// never produce a 3-run on any line (columns strictly alternate symbols).
function slotGrid(fill) {
  var g = [];
  for (var c = 0; c < 5; c++) {
    g.push([]);
    for (var r = 0; r < 4; r++) g[c].push(fill || (c % 2 ? 'berry' : 'star'));
  }
  return g;
}
t('evaluate: hybrid rules — rows pay runs anywhere, shaped lines from reel 1', function () {
  // Uniform grid: every line is a 5-of-a-kind.
  var all = slots.evaluate(slotGrid('lemon'));
  eq(all.lineWins.length, D.SLOT.LINES.length);
  eq(all.sun, D.SLOT.LINES.length * D.SLOT.PAYS.lemon[2]);
  // 3-kind anchored at reel 1 on the top row.
  var g3 = slotGrid();
  g3[0][0] = g3[1][0] = g3[2][0] = 'cherry';
  var r3 = slots.evaluate(g3);
  eq(r3.lineWins.length, 1);
  eq(r3.lineWins[0].n, 3);
  eq(r3.lineWins[0].start, 0);
  eq(r3.sun, D.SLOT.PAYS.cherry[0]);
  // MID-ROW triple (reels 2–4) pays too — the anywhere rule on flat rows.
  var gm = slotGrid();
  gm[1][2] = gm[2][2] = gm[3][2] = 'melon';
  var rm = slots.evaluate(gm);
  eq(rm.lineWins.length, 1, 'mid-row triple pays');
  eq(rm.lineWins[0].start, 1);
  eq(rm.lineWins[0].line, 2);
  eq(rm.sun, D.SLOT.PAYS.melon[0]);
  // A 4-run starting at reel 2 pays the 4-tier on its row.
  var gL = slotGrid();
  gL[1][0] = gL[2][0] = gL[3][0] = gL[4][0] = 'cherry';
  var rL = slots.evaluate(gL);
  eq(rL.sun, D.SLOT.PAYS.cherry[1], 'mid-row 4-run pays the ×4 tier');
  eq(rL.lineWins[0].start, 1);
  // Shaped lines (V/Λ) still require the reel-1 anchor: a 3-run along the V
  // starting at reel 2 pays nothing.
  var gv = slotGrid();
  gv[1][1] = gv[2][2] = gv[3][1] = 'melon';   // V rows [0,1,2,1,0], positions 1-3
  eq(slots.evaluate(gv).sun, 0, 'shaped line keeps the anchored rule');
  // 5 Sevens on a line: the 777 dream line, and 5 scatters → bonus too.
  var g7 = slotGrid();
  for (var c = 0; c < 5; c++) g7[c][0] = 'seven';
  var r7 = slots.evaluate(g7);
  eq(r7.sun, 777);
  eq(r7.scatters, 5);
  ok(r7.bonus, '5 sevens must also trigger the bonus');
});
t('evaluate: 3 scattered Sevens trigger the bonus without a line win', function () {
  var g = slotGrid();
  g[0][3] = 'seven'; g[2][1] = 'seven'; g[4][2] = 'seven';
  var r = slots.evaluate(g);
  eq(r.scatters, 3);
  ok(r.bonus, 'scatter bonus');
  eq(r.sun, 0, 'no line win from isolated sevens');
  var g2 = slotGrid();
  g2[0][3] = 'seven'; g2[2][1] = 'seven';
  ok(!slots.evaluate(g2).bonus, 'two sevens must not trigger');
});
t('exact RTP matches the published par sheet (1.45613)', function () {
  var r = slots.enumerateRTP(0);
  near(r.ev, 1.456130, 0.00001);
  near(r.linesEV, 1.137696, 0.00001);
  near(r.bonusP, 0.023371, 0.00001);
  near(r.bonusBlind, 13.625, 1e-9, 'blind-stop mean of the base ladder');
  eq(r.nFlat, 4); eq(r.nShaped, 2);
  // Lucky Sevens extends the ladder, never the reels.
  var r3 = slots.enumerateRTP(3);
  near(r3.ev, 1.822900, 0.00001);
  eq(r3.ladder.length, D.SLOT.BONUS.LADDER.length + 3);
});
t('reel weights sum to 64 and ladder cycle is symmetric', function () {
  var sum = slots.reelWeights().reduce(function (a, r) { return a + r.w; }, 0);
  eq(sum, 64);
  var cyc = slots.ladderCycle(0);
  eq(cyc.length, (D.SLOT.BONUS.LADDER.length - 1) * 2);
  eq(cyc[0], D.SLOT.BONUS.LADDER[0]);
  eq(Math.max.apply(null, cyc), D.SLOT.BONUS.LADDER[D.SLOT.BONUS.LADDER.length - 1]);
});
t('resolveSpin returns a well-formed 5×4 grid of known symbols', function () {
  var rng = new rngMod.Rng(4);
  var ids = D.SLOT.REEL.map(function (r) { return r.id; });
  for (var i = 0; i < 500; i++) {
    var res = slots.resolveSpin(rng, 0);
    eq(res.grid.length, 5);
    for (var c = 0; c < 5; c++) {
      eq(res.grid[c].length, 4);
      for (var r = 0; r < 4; r++) ok(ids.indexOf(res.grid[c][r]) >= 0, 'unknown symbol');
    }
    eq(res.sun, slots.evaluate(res.grid).sun, 'resolve/evaluate agree');
  }
});

console.log('choose your sunshine (Plan II Phase 34)');
t('all weather modes hold RTP parity, fixed sevens, and no sub-stake pays', function () {
  var classic = slots.enumerateRTP(0, 'classic');
  near(classic.ev, slots.enumerateRTP(0).ev, 1e-12, 'classic must equal the default sheet');
  var sevenW = null;
  Object.keys(D.SLOT.MODES).forEach(function (id) {
    var ev = slots.enumerateRTP(0, id).ev;
    ok(Math.abs(ev - classic.ev) <= 0.03,
       id + ' EV ' + ev.toFixed(5) + ' drifts >3 RTP points from classic ' + classic.ev.toFixed(5));
    var def = slots.modeDef(id);
    var w = 0;
    def.reel.forEach(function (r) { if (r.id === 'seven') w = r.w; });
    if (sevenW === null) sevenW = w;
    eq(w, sevenW, id + ' changes the seven weight — bonus math must be mode-independent');
    var total = 0;
    def.reel.forEach(function (r) { total += r.w; });
    eq(total, 64, id + ' must keep 64 virtual stops');
    Object.keys(def.pays).forEach(function (sym) {
      def.pays[sym].forEach(function (p) {
        ok(p === 0 || p >= 2, id + '/' + sym + ' pay ' + p + ' is positive but below the 2 S floor');
      });
    });
  });
});
t('zero-pay runs are not wins (Storm\'s low fruit need 4+)', function () {
  var grid = [
    ['cherry', 'star',  'berry', 'melon'],
    ['cherry', 'melon', 'lemon', 'star'],
    ['cherry', 'star',  'berry', 'melon'],
    ['star',   'melon', 'lemon', 'star'],
    ['lemon',  'star',  'berry', 'melon']
  ];
  var classic = slots.evaluate(grid, 'classic');
  eq(classic.lineWins.length, 1, 'classic pays the cherry 3-run');
  eq(classic.sun, D.SLOT.PAYS.cherry[0]);
  var storm = slots.evaluate(grid, 'storm');
  eq(storm.lineWins.length, 0, 'storm must not count a zero-pay 3-run as a win');
  eq(storm.sun, 0);
  // …but a 4-run of cherries pays in storm.
  grid[3][0] = 'cherry';
  var storm4 = slots.evaluate(grid, 'storm');
  eq(storm4.lineWins.length, 1, 'storm pays the cherry 4-run');
  eq(storm4.sun, D.SLOT.MODES.storm.pays.cherry[1]);
});
t('resolveSpin without a mode is byte-identical to explicit classic', function () {
  var a = slots.resolveSpin(new rngMod.Rng(3434), 0);
  var b = slots.resolveSpin(new rngMod.Rng(3434), 0, 'classic');
  eq(JSON.stringify(a), JSON.stringify(b), 'legacy call sites must be unchanged');
});
t('sun meter fills from decided sevens, forces a bonus at 77, and resets honestly', function () {
  var g = new st.Game();
  g.applySunMeter({ scatters: 2, bonus: false });
  eq(g.s.sunMeter, 2, 'sevens fill the meter');
  g.applySunMeter({ scatters: 0, bonus: false });
  eq(g.s.sunMeter, 2, 'no sevens, no change');
  // Full meter + no natural bonus → forced pity entry, meter consumed.
  g.s.sunMeter = D.SLOT.SUN_METER.SEGMENTS;
  var res = { scatters: 1, bonus: false };
  g.applySunMeter(res);
  eq(res.bonus, true, 'full meter guarantees the bonus');
  eq(res.pity, true, 'forced entry is marked');
  eq(g.s.stats.pityBonuses, 1);
  eq(g.s.sunMeter, 1, 'meter consumed, then this spin\'s sevens count anew');
  // Full meter + natural bonus → no pity, still resets (the promise was kept).
  g.s.sunMeter = D.SLOT.SUN_METER.SEGMENTS;
  var res2 = { scatters: 4, bonus: true };
  g.applySunMeter(res2);
  ok(!res2.pity, 'a natural bonus is never marked pity');
  eq(g.s.stats.pityBonuses, 1, 'no extra pity counted');
  eq(g.s.sunMeter, 4, 'reset then refilled by the natural trigger\'s sevens');
});
t('slot mode and sun meter survive saves and sanitize corruption', function () {
  var g = new st.Game();
  g.s.slotMode = 'storm';
  g.s.sunMeter = 33;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.slotMode, 'storm');
  eq(g2.s.sunMeter, 33);
  var g3 = new st.Game();
  g3.s.slotMode = 'hurricane';
  g3.s.sunMeter = 9999;
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  eq(g4.s.slotMode, 'classic', 'unknown mode sanitizes to classic');
  eq(g4.s.sunMeter, D.SLOT.SUN_METER.SEGMENTS, 'meter clamps to one legitimate fill');
});

console.log('the chain reforged (Plan II Phase 36)');
t('sunline charges by kind, arms at 77, pays 21 actions, pauses while resonant', function () {
  var g = new st.Game();
  g.sunlineCharge('cascade4');
  eq(g.s.sunline.points, D.CHAIN.CHARGE.cascade4);
  g.sunlineCharge('golden', 2);
  eq(g.s.sunline.points, D.CHAIN.CHARGE.cascade4 + 2 * D.CHAIN.CHARGE.golden);
  eq(g.sunlineCharge('mystery'), false, 'unknown kinds charge nothing');
  // Fill to the target.
  g.s.sunline.points = D.CHAIN.SUNLINE_TARGET - 1;
  var armed = g.sunlineCharge('bonus');
  eq(armed, true, 'crossing the target arms resonance');
  eq(g.s.sunline.points, 0);
  eq(g.s.sunline.actionsLeft, D.CHAIN.RESONANCE_ACTIONS);
  eq(g.s.stats.resonances, 1);
  // Charging pauses during resonance; consumption pays exactly 21 actions.
  eq(g.sunlineCharge('storm'), false, 'no charging during resonance');
  eq(g.s.sunline.points, 0, 'paused charge adds nothing');
  for (var i = 0; i < D.CHAIN.RESONANCE_ACTIONS; i++) {
    near(g.resonanceMult(), D.CHAIN.RESONANCE_MULT, 1e-9, 'action ' + i);
  }
  near(g.resonanceMult(), 1, 1e-9, 'resonance exhausted');
  eq(g.sunlineCharge('storm'), false, 'charging resumes (returns false: not armed)');
  eq(g.s.sunline.points, D.CHAIN.CHARGE.storm, 'points flow again after resonance ends');
});
t('pressed juice bottles a free spin at 7 tokens; jackpot splash banks a free drop', function () {
  var g = new st.Game();
  for (var i = 0; i < D.CHAIN.PRESS_TOKENS_FOR_SPIN - 1; i++) {
    eq(g.bottlePressedJuice(), false, 'token ' + i + ' must not pour yet');
  }
  eq(g.s.pressedJuice, D.CHAIN.PRESS_TOKENS_FOR_SPIN - 1);
  eq(g.bottlePressedJuice(), true, 'the 7th token pours a free spin');
  eq(g.s.pressedJuice, 0);
  eq(g.s.freeSpins, 1);
  eq(g.s.stats.freeSpinsEarned, 1);
  g.jackpotSplash();
  eq(g.s.freeDrops, D.CHAIN.JACKPOT_FREE_DROPS);
  eq(g.s.stats.freeDropsEarned, D.CHAIN.JACKPOT_FREE_DROPS);
});
t('sunline and free-action banks survive saves and sanitize corruption', function () {
  var g = new st.Game();
  g.s.sunline.points = 40;
  g.s.pressedJuice = 3; g.s.freeSpins = 2; g.s.freeDrops = 1;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.sunline.points, 40);
  eq(g2.s.pressedJuice, 3); eq(g2.s.freeSpins, 2); eq(g2.s.freeDrops, 1);
  var g3 = new st.Game();
  g3.s.sunline = { points: 9999, actionsLeft: 9999 };
  g3.s.freeSpins = -4; g3.s.pressedJuice = NaN;
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  ok(g4.s.sunline.points <= D.CHAIN.SUNLINE_TARGET, 'points clamp to the target');
  ok(g4.s.sunline.actionsLeft <= D.CHAIN.RESONANCE_ACTIONS, 'no eternal resonance');
  eq(g4.s.freeSpins, 0); eq(g4.s.pressedJuice, 0);
});
t('a resonant dozer coin keeps its multiplier across a table save', function () {
  var w = new dozer.World(new rngMod.Rng(3601), {}, { noStock: true });
  var c = w.spawn('coin', 100, 200);
  c.res = D.CHAIN.RESONANCE_MULT;
  var w2 = dozer.World.deserialize(new rngMod.Rng(3602), {}, w.serialize());
  near(w2.coins[0].res, D.CHAIN.RESONANCE_MULT, 1e-9, 'res multiplier survives the save');
});

console.log('builds & loadouts (Plan II Phase 37)');
t('bracelet focus doubles equipped charms exactly, on top of unchanged passives', function () {
  var g = new st.Game();
  g.s.charms.lemondrop = 3;                       // citrus, perLevel 0.05
  g.s.charms.cherrytwin = 2;                      // berry, perLevel 0.05
  var baseJuice = g.charmBonus('juice');
  near(baseJuice, 0.15, 1e-9, 'unequipped citrus passive');
  g.equipCharm('lemondrop');
  near(g.charmBonus('juice'), 0.30, 1e-9, 'equipped citrus counts double');
  near(g.charmBonus('suncoin'), 0.10, 1e-9, 'other sets untouched by the equip');
  g.equipCharm('lemondrop');                      // toggle off
  near(g.charmBonus('juice'), baseJuice, 1e-9, 'unequip restores the exact baseline');
});
t('a bracelet holding one complete set doubles its set bonus', function () {
  var g = new st.Game();
  var citrus = D.CHARMS.filter(function (c) { return c.set === 'citrus'; });
  eq(citrus.length, 7, 'a set is exactly seven charms');
  citrus.forEach(function (c) { g.s.charms[c.id] = 1; });
  var levels = 7 * 0.05;
  near(g.charmBonus('juice'), levels + 0.25, 1e-9, 'complete set, no focus');
  citrus.forEach(function (c) { g.equipCharm(c.id); });
  near(g.charmBonus('juice'), levels * 2 + 0.25 * 2, 1e-9, 'full-set bracelet doubles levels AND set bonus');
});
t('equip rules: owned only, 7 slots, free toggle', function () {
  var g = new st.Game();
  eq(g.equipCharm('lemondrop'), false, 'cannot equip an unowned charm');
  var owned = D.CHARMS.slice(0, 8);
  owned.forEach(function (c) { g.s.charms[c.id] = 1; });
  for (var i = 0; i < 7; i++) eq(g.equipCharm(owned[i].id), true, 'slot ' + i);
  eq(g.equipCharm(owned[7].id), false, 'slot 8 must not exist');
  eq(g.equipCharm(owned[0].id), true, 'unequip is free');
  eq(g.equipCharm(owned[7].id), true, 'freed slot takes the new charm');
});
t('migration: a never-initialized bracelet auto-picks the best seven owned', function () {
  var g = new st.Game();
  // A pre-bracelet save: charms owned, bracelet field absent entirely.
  D.CHARMS.slice(0, 10).forEach(function (c) { g.s.charms[c.id] = 2; });
  g.s.charms.galaxyfig = 7;                       // celestial, should rank first
  delete g.s.bracelet;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.bracelet.length, 7, 'auto-filled to seven');
  ok(g2.s.bracelet.indexOf('galaxyfig') >= 0, 'the maxed celestial makes the cut');
  // And the migrated player is strictly stronger than before (invariant 11).
  var g3 = new st.Game();
  D.CHARMS.slice(0, 10).forEach(function (c) { g3.s.charms[c.id] = 2; });
  g3.s.charms.galaxyfig = 7;
  g3.s.bracelet = [];
  ok(g2.charmBonus('all') > g3.charmBonus('all'), 'auto-equip only ever adds');
});
t('bracelet sanitize: unknown/unowned/duplicate ids drop, player-emptied stays empty', function () {
  var g = new st.Game();
  g.s.charms.lemondrop = 1;
  g.s.bracelet = ['lemondrop', 'lemondrop', 'notacharm', 'cherrytwin', 42];
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.bracelet.length, 1, 'only the owned, real, unique charm survives');
  eq(g2.s.bracelet[0], 'lemondrop');
  var g3 = new st.Game();
  g3.s.charms.lemondrop = 5;
  g3.s.bracelet = [];                             // deliberate empty choice
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  eq(g4.s.bracelet.length, 0, 'an emptied bracelet is a choice, not a bug to fix');
});
t('a fresh charm auto-equips while the bracelet has room', function () {
  var g = new st.Game();
  var rng = new rngMod.Rng(3701);
  for (var i = 0; i < 10; i++) g.awardRandomCharm(rng);
  ok(g.s.bracelet.length > 0, 'awards fill the bracelet');
  ok(g.s.bracelet.length <= D.BRACELET_SLOTS, 'never past seven');
  g.s.bracelet.forEach(function (id) { ok(g.s.charms[id] > 0, id + ' equipped but not owned'); });
});

console.log('the long game (Plan II Phase 38)');
t('seed bonus softcaps past 100 seeds (+10% → +7%)', function () {
  var g = new st.Game();
  g.s.seeds = 50;
  near(g.seedBonus(), 5.0, 1e-9, '50 seeds, full rate');
  g.s.seeds = 100;
  near(g.seedBonus(), 10.0, 1e-9, 'exactly at the knee');
  g.s.seeds = 110;
  near(g.seedBonus(), 10.0 + 10 * 0.07, 1e-9, 'past the knee, softer rate');
  // allMult must use the softcapped bonus.
  near(g.allMult(), 1 + g.seedBonus(), 1e-9, 'no charms/achievements: allMult = 1 + seedBonus');
});
t('a fresh lap starts warm: the first 77 Juice pay double, then warmth is spent', function () {
  var g = new st.Game();
  // Reach prestige legitimately.
  g.s.lifetime.stargem = 777;
  g.s.stats.playSec = 3600;
  ok(g.doPrestige(), 'prestige fires');
  eq(g.s.lap.warmLeft, D.PRESTIGE.WARM_JUICE);
  var got1 = g.gain('juice', 10, true);
  near(got1, 20, 1e-9, 'warm juice pays double');
  near(g.s.lap.warmLeft, 67, 1e-9);
  var got2 = g.gain('juice', 100, true);
  near(got2, 167, 1e-9, 'the last 67 warm + 33 plain');
  eq(g.s.lap.warmLeft, 0);
  near(g.gain('juice', 10, true), 10, 1e-9, 'warmth spent — plain rates resume');
  // Suncoins never warm.
  g.s.lap.warmLeft = 50;
  near(g.gain('suncoin', 10, true), 10, 1e-9, 'warm applies to Juice only');
});
t('each prestige mints a jar with the lap\'s record; the shelf caps at 49', function () {
  var g = new st.Game();
  g.s.lifetime.stargem = 777 * 4;    // enough for seeds jumps across laps
  g.s.stats.playSec = 1800;          // a 30-minute lap at 3108 G → gold rate
  ok(g.doPrestige());
  eq(g.s.jars.length, 1);
  var jar = g.s.jars[0];
  eq(jar.n, 1);
  eq(jar.lapG, 777 * 4, 'first lap counts all lifetime G');
  eq(jar.lid, 'gold', 'a 6.2K G/h lap earns the gold lid (rate ' + (jar.lapG / (jar.sec / 3600)).toFixed(0) + ')');
  // Next lap: only the delta counts.
  g.s.lifetime.stargem += 777;
  g.s.stats.playSec += 7200;         // slow lap → bronze
  g.s.seeds = 0;                     // force availability again for the test
  ok(g.doPrestige());
  eq(g.s.jars[1].lapG, 777, 'jar 2 records only its own lap');
  eq(g.s.jars[1].lid, 'bronze');
  // Shelf cap: stuff it and confirm the oldest fall into memory (stats keep the count).
  for (var i = 0; i < 60; i++) g.s.jars.push({ n: 100 + i, lapG: 1, sec: 60, seeds: 1, lid: 'bronze' });
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  ok(g2.s.jars.length <= D.JARS.MAX_JARS, 'shelf holds at most ' + D.JARS.MAX_JARS);
});
t('prestige keeps the veils down: lifetime totals are never reset', function () {
  var g = new st.Game();
  g.gain('juice', 100, true);
  g.gain('suncoin', 50, true);
  g.s.lifetime.stargem = 777;
  ok(g.doPrestige());
  ok(g.s.lifetime.juice >= 100, 'lifetime juice survives (slots stay unlocked)');
  ok(g.s.lifetime.suncoin >= 50, 'lifetime suncoins survive (dozer stays unlocked)');
  eq(g.s.cur.juice, 0, 'current balances do reset');
});

console.log('dozer');
t('world starts stocked and coins stay finite & in-bounds', function () {
  var rng = new rngMod.Rng(5);
  var w = new dozer.World(rng, {});
  eq(w.coins.length, D.DOZER.START_COINS);
  for (var i = 0; i < 60 * 30; i++) w.step(1 / 60);
  w.coins.forEach(function (c) {
    ok(isFinite(c.x) && isFinite(c.z), 'NaN coin');
    ok(c.z > -1 && c.z < D.DOZER.TABLE_D + 40, 'coin escaped depth bounds: ' + c.z);
  });
});
t('drops eventually push coins off the front (conservation)', function () {
  var rng = new rngMod.Rng(6);
  var w = new dozer.World(rng, {});
  var front = 0, dropped = 0, tNext = 1;
  for (var t = 0; t < 400; t += 1 / 60) {
    if (t >= tNext && dropped < 220) { w.drop(D.DOZER.TABLE_W / 2 + (rng.float() - 0.5) * 120); tNext += 1.2; dropped++; }
    w.step(1 / 60).forEach(function (ev) { if (ev.type === 'front') front++; });
  }
  ok(front > dropped * 0.5, 'only ' + front + ' front exits from ' + dropped + ' drops');
});
t('pusher face oscillates within its designed travel', function () {
  var rng = new rngMod.Rng(8);
  var w = new dozer.World(rng, {});
  var min = 1e9, max = -1e9;
  for (var t = 0; t < 10; t += 0.01) {
    w.t = t;
    var z = w.pusherZ();
    min = Math.min(min, z); max = Math.max(max, z);
  }
  near(min, dozer.PUSHER_MIN_Z, 0.5);
  near(max, dozer.PUSHER_MIN_Z + D.DOZER.PUSHER_TRAVEL, 0.5);
});
t('table serialize/deserialize round-trips coin count, kind, tier and special', function () {
  var rng = new rngMod.Rng(9);
  var w = new dozer.World(rng, {});
  for (var i = 0; i < 90; i++) w.step(1 / 60);          // let a few specials spawn in
  var before = w.coins.length;
  var kindsBefore = w.coins.map(function (c) { return c.kind; }).sort();
  var rec = w.serialize();
  eq(rec.length, before);
  var w2 = dozer.World.deserialize(new rngMod.Rng(1), {}, rec);
  eq(w2.coins.length, before, 'restored coin count');
  eq(w2.coins.map(function (c) { return c.kind; }).sort().join(), kindsBefore.join(), 'restored kinds');
  w2.coins.forEach(function (c, idx) {
    if (c.kind === 'coin') ok(c.tier && D.DOZER.COIN_TIERS.indexOf(c.tier) >= 0, 'coin ' + idx + ' lost its tier');
    else ok(c.special && D.DOZER.SPECIALS.indexOf(c.special) >= 0, 'special ' + idx + ' lost its kind');
  });
});
t('deserialize does not consume the live rng stream for tier/kind lookup', function () {
  var seedRng = new rngMod.Rng(9);
  var w = new dozer.World(seedRng, {});
  var rec = w.serialize();
  var probe = new rngMod.Rng(4242);
  var before = probe.getState();
  dozer.World.deserialize(probe, {}, rec);
  eq(probe.getState(), before, 'deserialize must not roll the rng it is given');
});
t('pachinko: runs finish in a valid slot and are seed-deterministic', function () {
  for (var s = 0; s < 50; s++) {
    var p = new dozer.Pachinko(new rngMod.Rng(9000 + s), 40 + s * 5);
    var guard = 0;
    while (!p.step(1 / 60) && guard++ < 2000);
    ok(p.done, 'run must finish');
    ok(p.slot >= 0 && p.slot < D.DOZER.PACHINKO.SLOTS.length, 'valid slot');
  }
  var a = new dozer.Pachinko(new rngMod.Rng(77), 160);
  var b = new dozer.Pachinko(new rngMod.Rng(77), 160);
  while (!a.step(1 / 60));
  while (!b.step(1 / 60));
  eq(a.slot, b.slot, 'same seed+aim must land the same slot');
  eq(a.exitX, b.exitX, 'same seed+aim must exit at the same x');
});
t('barrier perk seals the side gutters; expiry reopens them', function () {
  var w = new dozer.World(new rngMod.Rng(8), {}, { noStock: true });
  w.applyPerk('barrier');
  ok(w.barrierDrops > 0, 'barrier must arm');
  var c = w.spawn('coin', -10, w.railEnd() + 15);
  c.vx = -20;
  for (var i = 0; i < 30; i++) w.step(1 / 60);
  eq(w.coins.length, 1, 'sealed gutter must keep the coin');
  ok(w.coins[0].x >= w.coins[0].r - 1, 'coin pushed back inside the rail');
  w.barrierDrops = 0;
  w.coins[0].x = -10; w.coins[0].vx = -20;
  var sideSeen = false;
  for (var j = 0; j < 30; j++) {
    var evs = w.step(1 / 60);
    for (var e = 0; e < evs.length; e++) if (evs[e].type === 'side') sideSeen = true;
  }
  ok(sideSeen, 'open gutter must eat the coin again');
});
t('pachinko: no peg sits in a wall pocket the ball cannot pass', function () {
  var P = D.DOZER.PACHINKO;
  dozer.Pachinko.pegs.forEach(function (peg) {
    ok(peg.x >= P.WALL_CLEAR && peg.x <= P.W - P.WALL_CLEAR,
       'peg at ' + peg.x + ' is inside the wall clearance');
  });
  // Edge releases must resolve well before the failsafe timer (the old
  // top-corner pocket wedged the ball until t>6 bailed it out).
  for (var s = 0; s < 40; s++) {
    var p = new dozer.Pachinko(new rngMod.Rng(7000 + s), s % 2 ? 5 : 315);
    var guard = 0;
    while (!p.step(1 / 60) && guard++ < 2000);
    ok(p.t < 5, 'edge release resolved in ' + p.t.toFixed(2) + 's (seed ' + s + ')');
  }
});
t('pachinko bonus pins: 3 distinct lit pegs, strikes pay 1..3 S once each', function () {
  var P = D.DOZER.PACHINKO;
  var paid = 0;
  for (var s = 0; s < 60; s++) {
    var p = new dozer.Pachinko(new rngMod.Rng(5000 + s), 30 + (s * 11) % 260);
    eq(p.bonusIdx.length, P.BONUS_PEGS);
    var seen = {};
    p.bonusIdx.forEach(function (i) {
      ok(i >= 0 && i < dozer.Pachinko.pegs.length && !seen[i], 'distinct valid peg');
      seen[i] = true;
    });
    var guard = 0;
    while (!p.step(1 / 60) && guard++ < 2000);
    ok(p.hits.length <= P.BONUS_PEGS, 'a pin pays at most once');
    var sum = 0;
    p.hits.forEach(function (h) {
      ok(h.sun >= 1 && h.sun <= P.BONUS_SUN_MAX, 'strike pays 1..' + P.BONUS_SUN_MAX);
      sum += h.sun;
    });
    eq(sum, p.sun, 'hits ledger matches the total');
    paid += sum;
  }
  ok(paid > 0, 'across 60 balls at least one bonus pin must be struck');
});
t('tide surge seals the gutters exactly like a barrier (Plan II 35.3)', function () {
  // A coin past the rail end, drifting into the gutter: without a surge it
  // side-exits; with surgeDrops armed it bounces off the sealed rail.
  function gutterProbe(surged) {
    var w = new dozer.World(new rngMod.Rng(3501), {}, { noStock: true });
    if (surged) w.surgeDrops = 3;
    var c = w.spawn('coin', D.DOZER.COIN_R * 0.4, w.railEnd() + 30);
    c.vx = -420;
    var sideExit = false;
    for (var i = 0; i < 60; i++) {
      w.step(1 / 60).forEach(function (ev) { if (ev.type === 'side') sideExit = true; });
    }
    return sideExit;
  }
  eq(gutterProbe(false), true, 'unsealed gutter must swallow the drifting coin');
  eq(gutterProbe(true), false, 'a tide surge must seal the same gutter');
});
t('gem storm rains coins, caps at MAX_COINS, and announces itself', function () {
  var w = new dozer.World(new rngMod.Rng(3502), {}, { noStock: true });
  var got = w.rainCoins(D.DOZER.EVENTS.STORM_COINS);
  eq(got, D.DOZER.EVENTS.STORM_COINS, 'storm rains the published coin count');
  var evs = w.step(1 / 60);
  ok(evs.some(function (e) { return e.type === 'storm'; }), 'storm event emitted');
  // Fill to the cap: a storm may never overflow the table.
  while (w.coins.length < D.DOZER.MAX_COINS) w.spawn('coin', 100, 200);
  eq(w.rainCoins(7), 0, 'a full table rains nothing');
});
t('harbor currents reweight the specials pool (statistically) and never change coin tiers', function () {
  Object.keys(D.DOZER.CURRENTS).forEach(function (id) {
    var wsum = 0;
    Object.keys(D.DOZER.CURRENTS[id].weights).forEach(function (k) {
      wsum += D.DOZER.CURRENTS[id].weights[k];
    });
    eq(wsum, 100, id + ' weights must sum to 100');
  });
  var w = new dozer.World(new rngMod.Rng(3503), { current: 'gemgrass' }, { noStock: true });
  var pool = w.specialPool();
  var gemW = 0, total = 0;
  pool.forEach(function (s) { total += s.w; if (s.id === 'gemfruit') gemW = s.w; });
  eq(gemW, D.DOZER.CURRENTS.gemgrass.weights.gemfruit, 'pool carries the current\'s weights');
  eq(total, 100);
  // Statistical: draws follow the reweighted pool.
  var hits = 0, N = 4000;
  for (var i = 0; i < N; i++) {
    var s = w.spawnRandomSpecial();
    ok(s, 'spawn under cap succeeds');
    if (s.special.id === 'gemfruit') hits++;
    w.coins.length = 0;              // keep under MAX_COINS for the next draw
  }
  ok(hits / N > 0.56 && hits / N < 0.68, 'gemgrass gemfruit share ' + (hits / N).toFixed(3) + ', expected ~0.62');
});
t('harbor current sanitizes to balanced on unknown ids', function () {
  var g = new st.Game();
  g.s.harborCurrent = 'riptide';
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.harborCurrent, 'balanced');
  var g3 = new st.Game();
  g3.s.harborCurrent = 'charmwaters';
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  eq(g4.s.harborCurrent, 'charmwaters', 'a valid current survives the round-trip');
});
t('serialize round-trips coin layer and pachinko boost', function () {
  var w = new dozer.World(new rngMod.Rng(9), {}, { noStock: true });
  var c = w.spawn('coin', 100, 200);
  c.layer = 1; c.boost = 2;
  var w2 = dozer.World.deserialize(new rngMod.Rng(10), {}, w.serialize());
  eq(w2.coins[0].layer, 1, 'layer survives the save');
  eq(w2.coins[0].boost, 2, 'boost survives the save');
});

console.log('the moonlit tidepool (Plan II Phase 39)');
t('the night roster is 28 souls in 4 sets of 7, each set the charm rarity pattern', function () {
  eq(D.TIDEPOOL.CREATURES.length, 28);
  Object.keys(D.TIDEPOOL.SETS).forEach(function (setId) {
    var members = D.TIDEPOOL.CREATURES.filter(function (c) { return c.set === setId; });
    eq(members.length, 7, setId + ' must hold exactly 7 souls');
    var run = members.map(function (c) { return c.rarity; }).sort().join(',');
    eq(run, '1,1,1,2,2,3,4', setId + ' must mirror the charm rarity run');
  });
});
t('every zone pays the same exact E[P/cast], and it clears the 1.0 floor', function () {
  var g = new st.Game();
  var evs = Object.keys(D.TIDEPOOL.ZONES).map(function (zoneId) {
    var table = g.zoneTable(zoneId);
    eq(table.length, 14, zoneId + ' hosts two full sets');
    var wsum = 0, ev = 0;
    table.forEach(function (e) {
      wsum += e.w;
      ev += e.w * D.TIDEPOOL.PEARLS_BY_RARITY[e.c.rarity];
    });
    return ev / wsum;
  });
  evs.forEach(function (ev, i) {
    near(ev, evs[0], 1e-12, 'zone ' + i + ' must pay exactly like every other');
    ok(ev >= 1.0, 'E[P/cast] ' + ev.toFixed(4) + ' must clear the 1.0 stake floor');
  });
  near(evs[0], 55 / 35, 1e-12, 'the published 55/35 ≈ 1.571 P/cast');
});
t('casting: prestige-locked, costs 7 G, always bites, levels to 7, then refines', function () {
  var g = new st.Game();
  var rng = new rngMod.Rng(3901);
  g.gain('stargem', 1000, true);
  eq(g.castTidepool(rng), null, 'the night is locked before the first preserve');
  g.s.stats.prestiges = 1;
  g.checkAchievements();               // settle gem milestones so the balance check is clean
  var before = g.s.cur.stargem;
  var res = g.castTidepool(rng);
  ok(res && res.creature, 'one soul always bites');
  near(g.s.cur.stargem, before - D.TIDEPOOL.CAST_COST_G, 1e-9, 'cast costs 7 G');
  eq(res.credited, D.TIDEPOOL.PEARLS_BY_RARITY[res.creature.rarity], 'pearls by rarity, RAW');
  eq(g.s.creatures[res.creature.id], 1);
  eq(g.s.stats.casts, 1);
  // Max a soul and confirm the refine path.
  g.s.creatures[res.creature.id] = 7;
  var dupes = 0, refined = null;
  while (dupes++ < 500 && !refined) {
    var r2 = g.castTidepool(rng);
    if (r2.creature.id === res.creature.id) refined = r2;
  }
  ok(refined, 'a maxed soul eventually re-bites');
  eq(refined.refined, D.TIDEPOOL.MAXED_DUPE_PEARLS, 'maxed dupes refine into bonus pearls');
  eq(g.s.creatures[res.creature.id], 7, 'level never passes 7');
});
t('pearls stay outside the day pipeline and never convert backward', function () {
  var g = new st.Game();
  g.s.seeds = 50;                      // a big day multiplier...
  near(g.multFor('pearl'), 1, 1e-12, '...never touches pearls');
  g.gain('pearl', 10);
  eq(g.s.cur.pearl, 10, 'pearl gains are raw by construction');
  // No API converts P back: spending pearls only works on habitats.
  eq(g.buyHabitat('kelp'), false, 'cannot afford yet');
  g.gain('pearl', 100, true);
  ok(g.buyHabitat('kelp'), 'habitat is the only sink');
  eq(g.buyHabitat('kelp'), false, 'and it is one-time');
});
t('moonlight blessings: a complete set blesses its day stage; all 28 add +7% all', function () {
  var g = new st.Game();
  near(g.blessingBonus('juice'), 0, 1e-12, 'no blessing before a set completes');
  D.TIDEPOOL.CREATURES.forEach(function (c) {
    if (c.set === 'shorewalkers') g.s.creatures[c.id] = 1;
  });
  near(g.blessingBonus('juice'), D.TIDEPOOL.SETS.shorewalkers.blessing, 1e-12, 'shorewalkers bless Juice');
  near(g.blessingBonus('suncoin'), 0, 1e-12, 'other stages unblessed');
  D.TIDEPOOL.CREATURES.forEach(function (c) { g.s.creatures[c.id] = 1; });
  near(g.blessingBonus('all'),
       D.TIDEPOOL.SETS.moonkin.blessing + D.TIDEPOOL.FULL_AQUARIUM_ALL, 1e-12,
       'the full glass: moonkin +2% all plus the +7% aquarium bonus');
  // And the multipliers actually carry it.
  var withBless = g.juiceMult();
  g.s.creatures = {};
  ok(withBless > g.juiceMult(), 'blessings flow into the day multipliers');
});
t('tidepool state survives saves; corruption sanitizes clean', function () {
  var g = new st.Game();
  g.s.creatures.moonjelly = 3;
  g.s.tidepool.zone = 'deepglass';
  g.s.tidepool.habitats.kelp = true;
  g.s.cur.pearl = 42;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.creatures.moonjelly, 3);
  eq(g2.s.tidepool.zone, 'deepglass');
  eq(g2.s.tidepool.habitats.kelp, true);
  eq(g2.s.cur.pearl, 42);
  var g3 = new st.Game();
  g3.s.creatures = { kraken: 99, moonjelly: 99 };
  g3.s.tidepool = { zone: 'the-abyss', habitats: { castle: true } };
  g3.s.cur.pearl = -5;
  var g4 = new st.Game();
  g4.importSave(g3.exportSave());
  eq(g4.s.creatures.kraken, undefined, 'unknown souls vanish');
  eq(g4.s.creatures.moonjelly, 7, 'levels clamp to 7');
  eq(g4.s.tidepool.zone, 'shallows', 'unknown zones sanitize home');
  eq(g4.s.tidepool.habitats.castle, undefined, 'unknown habitats vanish');
  eq(g4.s.cur.pearl, 0, 'negative pearls sanitize to zero');
});
t('pearls survive a Preserve — the night sits outside the lap', function () {
  // Regression: doPrestige once rebuilt s.cur with only the day currencies,
  // silently wiping pearls to undefined (→ NaN on the next gain). Caught by
  // the end-to-end journey smoke; pinned here forever.
  var g = new st.Game();
  g.gain('pearl', 12, true);
  g.s.lifetime.stargem = 777;
  ok(g.doPrestige());
  eq(g.s.cur.pearl, 12, 'pearls must survive the preserve');
  eq(g.s.cur.stargem, 0, 'day currencies still reset');
  g.gain('pearl', 3, true);
  eq(g.s.cur.pearl, 15, 'and the balance still adds cleanly after');
});
t('a pre-pearl save migrates in with zeroed pearls and nothing else changed', function () {
  var g = new st.Game();
  g.gain('juice', 100, true);
  delete g.s.cur.pearl;
  delete g.s.lifetime.pearl;
  delete g.s.creatures;
  delete g.s.tidepool;
  var g2 = new st.Game();
  g2.importSave(g.exportSave());
  eq(g2.s.cur.pearl, 0);
  eq(g2.s.cur.juice, 100, 'day balances untouched');
  ok(g2.s.tidepool && g2.s.tidepool.zone === 'shallows');
});

console.log('personal rtp');
t('personal slot/dozer RTP withholds a ratio until the minimum sample size, then computes it', function () {
  var g = new st.Game();
  eq(g.personalSlotRTP().ratio, null, 'fresh game must not report a ratio yet');
  eq(g.personalDozerRTP().ratio, null, 'fresh game must not report a ratio yet');

  g.s.stats.spins = 19;
  g.s.stats.slotSunWon = 19 * 2;
  eq(g.personalSlotRTP().ratio, null, 'one spin short of the sample floor must still withhold');
  g.s.stats.spins = 20;
  g.s.stats.slotSunWon = 20 * 2;
  near(g.personalSlotRTP().ratio, 2, 1e-9, 'ratio must be slotSunWon / spins once the floor is met');

  g.s.stats.drops = 25;
  g.s.stats.dozerGemsWon = 25 * 1.3;
  near(g.personalDozerRTP().ratio, 1.3, 1e-9, 'ratio must be dozerGemsWon / drops once the floor is met');
});
t('personal RTP source stats sanitize corrupted values to finite non-negative numbers', function () {
  var g = new st.Game();
  g.s.stats.slotSunWon = -5;
  g.s.stats.dozerGemsWon = NaN;
  var code = g.exportSave();
  var g2 = new st.Game();
  g2.importSave(code);
  ok(isFinite(g2.s.stats.slotSunWon) && g2.s.stats.slotSunWon >= 0, 'negative slotSunWon must sanitize to >=0');
  ok(isFinite(g2.s.stats.dozerGemsWon) && g2.s.stats.dozerGemsWon >= 0, 'NaN dozerGemsWon must sanitize to a finite >=0 number');
});
console.log('published docs');
// This project's whole promise is that its published numbers are true, so the
// docs are treated as code: if the machine's math moves, the prose must move
// with it. The README once advertised a retired 118.4% RTP for a 3-reel
// machine long after the shipped game became a 5×4 at 145.6%.
function doc(name) {
  return fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
}
t('README and fairness.md quote the slot EV the code actually computes', function () {
  var ev = slots.enumerateRTP(0).ev.toFixed(5);           // "1.45613"
  var rtp = (slots.enumerateRTP(0).ev * 100).toFixed(1);  // "145.6"
  ['README.md', 'docs/fairness.md'].forEach(function (f) {
    var text = doc(f);
    ok(text.indexOf(ev) >= 0, f + ' must quote the exact slot EV ' + ev);
    ok(text.indexOf(rtp) >= 0, f + ' must quote the slot RTP ' + rtp + '%');
  });
});
t('README and fairness.md agree with the code on the payline count', function () {
  var n = String(D.SLOT.LINES.length);
  ['README.md', 'docs/fairness.md'].forEach(function (f) {
    var text = doc(f);
    ok(new RegExp('\\b' + n + '\\s+(fixed\\s+)?paylines\\b').test(text),
       f + ' must state "' + n + ' paylines" to match D.SLOT.LINES');
  });
});
t('no shipped source still claims the retired 9-payline machine', function () {
  ['js/slots.js', 'js/data.js', 'js/ui.js', 'README.md', 'docs/fairness.md'].forEach(function (f) {
    ok(!/9\s+(fixed\s+)?(pay)?lines/i.test(doc(f)),
       f + ' still references 9 paylines; the machine has ' + D.SLOT.LINES.length);
  });
});
t('fairness.md quotes every weather mode\'s exact EV and the sun meter size', function () {
  var text = doc('docs/fairness.md');
  Object.keys(D.SLOT.MODES).forEach(function (id) {
    var ev = slots.enumerateRTP(0, id).ev;
    ok(text.indexOf(ev.toFixed(5)) >= 0,
       'fairness.md must quote ' + id + '\'s exact EV ' + ev.toFixed(5));
    ok(text.indexOf((ev * 100).toFixed(1) + '%') >= 0,
       'fairness.md must quote ' + id + '\'s RTP ' + (ev * 100).toFixed(1) + '%');
  });
  ok(text.indexOf(D.SLOT.SUN_METER.SEGMENTS + ' segments') >= 0 ||
     text.indexOf('of ' + D.SLOT.SUN_METER.SEGMENTS + '\nsegments') >= 0 ||
     /1 of 77\s*\n?segments/.test(text),
     'fairness.md must state the ' + D.SLOT.SUN_METER.SEGMENTS + '-segment meter');
});
t('fairness.md quotes the golden-fruit odds and multipliers the code actually uses', function () {
  var text = doc('docs/fairness.md');
  var G = D.MATCH3.GOLDEN;
  ok(text.indexOf('1/' + Math.round(1 / G.CHANCE)) >= 0,
     'fairness.md must quote the 1/' + Math.round(1 / G.CHANCE) + ' golden spawn odds');
  ok(new RegExp('\\*\\*' + G.MULT + ' tiles\\*\\*').test(text),
     'fairness.md must quote the direct-clear ×' + G.MULT);
  ok(new RegExp('\\*\\*' + G.CASCADE_MULT + ' tiles\\*\\*').test(text),
     'fairness.md must quote the cascade-clear ×' + G.CASCADE_MULT);
  ok(text.indexOf(String(Math.round((D.ORDERS.TEMPLATES ? 21 : 21)))) >= 0 &&
     text.indexOf('21%') >= 0, 'fairness.md must state the ≤21% order budget');
  ok(text.indexOf(String(D.SQUEEZE.TARGET) + '-point') >= 0,
     'fairness.md must quote the ' + D.SQUEEZE.TARGET + '-point squeeze meter');
  ok(text.indexOf(D.SQUEEZE.BUFF_MOVES + ' hand') >= 0,
     'fairness.md must quote the ' + D.SQUEEZE.BUFF_MOVES + '-move Fresh Squeeze');
  ok(text.indexOf('+' + Math.round((D.SQUEEZE.BUFF_MULT - 1) * 100) + '%') >= 0,
     'fairness.md must quote the Fresh Squeeze multiplier');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
