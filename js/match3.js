/* Triple7 — match3.js  ("Juicy Grove")
 * Pure board logic (UMD-exported for the Node simulator) + canvas view.
 *
 * Loop (industry-standard state machine):
 *   swap → find matches → clear (expand bursts) → gravity → refill → re-detect
 * Deadlock: simulate every swap; if none matches, auto-reshuffle (Bejeweled 2 rule).
 * Refill: uniform seeded draw, re-rolled up to 8 times if the spawn would
 * instantly complete a run with its already-placed neighbours. That is a bias
 * against free matches on spawn, NOT a guarantee — the check only sees cells
 * already filled this pass, so cascades stay possible (and stay a gift).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./util.js'), require('./data.js'));
  } else {
    root.T7 = root.T7 || {};
    root.T7.match3 = factory(root.T7.util, root.T7.data);
  }
})(typeof self !== 'undefined' ? self : this, function (U, D) {
  'use strict';

  var COLS = D.MATCH3.COLS, ROWS = D.MATCH3.ROWS, NF = D.MATCH3.FRUITS.length;
  var NONE = 0, BURST = 1, RAINBOW = 2;   // special kinds
  var RAINBOW_FRUIT = -1;

  function cell(fruit, special, gold) { return { f: fruit, sp: special || NONE, g: !!gold }; }

  // ── Pure board ops ────────────────────────────────────────────────────────

  function rollFruit(rng, board, x, y) {
    // Avoid completing a run of 3 with already-placed left/up neighbours.
    var f = Math.floor(rng.float() * NF);
    var tries = 0;
    while (tries++ < 8 && wouldRun(board, x, y, f)) f = Math.floor(rng.float() * NF);
    return f;
  }
  // Sun-Ripened roll (Feature 33.2): one extra draw per spawned fruit decides
  // golden-ness at spawn time — economy RNG on the match3 stream, decided
  // before any presentation, exactly like every other outcome (§11.2).
  function rollGold(rng) { return rng.float() < D.MATCH3.GOLDEN.CHANCE; }
  function wouldRun(board, x, y, f) {
    var a = x >= 2 && at(board, x - 1, y) && board[y][x - 1].f === f && board[y][x - 2].f === f;
    var b = y >= 2 && at(board, x, y - 1) && board[y - 1][x].f === f && board[y - 2][x].f === f;
    return a || b;
  }
  function at(board, x, y) {
    return (x >= 0 && x < COLS && y >= 0 && y < ROWS) ? board[y][x] : null;
  }

  function newBoard(rng) {
    var b = [];
    for (var y = 0; y < ROWS; y++) {
      b.push([]);
      for (var x = 0; x < COLS; x++) b[y].push(null), b[y][x] = cell(rollFruit(rng, b, x, y), NONE, rollGold(rng));
    }
    if (!findAllMoves(b).length) return newBoard(rng);   // extremely rare
    return b;
  }

  // Find all matched cells. Returns { cells:[{x,y}], runs:[{cells,len,horiz}] }.
  function findMatches(board) {
    var marked = {}, runs = [];
    function scan(horiz) {
      for (var j = 0; j < (horiz ? ROWS : COLS); j++) {
        var runStart = 0, runFruit = -2;
        for (var i = 0; i <= (horiz ? COLS : ROWS); i++) {
          var c = i < (horiz ? COLS : ROWS) ? (horiz ? board[j][i] : board[i][j]) : null;
          var f = c && c.sp !== RAINBOW ? c.f : -2;   // rainbows don't auto-match
          if (f !== runFruit) {
            var len = i - runStart;
            if (runFruit >= 0 && len >= 3) {
              var cells = [];
              for (var k = runStart; k < i; k++) {
                var x = horiz ? k : j, y = horiz ? j : k;
                cells.push({ x: x, y: y });
                marked[x + ',' + y] = true;
              }
              runs.push({ cells: cells, len: len, horiz: horiz });
            }
            runStart = i; runFruit = f;
          }
        }
      }
    }
    scan(true); scan(false);
    var cells = [];
    for (var key in marked) {
      var p = key.split(',');
      cells.push({ x: +p[0], y: +p[1] });
    }
    return { cells: cells, runs: runs };
  }

  // Expand a clear-set through burst specials (row+col cross, chain-reacting).
  function expandSpecials(board, cellsSet) {
    var queue = Object.keys(cellsSet), qi = 0;
    while (qi < queue.length) {
      var p = queue[qi++].split(','), x = +p[0], y = +p[1];
      var c = at(board, x, y);
      if (!c || c.sp !== BURST) continue;
      for (var i = 0; i < COLS; i++) addClear(i, y);
      for (var j = 0; j < ROWS; j++) addClear(x, j);
    }
    function addClear(x, y) {
      var k = x + ',' + y;
      if (!cellsSet[k] && board[y][x]) { cellsSet[k] = true; queue.push(k); }
    }
    return cellsSet;
  }

  function clearCells(board, cellsSet) {
    var n = 0;
    for (var k in cellsSet) {
      var p = k.split(','), x = +p[0], y = +p[1];
      if (board[y][x]) { board[y][x] = null; n++; }
    }
    return n;
  }

  // Gravity + refill. Returns per-column list of falls for animation:
  // moves: [{x, fromY, toY}], spawns: [{x, y, cell, order}].
  function collapse(board, rng) {
    var moves = [], spawns = [];
    for (var x = 0; x < COLS; x++) {
      var write = ROWS - 1;
      for (var y = ROWS - 1; y >= 0; y--) {
        if (board[y][x]) {
          if (write !== y) {
            board[write][x] = board[y][x];
            board[y][x] = null;
            moves.push({ x: x, fromY: y, toY: write });
          }
          write--;
        }
      }
      var order = 0;
      for (var yy = write; yy >= 0; yy--) {
        board[yy][x] = cell(rollFruit(rng, board, x, yy), NONE, rollGold(rng));
        spawns.push({ x: x, y: yy, order: order++ });
      }
    }
    return { moves: moves, spawns: spawns };
  }

  function findAllMoves(board) {
    var found = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var c = board[y][x];
        if (c && c.sp === RAINBOW) {
          // Activate by swapping with a horizontal neighbour.
          var nx = x + 1 < COLS ? x + 1 : x - 1;
          found.push({ x1: x, y1: y, x2: nx, y2: y, rainbow: true });
          continue;
        }
        if (x + 1 < COLS && trySwapMatch(board, x, y, x + 1, y)) found.push({ x1: x, y1: y, x2: x + 1, y2: y });
        if (y + 1 < ROWS && trySwapMatch(board, x, y, x, y + 1)) found.push({ x1: x, y1: y, x2: x, y2: y + 1 });
      }
    }
    return found;
  }
  function trySwapMatch(board, x1, y1, x2, y2) {
    var a = board[y1][x1], b = board[y2][x2];
    if (!a || !b) return false;
    if (a.sp === RAINBOW || b.sp === RAINBOW) return true;
    board[y1][x1] = b; board[y2][x2] = a;
    var hit = findMatches(board).cells.length > 0;
    board[y1][x1] = a; board[y2][x2] = b;
    return hit;
  }

  function reshuffle(board, rng) {
    var fruits = [];
    var x, y;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) fruits.push(board[y][x]);
    for (var attempt = 0; attempt < 60; attempt++) {
      rng.shuffle(fruits);
      var i = 0;
      for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) board[y][x] = fruits[i++];
      if (!findMatches(board).cells.length && findAllMoves(board).length) return true;
    }
    // Degenerate board (e.g. flooded with one fruit) — regenerate outright.
    var fresh = newBoard(rng);
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) board[y][x] = fresh[y][x];
    return true;
  }

  // Deep-ish copy of the board for animation snapshots (cells are tiny).
  function snap(board) {
    var s = [];
    for (var y = 0; y < ROWS; y++) {
      s.push([]);
      for (var x = 0; x < COLS; x++) {
        var c = board[y][x];
        s[y].push(c ? { f: c.f, sp: c.sp, g: c.g } : null);
      }
    }
    return s;
  }

  /* Resolve a full move instantly (no animation) — used by the Node simulator
   * and as ground truth for the animated view. Returns:
   *   { valid, juice, tiles, chain, specialsMade } — juice is pre-multiplier.
   * If `steps` is an array, each cascade iteration is recorded into it for the
   * view's playback: { pre, post, cleared, specials, falls, spawns, juice,
   * chain } — recording never touches logic or the RNG stream. */
  // Where a 4/5-match spawns its special: the swapped cell when it sits in the
  // run (feels intentional), otherwise the run's middle cell (cascade spawns).
  function pickSpawnCell(run, move, firstChain) {
    if (firstChain && move) {
      for (var i = 0; i < run.cells.length; i++) {
        var c = run.cells[i];
        if ((c.x === move.x2 && c.y === move.y2) || (c.x === move.x1 && c.y === move.y1)) return c;
      }
    }
    return run.cells[Math.floor(run.cells.length / 2)];
  }

  // Score a clear-set before wiping it: `units` is tile-equivalents of juice
  // (a Sun-Ripened golden counts as GOLDEN.MULT units on a direct clear,
  // GOLDEN.CASCADE_MULT when a cascade clears it). With no goldens present,
  // units === plain cell count, so legacy boards resolve byte-identically.
  function scoreSet(board, cellsSet, cascadeClear, byFruit) {
    var n = 0, units = 0, goldens = 0;
    var G = D.MATCH3.GOLDEN;
    for (var k in cellsSet) {
      var p = k.split(','), x = +p[0], y = +p[1];
      var c = board[y][x];
      if (!c) continue;
      n++;
      units += c.g ? (cascadeClear ? G.CASCADE_MULT : G.MULT) : 1;
      if (c.g) goldens++;
      if (byFruit && c.f >= 0) byFruit[c.f] = (byFruit[c.f] || 0) + 1;
    }
    return { n: n, units: units, goldens: goldens };
  }

  function resolveMove(board, move, rng, kettleLvl, steps) {
    var a = board[move.y1][move.x1], b = board[move.y2] && board[move.y2][move.x2];
    if (!a || !b) return { valid: false };
    var juice = 0, tiles = 0, chain = 0, specialsMade = 0;
    var goldens = 0, goldJuice = 0, byFruit = [];
    for (var bf = 0; bf < NF; bf++) byFruit.push(0);
    var kettle = 1 + 0.1 * (kettleLvl || 0);

    // Rainbow swaps clear all of the partner fruit (both rainbows = full board).
    if (a.sp === RAINBOW || b.sp === RAINBOW) {
      var set = {};
      var target = a.sp === RAINBOW ? b : a;
      if (a.sp === RAINBOW && b.sp === RAINBOW) {
        for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) set[x + ',' + y] = true;
      } else {
        for (var yy = 0; yy < ROWS; yy++) for (var xx = 0; xx < COLS; xx++) {
          var c = board[yy][xx];
          if (c && (c.f === target.f || c.sp === RAINBOW)) set[xx + ',' + yy] = true;
        }
        set[move.x1 + ',' + move.y1] = true; set[move.x2 + ',' + move.y2] = true;
      }
      expandSpecials(board, set);
      var pre0 = steps ? snap(board) : null;
      var sc0 = scoreSet(board, set, false, byFruit);
      var n0 = clearCells(board, set);
      tiles += n0; chain = 1;
      juice += sc0.units * D.MATCH3.JUICE_PER_TILE;
      goldens += sc0.goldens;
      goldJuice += (sc0.units - sc0.n) * D.MATCH3.JUICE_PER_TILE;
      var col0 = collapse(board, rng);
      if (steps) {
        steps.push({ pre: pre0, post: snap(board), cleared: Object.keys(set),
                     specials: [], falls: col0.moves, spawns: col0.spawns,
                     juice: juice, chain: 1 });
      }
    } else {
      if (!adjacent(move) || !trySwapMatch(board, move.x1, move.y1, move.x2, move.y2)) return { valid: false };
      var t = board[move.y1][move.x1];
      board[move.y1][move.x1] = board[move.y2][move.x2];
      board[move.y2][move.x2] = t;
    }

    // Cascade loop.
    for (;;) {
      var m = findMatches(board);
      if (!m.cells.length) break;
      chain++;
      var juice0 = juice;
      var pre = steps ? snap(board) : null;
      var specialsRec = steps ? [] : null;
      // Special spawns: one per run of 4/5+, placed at the swap cell when possible.
      for (var r = 0; r < m.runs.length; r++) {
        var run = m.runs[r];
        if (run.len >= 4) {
          var spawnAt = pickSpawnCell(run, move, chain === 1);
          var sp = run.len >= 5 ? RAINBOW : BURST;
          var keep = board[spawnAt.y][spawnAt.x];
          m.cells = m.cells.filter(function (c) { return !(c.x === spawnAt.x && c.y === spawnAt.y); });
          board[spawnAt.y][spawnAt.x] = cell(sp === RAINBOW ? RAINBOW_FRUIT : keep.f, sp);
          juice += sp === RAINBOW ? D.MATCH3.SPECIAL5_BONUS : D.MATCH3.SPECIAL4_BONUS;
          specialsMade++;
          if (specialsRec) {
            var nc = board[spawnAt.y][spawnAt.x];
            specialsRec.push({ x: spawnAt.x, y: spawnAt.y, cell: { f: nc.f, sp: nc.sp } });
          }
        }
      }
      var setC = {};
      for (var i2 = 0; i2 < m.cells.length; i2++) setC[m.cells[i2].x + ',' + m.cells[i2].y] = true;
      expandSpecials(board, setC);
      var clearedKeys = steps ? Object.keys(setC) : null;
      // chain ≥ 2 means a cascade is doing the clearing — Sun-Ripened fruit
      // caught by one pays its doubled CASCADE_MULT (the setup reward).
      var sc = scoreSet(board, setC, chain > 1, byFruit);
      var n = clearCells(board, setC);
      tiles += n;
      var cascMult = 1 + D.MATCH3.CASCADE_STEP * kettle * (chain - 1);
      juice += sc.units * D.MATCH3.JUICE_PER_TILE * cascMult;
      goldens += sc.goldens;
      goldJuice += (sc.units - sc.n) * D.MATCH3.JUICE_PER_TILE * cascMult;
      var colr = collapse(board, rng);
      if (steps) {
        steps.push({ pre: pre, post: snap(board), cleared: clearedKeys,
                     specials: specialsRec, falls: colr.moves, spawns: colr.spawns,
                     juice: juice - juice0, chain: chain });
      }
    }
    if (!findAllMoves(board).length) {
      var preShuffle = steps ? snap(board) : null;
      reshuffle(board, rng);
      if (steps) steps.push({ reshuffle: true, pre: preShuffle, post: snap(board) });
    }
    return { valid: true, juice: juice, tiles: tiles, chain: chain, specialsMade: specialsMade,
             goldens: goldens, goldJuice: goldJuice, byFruit: byFruit };
  }
  function adjacent(m) { return Math.abs(m.x1 - m.x2) + Math.abs(m.y1 - m.y2) === 1; }

  var core = {
    COLS: COLS, ROWS: ROWS, NONE: NONE, BURST: BURST, RAINBOW: RAINBOW,
    newBoard: newBoard, findMatches: findMatches, findAllMoves: findAllMoves,
    resolveMove: resolveMove, reshuffle: reshuffle, collapse: collapse,
    expandSpecials: expandSpecials, clearCells: clearCells
  };

  // ── Canvas view (browser only) ────────────────────────────────────────────
  if (typeof document === 'undefined') return core;

  function View(canvas, game, rng, hooks) {
    this.cv = canvas; this.g = game; this.rng = rng;
    this.hooks = hooks || {};             // onJuice(amount, chain), onSpecial(), sfx(name)
    this.ctx = canvas.getContext('2d');
    this.board = newBoard(rng);
    this.sel = null;                       // selected cell {x,y}
    this.anim = [];                        // active tweens
    this.busy = false;
    this.hintAt = 0;                       // time of last action, for hint pulse
    this.hintMove = null;
    this.time = 0;
    this.floaters = [];                    // "+12 J" popups
    this.pb = null;                        // cascade playback (recorded steps)
    this.sparkles = [];                    // decorative burst-birth particles (cosmetic only)
    this.shake = { t: 0, mag: 0 };          // micro camera shake on a Rainbow birth
    // Specular sweep (Phase 21.6, feasibility-scoped to match-3 only): a slow
    // diagonal light band crosses the glass every SWEEP_PERIOD seconds. The
    // first delay is randomized (decorative Math.random(), never the seeded
    // gameplay rng) so boards across a session don't sweep in lockstep.
    this.sweepNext = 8 + Math.random() * SWEEP_PERIOD;
    this.sweep = null;                     // { t } while a sweep is animating
    this.bindInput();
  }

  var POP_T = 0.22;                        // seconds: cleared fruit shrink+fade
  var FALL_T = 0.30;                       // seconds: gravity slide + refill drop
  var SHUFFLE_OUT_T = 0.30;                // seconds: deadlock reshuffle fade-out
  var SHUFFLE_IN_T = 0.55;                 // seconds: "fresh rain" — new board falling in
  var SWEEP_PERIOD = 45;                   // seconds between specular sweeps
  var SWEEP_T = 1.4;                       // seconds a sweep takes to cross the board

  View.prototype.metrics = function () {
    var w = this.cv.width / (window.devicePixelRatio || 1);
    var size = Math.min(this.cv.clientWidth, this.cv.clientHeight) || 480;
    var tile = Math.floor(size / (COLS + 0.5));
    var ox = (this.cv.clientWidth - tile * COLS) / 2;
    var oy = (this.cv.clientHeight - tile * ROWS) / 2;
    return { tile: tile, ox: ox, oy: oy };
  };

  View.prototype.bindInput = function () {
    var self = this, dragFrom = null, dragPointerId = null, dragX = 0, dragY = 0, swiped = false;
    function cellAt(ev) {
      var r = self.cv.getBoundingClientRect();
      var m = self.metrics();
      var x = Math.floor((ev.clientX - r.left - m.ox) / m.tile);
      var y = Math.floor((ev.clientY - r.top - m.oy) / m.tile);
      return (x >= 0 && x < COLS && y >= 0 && y < ROWS) ? { x: x, y: y } : null;
    }
    function neighbourOf(from, dx, dy) {
      // Snap to the dominant axis neighbour — a diagonal flick still reads
      // as one clean horizontal or vertical swipe, never a diagonal swap.
      return Math.abs(dx) >= Math.abs(dy) ?
        { x: from.x + Math.sign(dx), y: from.y } : { x: from.x, y: from.y + Math.sign(dy) };
    }
    this.cv.addEventListener('pointerdown', function (ev) {
      if (self.busy) return;
      dragFrom = cellAt(ev);
      if (!dragFrom) return;
      dragPointerId = ev.pointerId; dragX = ev.clientX; dragY = ev.clientY; swiped = false;
      self.cv.setPointerCapture(ev.pointerId);
    });
    // Swipe: fire the swap the instant the drag crosses a small directional
    // threshold, rather than waiting for release — this is what makes a
    // flick feel like a swipe instead of a tap-and-hold-then-release.
    this.cv.addEventListener('pointermove', function (ev) {
      if (!dragFrom || swiped || self.busy || ev.pointerId !== dragPointerId) return;
      var m = self.metrics();
      var dx = ev.clientX - dragX, dy = ev.clientY - dragY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < m.tile * 0.34) return;
      swiped = true;
      self.trySwap(dragFrom, neighbourOf(dragFrom, dx, dy));
      dragFrom = null;
    });
    this.cv.addEventListener('pointerup', function (ev) {
      if (swiped) { swiped = false; dragFrom = null; return; }
      if (self.busy) { dragFrom = null; return; }
      var c = cellAt(ev);
      if (!c) { dragFrom = null; return; }
      if (dragFrom && (dragFrom.x !== c.x || dragFrom.y !== c.y)) {
        // A slow drag that never crossed the swipe threshold — still
        // resolves as a swap on release, same as before this change.
        self.trySwap(dragFrom, neighbourOf(dragFrom, c.x - dragFrom.x, c.y - dragFrom.y));
      } else if (self.sel && self.sel.x === c.x && self.sel.y === c.y) {
        // Tap a selected rainbow twice to detonate on itself? No — deselect.
        self.sel = null;
      } else if (self.sel && Math.abs(self.sel.x - c.x) + Math.abs(self.sel.y - c.y) === 1) {
        self.trySwap(self.sel, c);
      } else {
        self.sel = c;
        if (self.hooks.sfx) self.hooks.sfx('select');
      }
      dragFrom = null;
    });
    this.cv.addEventListener('pointercancel', function () { dragFrom = null; swiped = false; });
  };

  View.prototype.trySwap = function (a, b, isAuto) {
    var self = this;
    if (!at(this.board, b.x, b.y)) return;
    this.sel = null;
    this.hintAt = this.time;
    var ca = this.board[a.y][a.x], cb = this.board[b.y][b.x];
    var valid = ca && cb && (ca.sp === RAINBOW || cb.sp === RAINBOW ||
      trySwapMatch(this.board, a.x, a.y, b.x, b.y));
    this.busy = true;
    this.tweenSwap(a, b, valid, function () {
      if (!valid) {
        self.busy = false;
        if (self.hooks.sfx) self.hooks.sfx('bad');
        return;
      }
      var steps = [];
      var res = resolveMove(self.board, { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
                            self.rng, self.g.upLvl('combokettle'), steps);
      self.finishMove(res, b, steps, isAuto);
    });
  };

  // Credit is immediate (state stays authoritative); the recorded steps then
  // play back visually — pop, fall, repeat — while input stays locked.
  View.prototype.finishMove = function (res, at, steps, isAuto) {
    if (!res.valid) { this.busy = false; return; }
    var g = this.g;
    // Fresh Squeeze (Feature 33.5): an armed buff multiplies this hand move's
    // Juice; the Auto-Juicer neither consumes nor charges the meter. Consume
    // BEFORE charging so the move that fills the meter isn't itself buffed.
    var buff = isAuto ? 1 : g.squeezeMult();
    var credited = g.gain('juice', res.juice * buff);
    g.s.stats.matches++;
    if (res.goldens) g.s.stats.goldens += res.goldens;
    if (res.chain > g.s.stats.bestChain) g.s.stats.bestChain = res.chain;
    if (res.tiles > g.s.stats.bestClear) g.s.stats.bestClear = res.tiles;
    if (!isAuto) {
      g.squeezeCharge(res.chain);
      // Juice-Stand orders (Feature 33.1): hand moves only — directed play is
      // for hands, the robot just keeps the grove warm.
      if (typeof T7 !== 'undefined' && T7.orders) T7.orders.apply(g, res);
    }
    if (this.hooks.onJuice) this.hooks.onJuice(credited, res.chain, res.tiles);
    g.checkAchievements();
    if (steps && steps.length) {
      this.pb = { steps: steps, i: 0, phase: 'pop', t: 0,
                  credited: credited, totalJuice: res.juice || 1 };
    } else {
      this.busy = false;
      this.spawnFloater(at, '+' + U.fmtInt(credited), res.chain);
      if (this.hooks.sfx) this.hooks.sfx(res.chain >= 3 ? 'cascade' : 'match');
    }
  };

  View.prototype.stepPlayback = function (dt) {
    var pb = this.pb;
    var st = pb.steps[pb.i];
    if (!st.begun) {
      st.begun = true;
      if (st.reshuffle) {
        // A deadlocked board refreshing — a neutral, informational moment,
        // not a reward: no juice floater, a light chime instead of a match cue.
        if (this.hooks.sfx) this.hooks.sfx('sparkle');
      } else {
        // Per-step floater: this step's share of the credited total.
        var share = Math.max(1, Math.round(pb.credited * st.juice / pb.totalJuice));
        this.spawnFloater(stepCentroid(st), '+' + U.fmtInt(share), st.chain);
        if (this.hooks.sfx) this.hooks.sfx(st.chain >= 3 ? 'cascade' : 'match');
        // A colored particle burst per cleared tile — hued to what's actually
        // leaving the board (each fruit's own color, gold for Burst, a
        // cycling hue for Rainbow) so a clear reads by type at a glance
        // rather than as one generic flash. st.pre is the snapshot from just
        // before this step's clear, so it still holds each cell's fruit/sp.
        var self = this;
        st.cleared.forEach(function (key) {
          var p = key.split(','), gx = +p[0], gy = +p[1];
          var prev = st.pre[gy][gx];
          if (!prev) return;
          var color = prev.sp === RAINBOW ? 'hsl(' + (Math.round(self.time * 140) % 360) + ',85%,60%)' :
                      prev.sp === BURST ? '#ffcf4d' : D.MATCH3.FRUITS[prev.f].color;
          self.spawnSparkles(gx, gy, color, 6);
        });
        // A Burst/Rainbow being born additionally gets its own warm sparkle
        // burst; a Rainbow (the rarer 5-match) also earns a cozy-grade micro
        // camera shake — a few pixels for a few frames, never anything sharp.
        (st.specials || []).forEach(function (sp) {
          self.spawnSparkles(sp.x, sp.y, null, 10);
          if (sp.cell.sp === RAINBOW) self.triggerShake();
        });
      }
    }
    pb.t += dt;
    var outT = st.reshuffle ? SHUFFLE_OUT_T : POP_T;
    var inT = st.reshuffle ? SHUFFLE_IN_T : FALL_T;
    if (pb.phase === 'pop' && pb.t >= outT) {
      pb.phase = 'fall'; pb.t = 0;
    } else if (pb.phase === 'fall' && pb.t >= inT) {
      pb.phase = 'pop'; pb.t = 0; pb.i++;
      if (pb.i >= pb.steps.length) {
        this.pb = null;
        this.busy = false;
        this.hintAt = this.time;
      }
    }
  };
  function stepCentroid(st) {
    var sx = 0, sy = 0;
    for (var i = 0; i < st.cleared.length; i++) {
      var p = st.cleared[i].split(',');
      sx += +p[0]; sy += +p[1];
    }
    var n = Math.max(1, st.cleared.length);
    return { x: sx / n, y: sy / n };
  }

  // Simple tween helpers — the animated view re-resolves visuals from board
  // snapshots; logic stays authoritative in resolveMove.
  View.prototype.tweenSwap = function (a, b, valid, done) {
    var self = this;
    this.anim.push({
      t: 0, dur: valid ? 0.16 : 0.3, a: a, b: b, valid: valid,
      done: done, kind: 'swap'
    });
    if (this.hooks.sfx) this.hooks.sfx('swap');
    void self;
  };
  View.prototype.spawnFloater = function (at, text, chain) {
    var m = this.metrics();
    this.floaters.push({
      x: m.ox + (at.x + 0.5) * m.tile, y: m.oy + at.y * m.tile,
      text: text, t: 0, chain: chain
    });
  };
  var SPARKLE_T = 0.5;
  var MAX_SPARKLES = 240;    // a big cascade clears many cells at once; cap
                              // total particles so it can't runaway-allocate
  // Decorative-only burst: direction/speed use Math.random() (same precedent
  // as audio.js's noise texture) since this never touches gameplay fairness.
  // Each particle is a tiny glassy bubble-droplet — same wet-glass language as
  // the fruit themselves — that pops outward, arcs under gravity like a real
  // droplet, then fades: see drawSparkles for the render side.
  View.prototype.spawnSparkles = function (gx, gy, color, count) {
    var m = this.metrics();
    var cx = m.ox + (gx + 0.5) * m.tile, cy = m.oy + (gy + 0.5) * m.tile;
    var n = count || 9;
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = m.tile * (1.1 + Math.random() * 1.3);
      this.sparkles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - m.tile * 0.8,
        gravity: m.tile * (3.0 + Math.random() * 1.8),
        r: m.tile * (0.06 + Math.random() * 0.09),
        t: 0, life: SPARKLE_T * (0.75 + Math.random() * 0.55),
        color: color || '#fff8c4'
      });
    }
    if (this.sparkles.length > MAX_SPARKLES) {
      this.sparkles.splice(0, this.sparkles.length - MAX_SPARKLES);   // oldest first — already faded most
    }
  };
  View.prototype.triggerShake = function () {
    if (this.g.s.settings.reducedMotion) return;   // cozy-grade: off entirely under reduced motion
    this.shake.t = 0.16; this.shake.mag = 3.2;      // a few px, a few frames — never sharp
  };

  View.prototype.update = function (dt) {
    this.time += dt;
    if (this.pb) this.stepPlayback(dt);
    for (var i = this.anim.length - 1; i >= 0; i--) {
      var an = this.anim[i];
      an.t += dt;
      if (an.t >= an.dur) {
        this.anim.splice(i, 1);
        if (an.done) an.done();
      }
    }
    for (var f = this.floaters.length - 1; f >= 0; f--) {
      this.floaters[f].t += dt;
      if (this.floaters[f].t > 1.2) this.floaters.splice(f, 1);
    }
    for (var sp = this.sparkles.length - 1; sp >= 0; sp--) {
      var s = this.sparkles[sp];
      s.t += dt;
      s.vy += s.gravity * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= 0.94;
      if (s.t > s.life) this.sparkles.splice(sp, 1);
    }
    if (this.shake.t > 0) this.shake.t = Math.max(0, this.shake.t - dt);
    // Specular sweep: reduced-motion and "Extra sparkle" both gate it off
    // entirely (not just visually — the timer itself stops ticking), same
    // policy as triggerShake above.
    if (!this.g.s.settings.reducedMotion && this.g.s.settings.particles) {
      if (this.sweep) {
        this.sweep.t += dt;
        if (this.sweep.t >= SWEEP_T) this.sweep = null;
      } else {
        this.sweepNext -= dt;
        if (this.sweepNext <= 0) { this.sweep = { t: 0 }; this.sweepNext = SWEEP_PERIOD; }
      }
    }
    // Hint after 6 idle seconds. WHICH legal move gets highlighted is pure
    // decoration, so it uses Math.random rather than the seeded match-3
    // stream — otherwise merely idling long enough to summon a hint would
    // advance the gameplay stream and change the fruit you'd have been dealt.
    // (autoMove() below is the opposite case: it actually plays a move, so it
    // must and does draw from the seeded stream.)
    if (!this.busy && this.time - this.hintAt > 6 && !this.hintMove) {
      var moves = findAllMoves(this.board);
      if (moves.length) this.hintMove = moves[Math.floor(Math.random() * moves.length)];
    }
    if (this.time - this.hintAt < 6) this.hintMove = null;
  };

  // Auto-play one random valid move (Auto-Juicer). Returns true if it moved.
  View.prototype.autoMove = function () {
    if (this.busy) return false;
    var moves = findAllMoves(this.board);
    if (!moves.length) { reshuffle(this.board, this.rng); return false; }
    var mv = this.rng.pick(moves);
    this.trySwap({ x: mv.x1, y: mv.y1 }, { x: mv.x2, y: mv.y2 }, true);
    return true;
  };

  // ── Rendering: wet glass fruit ────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  View.prototype.drawGem = function (ctx, c, px, py, size, wob) {
    var r = size * 0.38;
    var cx = px + size / 2, cy = py + size / 2 + Math.sin(wob) * size * 0.02;

    if (c.sp === RAINBOW) {
      var hue = (this.time * 90) % 360;
      var grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, 'hsl(' + hue + ',90%,65%)');
      grad.addColorStop(1, 'hsl(' + ((hue + 120) % 360) + ',85%,45%)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, 7); ctx.fill();
      this.drawShine(ctx, cx, cy, r);
      return;
    }

    var fruit = D.MATCH3.FRUITS[c.f];
    // Shared wet-glass shadow (Phase 21.5) — same painter dozer/slots use.
    U.drawSoftShadow(ctx, cx, cy + r * 0.75, r * 0.85, r * 0.3, fruit.color, 0.267);

    // Painted sprite skin when loaded; canvas painter below stays the fallback.
    // Sprites sit on a baked white card, so the shimmer ring goes gold.
    var spr = typeof T7 !== 'undefined' && T7.sprites && T7.sprites.get(fruit.id);
    if (spr) {
      var side = size * 0.88;
      ctx.drawImage(spr, cx - side / 2, cy - side / 2, side, side);
      if (c.sp === BURST) {
        ctx.strokeStyle = 'rgba(255, 190, 40, ' + (0.65 + 0.3 * Math.sin(this.time * 6)) + ')';
        ctx.lineWidth = 4;
        roundRect(ctx, cx - side / 2 + 2, cy - side / 2 + 2, side - 4, side - 4, side * 0.22);
        ctx.stroke();
      }
      if (c.g) this.drawGoldenHalo(ctx, cx, cy, r);
      return;
    }

    // Glass body: bright core → saturated rim.
    var g2 = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.2);
    g2.addColorStop(0, fruit.hi);
    g2.addColorStop(0.55, fruit.color);
    g2.addColorStop(1, shade(fruit.color, -35));
    ctx.fillStyle = g2;

    // Distinct silhouettes per fruit (colorblind support).
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    switch (fruit.id) {
      case 'cherry':
        ctx.arc(-r * 0.42, r * 0.15, r * 0.62, 0, 7);
        ctx.arc(r * 0.42, r * 0.22, r * 0.62, 0, 7);
        break;
      case 'lemon':
        ctx.ellipse(0, 0, r * 1.05, r * 0.75, -0.5, 0, 7);
        break;
      case 'melon':
        ctx.arc(0, 0, r, 0, Math.PI, false);        // half-moon slice
        ctx.closePath();
        break;
      case 'berry':
        ctx.arc(0, -r * 0.45, r * 0.5, 0, 7);
        ctx.arc(-r * 0.45, r * 0.3, r * 0.5, 0, 7);
        ctx.arc(r * 0.45, r * 0.3, r * 0.5, 0, 7);
        break;
      case 'orange':
        ctx.arc(0, 0, r, 0, 7);
        break;
      case 'plum':
        roundRect(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.55);
        break;
    }
    ctx.fill();

    // Melon rind accent / orange leaf accents.
    if (fruit.id === 'melon') {
      ctx.strokeStyle = '#1c7a38'; ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0.08, Math.PI - 0.08); ctx.stroke();
    }
    if (fruit.id === 'orange') {
      ctx.fillStyle = '#2f9e44';
      ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.95, r * 0.3, r * 0.14, 0.6, 0, 7); ctx.fill();
    }
    ctx.restore();

    // Burst specials shimmer with a white ring.
    if (c.sp === BURST) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 + 0.35 * Math.sin(this.time * 6)) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, 7); ctx.stroke();
    }
    if (c.g) this.drawGoldenHalo(ctx, cx, cy, r);
    this.drawShine(ctx, cx, cy, r);
  };
  // Sun-Ripened halo (Feature 33.2): a warm gold ring + a tiny sun-dot crown.
  // Reduced motion gets the same halo, statically — a golden must always be
  // recognizable at a glance, never only by its animation.
  View.prototype.drawGoldenHalo = function (ctx, cx, cy, r) {
    var pulse = this.g.s.settings.reducedMotion ? 0.85 : 0.7 + 0.3 * Math.sin(this.time * 4);
    ctx.strokeStyle = 'rgba(255, 208, 66, ' + pulse.toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.16, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 236, 150, 0.95)';
    ctx.beginPath(); ctx.arc(cx, cy - r * 1.16, r * 0.14, 0, 7); ctx.fill();
  };
  View.prototype.drawShine = function (ctx, cx, cy, r) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(cx + r * 0.3, cy + r * 0.35, r * 0.09, 0, 7); ctx.fill();
  };
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = U.clamp(((n >> 16) & 255) + amt, 0, 255);
    var g = U.clamp(((n >> 8) & 255) + amt, 0, 255);
    var b = U.clamp((n & 255) + amt, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  View.prototype.draw = function () {
    var ctx = this.ctx, m = this.metrics();
    var W = this.cv.clientWidth, H = this.cv.clientHeight;
    ctx.clearRect(0, 0, W, H);

    // Cozy-grade camera nudge (Phase 21.9-ish, render-only): a few px for a
    // few frames on a Rainbow birth, decaying to nothing; never applied under
    // reduced motion (triggerShake refuses to arm itself in that case).
    ctx.save();
    if (this.shake.t > 0) {
      var sk = this.shake.t / 0.16 * this.shake.mag;
      ctx.translate((Math.random() - 0.5) * 2 * sk, (Math.random() - 0.5) * 2 * sk);
    }

    // Board plate with depth edge (pseudo-3D).
    roundRect(ctx, m.ox - 10, m.oy - 10, m.tile * COLS + 20, m.tile * ROWS + 20, 18);
    ctx.fillStyle = 'rgba(9, 60, 96, 0.35)'; ctx.fill();
    roundRect(ctx, m.ox - 10, m.oy - 6, m.tile * COLS + 20, m.tile * ROWS + 16, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();

    // Checker glass tiles for the whole grid.
    for (var ty = 0; ty < ROWS; ty++) {
      for (var tx = 0; tx < COLS; tx++) {
        ctx.fillStyle = (tx + ty) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)';
        roundRect(ctx, m.ox + tx * m.tile + 1, m.oy + ty * m.tile + 1, m.tile - 2, m.tile - 2, 8);
        ctx.fill();
      }
    }

    if (this.pb) this.drawPlayback(ctx, m);
    else this.drawBoard(ctx, m);
    this.drawSparkles(ctx);
    if (this.sweep) this.drawSweep(ctx, m);
    this.drawFloaters(ctx);
    ctx.restore();
  };
  // Specular sweep (Phase 21.6): one soft diagonal light band, clipped to the
  // board plate, drawn only during its ~1.4s crossing — no per-frame cost the
  // rest of the time. No allocations at rest; the gradient/path only get
  // built while `this.sweep` is truthy.
  View.prototype.drawSweep = function (ctx, m) {
    var x0 = m.ox - 10, y0 = m.oy - 10, w = m.tile * COLS + 20, h = m.tile * ROWS + 20;
    var k = this.sweep.t / SWEEP_T;
    var envelope = Math.sin(Math.min(1, k) * Math.PI);       // smooth fade in/out, never a hard pop
    ctx.save();
    roundRect(ctx, x0, y0, w, h, 18);
    ctx.clip();
    var diag = Math.sqrt(w * w + h * h);
    ctx.translate(x0 + w / 2, y0 + h / 2);
    ctx.rotate(-Math.PI / 5);
    var band = Math.max(40, m.tile * 0.9);
    var pos = -diag * 0.7 + k * diag * 1.4;
    var grad = ctx.createLinearGradient(pos - band, 0, pos + band, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,' + (0.32 * envelope).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(pos - band, -diag, band * 2, diag * 2);
    ctx.restore();
  };
  // Glassy bubble-droplets: pop to full size fast, hold, then fade — a soft
  // radial core-to-rim gradient plus a bright pinpoint highlight, same visual
  // language as drawGem/drawShine's wet-glass fruit.
  View.prototype.drawSparkles = function (ctx) {
    for (var i = 0; i < this.sparkles.length; i++) {
      var s = this.sparkles[i];
      var k = s.t / s.life;
      var popIn = Math.min(1, s.t / 0.07);
      var fadeOut = k > 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.45) : 1;
      var alpha = popIn * fadeOut;
      if (alpha <= 0.02) continue;
      var r = s.r * (0.55 + 0.45 * popIn);
      ctx.save();
      ctx.globalAlpha = alpha;
      var grad = ctx.createRadialGradient(s.x - r * 0.35, s.y - r * 0.4, r * 0.12, s.x, s.y, r * 1.15);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.45, s.color);
      grad.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(0.4, r * 0.2);
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.8, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(s.x - r * 0.32, s.y - r * 0.34, Math.max(0.35, r * 0.24), 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  View.prototype.drawBoard = function (ctx, m) {
    var swap = null;
    for (var i = 0; i < this.anim.length; i++) if (this.anim[i].kind === 'swap') swap = this.anim[i];

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var c = this.board[y][x];
        if (!c) continue;
        var px = m.ox + x * m.tile, py = m.oy + y * m.tile;

        // Animated swap offset (visual only — board already holds the result).
        // During the tween the board still holds pre-swap gems, so each gem
        // slides toward its partner cell; invalid swaps bounce back (sin arc).
        var ox = 0, oy = 0;
        if (swap) {
          var t = U.easeOutCubic(Math.min(1, swap.t / swap.dur));
          var wiggle = swap.valid ? t : Math.sin(t * Math.PI) * 0.6;
          if (x === swap.a.x && y === swap.a.y) {
            ox = (swap.b.x - swap.a.x) * m.tile * wiggle;
            oy = (swap.b.y - swap.a.y) * m.tile * wiggle;
          } else if (x === swap.b.x && y === swap.b.y) {
            ox = (swap.a.x - swap.b.x) * m.tile * wiggle;
            oy = (swap.a.y - swap.b.y) * m.tile * wiggle;
          }
        }

        // Selection / hint glow.
        if (this.sel && this.sel.x === x && this.sel.y === y) {
          ctx.fillStyle = 'rgba(255, 230, 120, 0.4)';
          roundRect(ctx, px + 1, py + 1, m.tile - 2, m.tile - 2, 8); ctx.fill();
        }
        if (this.hintMove && ((this.hintMove.x1 === x && this.hintMove.y1 === y) ||
                              (this.hintMove.x2 === x && this.hintMove.y2 === y))) {
          var pulse = 0.25 + 0.2 * Math.sin(this.time * 4);
          ctx.fillStyle = 'rgba(120, 230, 255, ' + pulse + ')';
          roundRect(ctx, px + 1, py + 1, m.tile - 2, m.tile - 2, 8); ctx.fill();
        }

        ctx.save();
        ctx.translate(px + ox, py + oy);
        this.drawGem(ctx, c, 0, 0, m.tile, this.time * 2 + x * 0.7 + y * 1.3);
        ctx.restore();
      }
    }
  };

  // ── Cascade playback: pop phase then fall phase per recorded step ─────────
  View.prototype.drawPlayback = function (ctx, m) {
    var pb = this.pb, st = pb.steps[pb.i];
    var x, y, px, py, key, c;
    if (st.reshuffle) { this.drawReshuffle(ctx, m, pb, st); return; }
    if (!st.maps) {
      var cs = {}, sm = {}, fm = {};
      st.cleared.forEach(function (k) { cs[k] = true; });
      st.specials.forEach(function (s) { sm[s.x + ',' + s.y] = s.cell; });
      st.falls.forEach(function (f2) { fm[f2.x + ',' + f2.toY] = f2.fromY; });
      st.spawns.forEach(function (s) { fm[s.x + ',' + s.y] = -1 - s.order; });
      st.maps = { cleared: cs, specials: sm, from: fm };
    }
    if (pb.phase === 'pop') {
      var k = Math.min(1, pb.t / POP_T);
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          c = st.pre[y][x];
          key = x + ',' + y;
          px = m.ox + x * m.tile; py = m.oy + y * m.tile;
          var born = st.maps.specials[key];
          if (born) {
            // A Burst/Rainbow being born pulses up over its popping run.
            this.drawScaled(ctx, born, px, py, m.tile, 1 + 0.25 * Math.sin(k * Math.PI), 1);
          } else if (st.maps.cleared[key]) {
            if (c) this.drawScaled(ctx, c, px, py, m.tile, 1 - U.easeOutCubic(k), 1 - k);
          } else if (c) {
            this.drawScaled(ctx, c, px, py, m.tile, 1, 1);
          }
        }
      }
    } else {
      // Gravity: tiles slide down into the gaps, refills drop in from above
      // the frame (clipped to the board plate).
      var kf = Math.min(1, pb.t / FALL_T);
      var ease = kf * kf;
      ctx.save();
      roundRect(ctx, m.ox - 6, m.oy - 6, m.tile * COLS + 12, m.tile * ROWS + 12, 14);
      ctx.clip();
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          c = st.post[y][x];
          if (!c) continue;
          var from = st.maps.from[x + ',' + y];
          var vy = from === undefined ? y : from + (y - from) * ease;
          this.drawScaled(ctx, c, m.ox + x * m.tile, m.oy + vy * m.tile, m.tile, 1, 1);
        }
      }
      ctx.restore();
    }
  };
  // Deadlock reshuffle ("fresh rain," §4a): fade the stuck board out, then
  // rain the fresh layout in as a diagonal wave rather than a flat curtain —
  // a distinct, informational beat, not a reward (see stepPlayback: no
  // floater, a light chime instead of the match/cascade cue).
  View.prototype.drawReshuffle = function (ctx, m, pb, st) {
    var x, y, px, py, c;
    if (pb.phase === 'pop') {
      var k = Math.min(1, pb.t / SHUFFLE_OUT_T);
      var scale = 1 - U.easeOutCubic(k), alpha = 1 - k;
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          c = st.pre[y][x];
          if (!c) continue;
          px = m.ox + x * m.tile; py = m.oy + y * m.tile;
          this.drawScaled(ctx, c, px, py, m.tile, scale, alpha);
        }
      }
    } else {
      ctx.save();
      roundRect(ctx, m.ox - 6, m.oy - 6, m.tile * COLS + 12, m.tile * ROWS + 12, 14);
      ctx.clip();
      for (y = 0; y < ROWS; y++) {
        for (x = 0; x < COLS; x++) {
          c = st.post[y][x];
          if (!c) continue;
          var delay = (x + y) / (COLS + ROWS) * 0.3;   // diagonal wave, top-left leads
          var local = U.clamp((pb.t - delay) / Math.max(0.05, SHUFFLE_IN_T - delay), 0, 1);
          var vy = -3 + (y + 3) * U.easeOutCubic(local);
          this.drawScaled(ctx, c, m.ox + x * m.tile, m.oy + vy * m.tile, m.tile, 1, 1);
        }
      }
      ctx.restore();
    }
  };
  View.prototype.drawScaled = function (ctx, c, px, py, tile, scale, alpha) {
    if (scale <= 0.02 || alpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px + tile / 2, py + tile / 2);
    ctx.scale(scale, scale);
    ctx.translate(-tile / 2, -tile / 2);
    this.drawGem(ctx, c, 0, 0, tile, this.time * 2);
    ctx.restore();
  };

  View.prototype.drawFloaters = function (ctx) {
    for (var f = 0; f < this.floaters.length; f++) {
      var fl = this.floaters[f];
      var ft = fl.t / 1.2;
      ctx.globalAlpha = 1 - ft;
      ctx.font = '700 ' + (fl.chain >= 3 ? 26 : 20) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = fl.chain >= 3 ? '#ffe066' : '#fff';
      ctx.strokeStyle = 'rgba(120,30,30,0.6)'; ctx.lineWidth = 4;
      ctx.strokeText(fl.text, fl.x, fl.y - ft * 46);
      ctx.fillText(fl.text, fl.x, fl.y - ft * 46);
      ctx.globalAlpha = 1;
    }
  };

  core.View = View;
  return core;
});
