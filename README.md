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
use), and the dozer returns ~**129 %** per drop at steady state (conservation:
coins in ≈ coins out, minus the side gutters). Match-3 is free to play and the
grove drips Juice passively, so the chain can never dead-end. Exponential
upgrade costs are the sink that keeps numbers meaningful.

Don't take the numbers on faith:

```
npm run simulate   # exact slot par sheet + Monte Carlo, match-3 EV, full dozer physics sim
npm test           # logic unit tests (board, reels, physics, saves, prestige)
```

## Saving

Progress autosaves to `localStorage`. In **⚙ Settings** you can export your
save as a checksummed `T71.xxxxxxxx.…` code and import it anywhere — codes are
versioned, validated and rejected gracefully when corrupted.

## Tech

Pure static site: vanilla JS + canvas, zero runtime dependencies, zero assets
(even the sounds are synthesized WebAudio). Node.js is used only for dev
tooling (`tools/serve.js`, `tools/simulate.js`, `tools/test.js`) — the same UMD
modules run in the browser and in Node, so the simulator verifies the *actual*
game logic. Randomness is mulberry32 seeded from `crypto.getRandomValues`.

The full design document and 30-phase roadmap live in
[`.claude/context/plan.md`](.claude/context/plan.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).
