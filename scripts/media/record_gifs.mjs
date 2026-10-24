// Record short page walkthroughs with Playwright and convert them to GIFs for the README.
// Usage: BASE_URL=http://localhost:3100 node scripts/media/record_gifs.mjs
// Requires: web/node_modules (playwright) and ffmpeg on PATH.
import { chromium } from "/home/arpit/Desktop/hackathon_projects/VeriCanopy/web/node_modules/playwright/index.mjs";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.resolve("docs/media");
const TMP = path.resolve(".gifs-tmp");
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP);

const SCENES = [
  { name: "landing", url: "/", steps: async (p) => { for (let y = 0; y <= 4200; y += 140) { await p.mouse.wheel(0, 140); await p.waitForTimeout(90); } } },
  { name: "registry", url: "/explore", steps: async (p) => { await p.waitForTimeout(2500); await p.mouse.move(700, 450); await p.mouse.wheel(0, 600); await p.waitForTimeout(1500); } },
  { name: "project", url: "/projects/1", steps: async (p) => { for (let i = 0; i < 18; i++) { await p.mouse.wheel(0, 180); await p.waitForTimeout(140); } } },
  { name: "market", url: "/market", steps: async (p) => { await p.waitForTimeout(1500); for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 160); await p.waitForTimeout(160); } } },
  { name: "ask", url: "/ask", steps: async (p) => { await p.waitForTimeout(2500); for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 160); await p.waitForTimeout(160); } } },
  { name: "status", url: "/status", steps: async (p) => { await p.waitForTimeout(3000); } },
];

const browser = await chromium.launch();
for (const s of SCENES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir: TMP, size: { width: 1280, height: 760 } }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1200);
  await s.steps(page);
  await page.waitForTimeout(800);
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const gif = path.join(OUT, `${s.name}.gif`);
  execSync(`ffmpeg -y -loglevel error -i "${webm}" -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" "${gif}"`);
  console.log("wrote", gif, execSync(`du -h "${gif}" | cut -f1`).toString().trim());
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
