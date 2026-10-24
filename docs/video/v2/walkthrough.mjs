// Real usage recordings of the live site: Playwright drives a browser with a visible cursor overlay, clicking through
// each feature. Each scene is saved as docs/video/v2/clips/<name>.webm (VP8, 1600x1000 @ ~25 fps).
// Usage: node docs/video/v2/walkthrough.mjs [scene ...]
import { chromium } from "/home/arpit/Desktop/hackathon_projects/VeriCanopy/web/node_modules/@playwright/test/index.mjs";
import { mkdirSync, copyFileSync, rmSync, unlinkSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "https://vericanopy.vercel.app";
const OUT = "/home/arpit/Desktop/hackathon_projects/VeriCanopy/docs/video/v2/clips";
const TMP = "/tmp/claude-1000/wt-tmp";
mkdirSync(OUT, { recursive: true }); rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP);
const W = 1600, H = 1000;

const CURSOR_CSS = `
#vc-cursor{position:fixed;left:0;top:0;width:26px;height:36px;z-index:2147483647;pointer-events:none;transform:translate(-4px,-2px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.45));transition:transform .08s}
#vc-cursor.down{transform:translate(-4px,-2px) scale(.85)}
#vc-ring{position:fixed;width:44px;height:44px;border-radius:50%;border:3px solid #b6fe00;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.4)}
#vc-ring.pop{animation:vcpop .55s ease-out}
@keyframes vcpop{0%{opacity:.9;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.6)}}
.preloader{display:none!important}`;
const CURSOR_JS = `
(() => { if (document.getElementById('vc-cursor')) return;
  const c = document.createElement('div'); c.id = 'vc-cursor';
  c.innerHTML = '<svg width="26" height="36" viewBox="0 0 26 36"><path d="M2 2l9 27 4-10 10-4z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
  const r = document.createElement('div'); r.id = 'vc-ring';
  document.documentElement.appendChild(c); document.documentElement.appendChild(r);
  window.__vcMove = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; r.style.left = x + 'px'; r.style.top = y + 'px'; };
  window.__vcClick = () => { c.classList.add('down'); r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); setTimeout(() => c.classList.remove('down'), 140); };
})();`;

await fetch("https://vericanopy-api.onrender.com/api/v1/stats").catch(() => {}); await fetch("https://vericanopy-api.onrender.com/api/v1/projects/1/evidence").catch(() => {}); await fetch("https://vericanopy-api.onrender.com/api/v1/status").catch(() => {}); await fetch("https://vericanopy-api.onrender.com/api/v1/market/listings").catch(() => {});
const browser = await chromium.launch();
let ctx, page, cur = { x: 800, y: 500 };
const open = async (url, wait = 2500) => {
  ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: TMP, size: { width: W, height: H } } });
  page = await ctx.newPage();
  await page.addInitScript(CURSOR_JS);
  await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.evaluate(CURSOR_JS);
  await page.evaluate(([x, y]) => window.__vcMove(x, y), [cur.x, cur.y]);
  const need = { "/explore": "text=Tapajós", "/projects/1": "text=Impaired", "/projects/3": "text=Frozen", "/market": "button:has-text('Buy')", "/ask": "select", "/status": "text=/operational|degraded/i", "/retirements": "text=/VC-|certificate|No retirements/i", "/verify": "button" }[url];
  if (need) await page.waitForSelector(need, { timeout: 60000 }).catch(() => console.log("  (slow)", url));
  await page.waitForTimeout(wait);
};
const moveTo = async (x, y, ms = 650) => {
  const steps = Math.max(8, Math.round(ms / 16)); const sx = cur.x, sy = cur.y;
  for (let i = 1; i <= steps; i++) { const k = i / steps, e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k; const px = sx + (x - sx) * e, py = sy + (y - sy) * e;
    await page.mouse.move(px, py); await page.evaluate(([a, b]) => window.__vcMove(a, b), [px, py]); await page.waitForTimeout(16); }
  cur = { x, y };
};
const clickAt = async (x, y, settle = 1200) => { await moveTo(x, y); await page.waitForTimeout(180); await page.evaluate(() => window.__vcClick()); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); await page.waitForTimeout(settle); };
const clickText = async (sel, settle = 1200, nth = 0) => { const loc = page.locator(sel).nth(nth); await loc.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); const b = await loc.boundingBox(); if (!b) { console.log("  (missing)", sel); return false; } await clickAt(b.x + b.width / 2, b.y + b.height / 2, settle); return true; };
const scrollBy = async (dy, ms = 900) => { const n = Math.max(6, Math.round(ms / 50)); for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await page.waitForTimeout(50); } };
const typeIn = async (sel, text) => { await clickText(sel, 300); await page.keyboard.type(text, { delay: 55 }); await page.waitForTimeout(500); };
const close = async (name) => { await page.waitForTimeout(900); const v = page.video(); await ctx.close(); const p = await v.path(); copyFileSync(p, path.join(OUT, `${name}.webm`)); unlinkSync(p); console.log("clip", name); };

const SCENES = {
  async registry() {
    await open("/explore", 6000);
    await moveTo(1180, 520, 900); await page.waitForTimeout(600);
    await scrollBy(500, 900); await page.waitForTimeout(800);
    await clickText("text=Tapajós Riverine Forest Block", 1800);
    await page.waitForTimeout(1200);
    await close("registry");
  },
  async project() {
    await open("/projects/1", 9000);
    await moveTo(500, 560, 900); await page.waitForTimeout(500);
    await scrollBy(420, 900); await page.waitForTimeout(1500);
    await moveTo(1150, 620, 900); await page.waitForTimeout(1200);
    await scrollBy(500, 900); await page.waitForTimeout(1800);
    await close("project");
  },
  async project_tools() {
    await open("/projects/1", 9000);
    await scrollBy(700, 900); await page.waitForTimeout(800);
    // year slider play
    const play = page.getByRole("button", { name: /play/i }).first();
    const b = await play.boundingBox().catch(() => null);
    if (b) { await clickAt(b.x + b.width / 2, b.y + b.height / 2, 5500); }
    await scrollBy(-700, 700); await page.waitForTimeout(600);
    const fire = page.locator("text=/fire|detections/i").first(); const fb = await fire.boundingBox().catch(() => null);
    if (fb) { await moveTo(fb.x + fb.width / 2, fb.y + fb.height / 2, 700); await page.waitForTimeout(1800); }
    await close("project_tools");
  },
  async proofs() {
    await open("/projects/1", 8000);
    await clickText("role=tab[name='Proofs & signatures']", 2000);
    await moveTo(600, 560, 800); await page.waitForTimeout(800);
    await clickText("text=Verify ML-DSA-65 signature", 2500);
    await scrollBy(300, 700); await page.waitForTimeout(1500);
    await clickText("text=Verify signature", 2500).catch(() => {});
    await page.waitForTimeout(1200);
    await close("proofs");
  },
  async verify() {
    await open("/verify", 4000);
    await moveTo(700, 500, 800);
    const btn = page.getByRole("button").filter({ hasText: /verify|check/i }).first(); const b = await btn.boundingBox().catch(() => null);
    if (b) await clickAt(b.x + b.width / 2, b.y + b.height / 2, 3500);
    await scrollBy(400, 900); await page.waitForTimeout(1800);
    await close("verify");
  },
  async register() {
    await open("/register", 4000);
    await clickText("text=Example: overlaps the Tapajós block", 1500);
    await clickText("text=Compute H3 cells & pre-check overlap", 5000);
    await moveTo(1150, 620, 900); await page.waitForTimeout(2200);
    await close("register");
  },
  async market() {
    await open("/market", 4000);
    await moveTo(300, 600, 800); await page.waitForTimeout(600);
    await clickText("button:has-text('Buy')", 2500);
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape"); await page.waitForTimeout(600);
    await scrollBy(600, 900); await page.waitForTimeout(1800);
    await close("market");
  },
  async ask() {
    await open("/ask", 5000);
    await moveTo(400, 420, 800); await page.waitForTimeout(600);
    const sel = page.locator("select").first(); const b = await sel.boundingBox().catch(() => null);
    if (b) { await moveTo(b.x + b.width / 2, b.y + b.height / 2, 600); await sel.selectOption({ index: 0 }); await page.waitForTimeout(2500); }
    await scrollBy(500, 1000); await page.waitForTimeout(2200);
    await scrollBy(600, 1000); await page.waitForTimeout(1800);
    await close("ask");
  },
  async status() {
    await open("/status", 9000);
    await moveTo(800, 500, 900); await page.waitForTimeout(1200);
    await scrollBy(500, 1000); await page.waitForTimeout(2000);
    await close("status");
  },
  async retire() {
    await open("/retirements", 5000);
    await moveTo(700, 500, 800); await page.waitForTimeout(800);
    await clickText("a[href^='/retirements/']", 3000).catch(() => {});
    await page.waitForTimeout(1500);
    await close("retire");
  },
  async basescan() {
    await open("", 0); await ctx.close();
    ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: TMP, size: { width: W, height: H } } });
    page = await ctx.newPage(); await page.addInitScript(CURSOR_JS);
    await page.goto("https://sepolia.basescan.org/tx/0xba0aaa0f4ec04419e0768298a97976db7153df2ead755e553e975852977ff4db", { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
    await page.addStyleTag({ content: CURSOR_CSS }).catch(() => {}); await page.evaluate(CURSOR_JS).catch(() => {});
    await page.waitForTimeout(5000);
    await moveTo(700, 500, 900); await scrollBy(500, 1200); await page.waitForTimeout(2500);
    await close("basescan");
  },
};

const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  try { await fn(); } catch (e) { console.log("fail", name, e.message.split("\n")[0]); try { await ctx.close(); } catch {} }
}
await browser.close();
