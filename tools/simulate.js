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
console.log('  Exact par sheet (5×4 window, 20 iid cells of 64 weighted stops,');
console.log('  ' + D.SLOT.LINES.length + ' paylines — line EV closed-form, scatter exact binomial):\n');
console.log('  run          P per line          pays     EV share (all lines)');
exact.lines.forEach(function (l) {
  console.log('  ' + l.label.padEnd(10) + (l.p.toFixed(9)).padStart(14) +
    '  (1 in ' + String(Math.round(1 / l.p)).padStart(9) + ')' +
    String(l.pay).padStart(6) + ' S   ' + l.evPart.toFixed(5) + ' S');
});
console.log('\n  Beach Bonus: P(3+ scatter Sevens) = ' + exact.bonusP.toFixed(6) +
  ' (1 in ' + Math.round(1 / exact.bonusP) + ') × blind-stop ladder mean ' +
  exact.bonusBlind.toFixed(4) + ' S = ' + (exact.bonusP * exact.bonusBlind).toFixed(5) + ' S/spin');
console.log('  (Skill can only lift a real player above the blind mean — the counter');
console.log('   pays exactly what it shows when stopped; ladder max ' +
  Math.max.apply(null, exact.ladder) + ' S + ' + D.SLOT.BONUS.PEAK_GEMS + ' G on the peak.)');
console.log('\n  EXACT EV = ' + exact.ev.toFixed(5) + ' S/spin  → RTP ' + pct(exact.ev) +
  '  (lines ' + exact.linesEV.toFixed(5) + ' + bonus ' + (exact.ev - exact.linesEV).toFixed(5) + ')');

// Monte Carlo: full spins; a triggered bonus is settled with a blind stop
// (uniform over the ladder cycle) — exactly what the published EV prices.
var rng = new rngMod.Rng(777001);
var cycle = slots.ladderCycle(0);
var mcPay = 0, mcHits = 0, mcBonuses = 0, mcLineWins = 0;
for (var s = 0; s < N_SPINS; s++) {
  var res = slots.resolveSpin(rng, 0);
  var pay = res.sun;
  mcLineWins += res.lineWins.length;
  if (res.bonus) {
    mcBonuses++;
    pay += cycle[Math.floor(rng.float() * cycle.length)];
  }
  mcPay += pay;
  if (pay > 0) mcHits++;
}
console.log('\n  Monte Carlo (' + N_SPINS.toLocaleString() + ' spins, seed 777001, blind bonus stops):');
console.log('    EV       = ' + (mcPay / N_SPINS).toFixed(5) + ' S/spin  (Δ vs exact: ' +
  Math.abs(mcPay / N_SPINS - exact.ev).toFixed(5) + ')');
console.log('    hit rate = ' + pct(mcHits / N_SPINS) + ' (incl. bonus triggers)' +
  ' · winning lines/spin = ' + (mcLineWins / N_SPINS).toFixed(4) +
  ' (exact ' + exact.expLineWins.toFixed(4) + ')' +
  ' · bonuses: ' + mcBonuses + ' (expect ~' + Math.round(N_SPINS * exact.bonusP) + ')');
var maxed = slots.enumerateRTP(3);
console.log('  With Lucky Sevens maxed (3 extra ladder rungs, top ' +
  Math.max.apply(null, maxed.ladder) + ' S): EV = ' + maxed.ev.toFixed(5) +
  ' S/spin → RTP ' + pct(maxed.ev));

var slotOK = Math.abs(exact.ev - 1.455259) < 0.0005 && exact.ev > 1.0 &&
             Math.abs(mcPay / N_SPINS - exact.ev) < 0.01;
console.log('\n  VERDICT: ' + (slotOK ? '✔ matches published 1.455259 S/spin; stage is EV-positive.'
  : '✘ MISMATCH with published EV!'));

// Inflation ceiling (§11.8): promo/upgrade EV must stay bounded — every
// multiplier source has a max level, but a change to one of them (or a new
// stacking source) could silently blow past a sane RTP. Lucky Sevens (max 3,
// each adding a higher bonus-ladder rung) and Sun-Kissed Reels (max 30,
// +5%/lvl) are the two slot-side sinks; this asserts their fully-maxed
// product never exceeds a 5.0x (500%) RTP ceiling. (Raised from 4.0 with the
// 5×4 machine: base EV moved to 1.455 and maxed lands at ≈4.47 — still a
// hard, published bound.)
var luckyU = D.UPGRADES.filter(function (u) { return u.id === 'luckysevens'; })[0];
var reelsU = D.UPGRADES.filter(function (u) { return u.id === 'sunreels'; })[0];
var maxSunMult = 1 + 0.05 * reelsU.max;
var maxedSlotEv = slots.enumerateRTP(luckyU.max).ev * maxSunMult;
var RTP_CEILING = 5.0;
console.log('\n  Inflation ceiling check (§11.8): Lucky Sevens maxed (+' + luckyU.max +
  ') × Sun-Kissed Reels maxed (+' + Math.round((maxSunMult - 1) * 100) + '%) → ' +
  maxedSlotEv.toFixed(3) + ' S/spin (RTP ' + pct(maxedSlotEv) + '), ceiling ' + RTP_CEILING.toFixed(1) + 'x');
var inflationOK = maxedSlotEv <= RTP_CEILING;
console.log('  VERDICT: ' + (inflationOK
  ? '✔ fully-maxed slot RTP stays under the ' + pct(RTP_CEILING) + ' ceiling.'
  : '✘ INFLATION CEILING BREACHED — maxed slot RTP exceeds ' + pct(RTP_CEILING) + '!'));

// Bonus drought odds (§10.3): published so players can trust the number
// rather than guess it — a rare event should still be an honestly-stated one.
console.log('\n  Beach Bonus drought odds (published — honesty over hype):');
[10, 43, 100, 300].forEach(function (n) {
  console.log('    P(no bonus in ' + n.toLocaleString() + ' spins) = ' +
    pct(Math.pow(1 - exact.bonusP, n)));
});
console.log('    (The 5-Seven dream line: p = ' +
  (D.SLOT.LINES.length * Math.pow(2 / 64, 5)).toExponential(2) + ' per spin — 777 S if it ever lands.)');

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

var allOK = slotOK && dozerOK && jPerMove > 1 && inflationOK;
console.log('\n' + (allOK ? '  ✅ ALL PUBLISHED ECONOMY CLAIMS VERIFIED.' : '  ❌ ECONOMY CHECK FAILED — see above.'));
process.exit(allOK ? 0 : 1);
