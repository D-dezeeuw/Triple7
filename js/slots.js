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

  var core = { resolveSpin: resolveSpin, evaluate: evaluate, enumerateRTP: enumerateRTP, reelWeights: reelWeights };

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
    if (this.hooks.onSettle) this.hooks.onSettle(this.lastWin);
    g.checkAchievements();
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

  View.prototype.draw = function () {
    var ctx = this.ctx;
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    ctx.clearRect(0, 0, W, H);

    var frameW = Math.min(W - 20, 460);
    var frameH = Math.min(H - 20, 300);
    var fx = (W - frameW) / 2, fy = (H - frameH) / 2;

    // Cabinet
    var cab = ctx.createLinearGradient(fx, fy, fx, fy + frameH);
    cab.addColorStop(0, '#ffb347'); cab.addColorStop(0.5, '#ff8c1a'); cab.addColorStop(1, '#e06d00');
    ctx.fillStyle = cab;
    rr(ctx, fx, fy, frameW, frameH, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    rr(ctx, fx + 3, fy + 3, frameW - 6, frameH - 6, 21); ctx.stroke();

    // Window
    var winX = fx + 24, winY = fy + 30, winW = frameW - 48, winH = frameH - 78;
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
