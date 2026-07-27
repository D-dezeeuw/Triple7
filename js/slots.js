/* Triple7 — slots.js  ("Sunshine Sevens 2.0")
 * 5×4 video slot, 6 fixed paylines (D.SLOT.LINES: 4 flat rows paying runs
 * anywhere + V/Λ anchored at reel 1), scatter-triggered skill-stop bonus.
 * Every window cell is an independent draw from one 64-stop weighted
 * distribution — outcome is decided the instant you spin; the reels are pure
 * theater. Pure resolve + exact analytic RTP are UMD-exported for the Node
 * verifier (line EV is closed-form, scatter is an exact binomial).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./data.js'));
  } else {
    root.T7 = root.T7 || {};
    root.T7.slots = factory(root.T7.util, root.T7.data);
  }
})(typeof self !== 'undefined' ? self : this, function (U, D) {
  'use strict';

  var S = D.SLOT;
  var COLS = S.GRID.COLS, ROWS = S.GRID.ROWS, CELLS = COLS * ROWS;

  // Weights are fixed for all upgrade levels now — Lucky Sevens extends the
  // bonus ladder instead of touching the reels (see ladderFor), keeping the
  // scatter frequency, and with it the inflation ceiling, bounded.
  function reelWeights() {
    return S.REEL.map(function (r) { return { id: r.id, w: r.w }; });
  }

  // The effective bonus ladder at a Lucky Sevens level, and its full up-then-
  // down step cycle (the thing the counter actually walks, and the thing the
  // blind-stop mean is averaged over).
  function ladderFor(luckyLvl) {
    return S.BONUS.LADDER.concat(S.BONUS.LADDER_EXT.slice(0, luckyLvl || 0));
  }
  function ladderCycle(luckyLvl) {
    var lad = ladderFor(luckyLvl);
    return lad.concat(lad.slice(1, lad.length - 1).reverse());
  }
  function ladderBlindMean(luckyLvl) {
    var cyc = ladderCycle(luckyLvl);
    var sum = 0;
    for (var i = 0; i < cyc.length; i++) sum += cyc[i];
    return sum / cyc.length;
  }

  function isFlatLine(rows) {
    for (var i = 1; i < rows.length; i++) if (rows[i] !== rows[0]) return false;
    return true;
  }

  // Evaluate a landed grid (grid[col][row] = symbol id) over the paylines.
  // Hybrid rules: a flat row line pays its best 3+ run ANYWHERE along the row
  // (only one such run can exist in 5 cells); a shaped line (V/Λ) pays only a
  // run anchored at reel 1, the classic rule. Returns
  // { lineWins: [{line, sym, n, start, pay}], scatters, sun, bonus } —
  // sun is the pre-multiplier sum of line pays; bonus means 3+ scatter Sevens.
  function evaluate(grid) {
    var lineWins = [], sun = 0;
    for (var l = 0; l < S.LINES.length; l++) {
      var rows = S.LINES[l];
      var maxStart = isFlatLine(rows) ? COLS - 3 : 0;
      var best = null;
      for (var start = 0; start <= maxStart; start++) {
        var sym = grid[start][rows[start]];
        var n = 1;
        while (start + n < COLS && grid[start + n][rows[start + n]] === sym) n++;
        if (n >= 3 && (!best || n > best.n)) best = { sym: sym, n: n, start: start };
        if (best && best.n >= 3) break;   // a second 3+ run can't fit in 5 cells
      }
      if (best) {
        var pay = S.PAYS[best.sym][best.n - 3];
        lineWins.push({ line: l, sym: best.sym, n: best.n, start: best.start, pay: pay });
        sun += pay;
      }
    }
    var scatters = 0;
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) if (grid[c][r] === 'seven') scatters++;
    }
    return { lineWins: lineWins, scatters: scatters, sun: sun,
             bonus: scatters >= S.SCATTER_MIN };
  }

  // One spin: draws the 20 cells column-major (col 0 top→bottom, then col 1…)
  // so the rng stream stays reproducible, then evaluates. Returns
  // { grid, lineWins, scatters, sun, bonus } — sun is pre-multiplier.
  function resolveSpin(rng, luckyLvl) {
    var weights = reelWeights();
    var grid = [];
    for (var c = 0; c < COLS; c++) {
      grid.push([]);
      for (var r = 0; r < ROWS; r++) grid[c].push(rng.weighted(weights).id);
    }
    var ev = evaluate(grid);
    ev.grid = grid;
    void luckyLvl;   // kept in the signature for call-site compatibility
    return ev;
  }

  function comb(n, k) {
    var v = 1;
    for (var i = 0; i < k; i++) v = v * (n - i) / (i + 1);
    return v;
  }

  // Exact analytic RTP — no sampling anywhere. Hybrid line rules:
  //   flat row lines (best 3+ run anywhere in the 5 cells):
  //     P(run=3) = 3p³q² + 2p⁴q · P(run=4) = 2p⁴q · P(run=5) = p⁵
  //     (enumerate the 2⁵ same/other masks by max-run to verify)
  //   shaped lines (run anchored at reel 1):
  //     P(3) = p³q · P(4) = p⁴q · P(5) = p⁵
  //   bonus: P(scatter Sevens ≥ 3) is an exact Binomial(20, p7), priced at
  //   the blind-stop ladder mean (skill can only raise a real player above
  //   this baseline — see docs/fairness.md).
  // Expectation is linear even though lines share cells, so the totals are
  // exact. Returns the par sheet used by tests, the simulator, the paytable.
  function enumerateRTP(luckyLvl) {
    var weights = reelWeights();
    var total = 0;
    weights.forEach(function (w) { total += w.w; });
    var nFlat = 0, nShaped = 0;
    S.LINES.forEach(function (rows) { if (isFlatLine(rows)) nFlat++; else nShaped++; });
    var linesEV = 0, lines = [], expLineWins = 0;
    weights.forEach(function (w) {
      var p = w.w / total, q = 1 - p;
      for (var n = 3; n <= COLS; n++) {
        var pFlat = n === 3 ? 3 * Math.pow(p, 3) * q * q + 2 * Math.pow(p, 4) * q :
                    n === 4 ? 2 * Math.pow(p, 4) * q : Math.pow(p, 5);
        var pShaped = Math.pow(p, n) * (n < COLS ? q : 1);
        var pay = S.PAYS[w.id][n - 3];
        var evPart = (nFlat * pFlat + nShaped * pShaped) * pay;
        linesEV += evPart;
        expLineWins += nFlat * pFlat + nShaped * pShaped;
        lines.push({ label: n + '×' + w.id, pFlat: pFlat, pShaped: pShaped,
                     pay: pay, evPart: evPart });
      }
    });
    lines.sort(function (a, b) { return b.evPart - a.evPart; });
    var p7 = 2 / total;
    weights.forEach(function (w) { if (w.id === 'seven') p7 = w.w / total; });
    var bonusP = 1;
    for (var k = 0; k < S.SCATTER_MIN; k++) {
      bonusP -= comb(CELLS, k) * Math.pow(p7, k) * Math.pow(1 - p7, CELLS - k);
    }
    var blind = ladderBlindMean(luckyLvl);
    var ev = linesEV + bonusP * blind;
    return {
      ev: ev,
      linesEV: linesEV,
      nFlat: nFlat,
      nShaped: nShaped,
      expLineWins: expLineWins,        // E[# winning lines]/spin
      lines: lines,
      bonusP: bonusP,
      bonusBlind: blind,
      ladder: ladderFor(luckyLvl)
    };
  }

  // Resort level (1-based) for a lifetime spin count — drives the Beach
  // Getaway top screen. Pure function of the spin COUNT, never of outcomes,
  // so it lives outside the odds model entirely.
  function resortLevel(spins) {
    var lv = 1;
    for (var i = 0; i < D.RESORT.LEVELS.length; i++) if (spins >= D.RESORT.LEVELS[i].at) lv = i + 1;
    return lv;
  }

  var core = { resolveSpin: resolveSpin, evaluate: evaluate, enumerateRTP: enumerateRTP,
               reelWeights: reelWeights, resortLevel: resortLevel,
               ladderFor: ladderFor, ladderCycle: ladderCycle,
               ladderBlindMean: ladderBlindMean };

  if (typeof document === 'undefined') return core;

  // ── Canvas view ───────────────────────────────────────────────────────────
  var SYM_COLORS = {
    seven:  { c: '#ff3355', hi: '#ff88a0' },
    star:   { c: '#ffc93c', hi: '#fff3b0' },
    berry:  { c: '#7b52d6', hi: '#c9b1ff' },
    melon:  { c: '#37c05e', hi: '#a4f0b7' },
    lemon:  { c: '#ffd23f', hi: '#fff3a6' },
    cherry: { c: '#e8283c', hi: '#ff7d8a' }
  };
  var STOP_BASE = [0.9, 1.3, 1.7, 2.1, 2.5]; // seconds until each reel locks
  var ANTICIPATION_MULT = 1.8;            // reels 4–5 delay when scatter is brewing
  // Payline identity colors for the win presentation (index = line number).
  var LINE_COLORS = ['#ff5a4e', '#ffc93c', '#3ec6ff', '#37c05e', '#b06ce8',
                     '#ff8c1a', '#ff6bb3', '#7dffb0', '#ffffff'];
  // Beach Getaway weather: purely cosmetic looks for the top screen, drifting
  // every 20–40 spins. Selection uses decorative Math.random (same precedent
  // as match3's sweep timing) — it never reads the seeded gameplay stream.
  var WEATHERS = ['sunny', 'sunset', 'breezy', 'splash'];
  var WEATHER_SKY = {
    sunny:  ['#8fdcff', '#d9f4ff'],
    sunset: ['#ffd9a0', '#ff8a66'],
    breezy: ['#a5e2ff', '#e6f8ff'],
    splash: ['#6fcdf2', '#c6efff']
  };

  function View(canvas, game, rng, hooks) {
    this.cv = canvas; this.g = game; this.rng = rng;
    this.hooks = hooks || {};
    this.ctx = canvas.getContext('2d');
    this.time = 0;
    // Visual strips: the 64 weighted stops, shuffled once — matches true odds
    // so what scrolls past honestly represents the distribution. Each spin
    // splices its drawn column in at the landing window (see spin()), which
    // keeps the strip converging to the same weighted mix over time.
    // The shuffle is DECORATIVE (it only orders what scrolls past; the landed
    // symbols are spliced in from resolveSpin), so it uses Math.random — the
    // seeded slots stream must be spent only on actual outcomes, or simply
    // opening the Slots tab would shift the next spin's result.
    this.strips = [];
    for (var r = 0; r < COLS; r++) {
      var strip = [];
      S.REEL.forEach(function (s) { for (var i = 0; i < s.w; i++) strip.push(s.id); });
      for (var i = strip.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = strip[i]; strip[i] = strip[j]; strip[j] = tmp;
      }
      this.strips.push(strip);
    }
    this.pos = [0, 0, 0, 0, 0];           // strip position of the window's top row
    this.reel = [null, null, null, null, null];
    this.spinning = false;
    this.result = null;
    this.flash = 0;                        // win flash timer
    this.lastWin = null;
    this.anticipating = false;
    this.bonus = null;                     // skill-stop bonus state machine
    this.weather = 'sunny';
    this.weatherAt = game.s.stats.spins + 20 + Math.floor(Math.random() * 21);
    this.sparkles = [];                   // decorative win droplets (cosmetic only)
    // Tap anywhere on the machine to stop the bonus counter.
    var self = this;
    canvas.addEventListener('pointerdown', function () {
      if (self.bonus && self.bonus.phase === 'count') self.stopBonus();
    });
  }

  View.prototype.canSpin = function () {
    return !this.spinning && !this.bonus &&
           this.g.canAfford('juice', D.CONVERSION.SPIN_COST_J);
  };

  View.prototype.spin = function () {
    // During the bonus, the SPIN button (and the Auto-Spinner, which calls
    // this same method) becomes the STOP button.
    if (this.bonus) return this.stopBonus();
    if (!this.canSpin()) {
      // Mirrors dozer.js's tryDrop: only the "can't afford it" case earns a
      // 'bad' cue — already-spinning is just a no-op, not a failed purchase.
      if (this.hooks.sfx && !this.g.canAfford('juice', D.CONVERSION.SPIN_COST_J)) this.hooks.sfx('bad');
      return false;
    }
    var g = this.g;
    g.spend('juice', D.CONVERSION.SPIN_COST_J);
    var res = resolveSpin(this.rng, g.upLvl('luckysevens'));
    this.result = res;
    this.spinning = true;
    this.lastWin = null;
    this.flash = 0;
    // Scatter anticipation, decided from the already-final grid: 2+ Sevens
    // among the first three reels → the last two spin longer with a glow.
    // Presentation only; the outcome was fixed the moment the stake was paid.
    var early = 0;
    for (var c = 0; c < 3; c++) {
      for (var rw0 = 0; rw0 < ROWS; rw0++) if (res.grid[c][rw0] === 'seven') early++;
    }
    this.anticipating = early >= 2;

    for (var r = 0; r < COLS; r++) {
      var stopAt = STOP_BASE[r];
      if (this.anticipating && r >= 3) stopAt *= ANTICIPATION_MULT;
      // Splice the drawn column into the strip at a landing window ahead, then
      // travel a whole number of symbols (≥3 loops) to arrive exactly on it.
      var strip = this.strips[r];
      var current = ((Math.round(this.pos[r]) % strip.length) + strip.length) % strip.length;
      var land = (current + 8 + Math.floor(Math.random() * (strip.length - 12))) % strip.length;
      for (var rw = 0; rw < ROWS; rw++) strip[(land + rw) % strip.length] = res.grid[r][rw];
      var distance = as_int(this.pos[r], land, strip.length);
      this.reel[r] = { t: 0, dur: stopAt, from: this.pos[r], dist: distance, done: false };
    }
    if (this.hooks.sfx) this.hooks.sfx('spin');
    g.s.stats.spins++;
    if (g.s.stats.spins >= this.weatherAt) {
      var w = this.weather;
      var pool = WEATHERS.filter(function (id) { return id !== w; });
      this.weather = pool[Math.floor(Math.random() * pool.length)];
      this.weatherAt = g.s.stats.spins + 20 + Math.floor(Math.random() * 21);
    }
    return true;
  };

  // Distance helper: whole symbols from `from` so that (from+dist) % len === target % len.
  function as_int(from, target, len) {
    var base = Math.ceil(from);
    var diff = ((target - base) % len + len) % len;
    return (base - from) + diff + len * 3;   // at least 3 full loops for show
  }

  View.prototype.update = function (dt) {
    this.time += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    for (var i = this.sparkles.length - 1; i >= 0; i--) {
      var s = this.sparkles[i];
      s.t += dt;
      s.vy += s.gravity * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t > s.life) this.sparkles.splice(i, 1);
    }
    if (this.bonus) this.updateBonus(dt);
    if (!this.spinning) return;

    var allDone = true;
    for (var r = 0; r < COLS; r++) {
      var st = this.reel[r];
      if (!st) continue;
      if (!st.done) {
        st.t += dt;
        var k = Math.min(1, st.t / st.dur);
        // Ease-out with a longer cruise for anticipation reels.
        var eased = 1 - Math.pow(1 - k, 3);
        this.pos[r] = st.from + st.dist * eased;
        if (k >= 1) {
          st.done = true;
          this.pos[r] = Math.round(st.from + st.dist);
          if (this.hooks.sfx) this.hooks.sfx('reelstop');
        } else {
          allDone = false;
        }
      }
    }
    if (allDone) {
      this.spinning = false;
      this.settle();
    }
  };

  View.prototype.settle = function () {
    var g = this.g, res = this.result;
    var creditedSun = 0;
    if (res.sun > 0) creditedSun = g.gain('suncoin', res.sun);
    g.s.stats.slotSunWon += creditedSun;   // Phase 28.7: personal RTP tracking
    if (res.sun > 0) {
      this.flash = res.sun >= 35 ? 2.5 : 1.2;
      if (this.hooks.sfx) this.hooks.sfx('win');
      this.spawnWinSparkles();
    } else if (!res.bonus && this.hooks.sfx) {
      this.hooks.sfx('nowin');
    }
    this.lastWin = { sun: creditedSun, gems: 0, lines: res.lineWins.length,
                     kind: res.bonus ? 'bonus' : (res.sun > 0 ? 'lines' : 'none') };
    this.checkResort();
    if (res.bonus) this.startBonus(res.scatters);
    if (this.hooks.onSettle) this.hooks.onSettle(this.lastWin);
    g.checkAchievements();
  };

  // ── Beach Bonus: the skill-stop counter ───────────────────────────────────
  // 3+ scatter Sevens turn the top screen into a rapidly stepping coin ladder.
  // Honestly skill-based: whatever value is showing when the player stops is
  // exactly what's credited — the machine never nudges or re-decides it (the
  // inverse of real pachislo "skill stop" cheats; see docs/fairness.md). Idle
  // players and the Auto-Spinner get an automatic stop after AUTO_CYCLES full
  // cycles, which over time pays the published blind-stop mean.
  View.prototype.startBonus = function (scatters) {
    var cyc = ladderCycle(this.g.upLvl('luckysevens'));
    this.bonus = { phase: 'banner', t: 0, idx: 0, stepT: 0, cycles: 0,
                   cycle: cyc, peak: Math.max.apply(null, cyc),
                   scatters: scatters, value: cyc[0], award: 0, gems: 0 };
    if (this.hooks.sfx) this.hooks.sfx('sparkle');
  };

  View.prototype.updateBonus = function (dt) {
    var b = this.bonus;
    b.t += dt;
    if (b.phase === 'banner') {
      if (b.t > 1.0) { b.phase = 'count'; b.t = 0; }
    } else if (b.phase === 'count') {
      b.stepT += dt;
      var step = S.BONUS.STEP_MS / 1000;
      while (b.stepT >= step && b.phase === 'count') {
        b.stepT -= step;
        b.idx = (b.idx + 1) % b.cycle.length;
        b.value = b.cycle[b.idx];
        if (b.idx === 0) {
          b.cycles++;
          if (b.cycles >= S.BONUS.AUTO_CYCLES) this.stopBonus();   // blind auto-stop
        }
      }
    } else if (b.phase === 'stopped') {
      if (b.t > 1.6) this.bonus = null;
    }
  };

  View.prototype.stopBonus = function () {
    var b = this.bonus, g = this.g;
    if (!b || b.phase !== 'count') return false;   // banner not armed yet; stopped is final
    b.award = g.gain('suncoin', b.value);
    g.s.stats.slotSunWon += b.award;               // bonus is part of the spin's return
    if (b.value === b.peak) {
      // The skill jackpot: catching the top rung. Pays Stargems on top and
      // counts as the "TRIPLE SEVEN" moment (stats + achievement + fanfare).
      b.gems = g.gain('stargem', S.BONUS.PEAK_GEMS);
      g.s.stats.jackpots++;
      this.flash = 3.0;
      if (this.hooks.sfx) this.hooks.sfx('jackpot');
      if (this.hooks.onJackpot) this.hooks.onJackpot(b.award, b.gems);
    } else {
      this.flash = 1.2;
      if (this.hooks.sfx) this.hooks.sfx('win');
    }
    b.phase = 'stopped'; b.t = 0;
    g.checkAchievements();
    return true;
  };

  // Immediate resolution for lifecycle edges (tab hidden, page closing): a
  // running counter stops right where it is so the credit lands before any
  // persist — a bonus can never be silently lost.
  View.prototype.forceStopBonus = function () {
    if (!this.bonus) return;
    if (this.bonus.phase === 'banner') { this.bonus.phase = 'count'; this.bonus.t = 0; }
    if (this.bonus.phase === 'count') this.stopBonus();
    this.bonus = null;
  };

  // Resort level-ups pay their one-time gift here, on settle (not at boot):
  // an existing save with hundreds of spins collects its whole backlog on the
  // first settle, one toast per level. Raw credit like achievement gems — a
  // fixed published milestone, never multiplied — and deliberately NOT added
  // to slotSunWon, which stays a strict per-stake measure for the personal
  // RTP audit.
  View.prototype.checkResort = function () {
    var g = this.g;
    var lv = resortLevel(g.s.stats.spins);
    while (g.s.resort.rewarded < lv - 1) {
      g.s.resort.rewarded++;
      var def = D.RESORT.LEVELS[g.s.resort.rewarded];
      if (def.sun > 0) g.gain('suncoin', def.sun, true);
      if (this.hooks.onResort) this.hooks.onResort(def, g.s.resort.rewarded + 1);
    }
  };

  // Decorative glassy droplets rising off the winning cells — the same
  // bubble language as match-3's clear particles. Capped so back-to-back
  // wins can't accumulate unbounded.
  View.prototype.spawnWinSparkles = function () {
    var wins = this.result && this.result.lineWins;
    if (!wins || !wins.length) return;
    var L = this.layout();
    var reelW = L.winW / COLS, symH = L.winH / ROWS;
    // First winning line's cells carry the burst (enough to read, not a storm).
    var win = wins[0], rows = S.LINES[win.line];
    for (var c = win.start; c < win.start + win.n; c++) {
      var cx = L.winX + c * reelW + reelW / 2;
      var cy = L.winY + rows[c] * symH + symH / 2;
      for (var i = 0; i < 4; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        var spd = symH * (0.9 + Math.random() * 1.3);
        this.sparkles.push({
          x: cx + (Math.random() - 0.5) * reelW * 0.4, y: cy,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          gravity: symH * 2.6, r: 2 + Math.random() * 3,
          t: 0, life: 0.55 + Math.random() * 0.35
        });
      }
    }
    if (this.sparkles.length > 90) this.sparkles.splice(0, this.sparkles.length - 90);
  };

  // ── Drawing ───────────────────────────────────────────────────────────────
  function drawSymbol(ctx, id, cx, cy, r, time) {
    var col = SYM_COLORS[id];
    // Shared wet-glass shadow (Phase 21.5) — same painter match3/dozer use.
    U.drawSoftShadow(ctx, cx, cy + r * 0.8, r * 0.8, r * 0.26, col.c, 0.2);

    // Painted sprite skin when loaded; canvas painter below stays the fallback.
    var spr = typeof T7 !== 'undefined' && T7.sprites && T7.sprites.get(id);
    if (spr) {
      var side = r * 2.4;
      ctx.drawImage(spr, cx - side / 2, cy - side / 2, side, side);
      return;
    }

    var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.15);
    g.addColorStop(0, col.hi); g.addColorStop(0.55, col.c); g.addColorStop(1, col.c);
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    switch (id) {
      case 'seven':
        ctx.restore();
        ctx.save();
        ctx.font = '900 ' + Math.round(r * 2.1) + 'px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = r * 0.28; ctx.strokeStyle = '#8f0f26';
        ctx.strokeText('7', cx, cy + r * 0.1);
        var g7 = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
        g7.addColorStop(0, '#ff8ba0'); g7.addColorStop(0.5, '#ff3355'); g7.addColorStop(1, '#c40f35');
        ctx.fillStyle = g7;
        ctx.fillText('7', cx, cy + r * 0.1);
        ctx.restore();
        ctx.save(); ctx.translate(cx, cy);
        break;
      case 'star':
        var spikes = 5, outer = r, inner = r * 0.45;
        for (var i = 0; i < spikes * 2; i++) {
          var rad = i % 2 === 0 ? outer : inner;
          var ang = (i * Math.PI) / spikes - Math.PI / 2 + Math.sin(time) * 0.03;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'cherry':
        ctx.arc(-r * 0.4, r * 0.2, r * 0.55, 0, 7);
        ctx.arc(r * 0.4, r * 0.28, r * 0.55, 0, 7);
        ctx.fill();
        ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.2); ctx.quadraticCurveTo(0, -r * 0.9, r * 0.35, -r * 0.15);
        ctx.stroke();
        break;
      case 'lemon':
        ctx.ellipse(0, 0, r, r * 0.7, -0.5, 0, 7); ctx.fill();
        break;
      case 'melon':
        ctx.arc(0, -r * 0.1, r, 0, Math.PI); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1c7a38'; ctx.lineWidth = r * 0.16;
        ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.93, 0.06, Math.PI - 0.06); ctx.stroke();
        break;
      case 'berry':
        ctx.arc(0, -r * 0.4, r * 0.45, 0, 7);
        ctx.arc(-r * 0.42, r * 0.28, r * 0.45, 0, 7);
        ctx.arc(r * 0.42, r * 0.28, r * 0.45, 0, 7);
        ctx.fill();
        break;
    }
    ctx.restore();
    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.24, r * 0.13, -0.6, 0, 7); ctx.fill();
  }

  // Shared layout: the Beach Getaway top screen and the reel cabinet stack
  // vertically, both centered. settle() needs the same numbers as draw() to
  // place win sparkles, so it's computed in one place.
  View.prototype.layout = function () {
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    var frameW = Math.min(W - 20, 460);
    var topH = U.clamp(Math.round(H * 0.32), 100, 150);
    var topY = 8;
    var fy = topY + topH + 10;
    var frameH = Math.min(H - fy - 10, 300);
    var fx = (W - frameW) / 2;
    return { W: W, H: H,
             topX: fx, topY: topY, topW: frameW, topH: topH,
             fx: fx, fy: fy, frameW: frameW, frameH: frameH,
             winX: fx + 24, winY: fy + 30, winW: frameW - 48, winH: frameH - 78 };
  };

  View.prototype.draw = function () {
    var ctx = this.ctx;
    var L = this.layout();
    var W = L.W, H = L.H;
    ctx.clearRect(0, 0, W, H);

    this.drawTopScreen(ctx, L);
    if (this.bonus) this.drawBonusOverlay(ctx, L);

    var frameW = L.frameW, frameH = L.frameH;
    var fx = L.fx, fy = L.fy;

    // Cabinet
    var cab = ctx.createLinearGradient(fx, fy, fx, fy + frameH);
    cab.addColorStop(0, '#ffb347'); cab.addColorStop(0.5, '#ff8c1a'); cab.addColorStop(1, '#e06d00');
    ctx.fillStyle = cab;
    rr(ctx, fx, fy, frameW, frameH, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    rr(ctx, fx + 3, fy + 3, frameW - 6, frameH - 6, 21); ctx.stroke();

    // Window: 5 reels × 4 visible rows.
    var winX = L.winX, winY = L.winY, winW = L.winW, winH = L.winH;
    var reelW = winW / COLS;
    var symH = winH / ROWS;

    for (var r = 0; r < COLS; r++) {
      var rx = winX + r * reelW;
      ctx.save();
      rr(ctx, rx + 2, winY, reelW - 4, winH, 10);
      ctx.clip();
      // Reel background
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(rx, winY, reelW, winH);

      var strip = this.strips[r];
      var p = this.pos[r];
      var base = Math.floor(p);
      var frac = p - base;
      for (var row = -1; row <= ROWS; row++) {
        var idx = ((base + row) % strip.length + strip.length) % strip.length;
        var cy = winY + (row - frac) * symH + symH / 2;
        // Cylinder curvature: shrink and dim toward window edges (pseudo-3D).
        var rel = (cy - (winY + winH / 2)) / (winH / 2);
        if (rel < -1.3 || rel > 1.3) continue;
        var squash = Math.cos(U.clamp(rel, -1, 1) * 0.55);
        ctx.save();
        ctx.translate(rx + reelW / 2, cy);
        ctx.scale(1, Math.max(0.25, squash));
        drawSymbol(ctx, strip[idx], 0, 0, Math.min(reelW, symH) * 0.36, this.time);
        ctx.restore();
      }
      // Cylinder shading overlay
      var shade1 = ctx.createLinearGradient(0, winY, 0, winY + winH);
      shade1.addColorStop(0, 'rgba(60,30,0,0.35)');
      shade1.addColorStop(0.15, 'rgba(60,30,0,0.06)');
      shade1.addColorStop(0.5, 'rgba(255,255,255,0.0)');
      shade1.addColorStop(0.85, 'rgba(60,30,0,0.06)');
      shade1.addColorStop(1, 'rgba(60,30,0,0.35)');
      ctx.fillStyle = shade1;
      ctx.fillRect(rx, winY, reelW, winH);
      ctx.restore();

      // Scatter anticipation glow on the two reels still to land.
      if (this.spinning && this.anticipating && r >= 3 && this.reel[r] && !this.reel[r].done) {
        ctx.strokeStyle = 'rgba(255, 60, 90, ' + (0.5 + 0.4 * Math.sin(this.time * 10)) + ')';
        ctx.lineWidth = 4;
        rr(ctx, rx + 2, winY, reelW - 4, winH, 10); ctx.stroke();
      }
    }

    // Faint payline guides while the machine rests — legibility for "where
    // can I win", gone the moment anything is in motion.
    if (!this.spinning && !this.bonus && this.flash <= 0) this.drawGuideLines(ctx, L);
    if (!this.spinning) this.drawWinLines(ctx, L);

    // Win banner
    if (this.lastWin && this.lastWin.sun > 0 && this.flash > 0 && !this.bonus) {
      ctx.font = '800 24px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      var msg = '+' + U.fmt(this.lastWin.sun) + ' Suncoins!' +
                (this.lastWin.lines > 1 ? ' (' + this.lastWin.lines + ' lines)' : '');
      ctx.fillStyle = 'rgba(80,20,0,0.65)';
      ctx.strokeStyle = 'rgba(80,20,0,0.65)';
      ctx.lineWidth = 6;
      ctx.strokeText(msg, W / 2, fy + frameH - 16);
      ctx.fillStyle = this.lastWin.sun >= 35 ? '#ffe066' : '#fff';
      ctx.fillText(msg, W / 2, fy + frameH - 16);
    }

    this.drawSparkles(ctx);
  };

  // Faint guide overlay: every payline's path at rest, each in its identity
  // color, quiet enough to read as etched glass rather than UI chrome.
  View.prototype.drawGuideLines = function (ctx, L) {
    var reelW = L.winW / COLS, symH = L.winH / ROWS;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var l = 0; l < S.LINES.length; l++) {
      var rows = S.LINES[l];
      ctx.strokeStyle = LINE_COLORS[l % LINE_COLORS.length];
      ctx.beginPath();
      for (var c = 0; c < COLS; c++) {
        var cx = L.winX + c * reelW + reelW / 2;
        // Nudge flat lines a touch per-index so overlapping straights and
        // shaped lines crossing them stay distinguishable.
        var cy = L.winY + rows[c] * symH + symH / 2 + (l % 2 ? 3 : -3);
        if (c === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  // Win presentation: cycle through the winning lines one at a time — the
  // line's colored path traces across the grid and the paying cells get a
  // glowing ring. Scatter Sevens pulse gold whenever the spin earned a bonus.
  View.prototype.drawWinLines = function (ctx, L) {
    var res = this.result;
    if (!res) return;
    var reelW = L.winW / COLS, symH = L.winH / ROWS;
    var c, cx, cy;
    if (res.bonus && (this.bonus || this.flash > 0)) {
      var pulse = 0.45 + 0.35 * Math.sin(this.time * 6);
      for (c = 0; c < COLS; c++) {
        for (var rw = 0; rw < ROWS; rw++) {
          if (res.grid[c][rw] !== 'seven') continue;
          ctx.strokeStyle = 'rgba(255, 201, 60, ' + pulse.toFixed(3) + ')';
          ctx.lineWidth = 3.5;
          rr(ctx, L.winX + c * reelW + 4, L.winY + rw * symH + 3, reelW - 8, symH - 6, 9);
          ctx.stroke();
        }
      }
    }
    if (!res.lineWins.length || this.flash <= 0) return;
    var win = res.lineWins[Math.floor(this.time / 0.7) % res.lineWins.length];
    var rows = S.LINES[win.line];
    var color = LINE_COLORS[win.line % LINE_COLORS.length];
    ctx.save();
    // Spotlight: dim every cell that is NOT part of the paying run, so the
    // combination is unmistakable — the path and rings never sweep through
    // unrelated fruit (that read as "random fruit counted as a combo").
    ctx.fillStyle = 'rgba(60, 30, 0, 0.38)';
    for (c = 0; c < COLS; c++) {
      for (var rw = 0; rw < ROWS; rw++) {
        var inRun = c >= win.start && c < win.start + win.n && rw === rows[c];
        if (inRun) continue;
        rr(ctx, L.winX + c * reelW + 2, L.winY + rw * symH + 2, reelW - 4, symH - 4, 8);
        ctx.fill();
      }
    }
    // Path drawn ONLY across the winning run.
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (c = win.start; c < win.start + win.n; c++) {
      cx = L.winX + c * reelW + reelW / 2;
      cy = L.winY + rows[c] * symH + symH / 2;
      if (c === win.start) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    // Ring + soft glow on the cells that actually pay.
    for (c = win.start; c < win.start + win.n; c++) {
      cx = L.winX + c * reelW + reelW / 2;
      cy = L.winY + rows[c] * symH + symH / 2;
      var gg = ctx.createRadialGradient(cx, cy, 2, cx, cy, symH * 0.7);
      gg.addColorStop(0, 'rgba(255, 240, 170, 0.35)');
      gg.addColorStop(1, 'rgba(255, 240, 170, 0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(cx, cy, symH * 0.7, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      rr(ctx, L.winX + c * reelW + 4, L.winY + rows[c] * symH + 3, reelW - 8, symH - 6, 9);
      ctx.stroke();
    }
    // Name the win right on the run: "3× melon".
    var midC = win.start + (win.n - 1) / 2;
    var labelX = L.winX + midC * reelW + reelW / 2;
    var runTopRow = Math.min.apply(null, rows.slice(win.start, win.start + win.n));
    var labelY = L.winY + runTopRow * symH - 7;
    if (labelY < L.winY + 12) labelY = L.winY + Math.max.apply(null, rows.slice(win.start, win.start + win.n)) * symH + symH + 14;
    ctx.globalAlpha = 1;
    ctx.font = '800 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(80, 20, 0, 0.75)';
    ctx.strokeText(win.n + '× ' + win.sym, labelX, labelY);
    ctx.fillStyle = '#fff';
    ctx.fillText(win.n + '× ' + win.sym, labelX, labelY);
    ctx.restore();
  };

  // The top screen mid-bonus: the beach dims and the skill-stop counter takes
  // over — a big stepping value, a rung bar showing where you are on the
  // ladder, and the STOP prompt. Pure presentation of bonus state.
  View.prototype.drawBonusOverlay = function (ctx, L) {
    var b = this.bonus;
    var x = L.topX, y = L.topY, w = L.topW, h = L.topH;
    ctx.save();
    rr(ctx, x, y, w, h, 18);
    ctx.clip();
    ctx.fillStyle = 'rgba(7, 40, 66, 0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.textAlign = 'center';
    if (b.phase === 'banner') {
      var bk = Math.min(1, b.t / 0.25);
      ctx.globalAlpha = bk;
      ctx.font = '900 24px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#ffe066';
      ctx.fillText('BEACH BONUS!', x + w / 2, y + h / 2 - 8);
      ctx.font = '700 13px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(b.scatters + ' Sevens — get ready to STOP the counter…', x + w / 2, y + h / 2 + 14);
    } else {
      var heat = (b.value - b.cycle[0]) / (b.peak - b.cycle[0]);   // 0..1 up the ladder
      var vs = b.phase === 'stopped' ? U.fmt(b.award) : U.fmt(b.value);
      ctx.font = '900 ' + Math.round(30 + heat * 10) + 'px "Trebuchet MS", sans-serif';
      ctx.fillStyle = b.phase === 'stopped'
        ? (b.gems > 0 ? '#ffe066' : '#fff')
        : 'hsl(' + Math.round(48 - heat * 10) + ',100%,' + Math.round(88 - heat * 22) + '%)';
      ctx.fillText((b.phase === 'stopped' ? '+' : '') + vs + ' S', x + w / 2, y + h * 0.42);
      // Rung bar: one notch per ladder value, lit up to the current rung.
      var lad = b.cycle.slice(0, (b.cycle.length + 2) / 2);
      var bw = Math.min(w - 60, lad.length * 26), bx = x + (w - bw) / 2, by = y + h * 0.58;
      for (var i = 0; i < lad.length; i++) {
        var lx = bx + (i + 0.5) * (bw / lad.length);
        var onRung = lad[i] === b.value && b.phase === 'count';
        var barH = 6 + i * 2.2;
        ctx.fillStyle = onRung ? '#ffe066' : (lad[i] <= b.value && b.phase === 'count' ? 'rgba(255,224,102,0.45)' : 'rgba(255,255,255,0.22)');
        rr(ctx, lx - 7, by + 14 - barH, 14, barH, 3);
        ctx.fill();
      }
      ctx.font = '700 12px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#fff';
      if (b.phase === 'count') {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 7);
        ctx.fillText('TAP or hit STOP to lock it in!', x + w / 2, y + h - 12);
      } else if (b.gems > 0) {
        ctx.fillText('PEAK CATCH — TRIPLE SEVEN! +' + U.fmt(b.gems) + ' Stargems!', x + w / 2, y + h - 12);
      }
    }
    ctx.restore();
  };

  // Win droplets as tiny glass bubbles — bright core, gold body, pinpoint
  // highlight — the same wet-glass look match-3's clear particles use.
  View.prototype.drawSparkles = function (ctx) {
    for (var i = 0; i < this.sparkles.length; i++) {
      var s = this.sparkles[i];
      var k = s.t / s.life;
      var a = k > 0.5 ? Math.max(0, 1 - (k - 0.5) / 0.5) : 1;
      if (a <= 0.02) continue;
      ctx.save();
      ctx.globalAlpha = a;
      var g = ctx.createRadialGradient(s.x - s.r * 0.35, s.y - s.r * 0.4, s.r * 0.1, s.x, s.y, s.r * 1.1);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, '#ffd76a');
      g.addColorStop(1, 'rgba(255,215,106,0.05)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.35, Math.max(0.35, s.r * 0.25), 0, 7); ctx.fill();
      ctx.restore();
    }
  };

  // ── Beach Getaway top screen ──────────────────────────────────────────────
  // The "dual screen" of a modern cabinet: a persistent vacation scene above
  // the reels. Everything here is read-only theater over stats.spins — the
  // scene furnishes itself as the resort levels up, weather drifts
  // cosmetically, and the progress bar counts spins toward the next level.
  View.prototype.drawTopScreen = function (ctx, L) {
    var x = L.topX, y = L.topY, w = L.topW, h = L.topH;
    var t = this.time;
    var spins = this.g.s.stats.spins;
    var lv = resortLevel(spins);
    var sky = WEATHER_SKY[this.weather] || WEATHER_SKY.sunny;

    ctx.save();
    rr(ctx, x, y, w, h, 18);
    ctx.clip();

    // Sky
    var skyG = ctx.createLinearGradient(0, y, 0, y + h);
    skyG.addColorStop(0, sky[0]); skyG.addColorStop(1, sky[1]);
    ctx.fillStyle = skyG;
    ctx.fillRect(x, y, w, h);

    // Sun — lower, larger and warmer at sunset.
    var sunset = this.weather === 'sunset';
    var sunX = x + w - 46, sunY = sunset ? y + h * 0.42 : y + 24;
    var sunR = sunset ? 16 : 12;
    var sunG = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunR * 2.6);
    sunG.addColorStop(0, '#fff8d6');
    sunG.addColorStop(0.4, sunset ? '#ffb15e' : '#ffe066');
    sunG.addColorStop(1, 'rgba(255,224,102,0)');
    ctx.fillStyle = sunG;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 2.6, 0, 7); ctx.fill();

    // Clouds drift; a breeze adds one and hurries them along.
    var clouds = this.weather === 'breezy' ? 3 : 2;
    var cspd = this.weather === 'breezy' ? 26 : 9;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (var c = 0; c < clouds; c++) {
      var ccx = x + ((t * cspd + c * 173) % (w + 120)) - 60;
      var ccy = y + 14 + c * 13;
      ctx.beginPath();
      ctx.ellipse(ccx, ccy, 26, 8, 0, 0, 7);
      ctx.ellipse(ccx + 16, ccy - 5, 16, 7, 0, 0, 7);
      ctx.fill();
    }

    // Ocean with a gently rolling top edge.
    var seaTop = y + h * 0.52, sandTop = y + h * 0.76;
    var seaG = ctx.createLinearGradient(0, seaTop, 0, sandTop);
    seaG.addColorStop(0, sunset ? '#3f8fc9' : '#2aa9d8');
    seaG.addColorStop(1, '#7fd7f0');
    ctx.fillStyle = seaG;
    ctx.beginPath();
    ctx.moveTo(x, seaTop + 3);
    for (var wx = 0; wx <= w; wx += 10) {
      ctx.lineTo(x + wx, seaTop + Math.sin(wx * 0.09 + t * 1.6) * 2.2);
    }
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();

    // Shimmer on the water; a splash spell doubles down on sparkle.
    var shimN = this.weather === 'splash' ? 10 : 4;
    for (var sh = 0; sh < shimN; sh++) {
      var shA = 0.22 + 0.34 * (0.5 + 0.5 * Math.sin(t * 2.2 + sh * 1.7));
      ctx.fillStyle = 'rgba(255,255,255,' + shA.toFixed(3) + ')';
      var shx = x + ((sh * 97 + 31) % w);
      var shy = seaTop + 6 + ((sh * 53) % Math.max(8, (sandTop - seaTop) - 10));
      ctx.fillRect(shx, shy, 7, 1.5);
    }

    // Sand
    var sandG = ctx.createLinearGradient(0, sandTop, 0, y + h);
    sandG.addColorStop(0, '#ffe9b8'); sandG.addColorStop(1, '#f2cf85');
    ctx.fillStyle = sandG;
    ctx.beginPath();
    ctx.moveTo(x, sandTop + 6);
    ctx.quadraticCurveTo(x + w * 0.5, sandTop - 6, x + w, sandTop + 8);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();

    // Props furnish the beach as the resort levels up.
    if (lv >= 4) this.drawBoat(ctx, x + w * 0.62, seaTop + (sandTop - seaTop) * 0.5 + Math.sin(t * 1.3) * 1.5, h);
    if (lv >= 5) this.drawResort(ctx, x + w * 0.34, sandTop + 3, h);
    if (lv >= 2) this.drawPalm(ctx, x + 34, sandTop + 10, h);
    if (lv >= 3) this.drawHut(ctx, x + w - 64, sandTop + 8, h);

    // ── Overlay UI: title, stars, progress ──
    ctx.textAlign = 'left';
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(7,52,79,0.85)';
    ctx.fillText('BEACH GETAWAY', x + 12, y + 18);
    ctx.font = '12px "Trebuchet MS", sans-serif';
    var full = '', empty = '';
    for (var st = 0; st < D.RESORT.LEVELS.length; st++) {
      if (st < lv) full += '★'; else empty += '☆';
    }
    ctx.fillStyle = '#e8a400';
    ctx.fillText(full, x + 12, y + 33);
    var fullW = ctx.measureText(full).width;
    ctx.fillStyle = 'rgba(7,52,79,0.4)';
    ctx.fillText(empty, x + 12 + fullW, y + 33);
    var starW = fullW + ctx.measureText(empty).width;
    ctx.font = '700 11px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(7,52,79,0.8)';
    ctx.fillText(D.RESORT.LEVELS[lv - 1].name, x + 16 + starW, y + 32);

    var barX = x + 12, barW = w - 24, barY = y + h - 16, barH = 7;
    ctx.fillStyle = 'rgba(7,52,79,0.30)';
    rr(ctx, barX, barY, barW, barH, 4); ctx.fill();
    var next = lv < D.RESORT.LEVELS.length ? D.RESORT.LEVELS[lv] : null;
    ctx.font = '700 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    if (next) {
      var prevAt = D.RESORT.LEVELS[lv - 1].at;
      var frac = U.clamp((spins - prevAt) / (next.at - prevAt), 0, 1);
      if (frac > 0) {
        var fillG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        fillG.addColorStop(0, '#ffc93c'); fillG.addColorStop(1, '#fff3b0');
        ctx.fillStyle = fillG;
        rr(ctx, barX, barY, Math.max(barH, barW * frac), barH, 4); ctx.fill();
      }
      ctx.fillStyle = 'rgba(7,52,79,0.75)';
      ctx.fillText('Next: ' + next.name + ' — ' + (next.at - spins) + ' spins', x + w - 12, barY - 4);
    } else {
      ctx.fillStyle = '#ffc93c';
      rr(ctx, barX, barY, barW, barH, 4); ctx.fill();
      ctx.fillStyle = 'rgba(7,52,79,0.75)';
      ctx.fillText('Resort complete ✦', x + w - 12, barY - 4);
    }
    ctx.restore();

    // Frosted screen edge.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 17); ctx.stroke();
  };

  // Scene props: all scaled off the panel height so the beach furnishes
  // itself identically on any canvas size.
  View.prototype.drawPalm = function (ctx, px, py, h) {
    var s = h / 130;
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s);
    ctx.strokeStyle = '#9c6b3f'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(4, -18, 12, -34); ctx.stroke();
    var tx = 12, ty = -34;
    ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 4;
    var angs = [-2.7, -2.1, -1.55, -1.0, -0.45];
    for (var f = 0; f < angs.length; f++) {
      var ex = tx + Math.cos(angs[f]) * 24;
      var ey = ty + Math.sin(angs[f]) * 14 + 8;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(angs[f]) * 14, ty + Math.sin(angs[f]) * 16 - 6, ex, ey);
      ctx.stroke();
    }
    ctx.fillStyle = '#7a4a28';
    ctx.beginPath(); ctx.arc(tx - 3, ty + 3, 2.5, 0, 7); ctx.arc(tx + 4, ty + 4, 2.5, 0, 7); ctx.fill();
    ctx.restore();
  };

  View.prototype.drawHut = function (ctx, px, py, h) {
    var s = h / 130;
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s);
    ctx.fillStyle = '#9c6b3f';
    ctx.fillRect(-16, -22, 3.5, 24); ctx.fillRect(12, -22, 3.5, 24);
    ctx.fillStyle = '#b98455';
    ctx.fillRect(-20, -6, 40, 7);
    ctx.fillStyle = '#e8c46a';
    ctx.beginPath();
    ctx.moveTo(-24, -20); ctx.lineTo(24, -20); ctx.lineTo(16, -32); ctx.lineTo(-16, -32);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c79b3b'; ctx.lineWidth = 1.5;
    for (var i = -18; i <= 18; i += 6) {
      ctx.beginPath(); ctx.moveTo(i, -20); ctx.lineTo(i * 0.7, -32); ctx.stroke();
    }
    // A little cocktail on the counter.
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath(); ctx.moveTo(-4, -13); ctx.lineTo(4, -13); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  View.prototype.drawBoat = function (ctx, px, py, h) {
    var s = h / 130;
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s);
    ctx.rotate(Math.sin(this.time * 1.3) * 0.05);
    ctx.fillStyle = '#b3502e';
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.quadraticCurveTo(0, 8, 16, 0); ctx.lineTo(12, -3); ctx.lineTo(-12, -3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a4a28'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -24); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(1, -23); ctx.quadraticCurveTo(13, -14, 2, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(-1, -21); ctx.quadraticCurveTo(-9, -12, -1, -5); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  View.prototype.drawResort = function (ctx, px, py, h) {
    var s = h / 130;
    ctx.save();
    ctx.translate(px, py); ctx.scale(s, s);
    ctx.fillStyle = '#fdf3e3';
    ctx.fillRect(-22, -34, 44, 30);
    ctx.fillStyle = '#f7b267';
    ctx.fillRect(-24, -38, 48, 5);
    ctx.fillStyle = '#ffd27a';
    for (var wy = 0; wy < 3; wy++) {
      for (var wx = 0; wx < 4; wx++) ctx.fillRect(-17 + wx * 10, -30 + wy * 9, 5.5, 5);
    }
    // Beach umbrella out front.
    ctx.strokeStyle = '#9c6b3f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(30, 4); ctx.lineTo(30, -10); ctx.stroke();
    ctx.fillStyle = '#ff5a4e';
    ctx.beginPath(); ctx.arc(30, -10, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.moveTo(30, -10); ctx.arc(30, -10, 9, Math.PI + 0.9, Math.PI + 1.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  core.View = View;
  return core;
});
