# Contributing to Triple7

Thanks for even opening this file. Triple7 is a free, open-source, cozy idle
game with a specific philosophy, and this document exists so a contribution
can land smoothly instead of bouncing off an invariant nobody wrote down.

## The philosophy, in one paragraph

Triple7 borrows casino mathematics (weighted virtual reels, par sheets, RTP)
and none of the casino incentives. Every stage of the currency chain is
deliberately player-positive, every odds table is published
(`docs/fairness.md`), and the game will never grow ads, accounts, purchases,
timers-to-pay, or streaks that punish absence. If your idea needs one of
those to work, it's a great idea for a different game.

## Before you write code

Read `.claude/context/plan.md` — it is the single source of truth for vision,
math, and architecture, written as an agile handoff document (§0 explains how
to use it). In particular:

- **§0's hard invariants** are non-negotiable in any PR: every economy stage
  stays EV-positive, outcomes are decided before presentation begins, no
  currency ever flows backward (Stargems → Suncoins → Juice is structurally
  impossible), no build step, no runtime network calls, save compatibility
  forever, every tuned number lives in `js/data.js`, free forever.
- **The Status Ledger** near the top of the plan is the honest boundary
  between what's shipped and what's still vision — audit the code before
  assuming a phase is done, and update the ledger when your change actually
  finishes one.
- **§11** (Casino-Industry Pitfalls) and **§12** (Implementation Notes) list
  traps other contributors already found. If your change touches RNG,
  multipliers, save schema, or dozer geometry, read the matching entry first.

## Local setup

Zero dependencies, zero build step — just Node 18+.

```
npm start           # dev server at http://localhost:7777
npm test            # logic unit tests (tools/test.js)
npm run simulate    # economy proof — exact + Monte Carlo RTP, physics sim
```

Both `npm test` and `npm run simulate` load the *exact* `js/*.js` files the
browser runs (each file's UMD wrapper works in both), so there is no separate
"simulator model" that can drift from what ships. If you change any economy
number, rerun both before opening a PR.

## Making a change

1. **Tuning numbers live only in `js/data.js`.** Logic reads constants; it
   never hardcodes a weight, cost, or payout inline.
2. **If you touch `data.js` economy numbers**, rerun `npm run simulate` and
   update any prose elsewhere that quotes the old figure (the plan's §12.1
   bookkeeping table lists exactly what to re-check for each kind of change:
   slot weights, dozer geometry, grove/upgrade costs, multiplier sources,
   save schema).
3. **If you add a persisted save field**, add it to `defaultState()` in
   `js/state.js` with a safe default so old saves migrate via the existing
   deep-merge — this repo doesn't bump `SAVE_VERSION` for additive fields,
   only for breaking schema changes.
4. **If you touch RNG**, use the correct named stream (`match3` / `slots` /
   `dozer` / `charms` — see `js/main.js`) rather than a fresh `Rng()`
   instance; a new subsystem that needs its own randomness should get its
   own named stream, not share another system's.
5. **Write a test.** `tools/test.js` is a small zero-dependency harness
   (`t(name, fn)`, `eq`, `ok`, `near` — see the top of the file); add cases
   near the relevant section rather than introducing a new framework.
6. **Verify before you push:**
   ```
   node --check js/*.js tools/*.js   # syntax
   npm test                          # logic
   npm run simulate                  # economy (only if you touched data.js/economy code)
   ```
   `.github/workflows/verify.yml` runs all three on every push and PR. It is
   the repo's only workflow and it builds and deploys nothing — Pages still
   serves the repository as-is, exactly as the "no build step" invariant
   requires. If it's red, the change isn't ready.
7. **If you change a published number, change the prose in the same commit.**
   `npm test` reads `README.md` and `docs/fairness.md` and fails if the slot EV
   or payline count quoted there no longer matches what the code computes.
   That gate exists because the README once advertised a retired 118.4% RTP
   for a 3-reel machine months after the game became a 5×4 at 145.6%.

## Style

- Match the existing code: classic `var`, no build tooling, no transpilation,
  no dependencies. `index.html` + its `js/`/`css/` files must keep running
  unmodified from `file://` and from GitHub Pages.
- Comments explain *why*, not *what* — the plan and the code's own naming
  should cover the "what."
- The visual language is "wet glassy fruit": saturated translucent bodies,
  hard white speculars, dew, sunny sky-blues. `assets/sprites/` holds
  optional generated art (`tools/genart/`); every visual must still have a
  correct canvas-painter fallback, since deleting `assets/` is a supported
  configuration, not an edge case.

## What's a good first contribution

Check the plan's Status Ledger for phases marked 🟡 (partially shipped) —
those have the clearest "what's missing" gap. Small, well-tested, narrowly
scoped PRs are much easier to land than large speculative ones; if you want
to attempt something big (a new mini-game, a rebalance, a new persisted
system), open an issue first so the approach can be discussed against the
hard invariants before you invest the time.

## Reporting issues

Bugs, balance concerns, and accessibility gaps are all welcome. For balance
reports, include the output of `npm run simulate` if you can — "the numbers
say X but I observed Y" is the most useful bug report this project can get,
since it's directly checkable against the published math.
