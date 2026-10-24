/* VeriCanopy whiteboard film. One world diagram (7680×4320), a camera that zooms in and out of it, marker-drawn
   strokes, real photos, real screen recordings. Every style is a pure function of time inside window.seek(t). */
(() => {
  const D = window.DATA, LINES = D.lines, L = Object.fromEntries(LINES.map((l) => [l.id, l]));
  const T = (id) => L[id].start, E = (id) => L[id].end, DUR = (id) => L[id].dur;
  const world = document.getElementById("world"), subs = document.getElementById("subs"), fade = document.getElementById("fade");
  const W = 7680, H = 4320, SW = 1920, SH = 1080;
  const NEON = "#b6fe00", RED = "#ff4d5e", AMBER = "#ffd23f";

  // ---------- deterministic helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (p) => p * p * (3 - 2 * p);
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeIn = (p) => p * p * p;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const h = (tag, cls = "", style = "", html = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (style) e.style.cssText = style; if (html) e.innerHTML = html; world.appendChild(e); return e; };
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const fmtInt = (v) => Math.round(v).toLocaleString("en-US");

  // items: { t0, t1, fn(p, t) } — fn is called every frame with p in [0,1]
  const items = [];
  const at = (t0, dur, fn) => items.push({ t0, t1: t0 + dur, fn });
  // visible from t0 (optional until t1)
  const show = (el, t0, t1 = 1e9) => items.push({ t0: -1, t1: 1e9, fn: (p, t) => { el.style.visibility = t >= t0 && t < t1 ? "visible" : "hidden"; } });
  const hide = (el) => { el.style.visibility = "hidden"; };

  // sketch svg in world coords
  const sk = (x, y, w, hh) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("class", "sk"); s.setAttribute("viewBox", `0 0 ${w} ${hh}`); s.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${hh}px`; world.appendChild(s); return s; };
  const ns = (s, tag, attrs) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) e.setAttribute(k, attrs[k]); s.appendChild(e); return e; };
  // hand-drawn polyline through points with wobble
  const wob = (pts, amp = 3, closed = false) => {
    const out = []; const P = closed ? [...pts, pts[0]] : pts;
    for (let i = 0; i < P.length - 1; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[i + 1]; const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 60));
      for (let j = 0; j < n; j++) { const k = j / n; out.push([x1 + (x2 - x1) * k + (rnd() - 0.5) * amp * 2, y1 + (y2 - y1) * k + (rnd() - 0.5) * amp * 2]); }
    }
    out.push(P[P.length - 1]);
    return "M" + out.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L");
  };
  const path = (s, d, cls = "") => ns(s, "path", { d, class: cls });
  const rect = (s, x, y, w, hh, cls = "") => path(s, wob([[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]], 4, true), cls);
  const line = (s, x1, y1, x2, y2, cls = "") => path(s, wob([[x1, y1], [x2, y2]], 3), cls);
  const arrow = (s, x1, y1, x2, y2, cls = "") => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 34;
    const d = wob([[x1, y1], [x2, y2]], 3) + " M" + (x2 - L * Math.cos(a - 0.45)).toFixed(1) + "," + (y2 - L * Math.sin(a - 0.45)).toFixed(1) + " L" + x2 + "," + y2 + " L" + (x2 - L * Math.cos(a + 0.45)).toFixed(1) + "," + (y2 - L * Math.sin(a + 0.45)).toFixed(1);
    return path(s, d, cls);
  };
  const circle = (s, cx, cy, r, cls = "") => { const pts = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return path(s, wob(pts, 3), cls); };
  // draw-on: stroke dash tied to time
  const draw = (el, t0, dur) => { const len = el.getTotalLength ? el.getTotalLength() : 1000; el.style.strokeDasharray = len; el.style.strokeDashoffset = len; el.style.opacity = 0; at(t0 - 0.001, dur, (p) => { el.style.opacity = p > 0 ? 1 : 0; el.style.strokeDashoffset = len * (1 - easeOut(p)); }); items.push({ t0: -1, t1: 1e9, fn: (p, t) => { if (t >= t0 + dur) { el.style.strokeDashoffset = 0; el.style.opacity = 1; } else if (t < t0) { el.style.opacity = 0; } } }); return el; };
  // text helpers
  const txt = (x, y, html, cls = "label", style = "") => h("div", `w ${cls}`, `left:${x}px;top:${y}px;${style}`, html);
  const wipe = (el, t0, dur, dir = "r") => { el.style.visibility = "hidden"; items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const q = clamp((t - t0) / dur); el.style.visibility = q > 0 ? "visible" : "hidden"; const k = easeOut(q); el.style.clipPath = dir === "r" ? `inset(0 ${(1 - k) * 100}% 0 0)` : dir === "d" ? `inset(0 0 ${(1 - k) * 100}% 0)` : `inset(0 0 0 ${(1 - k) * 100}%)`; } }); return el; };
  const fadeIn = (el, t0, dur = 0.5, t1 = 1e9) => { el.style.opacity = 0; items.push({ t0: -1, t1: 1e9, fn: (p, t) => { el.style.opacity = t >= t1 ? 0 : easeOut(clamp((t - t0) / dur)); } }); return el; };
  const typed = (el, text, t0, dur, caret = false) => { el.innerHTML = ""; items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const q = clamp((t - t0) / dur); const n = Math.round(text.length * q); el.innerHTML = esc(text.slice(0, n)) + (caret && t >= t0 && t < t0 + dur + 1.0 ? '<span style="display:inline-block;width:.55em;height:1em;background:currentColor;vertical-align:-.1em;margin-left:2px"></span>' : ""); el.style.visibility = t >= t0 ? "visible" : "hidden"; } }); el.style.visibility = "hidden"; return el; };
  const count = (el, from, to, t0, dur, fmt = fmtInt, ease = easeOut) => { el.style.visibility = "hidden"; items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const q = clamp((t - t0) / dur); el.style.visibility = t >= t0 ? "visible" : "hidden"; el.textContent = fmt(from + (to - from) * ease(q)); } }); return el; };
  const pop = (el, t0, dur = 0.35, t1 = 1e9) => { el.style.visibility = "hidden"; items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const q = clamp((t - t0) / dur); el.style.visibility = t >= t0 && t < t1 ? "visible" : "hidden"; const s = q < 0.6 ? 0.4 + 0.75 * (q / 0.6) : 1.15 - 0.15 * ((q - 0.6) / 0.4); el.style.transform = `${el.dataset.base || ""} scale(${s.toFixed(3)})`; } }); return el; };
  // photo with sketched frame, revealed by a wipe
  const photo = (x, y, w, hh, src, cap, t0, dur = 0.9, style = "") => {
    const box = h("div", "w photo", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px;${style}`, `<img src="${src}" />` + (cap ? `<div class="cap">${cap}</div>` : ""));
    const s = sk(x - 10, y - 10, w + 20, hh + 20); draw(rect(s, 10, 10, w, hh), t0, dur * 0.9);
    wipe(box, t0 + 0.25, dur, "r");
    return box;
  };
  // screen recording in a sketched browser frame; plays from t0 (clip time 0) until t1
  const videos = [];
  const clip = (x, y, w, hh, name, title, t0, t1, poster) => {
    const b = h("div", "w browser", `left:${x}px;top:${y}px;width:${w}px;height:${hh}px`, `<div class="bar"><i></i><i></i><i></i><span>${title}</span></div>`);
    const box = document.createElement("div"); box.className = "clipbox"; box.style.cssText = `left:0;top:54px;width:${w}px;height:${hh - 54}px;border-radius:0`; b.appendChild(box);
    const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = `clips/${name}.webm`; v.playsInline = true; box.appendChild(v);
    const s = sk(x - 10, y - 10, w + 20, hh + 20); draw(rect(s, 10, 10, w, hh), t0 - 1.0, 0.8);
    videos.push({ v, t0, t1, el: b });
    b.style.visibility = "hidden";
    items.push({ t0: -1, t1: 1e9, fn: (p, t) => { b.style.visibility = t >= t0 - 1.0 ? "visible" : "hidden"; } });
    return b;
  };

  // ---------- camera ----------
  // keyframes: { t, x, y, s } — (x,y) world point at screen centre, s = screen px per world px. Moves ease over `d` seconds.
  const cam = [];
  const camTo = (t, x, y, s, d = 1.4) => cam.push({ t, x, y, s, d });
  const camAt = (t) => {
    if (t <= cam[0].t) return cam[0];
    let i = cam.length - 1; while (i > 0 && cam[i].t > t) i--;
    const a = cam[i - 1] || cam[i], b = cam[i];
    if (i === 0 || t >= b.t + b.d) return b;
    const p = smooth(clamp((t - b.t) / b.d));
    const ls = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p);
    return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: ls };
  };

  // =====================================================================
  // WORLD LAYOUT
  //   A  "Today"      x 200–3400, y 150–2050
  //   logo centre     (3840, 1100)
  //   B  "VeriCanopy" x 4300–7550, y 150–2050
  //   C  "Live"       y 2300–4150, two rows of browser frames
  // =====================================================================

  // ---------- centre: logo + three gap arrows ----------
  const logo = h("div", "w", "left:3560px;top:860px;width:560px;height:560px", `<img src="assets/brand/mark-neon.svg" style="width:560px;height:560px" />`);
  const logoTxt = txt(3480, 1440, "VERICANOPY", "title", "font-size:150px;width:720px;text-align:center");
  const logoTag = txt(3430, 1610, "Carbon credits that prove themselves.", "note", "width:820px;text-align:center;font-size:36px");
  hide(logo); hide(logoTxt); hide(logoTag);

  // ---------- A: today ----------
  const A = (x, y) => [200 + x, 150 + y];
  {
    const [tx, ty] = A(0, 0);
    const title = txt(tx, ty, "TODAY: HOW A CREDIT IS MADE", "title", "font-size:96px"); wipe(title, T("ind1"), 1.0);
    // the credit certificate (hook)
    const cert = sk(tx + 1180, ty + 420, 720, 480);
    const certR = rect(cert, 10, 10, 700, 460);
    const certL1 = line(cert, 70, 120, 480, 120, "thin"), certL2 = line(cert, 70, 180, 620, 180, "thin"), certL3 = line(cert, 70, 240, 560, 240, "thin"), certL4 = line(cert, 70, 300, 400, 300, "thin");
    const seal = circle(cert, 590, 360, 70, "thin");
    const certT = txt(tx + 1250, ty + 440, "1 tCO<sub>2</sub>e · forest credit", "label", "font-size:44px"); wipe(certT, T("hook1") + 0.9, 0.6);
    draw(certR, T("hook1"), 1.1); draw(certL1, T("hook1") + 0.6, 0.3); draw(certL2, T("hook1") + 0.9, 0.3); draw(certL3, T("hook1") + 1.2, 0.3); draw(certL4, T("hook1") + 1.5, 0.3); draw(seal, T("hook1") + 1.9, 0.6);
    const q = txt(tx + 1960, ty + 380, "who checked this?", "label", "font-size:60px;color:" + RED); wipe(q, T("hook1") + 2.2, 0.6);
    const qa = sk(tx + 1880, ty + 420, 160, 200); draw(arrow(qa, 150, 20, 30, 150, "red"), T("hook1") + 2.5, 0.5);
    // hook2: developer → auditor stamp → everyone moved on
    const dev = txt(tx + 1180, ty + 960, "developer writes the baseline", "label", "font-size:44px"); wipe(dev, T("hook2") + 0.2, 0.8);
    const stamp = txt(tx + 1500, ty + 560, "VERIFIED", "stamp"); stamp.dataset.base = "rotate(-9deg)"; pop(stamp, T("hook2") + 2.2, 0.3);
    const once = txt(tx + 1180, ty + 1040, "stamped once · 2021", "label", "font-size:44px"); wipe(once, T("hook2") + 2.6, 0.7);
    const gone = txt(tx + 1180, ty + 1120, "…then nobody looks again", "label", "font-size:44px;color:" + RED); wipe(gone, T("hook2") + 5.2, 0.9);
    // satellite photo under the hook (real)
    photo(tx + 60, ty + 320, 1040, 760, "assets/sat/A_before.png", "Sentinel-2 · Tapajós block · 2019", T("hook1") - 0.6, 1.0);

    // ind2–ind3: the baseline recipe (left column, further down)
    const flow = sk(tx, ty + 1180, 3200, 900);
    const b1 = rect(flow, 60, 60, 560, 300), b2 = rect(flow, 760, 60, 560, 300), b3 = rect(flow, 1460, 60, 560, 300), b4 = rect(flow, 2160, 60, 560, 300);
    const a1 = arrow(flow, 630, 210, 750, 210), a2 = arrow(flow, 1330, 210, 1450, 210), a3 = arrow(flow, 2030, 210, 2150, 210);
    draw(b1, T("ind2"), 0.8); draw(a1, T("ind2") + 0.7, 0.3); draw(b2, T("ind2") + 1.0, 0.8); draw(a2, T("ind2") + 1.8, 0.3); draw(b3, T("ind2") + 2.1, 0.8); draw(a3, T("ind3") + 0.4, 0.3); draw(b4, T("ind3") + 0.7, 0.8);
    const f1 = txt(tx + 100, ty + 1270, "reference region<br><span class='dim' style='font-size:34px'>chosen by developer</span>", "label", "font-size:42px;line-height:1.1"); wipe(f1, T("ind2") + 0.5, 0.7);
    const f2 = txt(tx + 800, ty + 1270, "deforestation rate<br><span class='dim' style='font-size:34px'>self-reported</span>", "label", "font-size:42px;line-height:1.1"); wipe(f2, T("ind2") + 1.5, 0.7);
    const f3 = txt(tx + 1500, ty + 1270, "baseline<br><span class='mono' style='font-size:46px;color:" + AMBER + "'>−4.2 % / yr</span>", "label", "font-size:42px;line-height:1.1"); wipe(f3, T("ind2") + 2.6, 0.7);
    const f4 = txt(tx + 2200, ty + 1270, "credits issued<br><span class='mono' style='font-size:46px'>= 180,000 t</span>", "label", "font-size:42px;line-height:1.1"); wipe(f4, T("ind3") + 1.2, 0.7);
    const never = txt(tx + 1460, ty + 1600, "re-derived from pixels: <span style='color:" + RED + "'>never</span>", "label", "font-size:48px"); wipe(never, T("ind3") + 2.6, 0.9);
    const nx = sk(tx + 1440, ty + 1380, 620, 200); draw(line(nx, 20, 20, 600, 180, "red"), T("ind3") + 2.3, 0.4); draw(line(nx, 600, 20, 20, 180, "red"), T("ind3") + 2.6, 0.4);
    // ind4: 90%+
    const big = txt(tx + 2300, ty + 1480, "0", "big", "font-size:220px;color:" + RED); count(big, 0, 90, T("ind4") + 1.4, 1.6, (v) => Math.round(v) + "%+");
    const bigN = txt(tx + 2300, ty + 1720, "of some rainforest offsets<br>found to be phantom", "note", "font-size:34px"); wipe(bigN, T("ind4") + 2.4, 0.8);
    const bigS = txt(tx + 2300, ty + 1830, "West et al., Science 2023 · Guardian / SourceMaterial 2023", "note", "font-size:22px;color:" + NEON); fadeIn(bigS, T("ind4") + 3.2);

    // ind5–ind6: time — sold, resold, fire (photos)
    const [px, py] = A(60, 0);
    const sold = sk(px + 1100, py + 100, 1200, 240);
    const soldT = txt(px + 1120, py + 60, "sold → resold → resold", "label", "font-size:44px"); wipe(soldT, T("ind5") + 0.3, 1.2);
    draw(arrow(sold, 20, 160, 380, 160), T("ind5") + 0.4, 0.4); draw(arrow(sold, 420, 160, 780, 160), T("ind5") + 0.9, 0.4); draw(arrow(sold, 820, 160, 1180, 160), T("ind5") + 1.4, 0.4);
    const watch = txt(px + 1120, py + 300, "nothing watches the forest", "label", "font-size:44px;color:" + RED); wipe(watch, T("ind5") + 2.6, 1.0);
    // Manavgat photos (real) — placed right of the flow, upper row
    const mB = photo(px + 2140, py + 40, 1000, 640, "assets/sat/C_before.png", "Manavgat · Sentinel-2 · 2019", T("ind6") + 0.2, 0.9);
    const mF = photo(px + 2140, py + 40, 1000, 640, "assets/sat/C_fire2021.png", "Manavgat · Sentinel-2 · 2021 fire scar", T("ind6") + 2.6, 1.1);
    const mt = txt(px + 2140, py + 700, "0.0", "big", "font-size:150px;color:" + RED); count(mt, 0, 1.2, T("ind6") + 4.2, 1.4, (v) => v.toFixed(1) + " MtCO₂e");
    const mtN = txt(px + 2140, py + 860, "lost in one fire year · registry never noticed", "note", "font-size:30px"); wipe(mtN, T("ind6") + 5.4, 1.0);
    // ind7: black box
    const bx = sk(px + 2140, py + 960, 1000, 300);
    draw(rect(bx, 300, 20, 400, 240), T("ind7") + 0.3, 0.9);
    const bxT = txt(px + 2470, py + 1050, "private model", "label", "font-size:40px;color:" + NEON); wipe(bxT, T("ind7") + 1.0, 0.6);
    draw(arrow(bx, 60, 140, 290, 140), T("ind7") + 0.6, 0.4); draw(arrow(bx, 710, 140, 940, 140), T("ind7") + 2.4, 0.4);
    const inQ = txt(px + 2150, py + 1030, "???", "label", "font-size:54px;color:" + AMBER); wipe(inQ, T("ind7") + 0.8, 0.4);
    const grade = txt(px + 3090, py + 1020, "BBB", "chip", "font-size:52px;padding:6px 20px;border-color:" + AMBER + ";color:" + AMBER); pop(grade, T("ind7") + 2.9, 0.35);
    const trust = txt(px + 2140, py + 1290, "no proof it ran · no proof of which data", "label", "font-size:40px;color:" + RED); wipe(trust, T("ind7") + 4.2, 1.2);
    // ind8: three gap tags
    const g1 = txt(tx + 1200, ty + 1030, "① BASELINE", "chip", "font-size:40px;border-color:" + RED + ";color:" + RED + ";background:#000"); pop(g1, T("ind8") + 1.0, 0.3);
    const g2 = txt(tx + 2240, ty + 1020, "② TIME", "chip", "font-size:40px;border-color:" + RED + ";color:" + RED + ";background:#000"); pop(g2, T("ind8") + 1.6, 0.3);
    const g3 = txt(tx + 3160, ty + 1140, "③ SCORE", "chip", "font-size:40px;border-color:" + RED + ";color:" + RED + ";background:#000"); pop(g3, T("ind8") + 2.2, 0.3);
  }

  // ---------- B: VeriCanopy ----------
  const B = (x, y) => [4300 + x, 150 + y];
  {
    const [bx, by] = B(0, 0);
    const title = txt(bx, by, "VERICANOPY: FROM PIXELS TO PROOF", "title", "font-size:96px"); wipe(title, T("ev1") + 0.3, 1.0);
    // satellite photo + polygon + twin
    const satP = photo(bx + 40, by + 200, 1100, 760, "assets/sat/A_after.png", "Sentinel-2 L2A · Earth Engine · 2024", T("ev1") + 1.2, 1.0);
    const satS = sk(bx + 40, by + 200, 1100, 760);
    draw(rect(satS, 120, 90, 520, 520), T("ev3") + 0.2, 1.0);
    draw(rect(satS, 720, 300, 300, 300, "amber"), T("ev3") + 1.4, 0.9);
    const pL = txt(bx + 160, by + 820, "project · 776 px", "label", "font-size:36px"); wipe(pL, T("ev3") + 1.0, 0.5);
    const tL = txt(bx + 760, by + 820, "twin · 2,396 px", "label", "font-size:36px;color:" + AMBER); wipe(tL, T("ev4") + 0.6, 0.6);
    // datasets list
    const DS = ["Sentinel-2 L2A", "Sentinel-1 GRD", "Hansen GFC 2025", "GEDI L4B biomass", "MODIS burned area", "Dynamic World"];
    DS.forEach((d, i) => { const t0 = T("ev2") + 0.8 + i * 1.25; const c = sk(bx + 1200, by + 230 + i * 110, 60, 60); draw(circle(c, 30, 30, 20, "thin"), t0, 0.3); const l = txt(bx + 1280, by + 232 + i * 110, d, "label", "font-size:42px"); wipe(l, t0 + 0.15, 0.5); });
    const dsT = txt(bx + 1200, by + 170, "every monitoring period, Earth Engine pulls:", "note", "font-size:30px"); wipe(dsT, T("ev2") + 0.2, 0.8);
    // twin chart (real data)
    const CX = bx + 1200, CY = by + 920, CW = 1500, CH = 560;
    const ch = sk(CX, CY, CW + 160, CH + 120);
    const years = D.ev.years, xs = (i) => 100 + (i / (years.length - 1)) * CW, ys = (v) => 20 + (1 - (v - 0.78) / 0.24) * CH;
    draw(line(ch, 100, 20, 100, CH + 20, "thin"), T("ev4") + 0.2, 0.5); draw(line(ch, 100, CH + 20, CW + 100, CH + 20, "thin"), T("ev4") + 0.5, 0.6);
    years.forEach((y, i) => { if (i % 2 === 0) { const l = txt(CX + xs(i) - 30, CY + CH + 50, String(y), "note", "font-size:26px"); fadeIn(l, T("ev4") + 0.8 + i * 0.05); } });
    [0.8, 0.9, 1.0].forEach((v) => { const l = txt(CX, CY + ys(v) - 16, Math.round(v * 100) + "%", "note", "font-size:26px"); fadeIn(l, T("ev4") + 1.0); });
    const twinP = path(ch, wob(D.ev.twin_cover.map((v, i) => [xs(i), ys(v)]), 2), "amber"); draw(twinP, T("ev4") + 1.4, 2.6);
    const projP = path(ch, wob(D.ev.project_cover.map((v, i) => [xs(i), ys(v)]), 2)); draw(projP, T("ev4") + 1.8, 2.8);
    const fi = D.ev.fires.findIndex((f) => f.fraction > 0.1);
    draw(line(ch, xs(fi), 20, xs(fi), CH + 20, "red"), T("ev5") + 0.4, 0.4);
    const fireL = txt(CX + xs(fi) + 20, CY + 40, "fire 2023", "label", "font-size:36px;color:" + RED); wipe(fireL, T("ev5") + 0.7, 0.5);
    const legA = txt(CX + 140, CY - 60, "project", "label", "font-size:36px"), legB = txt(CX + 420, CY - 60, "matched twin", "label", "font-size:36px;color:" + AMBER); wipe(legA, T("ev4") + 2.0, 0.5); wipe(legB, T("ev4") + 1.6, 0.5);
    // gap brace
    const gy1 = CY + ys(D.ev.twin_cover[11]), gy2 = CY + ys(D.ev.project_cover[11]);
    const gb = sk(CX + xs(11) + 20, gy1 - 10, 200, gy2 - gy1 + 20); draw(line(gb, 20, 10, 20, gy2 - gy1 + 10, "red"), T("ev5") + 2.0, 0.6);
    const gapT = txt(CX + xs(11) + 60, gy1 + (gy2 - gy1) / 2 - 36, ((D.ev.twin_cover[11] - D.ev.project_cover[11]) * 100).toFixed(1) + " pts gap", "label", "font-size:44px;color:" + RED); wipe(gapT, T("ev5") + 2.5, 0.8);
    const gapN = txt(CX + 100, CY + CH + 100, "the gap is what the credit must pay for", "label", "font-size:40px"); wipe(gapN, T("ev5") + 3.6, 1.2);

    // sc1: features → network → score
    const SX = bx + 40, SY = by + 1080;
    const feats = ["loss_total", "loss_recent", "loss_twin", "ndvi_mean", "ndvi_trend", "vv_backscatter", "vh_backscatter", "biomass", "burn_frac", "burn_twin", "cloudfree", "dw_trees", "dw_crops", "support", "twin_delta", "leak_ring"];
    feats.forEach((f, i) => { const c = txt(SX + (i % 2) * 300, SY + Math.floor(i / 2) * 64, f, "chip", "font-size:24px;padding:6px 14px;border-width:2px"); pop(c, T("sc1") + 0.4 + i * 0.12, 0.25); });
    const net = sk(SX + 640, SY - 20, 500, 560);
    const ny = (n, i) => 280 + (i - (n - 1) / 2) * (n > 8 ? 30 : 56);
    const layers = [16, 16, 8, 1], LX = [40, 180, 320, 460];
    for (let l = 0; l < 3; l++) for (let i = 0; i < layers[l]; i++) for (let j = 0; j < layers[l + 1]; j++) draw(line(net, LX[l], ny(layers[l], i), LX[l + 1], ny(layers[l + 1], j), "thin dim"), T("sc1") + 2.4 + l * 0.6 + (i * 0.01), 0.3);
    for (let l = 0; l < 4; l++) for (let i = 0; i < layers[l]; i++) draw(circle(net, LX[l], ny(layers[l], i), l === 3 ? 22 : 9, "thin"), T("sc1") + 2.2 + l * 0.6, 0.25);
    const p417 = txt(SX + 640, SY + 560, "417 parameters · audited · hash on-chain", "note", "font-size:28px"); wipe(p417, T("sc1") + 4.6, 0.9);
    // score
    const scT = txt(SX + 1240, SY - 10, "Tapajós · integrity score", "label", "font-size:40px"); wipe(scT, T("sc2") + 0.2, 0.6);
    const sc = txt(SX + 1240, SY + 60, "0.0", "big", "font-size:260px"); count(sc, 0, 71.9, T("sc2") + 0.9, 1.4, (v) => v.toFixed(1));
    const scY = txt(SX + 1760, SY + 120, "2023", "chip", "font-size:40px"); pop(scY, T("sc2") + 1.2, 0.3, T("sc2") + 4.8);
    const sc2 = txt(SX + 1240, SY + 60, "71.9", "big", "font-size:260px;color:" + RED); count(sc2, 71.9, 3.9, T("sc2") + 5.6, 1.5, (v) => v.toFixed(1), easeIn);
    items.push({ t0: -1, t1: 1e9, fn: (p, t) => { sc.style.visibility = t >= T("sc2") + 0.9 && t < T("sc2") + 5.6 ? "visible" : "hidden"; } });
    const scY2 = txt(SX + 1760, SY + 120, "2025", "chip", "font-size:40px;border-color:" + RED + ";color:" + RED); pop(scY2, T("sc2") + 5.0, 0.3);
    const loss = txt(SX + 1240, SY + 330, "8,080 t of loss detected", "label", "font-size:44px;color:" + RED); wipe(loss, T("sc2") + 5.2, 0.9);
    const follows = txt(SX + 1240, SY + 410, "the score follows the forest", "label", "font-size:44px"); wipe(follows, T("sc2") + 7.6, 1.0);

    // pf: proof
    const PX = bx + 2200, PY = by + 200;
    const pfT = txt(PX, PY - 10, "a number is still just a number…", "note", "font-size:30px"); wipe(pfT, T("pf1") + 0.3, 1.0);
    const zk = sk(PX, PY + 40, 1000, 460);
    draw(rect(zk, 20, 20, 460, 300), T("pf1") + 3.6, 0.9);
    const zkT = txt(PX + 70, PY + 110, "zero-knowledge<br>circuit", "label", "font-size:46px;line-height:1.05"); wipe(zkT, T("pf1") + 4.2, 0.8);
    const zkS = txt(PX + 70, PY + 240, "EZKL · Halo2 · KZG", "note", "font-size:26px"); wipe(zkS, T("pf1") + 4.8, 0.6);
    draw(arrow(zk, 490, 170, 620, 170), T("pf2") + 0.2, 0.4);
    const pfC = txt(PX + 640, PY + 90, "proof.bin", "chip", "font-size:34px"); pop(pfC, T("pf2") + 0.6, 0.3);
    const pfB = txt(PX + 640, PY + 170, "4,416 bytes · 6.02 s", "label", "font-size:40px"); wipe(pfB, T("pf2") + 1.0, 0.9);
    // chain block with real Basescan recording
    const blk = photo(PX, PY + 560, 1000, 640, "claude/basescan_top.jpg", "sepolia.basescan.org · tx 0xba0aaa…7ff4db · Base Sepolia", T("pf3") + 0.6, 1.0);
    const blk2 = photo(PX, PY + 560, 1000, 640, "claude/basescan_logs.jpg", "sepolia.basescan.org · event logs · IntegrityOracle", T("pf4") + 0.8, 1.0);
    const vfy = txt(PX + 1040, PY + 580, "Halo2Verifier<br><span class='mono dim' style='font-size:30px'>19,817 B · on Base Sepolia</span>", "label", "font-size:44px;line-height:1.05"); wipe(vfy, T("pf3") + 0.9, 0.9);
    const ck = sk(PX + 1040, PY + 740, 400, 200); draw(path(ck, wob([[30, 100], [110, 170], [330, 30]], 4)), T("pf3") + 2.8, 0.6);
    const okT = txt(PX + 1050, PY + 940, "proof checked before the score is stored", "label", "font-size:36px"); wipe(okT, T("pf3") + 3.4, 1.0);
    const revT = txt(PX + 1050, PY + 1020, "wrong proof → REVERT", "label", "font-size:44px;color:" + RED); wipe(revT, T("pf3") + 5.6, 0.9);
    const anyT = txt(PX + 1050, PY + 1120, "anyone can open the transaction", "label", "font-size:36px"); wipe(anyT, T("pf4") + 0.5, 1.0);
    // ML-DSA seal
    const sealS = sk(PX + 1480, PY + 560, 560, 560); draw(circle(sealS, 280, 280, 240), T("pf5") + 0.8, 1.2); draw(circle(sealS, 280, 280, 200, "thin"), T("pf5") + 1.6, 0.9);
    const sealT = txt(PX + 1480, PY + 740, "ML-DSA-65", "display", "font-size:84px;width:560px;text-align:center"); wipe(sealT, T("pf5") + 2.2, 0.8);
    const sealN = txt(PX + 1480, PY + 850, "FIPS 204 · post-quantum<br>3,309-byte signature", "note", "font-size:28px;width:560px;text-align:center"); wipe(sealN, T("pf5") + 3.2, 0.8);
    const sealM = txt(PX + 1480, PY + 1160, "checkable for decades", "label", "font-size:40px;width:560px;text-align:center"); wipe(sealM, T("pf5") + 6.0, 1.0);

    // lc: living credit
    const LXx = bx + 2200, LY = by + 1440;
    const card = sk(LXx, LY, 1100, 560); draw(rect(card, 20, 20, 1060, 520), T("lc1") + 0.3, 1.0);
    const cT = txt(LXx + 70, LY + 60, "VeriCredit · ERC-1155 · Tapajós 2023", "note", "font-size:28px"); wipe(cT, T("lc1") + 0.8, 0.6);
    const cS = txt(LXx + 70, LY + 110, "live score on the token", "label", "font-size:44px"); wipe(cS, T("lc1") + 1.3, 0.8);
    const bufT = txt(LXx + 70, LY + 230, "buffer pool · 20 %", "note", "font-size:28px"); wipe(bufT, T("lc2") + 0.2, 0.5);
    const bufS = sk(LXx + 70, LY + 280, 960, 60); draw(rect(bufS, 10, 10, 940, 40, "thin"), T("lc2") + 0.3, 0.5);
    const bufF = h("div", "w", `left:${LXx + 82}px;top:${LY + 292}px;width:916px;height:36px;background:${NEON};transform-origin:0 50%`);
    items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const q = clamp((t - (T("lc2") + 1.2)) / 1.4); bufF.style.visibility = t >= T("lc2") + 0.6 ? "visible" : "hidden"; bufF.style.transform = `scaleX(${1 - 0.7 * easeOut(q)})`; bufF.style.background = q > 0.5 ? RED : NEON; } });
    const burn = txt(LXx + 70, LY + 350, "loss detected → buffer burns first", "label", "font-size:40px;color:" + RED); wipe(burn, T("lc2") + 1.0, 0.9);
    const frz = txt(LXx + 70, LY + 430, "shortfall → FROZEN · transfers blocked · holders notified", "label", "font-size:36px;color:" + AMBER); wipe(frz, T("lc3") + 0.4, 1.4);
    const chal = sk(LXx + 1140, LY, 640, 560);
    draw(rect(chal, 20, 20, 600, 520), T("lc4") + 0.3, 0.9);
    const chT = txt(LXx + 1190, LY + 60, "challenge", "label", "font-size:48px"); wipe(chT, T("lc4") + 0.8, 0.5);
    const chB = txt(LXx + 1190, LY + 140, "bond · 0.0005 ETH", "note", "font-size:28px"); wipe(chB, T("lc4") + 1.2, 0.5);
    const vs = ["resolver 1 ✓", "resolver 2 ✓", "resolver 3 ✗"]; vs.forEach((v, i) => { const l = txt(LXx + 1190, LY + 230 + i * 80, v, "label", "font-size:40px" + (i === 2 ? ";color:" + RED : "")); wipe(l, T("lc4") + 3.0 + i * 0.7, 0.5); });
    const twoThree = txt(LXx + 1190, LY + 470, "2 of 3 recompute → upheld", "label", "font-size:36px"); wipe(twoThree, T("lc4") + 5.4, 0.9);
  }

  // ---------- C: live product ----------
  {
    const CY1 = 2420, CY2 = 3340, CW = 1360, CH = 850, X0 = 200, GAP = 1480;
    const ct = txt(200, 2300, "LIVE ON BASE SEPOLIA · vericanopy.vercel.app", "title", "font-size:84px"); wipe(ct, T("pr1") + 0.3, 1.2);
    const row = [
      ["registry", "Registry", "pr2"], ["project", "Project · Sentinel-2 · twin chart", "pr3"], ["project_tools", "Year slider · fire watch · leakage ring", "pr4"], ["proofs", "Proofs & signatures · auditor report", "pr5"], ["verify", "Verify", "pr6"],
    ];
    const row2 = [["register", "Register · overlap refused", "pr7"], ["market", "Market", "pr8"], ["ask", "Ask", "pr9"], ["status", "Status", "pr10"]];
    const frames = {};
    row.forEach(([n, title, id], i) => { frames[n] = clip(X0 + i * GAP, CY1, CW, CH, n, title, T(id), i < row.length - 1 ? T(row[i + 1][2]) + 1.2 : T("pr7") + 1.2); });
    row2.forEach(([n, title, id], i) => { frames[n] = clip(X0 + i * GAP, CY2, CW, CH, n, title, T(id), i < row2.length - 1 ? T(row2[i + 1][2]) + 1.2 : T("ag1") + 1.2); });
    // Claude: connector screenshot + chat recording
    const cx = X0 + 4 * GAP;
    const conn = photo(cx, CY2, CW, 626, "claude/connector.jpg", "claude.ai · Settings › Connectors › VeriCanopy", T("ag1") + 0.4, 1.0);
    const connN = txt(cx, CY2 + 660, "custom connector → https://vericanopy-api.onrender.com/mcp/<br>10 tools · no keys on the server", "note", "font-size:28px;color:" + NEON); wipe(connN, T("ag1") + 2.2, 1.2);
    const chat = clip(cx, CY1, CW, CH, "claude", "claude.ai · VeriCanopy forest project scores", T("ag2"), T("end1") + 1.0);
    const chatN = txt(cx + 40, CY1 - 90, "real prompt · real tools · unsigned tx for my wallet", "label", "font-size:38px"); wipe(chatN, T("ag3") + 0.4, 1.2);
  }

  // ---------- end ----------
  const end1 = txt(2660, 4180, "pixels · twin · score · proof · chain · a credit that keeps watching", "label", "font-size:54px;width:2400px;text-align:center"); wipe(end1, T("end1") + 3.0, 2.2);
  const e2a = txt(3280, 560, "Ratings you must trust.", "display", "font-size:110px;width:1120px;text-align:center;color:" + "rgba(182,254,0,.45)"); wipe(e2a, T("end2") + 0.2, 0.9);
  const e2b = txt(3280, 700, "Proofs you can check.", "display", "font-size:110px;width:1120px;text-align:center"); wipe(e2b, T("end2") + 1.9, 0.9);
  const e3 = txt(3230, 1720, "github.com/LSUDOKO/VeriCanopy · Base Sepolia testnet · MIT", "note", "font-size:30px;width:1220px;text-align:center"); fadeIn(e3, T("end3") + 2.2, 0.8);
  items.push({ t0: -1, t1: 1e9, fn: (p, t) => { const on = t >= T("end2"); logo.style.visibility = on ? "visible" : "hidden"; logo.style.transform = `scale(${on ? Math.min(1, 0.3 + 0.7 * easeOut(clamp((t - T("end2")) / 0.8))) : 0})`; logoTxt.style.visibility = t >= T("end3") ? "visible" : "hidden"; logoTag.style.visibility = t >= T("end3") + 1.0 ? "visible" : "hidden"; } });
  typed(logoTxt, "VERICANOPY", T("end3"), 0.9);
  // hide the two end lines when the logo lands
  items.push({ t0: -1, t1: 1e9, fn: (p, t) => { if (t >= T("end3")) { e2a.style.visibility = "hidden"; e2b.style.visibility = "hidden"; } } });

  // ---------- camera script ----------
  camTo(0, 1690, 950, 0.95, 0.01);                 // hook: certificate + photo
  camTo(T("hook2") + 1.8, 1640, 1050, 0.8, 1.6);
  camTo(T("ind1"), 1800, 1100, 0.52, 1.6);         // whole of A
  camTo(T("ind2"), 1100, 1480, 0.9, 1.5);          // flow left half
  camTo(T("ind3"), 2000, 1480, 0.9, 1.4);          // flow right half
  camTo(T("ind4") + 0.6, 2500, 1700, 0.95, 1.4);   // 90%+
  camTo(T("ind5"), 1900, 420, 0.9, 1.5);           // sold/resold
  camTo(T("ind6"), 2900, 650, 1.0, 1.6);           // Manavgat photos
  camTo(T("ind7"), 2900, 1350, 1.0, 1.4);          // black box
  camTo(T("ind8"), 1800, 1100, 0.5, 1.8);          // pull back: three gaps
  camTo(T("ev1"), 5900, 1100, 0.48, 2.2);          // glide to B whole
  camTo(T("ev2"), 5300, 650, 0.95, 1.6);           // photo + datasets
  camTo(T("ev3"), 4900, 650, 1.2, 1.4);            // polygon + twin
  camTo(T("ev4"), 6300, 1200, 0.95, 1.6);          // chart
  camTo(T("sc1"), 4900, 1500, 0.9, 1.6);           // features + network
  camTo(T("sc2"), 5700, 1500, 0.9, 1.4);           // score
  camTo(T("pf1"), 7000, 550, 1.0, 1.6);            // zk box
  camTo(T("pf3"), 7100, 1050, 0.85, 1.6);          // basescan block + verifier
  camTo(T("pf4"), 6950, 1120, 1.15, 1.4);          // close on the recording
  camTo(T("pf5"), 7500, 1150, 0.95, 1.5);          // seal
  camTo(T("lc1"), 7200, 1900, 0.85, 1.6);          // credit card
  camTo(T("lc4"), 7700, 1900, 0.85, 1.4);          // challenge
  camTo(T("pr1"), 3840, 3300, 0.245, 2.2);         // whole product row
  const CW = 1360, GAP = 1480, X0 = 200, fy1 = 2420 + 425, fy2 = 3340 + 425;
  camTo(T("pr2"), X0 + CW / 2, fy1, 1.18, 1.6);
  camTo(T("pr3"), X0 + GAP + CW / 2, fy1, 1.18, 1.3);
  camTo(T("pr4"), X0 + 2 * GAP + CW / 2, fy1, 1.18, 1.3);
  camTo(T("pr5"), X0 + 3 * GAP + CW / 2, fy1, 1.18, 1.3);
  camTo(T("pr6"), X0 + 4 * GAP + CW / 2, fy1, 1.18, 1.3);
  camTo(T("pr7"), X0 + CW / 2, fy2, 1.18, 1.6);
  camTo(T("pr8"), X0 + GAP + CW / 2, fy2, 1.18, 1.3);
  camTo(T("pr9"), X0 + 2 * GAP + CW / 2, fy2, 1.18, 1.3);
  camTo(T("pr10"), X0 + 3 * GAP + CW / 2, fy2, 1.18, 1.3);
  camTo(T("ag1"), X0 + 4 * GAP + CW / 2, 3340 + 400, 1.18, 1.4);
  camTo(T("ag2"), X0 + 4 * GAP + CW / 2, fy1, 1.18, 1.4);
  camTo(T("end1"), 3840, 2160, 0.245, 3.2);        // everything
  camTo(T("end2"), 3840, 1100, 1.0, 2.0);          // centre
  camTo(T("end3"), 3840, 1250, 0.9, 1.4);

  // ---------- subtitles ----------
  const subEl = document.createElement("span"); subs.appendChild(subEl);
  const subtitle = (t) => { const l = LINES.find((x) => t >= x.start - 0.15 && t < x.end + 0.35); subEl.textContent = l ? l.text : ""; subEl.style.visibility = l ? "visible" : "hidden"; };

  // ---------- public ----------
  window.TOTAL = D.total;
  window.ready = async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))); await Promise.all(videos.map(({ v }) => new Promise((r) => { if (v.readyState >= 1) r(); else { v.onloadedmetadata = r; v.onerror = r; } }))); };
  window.seek = async (t) => {
    const c = camAt(t);
    world.style.transform = `translate(${(SW / 2 - c.x * c.s).toFixed(2)}px, ${(SH / 2 - c.y * c.s).toFixed(2)}px) scale(${c.s.toFixed(5)})`;
    for (const it of items) { if (it.t0 === -1) it.fn(0, t); else it.fn(clamp((t - it.t0) / (it.t1 - it.t0)), t); }
    subtitle(t);
    fade.style.opacity = t < 0.8 ? 1 - t / 0.8 : t > D.total - 1.6 ? clamp((t - (D.total - 1.6)) / 1.4) : 0;
    const waits = [];
    for (const { v, t0, t1, el } of videos) {
      const on = t >= t0 && t < t1; if (!on) { continue; }
      const ct = Math.min(Math.max(0, t - t0), (v.duration || 1e9) - 0.05);
      if (Math.abs(v.currentTime - ct) > 0.012) { waits.push(new Promise((r) => { const done = () => { v.removeEventListener("seeked", done); r(); }; v.addEventListener("seeked", done); setTimeout(done, 1500); v.currentTime = ct; })); }
    }
    await Promise.all(waits);
    return true;
  };
  window.seek(0);
})();
