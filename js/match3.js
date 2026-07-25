/* Triple7 — match3.js  ("Juicy Grove")
 * Pure board logic (UMD-exported for the Node simulator) + canvas view.
 *
 * Loop (industry-standard state machine):
 *   swap → find matches → clear (expand bursts) → gravity → refill → re-detect
 * Deadlock: simulate every swap; if none matches, auto-reshuffle (Bejeweled 2 rule).
 * Refill: uniform seeded draw with a single re-roll if the spawn would instantly
 * complete a vertical run (keeps surprise cascades special, not constant).
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

  function cell(fruit, special) { return { f: fruit, sp: special || NONE }; }

  // ── Pure board ops ────────────────────────────────────────────────────────

  function rollFruit(rng, board, x, y) {
    // Avoid completing a run of 3 with already-placed left/up neighbours.
    var f = Math.floor(rng.float() * NF);
    var tries = 0;
    while (tries++ < 8 && wouldRun(board, x, y, f)) f = Math.floor(rng.float() * NF);
    return f;
  }
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
      for (var x = 0; x < COLS; x++) b[y].push(null), b[y][x] = cell(rollFruit(rng, b, x, y));
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
        board[yy][x] = cell(rollFruit(rng, board, x, yy));
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

  /* Resolve a full move instantly (no animation) — used by the Node simulator
   * and as ground truth for the animated view. Returns:
   *   { valid, juice, tiles, chain, specialsMade } — juice is pre-multiplier. */
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

  function resolveMove(board, move, rng, kettleLvl) {
    var a = board[move.y1][move.x1], b = board[move.y2] && board[move.y2][move.x2];
    if (!a || !b) return { valid: false };
    var juice = 0, tiles = 0, chain = 0, specialsMade = 0;
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
      var n0 = clearCells(board, set);
      tiles += n0; chain = 1; juice += n0 * D.MATCH3.JUICE_PER_TILE;
      collapse(board, rng);
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
        }
      }
      var setC = {};
      for (var i2 = 0; i2 < m.cells.length; i2++) setC[m.cells[i2].x + ',' + m.cells[i2].y] = true;
      expandSpecials(board, setC);
      var n = clearCells(board, setC);
      tiles += n;
      juice += n * D.MATCH3.JUICE_PER_TILE * (1 + D.MATCH3.CASCADE_STEP * kettle * (chain - 1));
      collapse(board, rng);
    }
    if (!findAllMoves(board).length) reshuffle(board, rng);
    return { valid: true, juice: juice, tiles: tiles, chain: chain, specialsMade: specialsMade };
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
    this.pop = {};                         // cell pop scale on clear "x,y" -> t
    this.bindInput();
  }

  View.prototype.metrics = function () {
    var w = this.cv.width / (window.devicePixelRatio || 1);
    var size = Math.min(this.cv.clientWidth, this.cv.clientHeight) || 480;
    var tile = Math.floor(size / (COLS + 0.5));
    var ox = (this.cv.clientWidth - tile * COLS) / 2;
    var oy = (this.cv.clientHeight - tile * ROWS) / 2;
    return { tile: tile, ox: ox, oy: oy };
  };

  View.prototype.bindInput = function () {
    var self = this, dragFrom = null;
    function cellAt(ev) {
      var r = self.cv.getBoundingClientRect();
      var m = self.metrics();
      var x = Math.floor((ev.clientX - r.left - m.ox) / m.tile);
      var y = Math.floor((ev.clientY - r.top - m.oy) / m.tile);
      return (x >= 0 && x < COLS && y >= 0 && y < ROWS) ? { x: x, y: y } : null;
    }
    this.cv.addEventListener('pointerdown', function (ev) {
      if (self.busy) return;
      dragFrom = cellAt(ev);
    });
    this.cv.addEventListener('pointerup', function (ev) {
      if (self.busy) { dragFrom = null; return; }
      var c = cellAt(ev);
      if (!c) { dragFrom = null; return; }
      if (dragFrom && (dragFrom.x !== c.x || dragFrom.y !== c.y)) {
        // Drag: snap to the dominant axis neighbour.
        var dx = c.x - dragFrom.x, dy = c.y - dragFrom.y;
        var tx = dragFrom.x + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
        var ty = dragFrom.y + (Math.abs(dx) >= Math.abs(dy) ? 0 : Math.sign(dy));
        self.trySwap(dragFrom, { x: tx, y: ty });
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
  };

  View.prototype.trySwap = function (a, b) {
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
      var res = resolveMove(self.board, { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
                            self.rng, self.g.upLvl('combokettle'));
      self.finishMove(res, b);
    });
  };

  View.prototype.finishMove = function (res, at) {
    this.busy = false;
    if (!res.valid) return;
    var g = this.g;
    var credited = g.gain('juice', res.juice);
    g.s.stats.matches++;
    if (res.chain > g.s.stats.bestChain) g.s.stats.bestChain = res.chain;
    this.spawnFloater(at, '+' + U.fmtInt(credited), res.chain);
    this.burstPop();
    if (this.hooks.onJuice) this.hooks.onJuice(credited, res.chain, res.tiles);
    if (this.hooks.sfx) this.hooks.sfx(res.chain >= 3 ? 'cascade' : 'match');
    g.checkAchievements();
  };

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
  View.prototype.burstPop = function () {
    // Pop animation timestamps decay in draw(); board is already final.
    this.popT = 0.001;
  };
  View.prototype.spawnFloater = function (at, text, chain) {
    var m = this.metrics();
    this.floaters.push({
      x: m.ox + (at.x + 0.5) * m.tile, y: m.oy + at.y * m.tile,
      text: text, t: 0, chain: chain
    });
  };

  View.prototype.update = function (dt) {
    this.time += dt;
    if (this.popT) { this.popT += dt; if (this.popT > 0.35) this.popT = 0; }
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
    // Hint after 6 idle seconds.
    if (!this.busy && this.time - this.hintAt > 6 && !this.hintMove) {
      var moves = findAllMoves(this.board);
      if (moves.length) this.hintMove = this.rng.pick(moves);
    }
    if (this.time - this.hintAt < 6) this.hintMove = null;
  };

  // Auto-play one random valid move (Auto-Juicer). Returns true if it moved.
  View.prototype.autoMove = function () {
    if (this.busy) return false;
    var moves = findAllMoves(this.board);
    if (!moves.length) { reshuffle(this.board, this.rng); return false; }
    var mv = this.rng.pick(moves);
    this.trySwap({ x: mv.x1, y: mv.y1 }, { x: mv.x2, y: mv.y2 });
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
    // Colored translucent shadow — the "wet" look.
    ctx.fillStyle = fruit.color + '44';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.75, r * 0.85, r * 0.3, 0, 0, 7); ctx.fill();

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
    this.drawShine(ctx, cx, cy, r);
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

    // Board plate with depth edge (pseudo-3D).
    roundRect(ctx, m.ox - 10, m.oy - 10, m.tile * COLS + 20, m.tile * ROWS + 20, 18);
    ctx.fillStyle = 'rgba(9, 60, 96, 0.35)'; ctx.fill();
    roundRect(ctx, m.ox - 10, m.oy - 6, m.tile * COLS + 20, m.tile * ROWS + 16, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();

    var swap = null;
    for (var i = 0; i < this.anim.length; i++) if (this.anim[i].kind === 'swap') swap = this.anim[i];

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var c = this.board[y][x];
        if (!c) continue;
        var px = m.ox + x * m.tile, py = m.oy + y * m.tile;

        // Checker glass tiles.
        ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)';
        roundRect(ctx, px + 1, py + 1, m.tile - 2, m.tile - 2, 8); ctx.fill();

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
        var scale = 1;
        if (this.popT) scale = 1 + 0.08 * Math.sin(Math.min(1, this.popT / 0.35) * Math.PI);

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
        ctx.translate(px + ox + m.tile / 2, py + oy + m.tile / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(px + m.tile / 2), -(py + m.tile / 2));
        this.drawGem(ctx, c, px, py, m.tile, this.time * 2 + x * 0.7 + y * 1.3);
        ctx.restore();
      }
    }

    // Floating "+N J" popups.
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
