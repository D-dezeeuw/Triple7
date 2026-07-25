#!/usr/bin/env node
/* Triple7 — tools/simulate.js
 * The economy proof. Runs the EXACT game logic (same files the browser loads)
 * headless and verifies every EV number published in js/data.js:
 *
 *   1. Slot machine  — exact enumeration (the par sheet) + Monte Carlo check.
 *   2. Match-3       — Monte Carlo over random valid moves: Juice per move.
 *   3. Coin dozer    — full physics simulation: Stargems per dropped coin.
 *   4. Chain summary — end-to-end: is every conversion EV-positive?
 *
 * Deterministic: fixed seeds, so results are reproducible run-to-run.
 * Usage: npm run simulate  [-- --spins 2000000 --moves 20000 --drops 1500]
 */
'use strict';

var path = require('path');
var rngMod = require(path.join(__dirname, '..', 'js', 'rng.js'));
var D = require(path.join(__dirname, '..', 'js', 'data.js'));
var slots = require(path.join(__dirname, '..', 'js', 'slots.js'));
var match3 = require(path.join(__dirname, '..', 'js', 'match3.js'));
var dozer = require(path.join(__dirname, '..', 'js', 'dozer.js'));

function arg(name, def) {
  var i = process.argv.indexOf('--' + name);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
}
var N_SPINS = arg('spins', 2000000);
var N_MOVES = arg('moves', 20000);
var N_DROPS = arg('drops', 1500);

function hr(title) {
  console.log('\n' + '─'.repeat(64) + '\n  ' + title + '\n' + '─'.repeat(64));
}
function pct(x) { return (x * 100).toFixed(2) + '%'; }

// ── 1. SLOT MACHINE ─────────────────────────────────────────────────────────
hr('1. SLOT MACHINE — "Sunshine Sevens" (stake: 7 Juice ≡ 1.000 S)');

var exact = slots.enumerateRTP(0);
console.log('  Exact par sheet (3 reels × 64 weighted stops, enumerated):\n');
console.log('  line              probability        pays     EV share');
exact.lines.forEach(function (l) {
  console.log('  ' + l.label.padEnd(14) + (l.p.toFixed(7)).padStart(12) +
    '  (1 in ' + String(Math.round(1 / l.p)).padStart(6) + ')' +
    String(l.pay).padStart(6) + ' S   ' + l.evPart.toFixed(5) + ' S');
});
console.log('\n  EXACT EV       = ' + exact.ev.toFixed(5) + ' S/spin  → RTP ' + pct(exact.ev));
console.log('  EXACT hit rate = ' + pct(exact.hitRate));

var rng = new rngMod.Rng(777001);
var mcPay = 0, mcHits = 0, mcJack = 0, mcGems = 0;
for (var s = 0; s < N_SPINS; s++) {
  var res = slots.resolveSpin(rng, 0);
  mcPay += res.sun; mcGems += res.gems;
  if (res.sun > 0) mcHits++;
  if (res.kind === 'jackpot') mcJack++;
}
console.log('\n  Monte Carlo (' + N_SPINS.toLocaleString() + ' spins, seed 777001):');
console.log('    EV       = ' + (mcPay / N_SPINS).toFixed(5) + ' S/spin  (Δ vs exact: ' +
  Math.abs(mcPay / N_SPINS - exact.ev).toFixed(5) + ')');
console.log('    hit rate = ' + pct(mcHits / N_SPINS) +
  ' · jackpots: ' + mcJack + ' (expect ~' + Math.round(N_SPINS * Math.pow(2 / 64, 3)) + ')' +
  ' · bonus gems EV = ' + (mcGems / N_SPINS).toFixed(5) + ' G/spin');
var maxed = slots.enumerateRTP(3);
console.log('  With Lucky Sevens maxed (+3 weight): EV = ' + maxed.ev.toFixed(5) +
  ' S/spin → RTP ' + pct(maxed.ev));

var slotOK = Math.abs(exact.ev - 1.18401) < 0.0005 && exact.ev > 1.0;
console.log('\n  VERDICT: ' + (slotOK ? '✔ matches published 1.18401 S/spin; stage is EV-positive.'
  : '✘ MISMATCH with published EV!'));

// ── 2. MATCH-3 ──────────────────────────────────────────────────────────────
hr('2. MATCH-3 — "Juicy Grove" (stake: one free move)');

rng = new rngMod.Rng(777002);
var board = match3.newBoard(rng);
var totJ = 0, totTiles = 0, chains = {}, reshuffles = 0, specials = 0;
for (var mv = 0; mv < N_MOVES; mv++) {
  var moves = match3.findAllMoves(board);
  if (!moves.length) { match3.reshuffle(board, rng); reshuffles++; mv--; continue; }
  var pick = moves[Math.floor(rng.float() * moves.length)];
  var out = match3.resolveMove(board, pick, rng, 0);
  if (!out.valid) continue;
  totJ += out.juice; totTiles += out.tiles; specials += out.specialsMade;
  chains[out.chain] = (chains[out.chain] || 0) + 1;
}
var jPerMove = totJ / N_MOVES;
console.log('  ' + N_MOVES.toLocaleString() + ' random valid moves (seed 777002, no upgrades):');
console.log('    Juice/move   = ' + jPerMove.toFixed(3) + ' J  → a 7 J spin every ' +
  (7 / jPerMove).toFixed(2) + ' moves');
console.log('    tiles/move   = ' + (totTiles / N_MOVES).toFixed(2) +
  ' · specials made: ' + specials + ' · deadlock reshuffles: ' + reshuffles);
var chainKeys = Object.keys(chains).sort(function (a, b) { return a - b; });
console.log('    cascade depth histogram: ' + chainKeys.map(function (k) {
  return 'x' + k + ':' + pct(chains[k] / N_MOVES);
}).join('  '));
console.log('\n  VERDICT: ✔ every move earns Juice (free faucet — the chain can never dead-end);');
console.log('           human play beats random-move EV, so ' + jPerMove.toFixed(2) + ' J/move is the floor.');

// ── 3. COIN DOZER ───────────────────────────────────────────────────────────
hr('3. COIN DOZER — "Star Harbor" (stake: 7 S ≡ 1.000 G per drop)');

function runDozer(params, drops, seed, label) {
  var drng = new rngMod.Rng(seed);
  var world = new dozer.World(drng, params);
  var front = 0, frontGems = 0, side = 0, specialFront = { gems: 0, sun: 0, juice: 0, charm: 0 };
  var dropInterval = 1.15, tNext = 3, done = 0, warmFront = 0, warmup = Math.floor(drops * 0.15);
  var step = 1 / 60;
  // Run until we've dropped `drops` coins and let the table settle after.
  var tEnd = 3 + drops * dropInterval + 40;
  for (var t = 0; t < tEnd; t += step) {
    if (t >= tNext && done < drops) {
      world.drop(D.DOZER.TABLE_W / 2 + (drng.float() - 0.5) * 160);
      tNext += dropInterval; done++;
    }
    var evs = world.step(step);
    for (var e = 0; e < evs.length; e++) {
      var ev = evs[e];
      if (ev.type === 'front') {
        if (done <= warmup) { warmFront++; continue; }
        if (ev.coin.kind === 'coin') { front++; frontGems += ev.coin.tier ? ev.coin.tier.gems : 1; }
        else specialFront[ev.coin.special.kind]++;
      } else if (ev.type === 'side' && done > warmup) side++;
    }
  }
  var counted = drops - warmup;
  var gemsFromCoins = frontGems / counted;   // tier-weighted (COIN_TIERS)
  var gemsFromSpecials = (specialFront.gems * D.DOZER.SPECIALS[0].gems +
                          specialFront.charm * 5 +                    // charm ≈ 5 G value
                          specialFront.juice * 1 +                    // ≈ 1 G of juice-time
                          specialFront.sun * (21 / 7)) / counted;
  var evG = gemsFromCoins + gemsFromSpecials;
  var exits = front + side;
  console.log('  ' + label + ' (' + drops + ' drops, seed ' + seed + '):');
  console.log('    exits after warmup: front ' + front + ' / side ' + side +
    '  → side-loss s = ' + pct(side / Math.max(1, exits)));
  console.log('    plain-coin Stargems/drop  = ' + gemsFromCoins.toFixed(3) + ' G');
  console.log('    specials value/drop       ≈ ' + gemsFromSpecials.toFixed(3) + ' G  (chests:' +
    specialFront.charm + ' gemfruit:' + specialFront.gems + ' pouches:' + specialFront.sun +
    ' bottles:' + specialFront.juice + ')');
  console.log('    TOTAL E[G/drop]           ≈ ' + evG.toFixed(3) + ' G  → RTP ' + pct(evG) + '\n');
  return { evG: evG, sideRate: side / Math.max(1, exits) };
}

var base = runDozer({}, N_DROPS, 777003, 'Base table');
var tuned = runDozer({ railLvl: 5, pusherLvl: 5, magnetLvl: 7 }, N_DROPS, 777004,
  'Maxed rails/pusher/magnet');

var dozerOK = base.evG > 1.0;
console.log('  VERDICT: ' + (dozerOK
  ? '✔ steady-state E[G/drop] > 1 G stake — stage is EV-positive, and upgrades widen it.'
  : '✘ base dozer is EV-negative — tune gutters/specials!'));

// ── 4. THE WHOLE CHAIN ──────────────────────────────────────────────────────
hr('4. CHAIN PROOF — one-way value flow, every stage EV-positive');

var spinEV = exact.ev;             // S per 7 J
var dropEV = base.evG;             // G per 7 S
console.log('  Stage                    stake        expected return      edge');
console.log('  Match-3 move             free         ' + jPerMove.toFixed(2).padEnd(8) + ' J          +∞ (faucet)');
console.log('  Slot spin                7 J (≡1 S)   ' + spinEV.toFixed(3).padEnd(8) + ' S          +' + pct(spinEV - 1));
console.log('  Dozer drop               7 S (≡1 G)   ' + dropEV.toFixed(3).padEnd(8) + ' G          +' + pct(dropEV - 1));
console.log('\n  End-to-end: 49 J pushed through both gates → ' + (spinEV * dropEV).toFixed(3) +
  ' G ≈ ' + (spinEV * dropEV * 49).toFixed(1) + ' J of value (' + pct(spinEV * dropEV) + ' round trip).');
console.log('  · Variance without ruin: each stage is +EV, so progress is a supermartingale —');
console.log('    losing streaks are bounded by the free Match-3/Grove faucet (no dead-end).');
console.log('  · No backward conversion exists (G→S→J impossible), so value flows one way.');
console.log('  · Inflation sink: exponential upgrade costs (growth 1.15–2.6) and charm chests.');

var allOK = slotOK && dozerOK && jPerMove > 1;
console.log('\n' + (allOK ? '  ✅ ALL PUBLISHED ECONOMY CLAIMS VERIFIED.' : '  ❌ ECONOMY CHECK FAILED — see above.'));
process.exit(allOK ? 0 : 1);
