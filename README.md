# Triple7 🍒☀★

**Three little machines, one juicy chain.** A free, open-source, cozy idle game
for your browser: match glass fruit to squeeze **Juice**, feed 7 Juice to a
sunny **slot machine** to win **Suncoins**, drop 7 Suncoins into a pseudo-3D
**coin dozer** to push **Stargems** off the edge — then spend those on
collectible glass charms, grove buildings and upgrades that make the whole loop
faster. Great as a 15-minute time-killer, built to run near-endlessly.

No ads. No accounts. No purchases. Just fruit.

## Play

- **Hosted:** enable GitHub Pages for this repo (Settings → Pages → *Deploy from
  a branch* → your branch, root folder). No build step, no GitHub Actions —
  `index.html` and its `js/`/`css/` files are the whole game.
- **Local:** open `index.html` in a browser, or `npm start` for a tiny dev
  server at `http://localhost:7777`.

## The chain (why "Triple7")

```
Match-3  ──earn──▶  JUICE ─7:1─▶  SLOTS  ──win──▶  SUNCOINS ─7:1─▶  DOZER ──push──▶ STARGEMS
   ▲                                                                                  │
   └────────────── grove buildings · glass charms · upgrades · automation ◀───────────┘
```

Every stage is **deliberately player-positive** (this is a cozy idle, so the
house edge is inverted): the slot pays an exact, enumerable **118.4 % RTP**
(3 reels × 64 weighted virtual stops — the same par-sheet model real slots
use), and the dozer returns ~**131 %** per drop at steady state (conservation:
coins in ≈ coins out, minus the side gutters, plus rare higher-value coin
denominations). Match-3 is free to play and the grove drips Juice passively,
so the chain can never dead-end. Exponential upgrade costs are the sink that
keeps numbers meaningful.

Don't take the numbers on faith — every odds table is written down in full in
[`docs/fairness.md`](docs/fairness.md), and both of these commands run the
*exact* code the browser runs, not a separate model:

```
npm run simulate   # exact slot par sheet + Monte Carlo, match-3 EV, full dozer physics sim
npm test           # logic unit tests (board, reels, physics, saves, prestige, rng streams)
```

## Saving

Progress autosaves to `localStorage`. In **⚙ Settings** you can export your
save as a checksummed `T71.xxxxxxxx.…` code and import it anywhere — codes are
versioned, validated and rejected gracefully when corrupted.

## Tech

Pure static site: vanilla JS + canvas, zero runtime dependencies. Sound is
entirely synthesized WebAudio (zero audio assets, ever); the fruit, slot
symbols, coins and charm icons in `assets/sprites/` are optional dev-time
generated art (`tools/genart/`, see Phase 31 in the plan) — delete the whole
`assets/` folder and every one of those visuals falls back seamlessly to the
original hand-coded canvas painters, so the shipped game has zero *required*
assets and zero runtime network calls either way. Node.js is used only for
dev tooling (`tools/serve.js`, `tools/simulate.js`, `tools/test.js`,
`tools/genart/`) — the same UMD modules run in the browser and in Node, so
the simulator verifies the *actual* game logic. Randomness is mulberry32,
seeded from `crypto.getRandomValues`, running as independent named streams
per subsystem (match-3, slots, dozer, charms) so one never perturbs another —
see [`docs/fairness.md`](docs/fairness.md) for the full contract.

The full design document and 32-phase roadmap live in
[`.claude/context/plan.md`](.claude/context/plan.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).
