# Triple7 — Fairness Contract

Triple7 borrows casino mathematics — weighted virtual reels, par sheets, RTP —
because that vocabulary is precise. It borrows none of the incentives. There
is nothing to buy, nothing to lose, and no reason for the game to want your
time more than you do. This document is the honest, complete account of how
every random outcome in Triple7 is decided, published in the open so anyone
can check it against the code and against `npm run simulate`.

## The one hard rule

**Every outcome is decided before its presentation begins.** A slot spin's
symbols, a dozer coin's exit, a match-3 swap's result — all of it is computed
the instant the action happens, from code you can read in this repository.
Animation is never allowed to see the result early and adjust it; it only
ever stages a show around a number that already exists. This is the same
rule regulated gaming markets enforce against "secondary decisions" (Nevada
Gaming Regulation 14), adopted here as an invariant no future change may
break (see `.claude/context/plan.md` §11.2 and the hard invariants list).

One deliberate corollary: the Beach Bonus counter (see Slots below) has no
random outcome at all — its result is decided entirely by *when you tap*,
and the display is the decision. That is the same invariant seen from the
other side: nothing hidden ever adjusts what you were shown.

## Where the randomness comes from

Every draw in the game flows through **mulberry32**, a small, fast, seeded
PRNG (public-domain, widely used in games; passes standard statistical
smoke tests). It is not cryptographically secure and does not need to be —
there is no money on the table, and a FOSS idle game's only adversary is the
player's own optional save-editing, which is between them and their own copy
of the game (see "Save integrity" below).

The game seeds from `crypto.getRandomValues` when available (every modern
browser, on `https://` and `localhost`), falling back to a
`Date.now()`/`Math.random()` mix only if that API is absent — so outcomes
are not predictable from page-load time alone, the historical failure mode
(the Ron Harris slot-machine case) that pushed the real industry toward
certified, free-running hardware RNGs.

### Named streams, not one shared draw

As of this pass, **match-3, the slots, the dozer, and charm draws (the
charm chest and the dozer's charm-chest special) each run on their own
independent stream** (`js/main.js` constructs `rngs.match3`, `rngs.slots`,
`rngs.dozer`, `rngs.charms`). Playing a few match-3 moves can never shift
what the slots or the dozer would have rolled next, and vice versa — the
streams are separate objects with separate state, not separate seeds into
one shared generator. Each stream's exact position is written into your
save (`s.rng.<name> = {seed, a}`) and resumed on load, so closing the game
mid-session never reseeds you into a "luckier" or "unluckier" stream; a save
made before this change simply seeds all four streams fresh from
`crypto.getRandomValues`, identical in spirit to how the single shared
stream always worked.

## Slots — "Sunshine Sevens" (5×4)

A 5-reel, 4-row video slot with **6 fixed paylines**. Every one of the 20
window cells is an **independent draw** from the same 64-stop weighted
distribution, decided the instant you press Spin — the spinning strips are
pure theater staged around those 20 already-final symbols. (This is the same
"outcome first" model the 3-reel machine always used, extended to a window;
we state it plainly rather than pretending a mechanical reel exists.)

The lines use **two rules, both printed on the machine** (faint guide lines
trace every path while the reels rest): the **4 flat rows** pay a run of 3+
matching symbols **anywhere along the row** — what the eye expects of "three
in a row" — while the **V and Λ** lines pay only runs starting from reel 1,
the classic anchored rule, which keeps them rarer and special.

| Symbol | Weight (of 64) | P(one cell) |
|---|---|---|
| seven  | 2  | 3.125% |
| star   | 8  | 12.500% |
| berry  | 10 | 15.625% |
| melon  | 12 | 18.750% |
| lemon  | 15 | 23.438% |
| cherry | 17 | 26.563% |

Spin costs 7 Juice. Pays per run of 3, 4 or 5 identical symbols (per line,
in Suncoins, before upgrades), with p = weight/64, q = 1−p:

| Symbol | ×3 | ×4 | ×5 |
|---|---|---|---|
| seven  | 12 | 77 | **777** |
| star   | 3 | 5 | 20 |
| berry  | 2 | 3 | 8 |
| melon  | 2 | 2 | 5 |
| lemon  | 2 | 2 | 4 |
| cherry | 2 | 2 | 3 |

Exact per-line probabilities (enumerable by hand over the 2⁵ same/other
masks of a 5-cell line):

- **Flat row** (run anywhere): P(run=3) = 3p³q² + 2p⁴q · P(run=4) = 2p⁴q ·
  P(run=5) = p⁵
- **Shaped V/Λ** (anchored at reel 1): P(3) = p³q · P(4) = p⁴q · P(5) = p⁵

Line EV = Σ over symbols and run lengths of (4·P_flat + 2·P_shaped)·pay —
expectation is linear even though lines share cells, so the total is exact:
**1.13770 S/spin**, with **0.536 expected winning lines per spin**.

**The Beach Bonus (skill-stop counter).** 3 or more Sevens **anywhere** in
the window (scatter) trigger the bonus — an exact Binomial(20, 2/64) event,
**P = 2.337% (1 in 43)**. The Beach Getaway top screen becomes a counter
stepping up and down a published ladder (3→5→6→8→10→13→17→24→49 S). It is
**genuinely timing-based**: whatever value is showing the instant you stop
is exactly what is credited. The machine never nudges, re-rolls, or
"forces" the result the way real pachislo skill-stop machines are permitted
to — there is no hidden second decision at all, because there is no first
one: the only input is your tap. Walk away (or let the Auto-Spinner play)
and the counter stops itself after 3 full cycles; over time that pays the
**blind-stop mean of 13.625 S** (the exact average over the 16-step cycle),
which is the figure the published EV prices the bonus at. Skilled timing
can only lift your personal return *above* the published number, never
drag it below the ladder minimum. Catching the very top rung also pays
**7 Stargems** and counts as the TRIPLE SEVEN moment.

Total exact base EV is **1.456130 Suncoins per 7-Juice spin — 145.6% RTP**
(lines 1.13770 + bonus 0.31843), with a measured hit rate of **≈44.5%** —
the anywhere-rule on rows nearly halves the dry spins compared to the
leftmost-only rule at the same return, and both figures sit deliberately
above the old 3-reel machine's 1.18401 / 30.1%.
`npm run simulate` re-derives this analytically *and* by Monte Carlo over
millions of spins (blind bonus stops), and asserts they agree;
`tools/test.js` pins the exact figure (`1.45613`) as a regression test, so
it cannot silently drift. Sun-Kissed Reels multiplies payouts and Lucky
Sevens adds higher ladder rungs (63/77/98 S); the in-game Paytable dialog
computes the *current*, upgrade-adjusted odds live from the same
`enumerateRTP()` function the simulator uses — one source of truth for you,
the simulator, and this document.

The smallest line pay (2 S) still exceeds the 1-Suncoin-equivalent stake,
and the smallest ladder rung (3 S) exceeds it three-fold — no win in this
machine is a loss disguised as a win.

**Anticipation is presentation-only.** When 2+ Sevens sit among the first
three reels, the last two reels spin about 1.8× longer with a rising glow —
but their symbols were already decided at the moment you pressed Spin. The
longer spin never changes what lands; it only gives the already-decided
moment more room to be felt. The same rule governs any future near-miss
visuals: layout may place a symbol "one stop away" from a line, but only
cosmetically, never by moving the actual decided result.

**No win pays less than the stake.** The smallest listed win (2 Suncoins,
exactly two cherries) still exceeds the 1-Suncoin-equivalent 7-Juice stake.
Triple7 will never add a "win" smaller than what you spent to get it — the
industry calls those losses disguised as wins, and they are banned here by
design, not just by accident of current tuning.

**The Beach Getaway top screen is not part of the odds.** The vacation
scene above the reels levels up on lifetime spin *count* alone
(`D.RESORT.LEVELS` in `js/data.js`) — never on outcomes — and each level-up
pays a one-time fixed Suncoin gift, the same deterministic-milestone pattern
as achievement rewards. Weather changes are pure cosmetics on a decorative
random source. None of it reads or perturbs the seeded slots stream, none of
it changes any probability above, and the gifts are excluded from the
personal-RTP stat so that audit stays a clean per-stake measure.

## Coin dozer — "Star Harbor"

The dozer has no separate "roll" at all — the randomness *is* the physics.
A drop (7 Suncoins) spawns a real 2D circle-physics coin at a denomination
drawn from weighted tiers the instant it spawns:

| Coin | Face value | Weight | Pays (Stargems) |
|---|---|---|---|
| coin7  | 7 S  | 97/100 | 1 |
| coin21 | 21 S | 2/100  | 3 |
| coin49 | 49 S | 1/100  | 7 |

E[tier] = (97·1 + 2·3 + 1·7) / 100 = **1.10 Stargems per coin that exits the
front**. Every drop also has a 6% base chance (Charm Magnet upgrades raise
it, capped) to spawn a special item instead, weighted: gem-fruit (7
Stargems, 44/100), charm chest (a random collectible, 18/100), juice bottle
(300 seconds of your current Juice income, floor 77 J, 22/100), sun pouch
(21 Suncoins, 16/100).

Physics then decides, honestly, which coins reach the front edge (paid) and
which fall into a side gutter (lost — this is the entire "house edge",
measured at roughly 6–8% of exits at base geometry, lower with the Bumper
Rails upgrade). `npm run simulate` runs the *actual* physics — the same
`js/dozer.js` the browser runs — for thousands of simulated drops and
measures steady-state E[Stargems per drop] directly; it currently measures
**≈130% RTP at base geometry, ≈166% fully upgraded**. There is no hidden
"decide payout, then animate a fake table" step: the table you watch is the
computation.

## Match-3 — "Juicy Grove"

Refills are uniform over the six fruits, with a **single reroll** if the
freshly spawned fruit would *immediately* complete a 3-run with its already
placed neighbors. This is a mild bias against instant matches, not a
guarantee against them — cascades stay possible and are meant to feel like
a gift, per genre convention (Bejewela-likes call this "no free matches on
spawn," not "no cascades ever"). Deadlock is handled honestly too: after
every settle, the game tests all ~112 possible swaps against the real board;
if literally none produce a match, it reshuffles rather than trap you in an
unplayable board.

Match-3 is unconditionally free — no cost, always available, and the tests
in `tools/test.js` assert its expected value is strictly positive over
thousands of fuzzed moves. It is the loop's unconditional faucet: no matter
how a slot or dozer session goes, you can always walk back to the board and
earn your way back up.

## No dark patterns, published as a pledge

- No currency conversion ever runs backward (Stargems → Suncoins → Juice is
  structurally impossible — there is no code path for it).
- No timers-to-pay, no fake discounts, no streak that breaks and punishes
  you, no "log in or lose your bonus." If a future feature needs any of
  these to work, the feature is wrong for this game, not the pledge.
- Every multiplier source is bounded (upgrade max levels, charm level 7,
  achievement count, prestige seed count) — bonuses cannot compound past a
  ceiling `npm run simulate`'s balance checks watch for.
- Save codes (`T71.xxxxxxxx....`) carry an FNV-1a checksum and are validated
  end-to-end before ever touching live state; a corrupted or hand-edited
  code fails loudly with a readable error rather than silently corrupting
  your progress. This is integrity against corruption, not security against
  a player editing their own save — in a free, offline, single-player game,
  that's a decision only you get to make about your own copy.

## Verify it yourself

```
npm test        # logic unit tests — board, reels, physics, saves, prestige, rng streams
npm run simulate # exact slot par sheet + Monte Carlo, match-3 EV, full dozer physics sim
```

Both commands run the *exact* code the browser runs (`js/*.js` is loaded
unmodified in Node via the UMD wrapper each file uses) — there is no
separate "simulator model" that could drift from what actually ships. If
any number in this document ever disagrees with what those commands print,
trust the commands and file it as a bug in this document, not the other
way around.
