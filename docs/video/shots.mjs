// Fresh production screenshots for the film. Usage: node docs/video/shots.mjs
import { chromium } from "/home/arpit/Desktop/hackathon_projects/VeriCanopy/web/node_modules/@playwright/test/index.mjs";
import { mkdirSync } from "node:fs";
const OUT = "/home/arpit/Desktop/hackathon_projects/VeriCanopy/docs/video/composition/assets/shots";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL ?? "https://vericanopy.vercel.app";
const PAGES = [
  ["home", "/", 0], ["explore", "/explore", 0], ["project1", "/projects/1", 0], ["project3", "/projects/3", 0],
  ["register", "/register", 0], ["market", "/market", 0], ["portfolio", "/portfolio", 0], ["verify", "/verify", 0],
  ["challenges", "/challenges", 0], ["ask", "/ask", 0], ["status", "/status", 0], ["retirements", "/retirements", 0], ["model", "/model", 0], ["how", "/how-it-works", 0],
];
const only = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.2 });
const page = await ctx.newPage();
for (const [name, path] of PAGES) {
  if (only.length && !only.includes(name)) continue;
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(name === "explore" || name.startsWith("project") ? 6000 : 2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    if (name === "home") {
      for (const [i, y] of [900, 1900, 2900, 3900, 4900].entries()) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/home_${i + 1}.png` }); }
    }
    if (name === "project1") {
      for (const tab of ["Integrity history", "Proofs & signatures", "Credits"]) {
        await page.getByRole("tab", { name: tab }).click().catch(() => {}); await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}/project1_${tab.split(" ")[0].toLowerCase().replace("&", "")}.png` });
      }
    }
    console.log("ok", name);
  } catch (e) { console.log("fail", name, e.message.split("\n")[0]); }
}
await browser.close();
