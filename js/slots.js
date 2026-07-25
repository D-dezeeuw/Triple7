/* Triple7 — slots.js  ("Sunshine Sevens")
 * Weighted virtual-reel slot machine (the par-sheet model real slots use):
 * outcome is decided the instant you spin; the reels are pure theater.
 * Pure resolve + exact RTP enumeration are UMD-exported for the Node verifier.
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

  function reelWeights(luckyLvl) {
    // Lucky Sevens upgrade adds +1 seven stop per reel per level (max 3).
    return S.REEL.map(function (r) {
      return { id: r.id, w: r.id === 'seven' ? r.w + (luckyLvl || 0) : r.w };
    });
  }

  function evaluate(symbols) {
    var counts = {};
    symbols.forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
    if (counts[symbols[0]] === 3) {
      var sym = symbols[0];
      return {
        kind: sym === 'seven' ? 'jackpot' : 'triple',
        sym: sym,
        sun: S.PAYS[sym],
        gems: sym === 'seven' ? S.JACKPOT_GEM_BONUS : 0
      };
    }
    if ((counts.seven || 0) === 2) return { kind: 'pair7', sun: S.PAIR_SEVEN_PAYS, gems: 0 };
    if ((counts.cherry || 0) === 2) return { kind: 'pair-cherry', sun: S.PAIR_CHERRY_PAYS, gems: 0 };
    return { kind: 'none', sun: 0, gems: 0 };
  }

  // One spin: returns { symbols, sun, gems, kind } — sun is pre-multiplier.
  function resolveSpin(rng, luckyLvl) {
    var weights = reelWeights(luckyLvl);
    var symbols = [rng.weighted(weights).id, rng.weighted(weights).id, rng.weighted(weights).id];
    var ev = evaluate(symbols);
    ev.symbols = symbols;
    return ev;
  }

  // Exact RTP: enumerate all 6^3 symbol combos with exact probabilities.
  // Returns { ev, hitRate, lines: [{label, p, pay, evPart}] } — the par sheet.
  function enumerateRTP(luckyLvl) {
    var weights = reelWeights(luckyLvl);
    var total = 0;
    weights.forEach(function (w) { total += w.w; });
    var ev = 0, hit = 0, byKind = {};
    for (var a = 0; a < weights.length; a++) {
      for (var b = 0; b < weights.length; b++) {
        for (var c = 0; c < weights.length; c++) {
          var p = (weights[a].w / total) * (weights[b].w / total) * (weights[c].w / total);
          var res = evaluate([weights[a].id, weights[b].id, weights[c].id]);
          ev += p * res.sun;
          if (res.sun > 0) hit += p;
          var key = res.kind === 'triple' || res.kind === 'jackpot' ? '3×' + res.sym : res.kind;
          if (res.sun > 0) {
            byKind[key] = byKind[key] || { label: key, p: 0, pay: res.sun, evPart: 0 };
            byKind[key].p += p;
            byKind[key].evPart += p * res.sun;
          }
        }
      }
    }
    var lines = Object.keys(byKind).map(function (k) { return byKind[k]; });
    lines.sort(function (x, y) { return y.evPart - x.evPart; });
    return { ev: ev, hitRate: hit, lines: lines };
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
               reelWeights: reelWeights, resortLevel: resortLevel };

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
  var STOP_BASE = [1.0, 1.6, 2.2];        // seconds until each reel locks
  var ANTICIPATION_MULT = 2.5;            // reel 3 delay when two sevens showing
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
    // so what scrolls past honestly represents the distribution.
    this.strips = [];
    for (var r = 0; r < 3; r++) {
      var strip = [];
      S.REEL.forEach(function (s) { for (var i = 0; i < s.w; i++) strip.push(s.id); });
      rng.shuffle(strip);
      this.strips.push(strip);
    }
    this.pos = [0, 0, 0];                 // strip position (symbol units)
    this.reel = [null, null, null];       // per-reel anim state
    this.spinning = false;
    this.result = null;
    this.flash = 0;                        // win flash timer
    this.lastWin = null;
    this.anticipating = false;
    this.weather = 'sunny';
    this.weatherAt = game.s.stats.spins + 20 + Math.floor(Math.random() * 21);
    this.sparkles = [];                   // decorative win droplets (cosmetic only)
  }

  View.prototype.canSpin = function () {
    return !this.spinning && this.g.canAfford('juice', D.CONVERSION.SPIN_COST_J);
  };

  View.prototype.spin = function () {
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
    this.anticipating = res.symbols[0] === 'seven' && res.symbols[1] === 'seven';

    for (var r = 0; r < 3; r++) {
      var stopAt = STOP_BASE[r];
      if (r === 2 && this.anticipating) stopAt *= ANTICIPATION_MULT;
      // Land the target symbol on the payline: find an occurrence ahead,
      // then travel a whole number of symbols (≥3 loops) to stop exactly on it.
      var strip = this.strips[r];
      var current = Math.round(this.pos[r]) % strip.length;
      var targetIdx = current;
      for (var look = 1; look <= strip.length; look++) {
        if (strip[(current + look) % strip.length] === res.symbols[r]) { targetIdx = current + look; break; }
      }
      // The payline displays strip[pos+1] (see draw()), so stop at targetIdx-1.
      var distance = as_int(this.pos[r], targetIdx - 1, strip.length);
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
    if (!this.spinning) return;

    var allDone = true;
    for (var r = 0; r < 3; r++) {
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
    var creditedSun = 0, creditedGems = 0;
    if (res.sun > 0) creditedSun = g.gain('suncoin', res.sun);
    if (res.gems > 0) creditedGems = g.gain('stargem', res.gems);
    g.s.stats.slotSunWon += creditedSun;   // Phase 28.7: personal RTP tracking
    if (res.kind === 'jackpot') {
      g.s.stats.jackpots++;
      this.flash = 3.5;
      if (this.hooks.sfx) this.hooks.sfx('jackpot');
      if (this.hooks.onJackpot) this.hooks.onJackpot(creditedSun, creditedGems);
    } else if (res.sun > 0) {
      this.flash = 1.2;
      if (this.hooks.sfx) this.hooks.sfx('win');
    } else if (this.hooks.sfx) {
      this.hooks.sfx('nowin');
    }
    this.lastWin = { sun: creditedSun, gems: creditedGems, kind: res.kind };
    if (res.sun > 0) this.spawnWinSparkles(res.kind === 'jackpot' ? 8 : 4);
    this.checkResort();
    if (this.hooks.onSettle) this.hooks.onSettle(this.lastWin);
    g.checkAchievements();
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

  // Decorative glassy droplets rising off the winning payline — the same
  // bubble language as match-3's clear particles. Capped so back-to-back
  // wins can't accumulate unbounded.
  View.prototype.spawnWinSparkles = function (perReel) {
    var L = this.layout();
    var reelW = L.winW / 3, symH = L.winH / 3;
    var lineY = L.winY + L.winH / 2;
    for (var r = 0; r < 3; r++) {
      var cx = L.winX + r * reelW + reelW / 2;
      for (var i = 0; i < perReel; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        var spd = symH * (0.9 + Math.random() * 1.3);
        this.sparkles.push({
          x: cx + (Math.random() - 0.5) * reelW * 0.5, y: lineY,
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

    var frameW = L.frameW, frameH = L.frameH;
    var fx = L.fx, fy = L.fy;

    // Cabinet
    var cab = ctx.createLinearGradient(fx, fy, fx, fy + frameH);
    cab.addColorStop(0, '#ffb347'); cab.addColorStop(0.5, '#ff8c1a'); cab.addColorStop(1, '#e06d00');
    ctx.fillStyle = cab;
    rr(ctx, fx, fy, frameW, frameH, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    rr(ctx, fx + 3, fy + 3, frameW - 6, frameH - 6, 21); ctx.stroke();

    // Window
    var winX = L.winX, winY = L.winY, winW = L.winW, winH = L.winH;
    var reelW = winW / 3;
    var symH = winH / 3;

    for (var r = 0; r < 3; r++) {
      var rx = winX + r * reelW;
      ctx.save();
      rr(ctx, rx + 3, winY, reelW - 6, winH, 10);
      ctx.clip();
      // Reel background
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(rx, winY, reelW, winH);

      var strip = this.strips[r];
      var p = this.pos[r];
      var base = Math.floor(p);
      var frac = p - base;
      for (var row = -1; row <= 3; row++) {
        var idx = ((base + row) % strip.length + strip.length) % strip.length;
        var cy = winY + (row - frac) * symH + symH / 2;
        // Cylinder curvature: shrink and dim toward window edges (pseudo-3D).
        var rel = (cy - (winY + winH / 2)) / (winH / 2);
        if (rel < -1.3 || rel > 1.3) continue;
        var squash = Math.cos(U.clamp(rel, -1, 1) * 1.1);
        ctx.save();
        ctx.translate(rx + reelW / 2, cy);
        ctx.scale(1, Math.max(0.25, squash));
        drawSymbol(ctx, strip[idx], 0, 0, Math.min(reelW, symH) * 0.32, this.time);
        ctx.restore();
      }
      // Cylinder shading overlay
      var shade1 = ctx.createLinearGradient(0, winY, 0, winY + winH);
      shade1.addColorStop(0, 'rgba(60,30,0,0.45)');
      shade1.addColorStop(0.2, 'rgba(60,30,0,0.08)');
      shade1.addColorStop(0.5, 'rgba(255,255,255,0.0)');
      shade1.addColorStop(0.8, 'rgba(60,30,0,0.08)');
      shade1.addColorStop(1, 'rgba(60,30,0,0.45)');
      ctx.fillStyle = shade1;
      ctx.fillRect(rx, winY, reelW, winH);
      ctx.restore();

      // Anticipation glow on final reel
      if (this.spinning && this.anticipating && r === 2 && this.reel[2] && !this.reel[2].done) {
        ctx.strokeStyle = 'rgba(255, 60, 90, ' + (0.5 + 0.4 * Math.sin(this.time * 10)) + ')';
        ctx.lineWidth = 4;
        rr(ctx, rx + 3, winY, reelW - 6, winH, 10); ctx.stroke();
      }
    }

    // Soft glow haloing the winning payline symbols while the win flash runs
    // (a "soft glow on winning symbols" — drawn over the glass, so it reads
    // as light blooming off the symbol rather than a repaint).
    if (this.flash > 0 && this.lastWin && this.lastWin.sun > 0) {
      var glowA = Math.min(1, this.flash) * (0.30 + 0.14 * Math.sin(this.time * 8));
      var glowY = winY + winH / 2;
      for (var gr2 = 0; gr2 < 3; gr2++) {
        var gcx = winX + gr2 * reelW + reelW / 2;
        var gg = ctx.createRadialGradient(gcx, glowY, 2, gcx, glowY, symH * 0.78);
        gg.addColorStop(0, 'rgba(255, 240, 170, ' + glowA.toFixed(3) + ')');
        gg.addColorStop(1, 'rgba(255, 240, 170, 0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(gcx, glowY, symH * 0.78, 0, 7); ctx.fill();
      }
    }

    // Payline
    var lineY = winY + winH / 2;
    ctx.strokeStyle = this.flash > 0
      ? 'rgba(255, 90, 60, ' + (0.6 + 0.4 * Math.sin(this.time * 12)) + ')'
      : 'rgba(200, 60, 30, 0.55)';
    ctx.lineWidth = this.flash > 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(winX - 8, lineY); ctx.lineTo(winX + winW + 8, lineY);
    ctx.stroke();
    // Payline arrows
    ctx.fillStyle = '#c43a1a';
    tri(ctx, winX - 14, lineY, 10, 1); tri(ctx, winX + winW + 14, lineY, 10, -1);

    // Win banner
    if (this.lastWin && this.lastWin.sun > 0 && this.flash > 0) {
      ctx.font = '800 26px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      var msg = this.lastWin.kind === 'jackpot'
        ? 'TRIPLE SEVEN! +' + U.fmt(this.lastWin.sun) + ' S  +' + U.fmt(this.lastWin.gems) + ' G'
        : '+' + U.fmt(this.lastWin.sun) + ' Suncoins!';
      ctx.fillStyle = 'rgba(80,20,0,0.65)';
      ctx.strokeStyle = 'rgba(80,20,0,0.65)';
      ctx.lineWidth = 6;
      ctx.strokeText(msg, W / 2, fy + frameH - 18);
      ctx.fillStyle = this.lastWin.kind === 'jackpot' ? '#ffe066' : '#fff';
      ctx.fillText(msg, W / 2, fy + frameH - 18);
    }

    this.drawSparkles(ctx);
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
  function tri(ctx, x, y, s, dir) {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.lineTo(x + s * dir, y);
    ctx.closePath(); ctx.fill();
  }

  core.View = View;
  return core;
});
