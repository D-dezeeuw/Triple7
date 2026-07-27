/* Triple7 — dozer.js  ("Star Harbor")
 * Coin pusher in two acts: a pachinko peg chute on top (every dropped coin
 * plinks through it first — the exit slot grants that drop's perk), feeding
 * a pusher table below. Top-down 2D circle physics (x across, z toward the
 * player) rendered in fake perspective, with a second coin layer: a pushed
 * coin that rams a jammed pile climbs on top and rides until unsupported.
 * The headless World + Pachinko are UMD-exported so the Node simulator can
 * measure true E[gems per drop] — the "house edge" here is purely
 * mechanical: side gutters past the rails eat a fraction of falling coins.
 *
 * Solver: kinematic sinusoidal pusher wall + circle-circle impulse resolution
 * with 50% positional correction, heavy damping (arcade "reduced gravity"
 * trick). Broadphase is a per-layer spatial hash collected once per step;
 * the impulse solver then runs 3 iterations over that candidate pair list.
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
    this.coins = [];              // {x, z, vx, vz, r, layer, kind, id, tier?, special?, boost?}
    this.nextId = 1;
    this.params = params || {};   // {railLvl, pusherLvl, specialChance}
    this.events = [];
    this.barrierDrops = 0;        // pachinko perk: gutters sealed for this many drops
    this.doubleExits = 0;         // pachinko perk: this many coin exits pay ×2
    this.surgeDrops = 0;          // Tide Surge (35.3): its own seal counter, same effect
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
      if (c.layer) rec.l = c.layer;
      if (c.boost > 1) rec.b = c.boost;
      if (c.res > 1) rec.rs = c.res;
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
      c.layer = rec.l === 1 ? 1 : 0;
      if (rec.b > 1) c.boost = rec.b;
      if (rec.rs > 1) c.res = rec.rs;
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
    var c = { id: this.nextId++, kind: kind, x: x, z: z, vx: 0, vz: 0, r: r, layer: 0 };
    if (kind === 'coin') c.tier = tierOverride || this.rng.weighted(C.COIN_TIERS);
    this.coins.push(c);
    return c;
  };

  // Player drop: coin lands just in front of the pusher face at chosen x.
  // boost (pachinko ×2 perk) multiplies this coin's face value on exit.
  // Each drop may also spawn a special item at the back. Returns the coin.
  // The active Harbor Current's specials pool (Plan II 35.2): same items,
  // reweighted. Falls back to the classic SPECIALS table. Pools are built
  // once per current and cached on the data object.
  World.prototype.specialPool = function () {
    var cur = this.params.current && C.CURRENTS && C.CURRENTS[this.params.current];
    if (!cur) return C.SPECIALS;
    if (!cur._pool) {
      cur._pool = C.SPECIALS.map(function (s) {
        var copy = {};
        for (var k in s) copy[k] = s[k];
        copy.w = cur.weights[s.id];
        return copy;
      });
    }
    return cur._pool;
  };

  // Spawn one weighted special near the pusher (the pelican's delivery and
  // the per-drop roll share this path — identical draw order to v1's drop()).
  World.prototype.spawnRandomSpecial = function () {
    if (this.coins.length >= C.MAX_COINS) return null;
    var half = this.pusherHalfW();
    var sp = this.rng.weighted(this.specialPool());
    var s = this.spawn(sp.id, C.TABLE_W / 2 + this.rng.range(-half * 0.7, half * 0.7),
                       this.pusherZ() + C.COIN_R * 2.6);
    s.special = sp;
    s.born = this.t;
    this.events.push({ type: 'specialSpawn', coin: s });
    return s;
  };

  // Gem Storm (Plan II 35.3): rain up to n bonus coins across the mid-table.
  // Free coins, no stake — pure earned celebration, counted by the simulator.
  World.prototype.rainCoins = function (n) {
    var spawned = 0;
    while (spawned < n && this.coins.length < C.MAX_COINS) {
      var c = this.spawn('coin',
        C.COIN_R * 2 + this.rng.float() * (C.TABLE_W - 4 * C.COIN_R),
        120 + this.rng.float() * (C.TABLE_D * 0.45));
      c.born = this.t;
      spawned++;
    }
    if (spawned) this.events.push({ type: 'storm', count: spawned });
    return spawned;
  };

  World.prototype.drop = function (x, boost) {
    if (this.barrierDrops > 0) this.barrierDrops--;
    if (this.surgeDrops > 0) this.surgeDrops--;
    var half = this.pusherHalfW();
    var cx = U.clamp(x, C.TABLE_W / 2 - half + C.COIN_R, C.TABLE_W / 2 + half - C.COIN_R);
    var c = this.spawn('coin', cx + this.rng.range(-4, 4), this.pusherZ() + C.COIN_R + 2);
    c.vz = 30;
    c.dropped = true;
    c.born = this.t;                 // view-only: drop-in fall animation
    if (boost > 1) c.boost = boost;
    var chance = C.SPECIAL_CHANCE_BASE + 0.01 * (this.params.magnetLvl || 0);
    if (this.coins.length < C.MAX_COINS && this.rng.chance(chance)) {
      this.spawnRandomSpecial();
    }
    return c;
  };

  // Pachinko perks that act on the table itself. 'x2' never lands here — it
  // rides in on the coin via drop(x, 2).
  World.prototype.applyPerk = function (kind) {
    if (kind === 'barrier') {
      // +1 because the perk's own drop already decremented on landing.
      this.barrierDrops = C.PACHINKO.BARRIER_DROPS + 1;
    } else if (kind === 'double') {
      this.doubleExits = Math.min(C.PACHINKO.DOUBLE_EXITS_CAP,
                                  this.doubleExits + C.PACHINKO.DOUBLE_EXITS);
    } else if (kind === 'quake') {
      // A stir, not a bulldozer: seeded nudge on every coin, slightly biased
      // toward the player so a quake always feels like it worked in your favor.
      for (var i = 0; i < this.coins.length; i++) {
        var c = this.coins[i];
        c.vx += this.rng.range(-C.PACHINKO.QUAKE_IMPULSE, C.PACHINKO.QUAKE_IMPULSE);
        c.vz += this.rng.range(-C.PACHINKO.QUAKE_IMPULSE * 0.4, C.PACHINKO.QUAKE_IMPULSE);
      }
    }
    this.events.push({ type: 'perk', kind: kind });
  };

  // Broadphase: per-layer uniform spatial hash, collected once per step; the
  // impulse solver then runs its iterations over this candidate list instead
  // of every O(n²) pair. The small margin keeps candidates valid across the
  // sub-pixel movement the solver itself introduces within one step.
  var HASH_CELL = C.COIN_R * 2.8;
  World.prototype.collectPairs = function () {
    var pairs = [], grid = {}, i;
    var inv = 1 / HASH_CELL;
    for (i = 0; i < this.coins.length; i++) {
      var c = this.coins[i];
      var key = c.layer + ':' + Math.floor(c.x * inv) + ':' + Math.floor(c.z * inv);
      (grid[key] = grid[key] || []).push(i);
    }
    var margin = 6;
    for (i = 0; i < this.coins.length; i++) {
      var a = this.coins[i];
      var cx = Math.floor(a.x * inv), cz = Math.floor(a.z * inv);
      for (var gx = cx - 1; gx <= cx + 1; gx++) {
        for (var gz = cz - 1; gz <= cz + 1; gz++) {
          var cell = grid[a.layer + ':' + gx + ':' + gz];
          if (!cell) continue;
          for (var k = 0; k < cell.length; k++) {
            var j = cell[k];
            if (j <= i) continue;
            var b = this.coins[j];
            var dx = b.x - a.x, dz = b.z - a.z;
            var rr = a.r + b.r + margin;
            if (dx * dx + dz * dz < rr * rr) pairs.push(i, j);
          }
        }
      }
    }
    return pairs;
  };

  World.prototype.step = function (dt) {
    var i, j, c;
    this.t += dt;
    var faceZ = this.pusherZ();
    var railEnd = this.railEnd();
    var half = this.pusherHalfW();
    var lo = C.TABLE_W / 2 - half, hi = C.TABLE_W / 2 + half;
    var barrier = this.barrierDrops > 0 || this.surgeDrops > 0;

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
      // Side rails — full length while a pachinko barrier seals the gutters.
      if (c.z < railEnd || barrier) {
        if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * 0.4; }
        if (c.x > C.TABLE_W - c.r) { c.x = C.TABLE_W - c.r; c.vx = -Math.abs(c.vx) * 0.4; }
      }
    }

    // Circle-circle: 3 solver iterations over the broadphase candidate list —
    // equal mass, 50% positional correction, same-layer pairs only. The first
    // iteration also counts real contacts per coin for the stacking pass.
    var pairs = this.collectPairs();
    var contacts = {};
    for (var iter = 0; iter < 3; iter++) {
      for (var p = 0; p < pairs.length; p += 2) {
        var a = this.coins[pairs[p]], b = this.coins[pairs[p + 1]];
        var dx = b.x - a.x, dz = b.z - a.z;
        var rr = a.r + b.r;
        var d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 === 0) continue;
        if (iter === 0) {
          contacts[pairs[p]] = (contacts[pairs[p]] || 0) + 1;
          contacts[pairs[p + 1]] = (contacts[pairs[p + 1]] || 0) + 1;
        }
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

    // Stacking: a coin the pusher is actively shoving into a wall of coins
    // (several contacts, still stuck at the face) has nowhere to go but up —
    // occasionally it climbs onto the pile (layer 1) and rides until
    // unsupported. Seeded chance keeps it an event, not constant churn; like
    // everything on this table, the roll is mechanical physics on the live
    // stream.
    var riders = 0;
    for (i = 0; i < this.coins.length; i++) if (this.coins[i].layer === 1) riders++;
    for (i = 0; i < this.coins.length; i++) {
      c = this.coins[i];
      if (riders >= 6) break;                    // keep the second story a feature, not a ceiling
      if (c.layer !== 0 || c.kind !== 'coin') continue;
      if ((contacts[i] || 0) < 3) continue;
      if (c.z - c.r > faceZ + 12) continue;      // pinned against the face
      if (this.rng.chance(0.05)) {
        riders++;
        // Ride up and forward ONTO the blocking pile — the climb must land
        // the coin over a supporter or the support check would immediately
        // drop it back where it started.
        c.layer = 1;
        c.z += c.r * 0.9;
        c.vz = Math.max(c.vz, 26);
      }
    }

    // Layer-1 support check: a raised coin needs a ground coin under most of
    // its footprint, else it drops back to the table (the solver untangles
    // any overlap it lands in, which scatters neighbors naturally).
    for (i = 0; i < this.coins.length; i++) {
      c = this.coins[i];
      if (c.layer !== 1) continue;
      var supported = false;
      for (j = 0; j < this.coins.length; j++) {
        var u = this.coins[j];
        if (u.layer !== 0) continue;
        var sdx = u.x - c.x, sdz = u.z - c.z;
        var sup = (c.r + u.r) * 0.62;   // center over some part of the coin below
        if (sdx * sdx + sdz * sdz < sup * sup) { supported = true; break; }
      }
      if (!supported) c.layer = 0;
    }

    // Exits. Double-pay is a per-coin budget: each doubled coin exit spends
    // one charge, so the perk's worth is bounded at any drop cadence.
    for (i = this.coins.length - 1; i >= 0; i--) {
      c = this.coins[i];
      if (c.z > C.TABLE_D + c.r * 0.4) {
        this.coins.splice(i, 1);
        var doubled = c.kind === 'coin' && this.doubleExits > 0;
        if (doubled) this.doubleExits--;
        this.events.push({ type: 'front', coin: c, doubled: doubled });
      } else if (!barrier && c.z >= railEnd && (c.x < -c.r * 0.4 || c.x > C.TABLE_W + c.r * 0.4)) {
        this.coins.splice(i, 1);
        this.events.push({ type: 'side', coin: c });
      }
    }

    var ev = this.events;
    this.events = [];
    return ev;
  };

  // ── Pachinko chute ────────────────────────────────────────────────────────
  // A steppable, headless plinko board: seeded live physics on the same
  // stream as the table (mechanical randomness — tools/simulate.js measures
  // the slot distribution; nothing is pre-decided or staged). x is shared
  // with TABLE_W; y runs 0 (release) → H (exit slots).
  function Pachinko(rng, releaseX) {
    var P = C.PACHINKO;
    this.rng = rng;
    this.x = U.clamp(releaseX, P.BALL_R, P.W - P.BALL_R);
    this.y = -P.BALL_R;
    this.vx = rng.range(-12, 12);
    this.vy = 40;
    this.done = false;
    this.slot = -1;
    this.exitX = this.x;
    this.t = 0;
    // Bonus pins (seeded, fresh every ball): striking a lit peg pays a small
    // instant Suncoin prize. Partial Fisher-Yates keeps the draw count fixed.
    this.bonusIdx = [];
    this.hitSet = {};
    this.hits = [];               // {peg, sun} — drained by the view for credit
    this.sun = 0;
    var pool = [];
    for (var i = 0; i < Pachinko.pegs.length; i++) pool.push(i);
    for (var k = 0; k < P.BONUS_PEGS && k < pool.length; k++) {
      var pick = k + Math.floor(rng.float() * (pool.length - k));
      var tmp = pool[k]; pool[k] = pool[pick]; pool[pick] = tmp;
      this.bonusIdx.push(pool[k]);
    }
  }
  Pachinko.pegs = (function () {
    var P = C.PACHINKO, pegs = [];
    for (var row = 0; row < P.ROWS; row++) {
      var y = P.ROW0_Y + row * P.ROW_DY;
      var x0 = row % 2 ? P.PEG_DX : P.PEG_DX / 2;
      for (var x = x0; x < P.W; x += P.PEG_DX) {
        // Never place a peg the ball can't pass: pockets narrower than the
        // ball wedge it against the wall (the top-corner stuck-ball bug).
        if (x < P.WALL_CLEAR || x > P.W - P.WALL_CLEAR) continue;
        pegs.push({ x: x, y: y });
      }
    }
    return pegs;
  })();
  Pachinko.prototype.step = function (dt) {
    if (this.done) return true;
    var P = C.PACHINKO;
    // Substep for stable peg contact at any caller cadence.
    var sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    var h = dt / sub;
    for (var s = 0; s < sub && !this.done; s++) {
      this.t += h;
      this.vy += P.GRAVITY * h;
      this.x += this.vx * h;
      this.y += this.vy * h;
      if (this.x < P.BALL_R) { this.x = P.BALL_R; this.vx = Math.abs(this.vx) * 0.7; }
      if (this.x > P.W - P.BALL_R) { this.x = P.W - P.BALL_R; this.vx = -Math.abs(this.vx) * 0.7; }
      var pegs = Pachinko.pegs, rr = P.BALL_R + P.PEG_R;
      for (var i = 0; i < pegs.length; i++) {
        var dx = this.x - pegs[i].x, dy = this.y - pegs[i].y;
        if (Math.abs(dy) > rr || Math.abs(dx) > rr) continue;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        this.x = pegs[i].x + nx * rr;
        this.y = pegs[i].y + ny * rr;
        var vn = this.vx * nx + this.vy * ny;
        if (vn < 0) {
          this.vx -= (1 + P.RESTITUTION) * vn * nx;
          this.vy -= (1 + P.RESTITUTION) * vn * ny;
          // The seeded plink: a sideways kick per bounce is what makes the
          // chute a genuine (measured) randomizer rather than a funnel.
          this.vx += this.rng.range(-P.JITTER, P.JITTER);
          // Bonus pin strike: once per lit peg per ball, 1..BONUS_SUN_MAX S.
          if (this.bonusIdx.indexOf(i) >= 0 && !this.hitSet[i]) {
            this.hitSet[i] = true;
            var amt = 1 + Math.floor(this.rng.float() * P.BONUS_SUN_MAX);
            this.sun += amt;
            this.hits.push({ peg: i, sun: amt });
          }
        }
      }
      if (this.y > P.H || this.t > 6) {
        this.done = true;
        this.exitX = this.x;
        this.slot = U.clamp(Math.floor(this.x / (P.W / P.SLOTS.length)), 0, P.SLOTS.length - 1);
      }
    }
    return this.done;
  };

  var core = { World: World, Pachinko: Pachinko,
               RAIL_END_BASE: RAIL_END_BASE, PUSHER_MIN_Z: PUSHER_MIN_Z };

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
    this.balls = [];               // pachinko balls in flight (Pachinko instances)
    this.shake = 0;                // quake screen shake timer
    this.acc = 0;
    this.bindInput();
  }

  // Screen mapping for the pachinko board (top ~third of the canvas; the
  // table's perspective trapezoid owns the rest — see proj()). The x-axis
  // reuses the table's own back-edge projection so every pachinko column
  // sits EXACTLY above where its coin will land: exit left → land left.
  View.prototype.pachProj = function (x, y) {
    var H = this.cv.clientHeight;
    var sx = this.proj(x * (C.TABLE_W / C.PACHINKO.W), 0).x;
    return { x: sx, y: 10 + (y / C.PACHINKO.H) * (H * 0.28) };
  };

  View.prototype.syncParams = function () {
    this.world.params = {
      railLvl: this.g.upLvl('bumperrails'),
      pusherLvl: this.g.upLvl('widepusher'),
      magnetLvl: this.g.upLvl('charmmagnet'),
      current: this.g.s.harborCurrent
    };
  };

  View.prototype.proj = function (x, z) {
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    var mTop = H * 0.40, mBot = H * 0.95;
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
      var sx = ev.clientX - r.left;                      // CSS px, same space as proj()
      // The tap picks the RELEASE point at the top of the pachinko chute —
      // invert the board's screen mapping so the ball starts under the finger.
      var left = self.pachProj(0, 0).x, right = self.pachProj(C.PACHINKO.W, 0).x;
      self.tryDrop(U.clamp((sx - left) / (right - left), 0, 1) * C.PACHINKO.W);
    });
  };

  View.prototype.canDrop = function () {
    return (this.g.s.freeDrops > 0 ||
            this.g.canAfford('suncoin', D.CONVERSION.DROP_COST_S)) &&
           this.world.coins.length < C.MAX_COINS &&
           this.balls.length < 3;
  };

  // A drop now releases a ball into the pachinko chute; the coin reaches the
  // table (with its perk) when the ball exits a slot — see update().
  View.prototype.tryDrop = function (x) {
    if (!this.canDrop()) {
      if (this.hooks.sfx && !this.g.canAfford('suncoin', D.CONVERSION.DROP_COST_S)) this.hooks.sfx('bad');
      return false;
    }
    // Free drops (Plan II 36.2) roll before Suncoins are touched.
    if (this.g.s.freeDrops > 0) this.g.s.freeDrops--;
    else this.g.spend('suncoin', D.CONVERSION.DROP_COST_S);
    this.syncParams();
    var ball = new Pachinko(this.rng,
      x === undefined ? C.PACHINKO.W / 2 + this.rng.range(-80, 80) : x);
    // Resonance (36.1): every drop is an action; the multiplier rides the
    // ball and lands on its coin, so the boost pays exactly this drop.
    ball.resMult = this.g.resonanceMult();
    this.balls.push(ball);
    this.g.s.stats.drops++;
    // Earned events (Plan II 35.3): counters, never clocks — and they fire
    // for the Auto-Dropper too (celebration floors for everyone).
    var E = C.EVENTS;
    if (this.g.s.stats.drops % E.SURGE_EVERY_DROPS === 0) {
      // +1: the drop this ball lands will decrement on arrival, netting the
      // published SURGE_SEAL_DROPS drops of sealed gutters after it.
      this.world.surgeDrops = Math.max(this.world.surgeDrops, E.SURGE_SEAL_DROPS + 1);
      this.g.s.stats.surges++;
      this.world.events.push({ type: 'surge' });
    }
    if (this.rng.chance(E.PELICAN_CHANCE) && this.world.coins.length < C.MAX_COINS) {
      this.g.s.stats.pelicans++;
      this.world.spawnRandomSpecial();
      this.world.events.push({ type: 'pelican' });
    }
    if (this.hooks.sfx) this.hooks.sfx('drop');
    this.g.checkAchievements();
    return true;
  };

  // Bonus pin strikes pay the moment they happen — same multiplied Suncoin
  // path as the sunpouch special (never counted into the personal-RTP
  // Stargem stat, which stays a strict per-stake measure).
  View.prototype.drainBallBonus = function (ball) {
    while (ball.hits.length) {
      var h = ball.hits.shift();
      var got = this.g.gain('suncoin', h.sun);
      var peg = Pachinko.pegs[h.peg];
      var pp = this.pachProj(peg.x, peg.y);
      this.floaters.push({ x: pp.x, y: pp.y, text: '+' + U.fmt(got) + ' S', t: 0, big: false });
      if (this.hooks.sfx) this.hooks.sfx('sparkle');
    }
  };

  // A finished ball lands its coin on the table and applies its slot's perk.
  View.prototype.settleBall = function (ball) {
    this.slotFlash = { i: ball.slot, x: ball.exitX, t: 0 };
    var kind = C.PACHINKO.SLOTS[ball.slot];
    var coin;
    if (kind === 'x2') {
      coin = this.world.drop(ball.exitX, 2);
      this.world.events.push({ type: 'perk', kind: 'x2' });
    } else {
      coin = this.world.drop(ball.exitX);
      this.world.applyPerk(kind);
    }
    if (ball.resMult > 1) coin.res = ball.resMult;   // resonance rides the coin
  };

  // Lifecycle safety (main.js calls this on tab-hide/close): balls still in
  // the chute resolve instantly so a paid drop is never lost to a reload.
  View.prototype.finishBallsNow = function () {
    for (var i = 0; i < this.balls.length; i++) {
      var guard = 0;
      while (!this.balls[i].step(1 / 30) && guard++ < 2000);
      this.drainBallBonus(this.balls[i]);
      this.settleBall(this.balls[i]);
    }
    this.balls = [];
    // Flush payouts (front/side/perk events) through the normal handler.
    var events = this.world.step(1 / 60);
    for (var e = 0; e < events.length; e++) this.handleEvent(events[e]);
  };

  View.prototype.update = function (dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.slotFlash) {
      this.slotFlash.t += dt;
      if (this.slotFlash.t > 0.7) this.slotFlash = null;
    }
    // Pachinko balls plink at frame rate (they substep internally); bonus
    // pin strikes credit the instant they happen.
    for (var b = this.balls.length - 1; b >= 0; b--) {
      var done = this.balls[b].step(dt);
      this.drainBallBonus(this.balls[b]);
      if (done) {
        this.settleBall(this.balls[b]);
        this.balls.splice(b, 1);
      }
    }
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

  var PERK_INFO = {
    x2:      { text: '×2 coin!',      color: '#3ec6ff' },
    barrier: { text: 'Barriers up!',  color: '#37c05e' },
    quake:   { text: 'QUAKE!',        color: '#ff8c1a' },
    double:  { text: 'Double pay!',   color: '#ffc93c' }
  };

  View.prototype.handleEvent = function (ev) {
    var g = this.g, c = ev.coin;
    if (ev.type === 'perk') {
      var info = PERK_INFO[ev.kind];
      if (ev.kind === 'quake') this.shake = 0.45;
      var W = this.cv.clientWidth, H = this.cv.clientHeight;
      this.floaters.push({ x: W / 2, y: H * 0.36, text: info.text, t: 0, big: true });
      if (this.hooks.sfx) this.hooks.sfx(ev.kind === 'quake' ? 'gutter' : 'sparkle');
      return;
    }
    if (ev.type === 'front') {
      this.falling.push({ x: c.x, kind: c.kind, tier: c.tier, t: 0 });
      var label = '';
      if (c.kind === 'coin') {
        // Face value × the coin's own pachinko boost × an active double-pay
        // window — both perks are visible on the table before they pay.
        var face = (c.tier ? c.tier.gems : 1) * (c.boost || 1) * (ev.doubled ? 2 : 1) *
                   (c.res || 1);
        var got = g.gain('stargem', face);
        g.s.stats.coinsFallen++;
        g.s.stats.dozerGemsWon += got;
        // Gem Storm (Plan II 35.3): every 77th coin off the edge rains 7
        // bonus coins across the table — earned by falls, never by clocks.
        if (g.s.stats.coinsFallen % C.EVENTS.STORM_EVERY_FALLEN === 0) {
          g.s.stats.storms++;
          this.world.rainCoins(C.EVENTS.STORM_COINS);
        }
        label = '+' + U.fmt(got) + ' G' + (ev.doubled ? ' ×2' : '');
        if (this.hooks.sfx) this.hooks.sfx(face > 1 ? 'special' : 'coinfall');
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
    } else if (ev.type === 'storm') {
      var Ws = this.cv.clientWidth, Hs = this.cv.clientHeight;
      this.floaters.push({ x: Ws / 2, y: Hs * 0.3, text: 'GEM STORM! +' + ev.count + ' coins', t: 0, big: true });
      this.shake = 0.35;
      g.sunlineCharge('storm');   // the Sunline (36.1): storms sing to the chain
      if (this.hooks.sfx) this.hooks.sfx('jackpot');
    } else if (ev.type === 'surge') {
      var Wu = this.cv.clientWidth, Hu = this.cv.clientHeight;
      this.floaters.push({ x: Wu / 2, y: Hu * 0.34, text: 'TIDE SURGE — gutters sealed ×' + C.EVENTS.SURGE_SEAL_DROPS, t: 0, big: true });
      if (this.hooks.sfx) this.hooks.sfx('sparkle');
    } else if (ev.type === 'pelican') {
      var Wp = this.cv.clientWidth, Hp = this.cv.clientHeight;
      this.floaters.push({ x: Wp / 2, y: Hp * 0.38, text: 'A pelican visits!', t: 0, big: true });
      if (this.hooks.sfx) this.hooks.sfx('special');
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

    ctx.save();
    if (this.shake > 0) {
      var mag = this.shake / 0.45 * 4;
      ctx.translate((Math.random() - 0.5) * 2 * mag, (Math.random() - 0.5) * 2 * mag);
    }
    this.drawPachinko(ctx);

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
    // Gutter strips: warning orange normally; solid safe green while a
    // pachinko barrier perk has them sealed.
    var barrierOn = this.world.barrierDrops > 0;
    ctx.strokeStyle = barrierOn
      ? 'rgba(55, 192, 94, ' + (0.75 + 0.2 * Math.sin(this.time * 6)) + ')'
      : 'rgba(255, 120, 80, 0.55)';
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

    // Coins & specials, back-to-front for correct overlap; a stacked coin
    // draws after its neighbors so it reads as sitting on the pile.
    var sorted = this.world.coins.slice().sort(function (a, b) {
      return a.z - b.z || a.layer - b.layer;
    });
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

    // Front edge lip — gold and loud while double-pay charges remain.
    var doubleOn = this.world.doubleExits > 0;
    ctx.strokeStyle = '#08344f';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(bl.x - 20, bl.y + 4); ctx.lineTo(br.x + 20, br.y + 4); ctx.stroke();
    var lipGlow = ctx.createLinearGradient(0, bl.y, 0, bl.y + 26);
    if (doubleOn) {
      var da = 0.55 + 0.3 * Math.sin(this.time * 7);
      lipGlow.addColorStop(0, 'rgba(255, 201, 60, ' + da.toFixed(3) + ')');
      lipGlow.addColorStop(1, 'rgba(255, 201, 60, 0)');
    } else {
      lipGlow.addColorStop(0, 'rgba(62, 198, 255, 0.5)');
      lipGlow.addColorStop(1, 'rgba(62, 198, 255, 0)');
    }
    ctx.fillStyle = lipGlow;
    ctx.fillRect(bl.x - 20, bl.y + 4, br.x - bl.x + 40, 26);
    if (doubleOn) {
      ctx.font = '900 16px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = 'rgba(80,40,0,0.7)'; ctx.lineWidth = 3;
      var dTxt = 'NEXT ' + this.world.doubleExits + ' COIN' +
                 (this.world.doubleExits > 1 ? 'S' : '') + ' ×2';
      ctx.strokeText(dTxt, (bl.x + br.x) / 2, bl.y + 22);
      ctx.fillText(dTxt, (bl.x + br.x) / 2, bl.y + 22);
    }

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
    ctx.restore();
  };

  // ── Pachinko chute (top of the canvas) ────────────────────────────────────
  var SLOT_STYLE = {
    double:  { c: '#ffc93c', glyph: '2×' },
    barrier: { c: '#37c05e', glyph: '▐▌' },
    x2:      { c: '#3ec6ff', glyph: '×2' },
    quake:   { c: '#ff8c1a', glyph: '≈' }
  };

  View.prototype.drawPachinko = function (ctx) {
    var P = C.PACHINKO;
    var tl = this.pachProj(0, 0), brr = this.pachProj(P.W, P.H);
    var px = tl.x - 10, py = tl.y - 4, pw = brr.x - tl.x + 20, ph = brr.y - tl.y + 26;

    // Glass panel
    ctx.fillStyle = 'rgba(9, 60, 96, 0.35)';
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(px, py, pw, ph, 14); } else { ctx.rect(px, py, pw, ph); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Release arrow hint at the top.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ tap to release ▼', px + pw / 2, py + 11);

    // Pegs — glass studs; a ball's bonus pins glow gold until struck.
    var bonusMap = {};
    for (var bm = 0; bm < this.balls.length; bm++) {
      var bb = this.balls[bm];
      for (var q = 0; q < bb.bonusIdx.length; q++) {
        var bi = bb.bonusIdx[q];
        bonusMap[bi] = bb.hitSet[bi] ? 'hit' : (bonusMap[bi] || 'live');
      }
    }
    var pegs = Pachinko.pegs;
    for (var i = 0; i < pegs.length; i++) {
      var pp = this.pachProj(pegs[i].x, pegs[i].y);
      var pr = Math.max(2.5, this.cv.clientWidth * 0.008);
      var state = bonusMap[i];
      var g = ctx.createRadialGradient(pp.x - pr * 0.3, pp.y - pr * 0.3, pr * 0.1, pp.x, pp.y, pr);
      if (state === 'live') {
        g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#e8a20c');
      } else if (state === 'hit') {
        g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#c8b06a');
      } else {
        g.addColorStop(0, '#eaf7ff'); g.addColorStop(1, '#7fb8d8');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, pr, 0, 7); ctx.fill();
      if (state === 'live') {
        ctx.strokeStyle = 'rgba(255, 201, 60, ' + (0.5 + 0.4 * Math.sin(this.time * 6 + i)) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pp.x, pp.y, pr * 1.9, 0, 7); ctx.stroke();
      }
    }

    // Slot bins along the bottom: color-coded perks; the bin a ball just
    // exited through flashes bright, pointing straight down at the landing.
    var n = P.SLOTS.length, slotW = pw / n;
    for (var s = 0; s < n; s++) {
      var st = SLOT_STYLE[P.SLOTS[s]];
      var sx = px + s * slotW;
      var hot = this.slotFlash && this.slotFlash.i === s;
      var hotK = hot ? 1 - this.slotFlash.t / 0.7 : 0;
      ctx.fillStyle = hot ? st.c : st.c + '44';
      ctx.fillRect(sx + 2, py + ph - 18, slotW - 4, 16);
      ctx.strokeStyle = hot ? '#fff' : st.c;
      ctx.lineWidth = hot ? 2.5 : 1.5;
      ctx.strokeRect(sx + 2, py + ph - 18, slotW - 4, 16);
      ctx.fillStyle = '#fff';
      ctx.font = '800 10px "Trebuchet MS", sans-serif';
      ctx.fillText(st.glyph, sx + slotW / 2, py + ph - 6);
      if (hot) {
        // Guide beam from the exit point straight down at the landing column
        // (the board and table share their x-projection, so this lines up).
        var beamX = this.pachProj(this.slotFlash.x, 0).x;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * hotK).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(beamX, py + ph - 2);
        ctx.lineTo(beamX, py + ph + 34);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Balls in flight — little golden coins.
    for (var b = 0; b < this.balls.length; b++) {
      var ball = this.balls[b];
      var bp = this.pachProj(ball.x, Math.max(0, ball.y));
      var br2 = Math.max(4, this.cv.clientWidth * 0.014);
      var bg = ctx.createRadialGradient(bp.x - br2 * 0.3, bp.y - br2 * 0.4, br2 * 0.1, bp.x, bp.y, br2);
      bg.addColorStop(0, '#fff3c0'); bg.addColorStop(0.6, '#ffc93c'); bg.addColorStop(1, '#c08900');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(bp.x, bp.y, br2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(bp.x - br2 * 0.3, bp.y - br2 * 0.35, br2 * 0.25, 0, 7); ctx.fill();
    }
  };

  View.prototype.drawCoin = function (ctx, c) {
    var p = this.proj(c.x, c.z);
    // Stacked coins ride one coin-thickness higher on screen.
    var raise = c.layer ? C.COIN_R * p.s * 0.68 : 0;
    // Fresh drops visibly fall from the pachinko slots onto the table at
    // their exit column — the hand-off between the two machines.
    var born = c.born !== undefined ? this.world.t - c.born : 99;
    if (born < 0.35) {
      var bk = born / 0.35;
      raise += (1 - bk) * (1 - bk) * 52;
    }
    this.drawCoinShape(ctx, c.kind, p.x, p.y - raise, p.s, 1, c);
    // A ×2-boosted coin advertises itself with a pulsing gold ring.
    if (c.boost > 1) {
      var rx = C.COIN_R * p.s * 1.35, ry = rx * 0.62;
      ctx.strokeStyle = 'rgba(255, 201, 60, ' + (0.55 + 0.35 * Math.sin(this.time * 6)) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - raise, rx, ry, 0, 0, 7); ctx.stroke();
    }
  };

  // A coin is an ellipse (perspective squash) with a "thickness" rim below —
  // the cheap pseudo-3D trick that sells the whole table.
  View.prototype.drawCoinShape = function (ctx, kind, sx, sy, s, alpha, c) {
    var rx = C.COIN_R * s * 1.05, ry = rx * 0.62;
    var thick = rx * 0.28;
    if (kind !== 'coin') { rx *= 1.25; ry *= 1.25; thick *= 1.2; }

    if (kind === 'coin') {
      var tier = TIER_STYLE[(c && c.tier && c.tier.id) || 'coin7'] || TIER_STYLE.coin7;
      // Shared wet-glass ground shadow (Phase 21.5) — a soft pool the coin
      // sits in on the table, same painter match3/slots use. Sits behind
      // the rim so it only peeks out at the coin's edges.
      U.drawSoftShadow(ctx, sx, sy + thick * 1.8, rx * 1.08, ry * 0.6, tier.lo, 0.28);
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
      U.drawSoftShadow(ctx, sx, sy + thick * 1.8, rx * 1.08, ry * 0.6, st.c, 0.28);
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
