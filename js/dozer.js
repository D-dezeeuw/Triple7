/* Triple7 — dozer.js  ("Star Harbor")
 * Coin pusher: top-down 2D circle physics (x across, z toward the player),
 * rendered in fake perspective. The headless World is UMD-exported so the Node
 * simulator can measure true E[gems per drop] — the "house edge" here is purely
 * mechanical: side gutters past the rails eat a fraction of falling coins.
 *
 * Solver: kinematic sinusoidal pusher wall + circle-circle impulse resolution
 * with 50% positional correction, heavy damping (arcade "reduced gravity" trick),
 * 3 iterations/step. O(n²) broadphase is fine at ≤70 coins.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./data.js'));
  } else {
    root.T7 = root.T7 || {};
    root.T7.dozer = factory(root.T7.util, root.T7.data);
  }
})(typeof self !== 'undefined' ? self : this, function (U, D) {
  'use strict';

  var C = D.DOZER;
  var RAIL_END_BASE = 372;        // rails cover z∈[0,railEnd]; past that, sides are open gutters
  var RAIL_END_PER_RAIL_LVL = 7;  // Bumper Rails upgrade extends the rails
  var PUSHER_MIN_Z = 56;
  var DAMPING = 0.93;             // per 60Hz step — heavy friction, no bouncing chaos
  var RESTITUTION = 0.12;
  var PUSH_SPEED = 52;            // world units/s the pusher imparts

  function World(rng, params, opts) {
    this.rng = rng;
    this.t = 0;
    this.coins = [];              // {x, z, vx, vz, r, kind, id, tier?, special?}
    this.nextId = 1;
    this.params = params || {};   // {railLvl, pusherLvl, specialChance}
    this.events = [];
    if (opts && opts.noStock) return;
    // Pre-stock near saturation so the pile behaves like a broken-in arcade
    // table from the first drop (steady state ⇒ coins in ≈ coins out).
    for (var i = 0; i < C.START_COINS; i++) {
      this.spawn('coin',
        C.COIN_R + rng.float() * (C.TABLE_W - 2 * C.COIN_R),
        150 + rng.float() * (C.TABLE_D - 190));
    }
  }

  // Table persistence (Phase 12.9): plain, save-safe records — tier/special
  // are stored by id and looked back up in data.js on restore, since the live
  // objects are shared references into D.DOZER.COIN_TIERS/SPECIALS.
  World.prototype.serialize = function () {
    return this.coins.map(function (c) {
      var rec = { kind: c.kind, x: c.x, z: c.z, vx: c.vx, vz: c.vz };
      if (c.tier) rec.tier = c.tier.id;
      if (c.special) rec.special = c.special.id;
      return rec;
    });
  };
  // Restores a saved table verbatim (no restock) — the returned world starts
  // at t=0, which only affects the (purely cosmetic) pusher animation phase.
  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  World.deserialize = function (rng, params, records) {
    var w = new World(rng, params, { noStock: true });
    (records || []).forEach(function (rec) {
      var tier = rec.tier ? findById(C.COIN_TIERS, rec.tier) : null;
      var c = w.spawn(rec.kind, rec.x, rec.z, tier);
      c.vx = rec.vx || 0; c.vz = rec.vz || 0;
      if (rec.special) c.special = findById(C.SPECIALS, rec.special);
    });
    return w;
  };

  World.prototype.railEnd = function () {
    return Math.min(C.TABLE_D - 10, RAIL_END_BASE + (this.params.railLvl || 0) * RAIL_END_PER_RAIL_LVL);
  };
  World.prototype.pusherHalfW = function () {
    return (C.TABLE_W / 2) * (0.98 + 0.06 * (this.params.pusherLvl || 0));
  };
  World.prototype.pusherZ = function () {
    // Sinusoidal cycle: face oscillates z ∈ [MIN, MIN+TRAVEL].
    var phase = (this.t % C.PUSHER_PERIOD) / C.PUSHER_PERIOD;
    return PUSHER_MIN_Z + (C.PUSHER_TRAVEL / 2) * (1 - Math.cos(phase * Math.PI * 2));
  };

  // tierOverride skips the weighted roll (used by deserialize() to restore an
  // exact saved tier without burning an extra draw from the live stream).
  World.prototype.spawn = function (kind, x, z, tierOverride) {
    var r = kind === 'coin' ? C.COIN_R : C.COIN_R * 1.25;
    var c = { id: this.nextId++, kind: kind, x: x, z: z, vx: 0, vz: 0, r: r };
    if (kind === 'coin') c.tier = tierOverride || this.rng.weighted(C.COIN_TIERS);
    this.coins.push(c);
    return c;
  };

  // Player drop: coin lands just in front of the pusher face at chosen x.
  // Each drop may also spawn a special item at the back. Returns the coin.
  World.prototype.drop = function (x) {
    var half = this.pusherHalfW();
    var cx = U.clamp(x, C.TABLE_W / 2 - half + C.COIN_R, C.TABLE_W / 2 + half - C.COIN_R);
    var c = this.spawn('coin', cx + this.rng.range(-4, 4), this.pusherZ() + C.COIN_R + 2);
    c.vz = 30;
    c.dropped = true;
    var chance = C.SPECIAL_CHANCE_BASE + 0.01 * (this.params.magnetLvl || 0);
    if (this.coins.length < C.MAX_COINS && this.rng.chance(chance)) {
      var sp = this.rng.weighted(C.SPECIALS);
      var s = this.spawn(sp.id, C.TABLE_W / 2 + this.rng.range(-half * 0.7, half * 0.7),
                         this.pusherZ() + C.COIN_R * 2.6);
      s.special = sp;
      this.events.push({ type: 'specialSpawn', coin: s });
    }
    return c;
  };

  World.prototype.step = function (dt) {
    var i, j, c;
    this.t += dt;
    var faceZ = this.pusherZ();
    var railEnd = this.railEnd();
    var half = this.pusherHalfW();
    var lo = C.TABLE_W / 2 - half, hi = C.TABLE_W / 2 + half;

    for (i = 0; i < this.coins.length; i++) {
      c = this.coins[i];
      c.vx *= DAMPING; c.vz *= DAMPING;
      if (Math.abs(c.vx) < 0.5) c.vx = 0;
      if (Math.abs(c.vz) < 0.5) c.vz = 0;
      c.x += c.vx * dt; c.z += c.vz * dt;

      // Pusher wall: anything overlapping the face inside its width gets shoved.
      if (c.z - c.r < faceZ && c.x > lo - c.r && c.x < hi + c.r) {
        c.z = faceZ + c.r;
        if (c.vz < PUSH_SPEED) c.vz = PUSH_SPEED;
      }
      // Back wall safety.
      if (c.z < c.r) { c.z = c.r; c.vz = Math.abs(c.vz) * 0.3; }
      // Side rails (only while over the railed section).
      if (c.z < railEnd) {
        if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * 0.4; }
        if (c.x > C.TABLE_W - c.r) { c.x = C.TABLE_W - c.r; c.vx = -Math.abs(c.vx) * 0.4; }
      }
    }

    // Circle-circle: 3 solver iterations, equal mass, 50% positional correction.
    for (var iter = 0; iter < 3; iter++) {
      for (i = 0; i < this.coins.length; i++) {
        for (j = i + 1; j < this.coins.length; j++) {
          var a = this.coins[i], b = this.coins[j];
          var dx = b.x - a.x, dz = b.z - a.z;
          var rr = a.r + b.r;
          var d2 = dx * dx + dz * dz;
          if (d2 >= rr * rr || d2 === 0) continue;
          var d = Math.sqrt(d2);
          var nx = dx / d, nz = dz / d;
          var pen = (rr - d) * 0.5;
          a.x -= nx * pen * 0.5; a.z -= nz * pen * 0.5;
          b.x += nx * pen * 0.5; b.z += nz * pen * 0.5;
          var rvx = b.vx - a.vx, rvz = b.vz - a.vz;
          var vn = rvx * nx + rvz * nz;
          if (vn < 0) {
            var imp = -(1 + RESTITUTION) * vn * 0.5;
            a.vx -= nx * imp; a.vz -= nz * imp;
            b.vx += nx * imp; b.vz += nz * imp;
          }
        }
      }
    }

    // Exits.
    for (i = this.coins.length - 1; i >= 0; i--) {
      c = this.coins[i];
      if (c.z > C.TABLE_D + c.r * 0.4) {
        this.coins.splice(i, 1);
        this.events.push({ type: 'front', coin: c });
      } else if (c.z >= railEnd && (c.x < -c.r * 0.4 || c.x > C.TABLE_W + c.r * 0.4)) {
        this.coins.splice(i, 1);
        this.events.push({ type: 'side', coin: c });
      }
    }

    var ev = this.events;
    this.events = [];
    return ev;
  };

  var core = { World: World, RAIL_END_BASE: RAIL_END_BASE, PUSHER_MIN_Z: PUSHER_MIN_Z };

  if (typeof document === 'undefined') return core;

  // ── Perspective view ──────────────────────────────────────────────────────
  // World (x,z) → screen: scale grows toward the player; the table is a trapezoid.
  // savedTable: optional World.serialize() array (Phase 12.9) — when present,
  // the table restores exactly as left; otherwise it restocks fresh (v1
  // behavior, still the fallback for a first run or a corrupt/missing record).
  function View(canvas, game, rng, hooks, savedTable) {
    this.cv = canvas; this.g = game; this.rng = rng;
    this.hooks = hooks || {};
    this.ctx = canvas.getContext('2d');
    this.world = (savedTable && savedTable.length)
      ? World.deserialize(rng, {}, savedTable)
      : new World(rng, {});
    this.syncParams();
    this.time = 0;
    this.falling = [];             // visual-only falling coins after front exit
    this.floaters = [];
    this.acc = 0;
    this.bindInput();
  }

  View.prototype.syncParams = function () {
    this.world.params = {
      railLvl: this.g.upLvl('bumperrails'),
      pusherLvl: this.g.upLvl('widepusher'),
      magnetLvl: this.g.upLvl('charmmagnet')
    };
  };

  View.prototype.proj = function (x, z) {
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    var mTop = H * 0.16, mBot = H * 0.94;
    var t = z / C.TABLE_D;
    var scale = U.lerp(0.66, 1.06, t);
    var sy = U.lerp(mTop, mBot, Math.pow(t, 0.93));
    var sx = W / 2 + (x - C.TABLE_W / 2) * scale * (W / (C.TABLE_W * 1.18));
    return { x: sx, y: sy, s: scale * (W / 520) };
  };

  View.prototype.bindInput = function () {
    var self = this;
    this.cv.addEventListener('pointerdown', function (ev) {
      var r = self.cv.getBoundingClientRect();
      var relX = (ev.clientX - r.left) / r.width;        // 0..1 across the canvas
      self.tryDrop(U.clamp((relX - 0.5) * C.TABLE_W * 1.25 + C.TABLE_W / 2, 0, C.TABLE_W));
    });
  };

  View.prototype.canDrop = function () {
    return this.g.canAfford('suncoin', D.CONVERSION.DROP_COST_S) &&
           this.world.coins.length < C.MAX_COINS;
  };

  View.prototype.tryDrop = function (x) {
    if (!this.canDrop()) {
      if (this.hooks.sfx && !this.g.canAfford('suncoin', D.CONVERSION.DROP_COST_S)) this.hooks.sfx('bad');
      return false;
    }
    this.g.spend('suncoin', D.CONVERSION.DROP_COST_S);
    this.syncParams();
    this.world.drop(x === undefined ? C.TABLE_W / 2 + this.rng.range(-60, 60) : x);
    this.g.s.stats.drops++;
    if (this.hooks.sfx) this.hooks.sfx('drop');
    this.g.checkAchievements();
    return true;
  };

  View.prototype.update = function (dt) {
    this.time += dt;
    // Fixed-step physics with accumulator (research: clamp to survive tab naps).
    this.acc = Math.min(this.acc + dt, 0.25);
    var step = 1 / 60;
    while (this.acc >= step) {
      this.acc -= step;
      var events = this.world.step(step);
      for (var i = 0; i < events.length; i++) this.handleEvent(events[i]);
    }
    for (var f = this.falling.length - 1; f >= 0; f--) {
      this.falling[f].t += dt;
      if (this.falling[f].t > 0.8) this.falling.splice(f, 1);
    }
    for (var k = this.floaters.length - 1; k >= 0; k--) {
      this.floaters[k].t += dt;
      if (this.floaters[k].t > 1.4) this.floaters.splice(k, 1);
    }
  };

  View.prototype.handleEvent = function (ev) {
    var g = this.g, c = ev.coin;
    if (ev.type === 'front') {
      this.falling.push({ x: c.x, kind: c.kind, tier: c.tier, t: 0 });
      var label = '';
      if (c.kind === 'coin') {
        var got = g.gain('stargem', c.tier ? c.tier.gems : 1);
        g.s.stats.coinsFallen++;
        g.s.stats.dozerGemsWon += got;
        label = '+' + U.fmt(got) + ' G';
        if (this.hooks.sfx) this.hooks.sfx(c.tier && c.tier.gems > 1 ? 'special' : 'coinfall');
      } else {
        var sp = c.special;
        if (sp.kind === 'gems') {
          // Personal RTP (Phase 28.7) only tallies directly Stargem-denominated
          // credits — plain coins plus this special — so the figure never has
          // to invent a cross-currency exchange rate for sunpouch/bottle/charm.
          var gotGems = g.gain('stargem', sp.gems);
          g.s.stats.dozerGemsWon += gotGems;
          label = '+' + U.fmt(gotGems) + ' G';
        } else if (sp.kind === 'sun') {
          label = '+' + U.fmt(g.gain('suncoin', sp.sun)) + ' S';
        } else if (sp.kind === 'juice') {
          // Worth `seconds` of current total Juice income, floor 77.
          var jps = g.groveRate('juice');
          label = '+' + U.fmt(g.gain('juice', Math.max(77, jps * sp.seconds), true)) + ' J';
        } else if (sp.kind === 'charm') {
          // Charm draws are a collection-system event, not dozer physics — use
          // the charms stream (hooks.charmRng) so they never perturb the
          // physics stream's sequence. Falls back to the physics stream when
          // no charm stream is wired (e.g. ad-hoc test harnesses).
          var award = g.awardRandomCharm(this.hooks.charmRng || this.rng);
          label = award.refined ? '+' + U.fmt(award.refined) + ' G refined' : award.charm.name + '!';
          if (this.hooks.onCharm) this.hooks.onCharm(award);
        }
        if (this.hooks.sfx) this.hooks.sfx('special');
      }
      var p = this.proj(c.x, C.TABLE_D);
      this.floaters.push({ x: p.x, y: p.y, text: label, t: 0,
                           big: c.kind !== 'coin' || (c.tier && c.tier.gems > 1) });
      if (this.hooks.onPayout) this.hooks.onPayout(ev);
      g.checkAchievements();
    } else if (ev.type === 'side') {
      if (this.hooks.sfx) this.hooks.sfx('gutter');
    } else if (ev.type === 'specialSpawn') {
      if (this.hooks.sfx) this.hooks.sfx('sparkle');
    }
  };

  // ── Drawing ───────────────────────────────────────────────────────────────
  // Canvas fallback palettes for the coin denominations (sprite absent).
  var TIER_STYLE = {
    coin7:  { rim: '#b7791f', hi: '#ffe9a6', c: '#ffc93c', lo: '#e8a20c', ink: 'rgba(160,100,10,0.85)', face: '7' },
    coin21: { rim: '#96552e', hi: '#ffd9c4', c: '#e8956a', lo: '#c06a3a', ink: 'rgba(120,60,20,0.85)', face: '21' },
    coin49: { rim: '#8a6a00', hi: '#fff3c0', c: '#f0b400', lo: '#c08900', ink: 'rgba(130,80,0,0.9)',  face: '49' }
  };
  // sprite: painted icon drawn on the prize disc when loaded; glyph is the
  // zero-asset canvas fallback.
  var SPECIAL_STYLE = {
    gemfruit: { c: '#3ec6ff', hi: '#c8f0ff', glyph: '◆', sprite: 'gem' },
    charm:    { c: '#b06ce8', hi: '#ecd4ff', glyph: '✦', sprite: 'sparkle' },
    bottle:   { c: '#ff5a4e', hi: '#ffc2b8', glyph: '!', sprite: 'bottle' },
    sunpouch: { c: '#ffc93c', hi: '#fff3b0', glyph: '☀', sprite: 'sun' }
  };

  View.prototype.draw = function () {
    var ctx = this.ctx;
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    ctx.clearRect(0, 0, W, H);

    var railEnd = this.world.railEnd();
    var faceZ = this.world.pusherZ();

    // Table bed (trapezoid, watery gradient).
    var tl = this.proj(0, 0), tr = this.proj(C.TABLE_W, 0);
    var bl = this.proj(0, C.TABLE_D), br = this.proj(C.TABLE_W, C.TABLE_D);
    var bed = ctx.createLinearGradient(0, tl.y, 0, bl.y);
    bed.addColorStop(0, '#0d5c8c');
    bed.addColorStop(0.6, '#1479b8');
    bed.addColorStop(1, '#22a0e0');
    ctx.fillStyle = bed;
    ctx.beginPath();
    ctx.moveTo(tl.x - 14, tl.y); ctx.lineTo(tr.x + 14, tr.y);
    ctx.lineTo(br.x + 20, br.y); ctx.lineTo(bl.x - 20, bl.y);
    ctx.closePath(); ctx.fill();

    // Lane stripes for depth.
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    for (var zi = 1; zi < 6; zi++) {
      var z = (C.TABLE_D / 6) * zi;
      var a = this.proj(0, z), b = this.proj(C.TABLE_W, z);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Side rails (railed section) + open gutters (glowing warning strips).
    var re1 = this.proj(0, railEnd), re2 = this.proj(C.TABLE_W, railEnd);
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.strokeStyle = '#0a3f63';
    ctx.beginPath(); ctx.moveTo(tl.x - 10, tl.y); ctx.lineTo(re1.x - 12, re1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tr.x + 10, tr.y); ctx.lineTo(re2.x + 12, re2.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 120, 80, 0.55)';
    ctx.beginPath(); ctx.moveTo(re1.x - 12, re1.y); ctx.lineTo(bl.x - 16, bl.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(re2.x + 12, re2.y); ctx.lineTo(br.x + 16, br.y); ctx.stroke();

    // Pusher block (a 3D slab from back wall to its face).
    var p1 = this.proj(C.TABLE_W / 2 - this.world.pusherHalfW(), faceZ);
    var p2 = this.proj(C.TABLE_W / 2 + this.world.pusherHalfW(), faceZ);
    var b1 = this.proj(C.TABLE_W / 2 - this.world.pusherHalfW(), 0);
    var b2 = this.proj(C.TABLE_W / 2 + this.world.pusherHalfW(), 0);
    var top = ctx.createLinearGradient(0, b1.y - 26, 0, p1.y);
    top.addColorStop(0, '#ff9d3f'); top.addColorStop(1, '#ffb85e');
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y - 26); ctx.lineTo(b2.x, b2.y - 26);
    ctx.lineTo(p2.x, p2.y - 26); ctx.lineTo(p1.x, p1.y - 26);
    ctx.closePath(); ctx.fill();
    // Face
    var face = ctx.createLinearGradient(0, p1.y - 26, 0, p1.y + 4);
    face.addColorStop(0, '#e06d00'); face.addColorStop(1, '#a34e00');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y - 26); ctx.lineTo(p2.x, p2.y - 26);
    ctx.lineTo(p2.x, p2.y + 2); ctx.lineTo(p1.x, p1.y + 2);
    ctx.closePath(); ctx.fill();
    // 7 emblem on the face
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '900 ' + Math.round(16 * p1.s) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('777', (p1.x + p2.x) / 2, p1.y - 11);

    // Coins & specials, back-to-front for correct overlap.
    var sorted = this.world.coins.slice().sort(function (a, b) { return a.z - b.z; });
    for (var i = 0; i < sorted.length; i++) this.drawCoin(ctx, sorted[i]);

    // Visual falling coins at the front edge.
    for (var f = 0; f < this.falling.length; f++) {
      var fc = this.falling[f];
      var t = fc.t / 0.8;
      var pp = this.proj(fc.x, C.TABLE_D);
      ctx.globalAlpha = 1 - t;
      var fy = pp.y + t * t * 90;
      this.drawCoinShape(ctx, fc.kind, pp.x, fy, pp.s * (1 - t * 0.3), 1 - t * 0.5, fc);
      ctx.globalAlpha = 1;
    }

    // Front edge lip.
    ctx.strokeStyle = '#08344f';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(bl.x - 20, bl.y + 4); ctx.lineTo(br.x + 20, br.y + 4); ctx.stroke();
    var lipGlow = ctx.createLinearGradient(0, bl.y, 0, bl.y + 26);
    lipGlow.addColorStop(0, 'rgba(62, 198, 255, 0.5)');
    lipGlow.addColorStop(1, 'rgba(62, 198, 255, 0)');
    ctx.fillStyle = lipGlow;
    ctx.fillRect(bl.x - 20, bl.y + 4, br.x - bl.x + 40, 26);

    // Floaters.
    for (var k = 0; k < this.floaters.length; k++) {
      var fl = this.floaters[k];
      var ft = fl.t / 1.4;
      ctx.globalAlpha = 1 - ft;
      ctx.font = '800 ' + (fl.big ? 24 : 18) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,50,80,0.7)'; ctx.lineWidth = 4;
      ctx.strokeText(fl.text, fl.x, fl.y - ft * 52);
      ctx.fillStyle = fl.big ? '#ffe066' : '#d9f4ff';
      ctx.fillText(fl.text, fl.x, fl.y - ft * 52);
      ctx.globalAlpha = 1;
    }
  };

  View.prototype.drawCoin = function (ctx, c) {
    var p = this.proj(c.x, c.z);
    this.drawCoinShape(ctx, c.kind, p.x, p.y, p.s, 1, c);
  };

  // A coin is an ellipse (perspective squash) with a "thickness" rim below —
  // the cheap pseudo-3D trick that sells the whole table.
  View.prototype.drawCoinShape = function (ctx, kind, sx, sy, s, alpha, c) {
    var rx = C.COIN_R * s * 1.05, ry = rx * 0.62;
    var thick = rx * 0.28;
    if (kind !== 'coin') { rx *= 1.25; ry *= 1.25; thick *= 1.2; }

    if (kind === 'coin') {
      var tier = TIER_STYLE[(c && c.tier && c.tier.id) || 'coin7'] || TIER_STYLE.coin7;
      // Rim (side)
      ctx.fillStyle = tier.rim;
      ctx.beginPath(); ctx.ellipse(sx, sy + thick, rx, ry, 0, 0, 7); ctx.fill();
      var cspr = typeof T7 !== 'undefined' && T7.sprites &&
                 T7.sprites.get((c && c.tier && c.tier.id) || 'coin7');
      if (cspr) {
        // Painted face, squashed into the table's perspective ellipse.
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(1, ry / rx);
        ctx.drawImage(cspr, -rx, -rx, rx * 2, rx * 2);
        ctx.restore();
        return;
      }
      // Face
      var g = ctx.createRadialGradient(sx - rx * 0.3, sy - ry * 0.4, rx * 0.1, sx, sy, rx * 1.1);
      g.addColorStop(0, tier.hi); g.addColorStop(0.6, tier.c); g.addColorStop(1, tier.lo);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, 7); ctx.fill();
      // Embossed face value (in Suncoins: 7 / 21 / 49)
      ctx.fillStyle = tier.ink;
      ctx.font = '900 ' + Math.max(8, Math.round(rx * (tier.face.length > 1 ? 0.7 : 0.9))) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tier.face, sx, sy + 1);
      // Glint
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(sx - rx * 0.35, sy - ry * 0.35, rx * 0.2, ry * 0.18, -0.5, 0, 7); ctx.fill();
    } else {
      var st = SPECIAL_STYLE[kind] || SPECIAL_STYLE.gemfruit;
      ctx.fillStyle = st.c + '55';
      ctx.beginPath(); ctx.ellipse(sx, sy + thick, rx, ry, 0, 0, 7); ctx.fill();
      var g2 = ctx.createRadialGradient(sx - rx * 0.3, sy - ry * 0.5, rx * 0.05, sx, sy, rx * 1.2);
      g2.addColorStop(0, st.hi); g2.addColorStop(0.6, st.c); g2.addColorStop(1, st.c);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, 7); ctx.fill();
      // Pulse glow so specials read as prizes.
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * Math.sin(this.time * 5 + sx)) * (alpha || 1) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, rx * 1.12, ry * 1.12, 0, 0, 7); ctx.stroke();
      var spr = typeof T7 !== 'undefined' && T7.sprites && T7.sprites.get(st.sprite);
      if (spr) {
        var side = rx * 1.3;
        ctx.drawImage(spr, sx - side / 2, sy - side / 2 - ry * 0.25, side, side);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = '800 ' + Math.max(8, Math.round(rx * 0.8)) + 'px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(st.glyph, sx, sy + 1);
      }
    }
  };

  core.View = View;
  return core;
});
