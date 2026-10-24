# VeriCanopy launch film — script and shot table

Target length 3:55 · 1920×1080 · 30 fps · music + voiceover · English.
Style reference: `~/Downloads/install.mp4` (agent.md launch film). What that film does, and what we keep:

| Reference technique | How it is used here |
|---|---|
| One focal element per frame, centred, lots of air | Every shot has one subject; nothing else moves |
| Words assemble one at a time, blur 18 px → 0, 16 px rise | All headline copy enters word by word (`blurIn`) |
| Light cream scenes with a soft radial glow; dark scenes with blurred bokeh | Light = brand Fog `#f5f5f7` with warm centre; dark = Forest `#012c19` → `#04150d` with lime bokeh |
| Logo pops, wordmark types in letter by letter, tagline fades in | Act 2 reveal and Act 6 close |
| Element morphs into a dark rounded rectangle that expands to fill the frame | Light → dark transition at 1:08 |
| Terminal typing with caret, glowing ↵ drawn as a line stroke that sweeps across | zk proving terminal (3.3) and MCP line (4.6) |
| List rows slide in one by one with a green status dot; soft caption under | Dataset list (3.1), contract checks (Act 5) |
| Grid of chips, everything blurred except the item in focus; pill counter increments | 16-feature grid (3.2) |
| Big number counts up, then stops; progress bar fills | Scores, proof size, test counts |
| Depth of field: background blurred 24–40 px, foreground crisp | Screenshot pushes in Act 4 |
| Static camera; motion comes from elements. Pushes are rare and slow | Camera moves only on screenshots (0.9 s ease) and on three accents (0.28 s punch) |
| Entire film cut to a steady bed; fade to black | Music bed from `~/Downloads/Lights(chosic.com).mp3`, ducked −14 dB under VO |

Brand lock (from `brand/BRAND.md`): Geist 600 / −0.03 em headlines, Geist Mono for hashes and numbers; Forest `#012c19`, Lime `#7ad101`, Lime 2 `#b6fe00`, Ink `#1d1d1f`, Grey `#6e6e73`, Fog `#f5f5f7`, Hairline `#e5e5ea`, Red `#e63946`, Amber `#e3a008`, Teal `#0f8f5a`. No blue‑purple, no gradients as backgrounds, no drop shadows except under floating media.

Real material used (nothing invented): Sentinel‑2 composites rendered by Earth Engine for the three pilot polygons (`web/public/sat/*`), production screenshots of the deployed site, numbers from `docs/BENCHMARKS.md` and the Base Sepolia chain (Tapajós 2023 score 71.9 → 2025 score 3.9 after 8,080 t of detected loss; Manavgat 1.2 MtCO2e loss in 2021; proof 4,416 B; proving 6.02 s; verifier 19,817 B; 417 parameters; 55 contract tests; 31 backend tests; submit tx `0xba0aaa…7ff4db`).

---

## Voiceover (≈ 560 words, 2.4 words/s)

**Act 0 · Cold open (0:00–0:14)**
Every forest carbon credit is checked once. By someone you have to trust. Then nobody looks at the forest again.

**Act 1 · The problem (0:14–0:58)**
Three things are broken. First, the baseline. The developer chooses how much forest would have been lost without the project, and nobody re-derives that number from the pixels. Independent studies found that most of these reductions never happened.
Second, time. A credit issued in 2021 says nothing about the fire in 2023. On one of our pilot areas, a single fire year took 1.2 million tonnes of carbon. The registry never noticed.
Third, the score itself. Ratings agencies publish a number and ask you to trust a private model. No proof it ran. No proof of which data it saw.
The market trusts paperwork. The forest does not read it.

**Act 2 · Reveal (0:58–1:10)**
This is VeriCanopy. Carbon credits that prove themselves.

**Act 3 · How it works (1:10–2:28)**
Step one, evidence. Every monitoring period, the oracle pulls Sentinel-2 and Sentinel-1, Hansen forest loss, GEDI biomass, MODIS burned area and Dynamic World, for the project and for a matched twin forest nearby. Seven hundred and seventy-six project pixels against two thousand four hundred twin pixels. The twin is the counterfactual. Not the developer's spreadsheet.
Step two, the score. Sixteen features go into a small, audited neural network, four hundred and seventeen parameters, and out comes an integrity score. Tapajós scored seventy-one point nine in 2023. After eight thousand tonnes of detected loss, it scores three point nine. The score follows the forest.
Step three, the proof. The inference runs inside a zero-knowledge circuit. Six seconds, a four-kilobyte proof. The Halo2 verifier on Base Sepolia checks it before the score is stored. If the proof fails, the transaction reverts. The oracle cannot invent a number. And every evidence manifest is signed with ML-DSA-65, a post-quantum signature, so the record stays checkable for decades.
Step four, the credit lives. Each token carries the live score. When loss is detected, buffer credits burn first. A shortfall freezes the project, blocks transfers, and notifies every holder. And anyone can challenge a score with a bond; two of three independent resolvers recompute it.

**Act 4 · The product (2:28–3:24)**
It is live today, on Base Sepolia. The registry shows every project on a map with its integrity status. Open a project: real Sentinel-2 before and after, the twin-forest chart, the fire year, and the proof that put the score on-chain. Try to register land that overlaps an existing project, and the contract refuses. The marketplace trades living credits, with the integrity score on the price tag. Retire a tonne and get a signed certificate. And it works for agents too: one line connects VeriCanopy to Claude through an MCP server.

**Act 5 · Receipts (3:24–3:42)**
Fifty-five contract tests, including a real proof verified by the deployed verifier. Ten satellite datasets. Open source, MIT. Everything on this screen is measured, not promised.

**Act 6 · Close (3:42–3:55)**
Ratings you must trust, or proofs you can check. VeriCanopy.

---

## Shot table

Palette lock: Fog light scenes / Forest dark scenes, Lime accent, Red only for loss and fire. Characters: none (no people; hands never shown).

| # | Time | Subject on screen | What it does | Camera | On‑screen text | Build |
|---|---|---|---|---|---|---|
| 01 | 0:00–0:05 | Sentinel‑2 of Tapajós (A_before) under a fog veil | Image fades up 40% behind; words assemble one by one | hold | Every forest carbon credit is checked **once.** | light · blurIn words |
| 02 | 0:05–0:09 | A stamp "VERIFIED · 2021" | Slams onto the image, ink spreads | punch 0.28 s | By someone you have to trust. | light · stamp slam |
| 03 | 0:09–0:14 | Same image, 2024 version (A_after) | Crossfades to the later year; cleared plots appear; a thin year ticker 2021→2024 counts | hold | Then nobody looks again. | light · crossfade + ticker |
| 04 | 0:14–0:18 | Three dark pills | Light collapses into a dark rounded rect that expands to full frame; three pills "Baseline · Time · Score" rise | hold | Three things are broken. | dark · rect morph |
| 05 | 0:18–0:28 | A baseline form (PDD rows) | Rows slide in with a developer‑typed number "−4.2 %/yr"; a red question mark blooms over it; caption counts "90 %+" | hold → slow push on the number | 01 Self‑reported baselines · 90 %+ phantom | dark · row list |
| 06 | 0:28–0:40 | Manavgat before (C_before) → fire (C_fire2021) | Year ticker 2019→2021; fire scar blooms red; counter "1.2 MtCO2e" counts | hold, 0.9 s pull‑out at the end | 02 Nothing watches after issuance · 1.2 MtCO2e lost | dark · image crossfade + counter |
| 07 | 0:40–0:50 | A black box with a slot | "BBB" rating slides out; input side shows "? ? ?"; the box stays opaque | slow push 10% | 03 Scores you cannot check · no proof it ran | dark · box |
| 08 | 0:50–0:58 | The thesis line | Two lines assemble; forest image faintly behind | hold | The market trusts paperwork. The forest does not read it. | dark · blurIn |
| 09 | 0:58–1:04 | VeriCanopy mark | Mark pops (spring), wordmark types letter by letter, tagline fades word by word | hold | VeriCanopy · Carbon credits that prove themselves. | light · logo |
| 10 | 1:04–1:10 | Mark becomes a dark tile | Tile expands to full frame (reference transition), lime bokeh breathes in | hold | | light→dark morph |
| 11 | 1:10–1:19 | Sentinel‑2 Tapajós full bleed | Polygon outline draws itself; twin polygon draws offset; dataset rows slide in with green dots | hold | 01 Evidence · Sentinel‑2 L2A · Sentinel‑1 GRD · Hansen GFC 2025 · GEDI L4B · MODIS MCD64A1 · Dynamic World | dark · list over image |
| 12 | 1:19–1:28 | Twin‑forest chart | Axes first, then two lines grow (project vs twin), fire year marker drops; pixel counts count | hold | 776 project px · 2,396 twin px | dark · chart |
| 13 | 1:28–1:36 | 16 feature chips | Grid blurred; focus hops chip to chip; pill counter 0→16 | hold | 02 Score · 16 features | dark · chip grid |
| 14 | 1:36–1:44 | Tiny network 16‑16‑8‑1 | Edges light up left→right; output node pulses | slow push to output | 417 parameters | dark · network |
| 15 | 1:44–1:52 | Big score number | 71.9 counts up, holds; year flips 2023→2025; number drains to 3.9 in red; sub‑line counts 8,080 t | punch 0.28 s on 3.9 | 71.9 → 3.9 · 8,080 t loss detected | dark · counter |
| 16 | 1:52–2:00 | Terminal | Types `vericanopy prove --project 1 --period 2025`, progress bar fills in 6.0 s compressed, prints `proof 4,416 B` | hold | 03 Proof · 6.02 s · 4,416 B | dark · terminal |
| 17 | 2:00–2:08 | Proof chip flies into a chain block | Block outline, `Halo2Verifier · 19,817 B`, green check; tx hash pill appears | hold | verified on Base Sepolia · 0xba0aaa…7ff4db | dark · block |
| 18 | 2:08–2:12 | Same block | Second proof arrives broken; block flashes red "revert" | punch 0.28 s | if the proof fails, the tx reverts | dark |
| 19 | 2:12–2:18 | Manifest card | ML‑DSA‑65 seal stamps; signature bytes scroll | hold | ML‑DSA‑65 · FIPS 204 · 3,309 B signature | dark · stamp |
| 20 | 2:18–2:28 | Credit token card + buffer bar | Score badge live; loss event: buffer bar drains 20%→6%, lock icon snaps, "3 holders notified" row; then a bond pill and 2‑of‑3 votes | hold, 0.9 s pull at end | 04 Living credit · buffer burn · frozen · 2‑of‑3 resolvers | dark · card |
| 21 | 2:28–2:35 | Landing page screenshot (d_home) | Rises from blur, settles | 0.9 s push 1.00→1.12 on the hero stats | vericanopy.vercel.app · Base Sepolia | light · screenshot |
| 22 | 2:35–2:42 | Registry map (d_explore) | Slides in from right; map pins pulse (overlay) | pan right→left | Registry | light · screenshot |
| 23 | 2:42–2:52 | Project page (d_projects_1) | Push to twin chart, glide to before/after tiles, pull back | push · glide · pull | Project · twin chart · Sentinel‑2 | light · screenshot |
| 24 | 2:52–2:58 | Register wizard (d_register) | Overlap cells flash red, revert toast | punch on toast | OverlapDetected · refused on‑chain | light · screenshot |
| 25 | 2:58–3:06 | Market (d_market) | Push to the first listing card; "Buy" highlights; score badge | push → hold | Market · integrity on the price tag | light · screenshot |
| 26 | 3:06–3:14 | Portfolio / certificate (d_portfolio) | Certificate card rises with ML‑DSA seal | hold | Retire · signed certificate | light · screenshot |
| 27 | 3:14–3:24 | Terminal line + Ask page | Types `claude mcp add --transport http vericanopy …/mcp`; tool list rows slide in | hold | MCP · 10 tools for agents | light · terminal |
| 28 | 3:24–3:34 | Receipt rows | Rows slide in with green dots and counting numbers: 55 contract tests · 31 backend tests · 4,416 B proof · 6.02 s · 19,817 B verifier · 10 datasets | hold | Measured, not promised | dark · list |
| 29 | 3:34–3:42 | Contract address strip | Ten addresses scroll horizontally, mono, blurred edges; "MIT · open source" pill | hold | Base Sepolia · 10 contracts | dark · marquee |
| 30 | 3:42–3:49 | Two lines | "Ratings you must trust." greys out; "Proofs you can check." lands in lime | hold | | light · blurIn |
| 31 | 3:49–3:55 | Lockup + URL pill | Mark pops, wordmark types, URL pill types, GitHub line; fade to black | hold | vericanopy.vercel.app · github.com/LSUDOKO/VeriCanopy | light · logo |

Checks against the storyboard rules: opens on a concrete thing (a satellite image being stamped), not a title; one example (Tapajós) runs through evidence → score → proof → product; shots 2–10 s; text‑led shots 6 of 31 (19%); adjacent shots change composition, never palette; pushes 7, punches 4 of 31 (13%); every number on screen appears in the voiceover or in `docs/BENCHMARKS.md`.

## Production

- Composition: `docs/video/composition/index.html` (DOM + GSAP timeline, deterministic `seek(t)`), rendered frame by frame with Playwright → PNG → ffmpeg (`docs/video/render.mjs`).
- Music: `Lights (chosic.com)` bed, −14 dB under voice, 1.5 s fade in, 3 s fade out.
- Voice: ElevenLabs via `belt` (inference.sh) when the network is up; the text above is the exact read. Per‑act WAVs are placed at the act start times listed, so re‑recording one act never shifts the others.
- Output: `docs/video/VeriCanopy.mp4` (H.264, CRF 18, AAC 192 kbps).
