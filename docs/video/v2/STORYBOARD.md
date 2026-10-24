# VeriCanopy — whiteboard film (v2) storyboard

1920×1080 · 60 fps (2 sub-frames blended for motion blur) · 4:36 · voice: edge-tts `en-US-AriaNeural` · subtitles synced line by line.

**Form.** One diagram in one continuous space (7680×4320 world). The camera zooms into a part to explain it and pulls back to show where it sits. Marker strokes draw on in neon green (`#b6fe00`) over black; red (`#ff4d5e`) is reserved for what is broken, amber for the twin forest and warnings. Real material everywhere it exists: Sentinel-2 composites rendered by Earth Engine for the pilot polygons, the live site driven by a visible cursor, the Base Sepolia transaction on Basescan, and a real claude.ai chat using the VeriCanopy MCP connector.

**Rules kept.** One thing moves at a time; arrows animate in the direction things actually move; ≤7 words per on-screen label; labels sit on the thing they name; no crossfades, no gradients as backgrounds, no glows, no stock icons.

## World map

| Region | World box | What is drawn there |
|---|---|---|
| A · Today | 200–3400 × 150–2050 | credit certificate over a satellite photo → VERIFIED stamp → baseline recipe (reference region → self-reported rate → −4.2 %/yr → 180,000 t) → "re-derived from pixels: never" → 90 %+ → sold/resold arrows → Manavgat 2019 → 2021 fire scar → 1.2 MtCO₂e → black box "private model" → BBB → three red gap tags |
| Centre | (3840, 1100) | VeriCanopy mark and wordmark (end only) |
| B · VeriCanopy | 4300–7550 × 150–2050 | Sentinel-2 tile with project and twin polygons, six dataset rows, twin-forest chart from the real evidence JSON, 16 feature chips, 16-16-8-1 network, score 71.9 → 3.9, zk circuit → proof.bin 4,416 B, Basescan tx (real screenshots), Halo2Verifier check, REVERT, ML-DSA-65 seal, VeriCredit card with buffer bar, challenge box with 2-of-3 votes |
| C · Live | 200–7500 × 2300–4150 | ten browser frames playing screen recordings of the live site (registry, project, year slider/fire/ring, proofs, verify, register-overlap, market, ask, status) and the claude.ai connector + chat recording |

## Timed storyboard

Times come from the measured length of each narration line (`lines_timed.json`); `data.js` holds the final starts.

| Line | Start | Camera | On screen |
|---|---|---|---|
| hook1 | 1.0 | hold on certificate + photo (s 0.95) | certificate draws; "who checked this?" |
| hook2 | 4.5 | slight pull | "developer writes the baseline", VERIFIED stamp slams, "…then nobody looks again" |
| ind1 | 13.3 | pull to all of A (s 0.52) | title "TODAY: HOW A CREDIT IS MADE" |
| ind2–3 | 16.6–21.6 | push to the recipe (s 0.9), glide right | four boxes + arrows draw; red X over "re-derived: never" |
| ind4 | 28.7 | push to 90 %+ | counter 0 → 90 %+, source line |
| ind5 | 35.1 | glide up | sold → resold → resold arrows; "nothing watches the forest" |
| ind6 | 40.5 | push to Manavgat photos (s 1.0) | 2019 photo wipes in, 2021 fire scar wipes over it, 1.2 MtCO₂e counts |
| ind7 | 50.0 | glide down | black box, "???" → BBB |
| ind8 | 56.7 | pull back to A (s 0.5) | ① BASELINE ② TIME ③ SCORE tags pop |
| ev1 | 63.2 | glide across the centre to B (s 0.48) | title "VERICANOPY: FROM PIXELS TO PROOF" |
| ev2 | 67.9 | push to photo + list | six dataset rows draw with circles |
| ev3 | 78.4 | push closer (s 1.2) | project polygon, twin polygon (amber) |
| ev4–5 | 83.2–89.8 | glide to chart | axes, twin and project curves draw from real data, fire 2023, gap brace |
| sc1 | 97.9 | glide down | 16 chips pop, network draws, "417 parameters" |
| sc2 | 104.4 | glide right | 71.9 (2023) counts, drains to 3.9 (2025) in red, "8,080 t of loss" |
| pf1–2 | 114.5–122.6 | push to zk box (s 1.0) | circuit box, arrow, proof.bin, "4,416 bytes · 6.02 s" |
| pf3 | 127.4 | glide down to the block | Basescan screenshot wipes in; Halo2Verifier; check mark; REVERT |
| pf4 | 136.2 | push on the screenshot (s 1.15) | event-log screenshot (topics: period 7, project 1, oracle) |
| pf5 | 142.3 | glide right | ML-DSA-65 seal draws, "checkable for decades" |
| lc1–4 | 152.8–166.4 | glide down to the card | buffer bar drains and turns red, FROZEN line, challenge box, 2-of-3 votes |
| pr1 | 174.9 | pull way out to row C (s 0.245) | "LIVE ON BASE SEPOLIA" |
| pr2–pr10 | 179.4–231.0 | one frame at a time (s 1.18), glide between | each browser frame plays its recording with the cursor |
| ag1 | 235.3 | glide to the Claude frames | connector settings screenshot; "custom connector → …/mcp/" |
| ag2–3 | 241.7–244.3 | push up to the chat | real claude.ai chat recording: tools called, table, explanation, unsigned tx |
| end1 | 252.2 | pull back to the whole world (s 0.245, 3.2 s) | caption line under the diagram |
| end2 | 262.1 | push to centre (s 1.0) | "Ratings you must trust." dims, "Proofs you can check." |
| end3 | 267.6 | hold | mark pops, VERICANOPY types in, tagline, repo line; fade |

## Build

```sh
node docs/video/v2/walkthrough.mjs            # records the site with a visible cursor → clips/*.webm
node docs/video/v2/render.mjs --stills 10,60  # check key frames
node docs/video/v2/render.mjs --out docs/video/v2/film_silent.mp4 --fps 60 --sub 2
ffmpeg -i film_silent.mp4 -i mix.m4a -map 0:v -map 1:a -c:v copy -c:a aac -shortest VeriCanopy.mp4
```

`mix.m4a` = per-line voiceover placed at `data.js` starts, over the music bed ducked by side-chain compression; `subs.srt` carries the same lines for platforms that want captions.
