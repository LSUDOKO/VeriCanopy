// Frame-by-frame renderer: Playwright seeks the GSAP timeline, screenshots each frame, pipes JPEGs into ffmpeg.
// node docs/video/render.mjs --out docs/video/film_silent.mp4 [--fps 30] [--from 0 --to 10]
// node docs/video/render.mjs --stills 1,5,12 --out /tmp/stills   (PNG previews)
import { chromium } from "/home/arpit/Desktop/hackathon_projects/VeriCanopy/web/node_modules/@playwright/test/index.mjs";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const FPS = Number(arg("--fps", 30)), OUT = arg("--out", "docs/video/film_silent.mp4"), STILLS = arg("--stills", null);
const T0 = Number(arg("--from", 0)); let T1 = arg("--to", null);
const HTML = "file://" + path.resolve("docs/video/composition/index.html");

const browser = await chromium.launch({ args: ["--disable-gpu", "--force-device-scale-factor=1"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => { console.error("PAGE ERROR", e.message); });
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE", m.text()); });
await page.goto(HTML);
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))); });
const total = await page.evaluate(() => window.TOTAL);
T1 = T1 == null ? total : Number(T1);
console.log(`timeline ${total.toFixed(2)}s · rendering ${T0}–${T1.toFixed(2)} @ ${FPS}fps`);

if (STILLS) {
  mkdirSync(OUT, { recursive: true });
  for (const t of STILLS.split(",").map(Number)) {
    await page.evaluate(() => window.seek(0));
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(OUT, `t${t.toFixed(1).padStart(6, "0")}.png`), type: "png" });
    console.log("still", t);
  }
  await browser.close(); process.exit(0);
}

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
const n0 = Math.round(T0 * FPS), n1 = Math.round(T1 * FPS);
await page.evaluate(() => window.seek(0));
const t00 = Date.now();
for (let n = n0; n < n1; n++) {
  const t = n / FPS;
  await page.evaluate((t) => window.seek(t), t);
  const buf = await page.screenshot({ type: "jpeg", quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (n % (FPS * 10) === 0) console.log(`t=${t.toFixed(1)}s  ${((Date.now() - t00) / 1000).toFixed(0)}s elapsed`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("wrote", OUT);
