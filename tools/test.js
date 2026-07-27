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
t('serialize round-trips coin layer and pachinko boost', function () {
  var w = new dozer.World(new rngMod.Rng(9), {}, { noStock: true });
  var c = w.spawn('coin', 100, 200);
  c.layer = 1; c.boost = 2;
  var w2 = dozer.World.deserialize(new rngMod.Rng(10), {}, w.serialize());
  eq(w2.coins[0].layer, 1, 'layer survives the save');
  eq(w2.coins[0].boost, 2, 'boost survives the save');
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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
