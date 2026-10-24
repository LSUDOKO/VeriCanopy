/* VeriCanopy launch film — DOM + GSAP composition, driven frame by frame by render.mjs via window.seek(t). */
(() => {
  const A = window.DATA.acts, EV = window.DATA.ev, CONTRACTS = window.DATA.contracts;
  const stage = document.getElementById("stage");
  const tl = gsap.timeline({ paused: true });
  gsap.ticker.lagSmoothing(0);

  // ---------- helpers ----------
  const h = (tag, cls = "", html = "", style = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (style) e.style.cssText = style; return e; };
  const scene = (cls) => { const s = h("div", `scene ${cls}`); stage.insertBefore(s, stage.querySelector(".grain")); return s; };
  const show = (s, t0, t1) => { tl.set(s, { autoAlpha: 1 }, t0); if (t1 != null) tl.set(s, { autoAlpha: 0 }, t1); };
  // words("Hello *lime* world") → container with spans; *x* = lime, _x_ = orange, ~x~ = red
  const words = (text, cls = "display h1", style = "") => {
    const c = h("div", cls, "", style);
    text.split(/(\n)/).forEach((line) => {
      if (line === "\n") { c.appendChild(h("br")); return; }
      line.split(" ").forEach((w, i, arr) => {
        let k = "w"; let txt = w;
        if (/^\*.*\*$/.test(w)) { k += " lime"; txt = w.slice(1, -1); }
        else if (/^_.*_$/.test(w)) { k += " orange"; txt = w.slice(1, -1); }
        else if (/^~.*~$/.test(w)) { k += " red"; txt = w.slice(1, -1); }
        const s = h("span", k, txt + (i < arr.length - 1 ? " " : ""));
        c.appendChild(s);
      });
    });
    return c;
  };
  const wordsIn = (c, t, stagger = 0.11, dur = 0.7) => tl.fromTo(c.querySelectorAll(".w"), { opacity: 0, filter: "blur(16px)", y: 18 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: dur, stagger, ease: "power2.out" }, t);
  const wordsOut = (c, t, dur = 0.35) => tl.to(c.querySelectorAll(".w"), { opacity: 0, filter: "blur(10px)", y: -10, duration: dur, stagger: 0.02, ease: "power2.in" }, t);
  const fadeIn = (e, t, dur = 0.6, from = {}) => tl.fromTo(e, { opacity: 0, y: 14, ...from }, { opacity: 1, y: 0, x: 0, scale: 1, duration: dur, ease: "power2.out" }, t);
  const fadeOut = (e, t, dur = 0.35) => tl.to(e, { opacity: 0, duration: dur, ease: "power2.in" }, t);
  const blurUp = (e, t, dur = 0.9) => tl.fromTo(e, { opacity: 0, filter: "blur(22px)", y: 40, scale: 0.96 }, { opacity: 1, filter: "blur(0px)", y: 0, scale: 1, duration: dur, ease: "power3.out" }, t);
  const slam = (e, t) => { tl.set(e, { opacity: 1 }, t); tl.fromTo(e, { scale: 1.55, opacity: 0 }, { scale: 0.94, opacity: 1, duration: 0.12, ease: "power3.in" }, t); tl.to(e, { scale: 1, duration: 0.09, ease: "power1.out" }, t + 0.12); };
  const typeIn = (e, text, t, dur, caret = true) => {
    const o = { n: 0 }; const k = caret ? '<span class="caret"></span>' : "";
    tl.set(e, { opacity: 1 }, t);
    tl.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => { e.innerHTML = esc(text.slice(0, Math.round(o.n))) + k; } }, t);
    if (caret) tl.call(() => { e.innerHTML = esc(text); }, null, t + dur + 1.2);
  };
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const count = (e, from, to, t, dur, fmt = (v) => Math.round(v).toLocaleString("en-US"), ease = "power3.out") => {
    const o = { v: from }; tl.set(e, { opacity: 1 }, t);
    e.textContent = fmt(from);
    tl.to(o, { v: to, duration: dur, ease, onUpdate: () => { e.textContent = fmt(o.v); } }, t);
  };
  const rowsIn = (rows, t, stagger = 0.16) => { tl.fromTo(rows, { opacity: 0, x: -28, filter: "blur(6px)" }, { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.55, stagger, ease: "power3.out" }, t); rows.forEach((r, i) => { const d = r.querySelector(".dot"); if (d) tl.fromTo(d, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, t + stagger * i + 0.35); }); };
  const drawPath = (p, t, dur, ease = "power2.inOut") => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; tl.to(p, { strokeDashoffset: 0, duration: dur, ease }, t); };
  const cam = (e, to, t, dur = 0.9, ease = "power2.inOut") => tl.to(e, { ...to, duration: dur, ease }, t);
  const punch = (e, to, t) => tl.to(e, { ...to, duration: 0.28, ease: "power3.out" }, t);
  const morph = (t, toDark = true, dur = 0.9) => {
    const m = h("div", `morph ${toDark ? "" : "morph-light"}`); stage.appendChild(m);
    tl.set(m, { scale: 0 }, t); tl.to(m, { scale: 14, duration: dur, ease: "power3.in" }, t);
    tl.to(m, { opacity: 0, duration: 0.5 }, t + dur + 0.35); tl.set(m, { scale: 0 }, t + dur + 0.9);
    return t + dur; // moment the frame is fully covered: swap scenes here
  };
  const img = (src, cls = "img-fill", style = "") => { const i = h("img", cls, "", style); i.src = src; return i; };
  const sat = (name) => `assets/sat/${name}`;
  const shot = (name) => `assets/shots/${name}.png`;

  // ================= ACT 0 — cold open (light) =================
  {
    const t0 = A.act0.start, s = scene("light");
    const im = img(sat("A_before.png"), "img-fill", "opacity:0"); s.appendChild(im);
    const veil = h("div", "veil", "", "background:linear-gradient(180deg, rgba(244,243,239,.55), rgba(244,243,239,.75))"); s.appendChild(veil);
    const im2 = img(sat("A_after.png"), "img-fill", "opacity:0"); s.appendChild(im2);
    const veil2 = h("div", "veil", "", "background:linear-gradient(180deg, rgba(244,243,239,.45), rgba(244,243,239,.7))"); s.appendChild(veil2);
    const w1 = words("Every forest carbon credit\nis checked *once.*", "display h1 center", "width:1500px"); s.appendChild(w1);
    const stamp = h("div", "stamp center", "VERIFIED · 2021", "opacity:0;top:70%"); s.appendChild(stamp);
    const w2 = words("By someone you have to trust.", "display h2 center", "width:1500px;top:38%"); s.appendChild(w2);
    const w3 = words("Then nobody looks again.", "display h2 center", "width:1500px;top:38%"); s.appendChild(w3);
    const tick = h("div", "mono center", "2021", "font-size:72px;top:64%;color:var(--forest);opacity:0;font-weight:500"); s.appendChild(tick);
    const foot = h("div", "cap muted", "Sentinel-2 L2A · Tapajós, Pará (BR) · rendered by Earth Engine for this polygon", "position:absolute;left:60px;bottom:44px;font-size:20px"); s.appendChild(foot);
    show(s, 0, A.act1a.start + 0.6);
    tl.to(im, { opacity: 1, duration: 1.4, ease: "power1.out" }, 0.2);
    tl.fromTo(im, { scale: 1.06 }, { scale: 1.0, duration: 8, ease: "none" }, 0);
    fadeIn(foot, 0.6);
    wordsIn(w1, t0 + 0.1, 0.13);
    wordsOut(w1, t0 + 3.1);
    wordsIn(w2, t0 + 3.4, 0.1);
    slam(stamp, t0 + 4.2);
    wordsOut(w2, t0 + 5.7); fadeOut(stamp, t0 + 5.7);
    tl.to(im2, { opacity: 1, duration: 1.2 }, t0 + 5.9);
    tl.fromTo(im2, { scale: 1.0 }, { scale: 1.05, duration: 4, ease: "none" }, t0 + 5.9);
    count(tick, 2021, 2024, t0 + 5.9, 1.6, (v) => String(Math.floor(v)), "none");
    wordsIn(w3, t0 + 6.0, 0.1);
  }

  // ================= ACT 1 — the problem (dark) =================
  {
    const tA = A.act1a.start, tB = A.act1b.start, tC = A.act1c.start, tD = A.act1d.start;
    // morph into dark
    const cover = morph(tA - 0.5, true);
    // --- 1a: three pills + baseline form
    const s = scene("dark");
    show(s, cover, tB);
    const head = words("Three things are broken.", "display h2 center", "width:1500px;top:40%"); s.appendChild(head);
    const pills = h("div", "center", "", "top:56%;display:flex;gap:22px;white-space:nowrap");
    ["01 · Baseline", "02 · Time", "03 · Score"].forEach((p) => pills.appendChild(h("span", "pill dark-pill", p)));
    s.appendChild(pills);
    wordsIn(head, cover + 0.1);
    tl.fromTo(pills.children, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.14, ease: "back.out(2)" }, cover + 1.2);
    wordsOut(head, tA + 3.3); fadeOut(pills, tA + 3.3);
    // baseline form
    const form = h("div", "card", "", "position:absolute;left:220px;top:230px;width:900px;padding:36px 44px;opacity:0");
    form.innerHTML = `<div class="mono" style="font-size:16px;letter-spacing:.14em;color:rgba(244,243,239,.5)">PROJECT DESIGN DOCUMENT · SECTION B.4 · BASELINE SCENARIO</div>
      <div style="height:18px"></div>
      <div class="frow" style="display:flex;justify-content:space-between;font-size:28px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span>Reference region</span><span class="mono">chosen by developer</span></div>
      <div class="frow" style="display:flex;justify-content:space-between;font-size:28px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span>Historic deforestation rate</span><span class="mono">self-reported</span></div>
      <div class="frow" style="display:flex;justify-content:space-between;font-size:28px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span>Projected loss without project</span><span class="mono orange" id="basenum">−4.2 % / yr</span></div>
      <div class="frow" style="display:flex;justify-content:space-between;font-size:28px;padding:14px 0"><span>Re-derived from satellite pixels</span><span class="mono" style="color:var(--red)">never</span></div>`;
    s.appendChild(form);
    const q = h("div", "display", "?", "position:absolute;left:1010px;top:300px;font-size:260px;color:var(--red);opacity:0;transform-origin:50% 50%"); s.appendChild(q);
    const n90 = h("div", "", "", "position:absolute;left:1230px;top:300px;width:560px;opacity:0");
    n90.innerHTML = `<div class="display" style="font-size:190px;color:var(--lime);line-height:.9"><span id="n90">0</span>%+</div><div class="sub" style="margin-top:14px;max-width:520px">of audited rainforest offsets were found to be phantom reductions.</div><div class="cap muted" style="margin-top:18px;font-size:19px">West et al., Science 2023 · Guardian / SourceMaterial investigation 2023</div>`;
    s.appendChild(n90);
    const lab1 = h("div", "label", '<span class="pill lime-pill">01 · Self-reported baselines</span>'); s.appendChild(lab1);
    blurUp(form, tA + 3.6);
    rowsIn([...form.querySelectorAll(".frow")], tA + 4.0, 0.9);
    tl.fromTo(q, { opacity: 0, scale: 0.4, rotation: -12 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2.5)" }, tA + 9.4);
    fadeIn(n90, tA + 10.6);
    count(n90.querySelector("#n90"), 0, 90, tA + 10.8, 1.6, (v) => String(Math.round(v)));
    fadeIn(lab1, tA + 4.2, 0.5, { y: 20 });

    // --- 1b: fire
    const s2 = scene("dark"); show(s2, tB - 0.3, tC);
    const b1 = img(sat("C_before.png")); s2.appendChild(b1);
    const b2 = img(sat("C_fire2021.png"), "img-fill", "opacity:0"); s2.appendChild(b2);
    const dim = h("div", "veil", "", "background:linear-gradient(90deg, rgba(1,40,0,.78) 0%, rgba(1,40,0,.35) 45%, rgba(1,40,0,.1) 100%)"); s2.appendChild(dim);
    const yr = h("div", "display", "2019", "position:absolute;left:120px;top:150px;font-size:150px;color:var(--cream)"); s2.appendChild(yr);
    const credit = h("div", "pill cream-pill", "✓ &nbsp;Credit issued · vintage 2021", "position:absolute;left:120px;top:330px;opacity:0"); s2.appendChild(credit);
    const fireTxt = h("div", "", "", "position:absolute;left:120px;top:430px;opacity:0");
    fireTxt.innerHTML = `<div class="display" style="font-size:150px;line-height:.9;color:var(--orange)"><span id="mt">0.0</span> <span style="font-size:70px">MtCO2e</span></div><div class="sub" style="margin-top:10px;max-width:700px">lost in a single fire year on the Manavgat pilot area. The registry never re-scored it.</div>`;
    s2.appendChild(fireTxt);
    const lab2 = h("div", "label", '<span class="pill lime-pill">02 · Nothing watches after issuance</span>', "left:auto;right:60px;transform:none"); s2.appendChild(lab2);
    const foot2 = h("div", "cap", "Sentinel-2 · Manavgat, Antalya (TR) · Earth Engine composites 2019 and 2021", "position:absolute;left:120px;bottom:44px;font-size:20px;color:rgba(244,243,239,.6)"); s2.appendChild(foot2);
    tl.fromTo(s2, { opacity: 0 }, { opacity: 1, duration: 0.6 }, tB - 0.3);
    tl.fromTo(b1, { scale: 1.08 }, { scale: 1.0, duration: 14, ease: "none" }, tB - 0.3);
    tl.fromTo(b2, { scale: 1.08 }, { scale: 1.0, duration: 14, ease: "none" }, tB - 0.3);
    fadeIn(credit, tB + 1.2);
    count(yr, 2019, 2021, tB + 3.8, 1.2, (v) => String(Math.floor(v)), "none");
    tl.to(b2, { opacity: 1, duration: 1.4, ease: "power2.inOut" }, tB + 4.6);
    tl.to(credit, { opacity: 0.35, duration: 0.6 }, tB + 5.5);
    fadeIn(fireTxt, tB + 6.4);
    count(fireTxt.querySelector("#mt"), 0, 1.2, tB + 6.6, 1.8, (v) => v.toFixed(1));
    fadeIn(lab2, tB + 1.0, 0.5, { y: 20 });
    fadeIn(foot2, tB + 0.6);

    // --- 1c: black box
    const s3 = scene("dark"); show(s3, tC - 0.2, tD);
    tl.fromTo(s3, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tC - 0.2);
    const box = h("div", "", "", "position:absolute;left:760px;top:330px;width:400px;height:400px;border-radius:40px;background:#050f05;box-shadow:0 40px 120px rgba(0,0,0,.6), inset 0 0 0 2px rgba(182,254,0,.12);opacity:0");
    box.innerHTML = `<div class="display" style="position:absolute;inset:0;display:grid;place-items:center;font-size:54px;color:rgba(244,243,239,.35)">private model</div>`;
    s3.appendChild(box);
    const inp = h("div", "", "", "position:absolute;left:300px;top:380px;width:380px;display:flex;flex-direction:column;gap:18px;opacity:0");
    ["Which satellite data?", "Which version of the model?", "Did it run at all?"].forEach((q) => inp.appendChild(h("div", "row", `<span class="ico">?</span><span>${q}</span>`, "width:380px;font-size:24px")));
    s3.appendChild(inp);
    const outp = h("div", "pill cream-pill display", "Rating: BBB", "position:absolute;left:1240px;top:470px;font-size:46px;padding:16px 36px;opacity:0"); s3.appendChild(outp);
    const arrows = h("div", "mono", "→", "position:absolute;left:1180px;top:470px;font-size:60px;color:var(--lime);opacity:0"); s3.appendChild(arrows);
    const lab3 = h("div", "label", '<span class="pill lime-pill">03 · Scores you cannot check</span>'); s3.appendChild(lab3);
    const cap3 = words("No proof it ran. No proof of which data.", "display h3 center", "width:1400px;top:16%"); s3.appendChild(cap3);
    blurUp(box, tC + 0.3);
    fadeIn(inp, tC + 1.0); rowsIn([...inp.children], tC + 1.1, 0.3);
    tl.to(box, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 }, tC + 3.6);
    fadeIn(arrows, tC + 3.9, 0.3); tl.fromTo(outp, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, tC + 4.0);
    cam(box, { scale: 1.1 }, tC + 5.5, 2.5, "power1.inOut");
    wordsIn(cap3, tC + 6.2);
    fadeIn(lab3, tC + 1.0, 0.5, { y: 20 });

    // --- 1d: thesis
    const s4 = scene("dark"); show(s4, tD - 0.2, A.act2.start + 0.3);
    const bgw = img(sat("amazon_wide.jpg"), "img-fill", "opacity:.22"); s4.appendChild(bgw);
    const th = words("The market trusts paperwork.\nThe forest does not read it.", "display h1 center", "width:1600px;font-size:110px"); s4.appendChild(th);
    tl.fromTo(s4, { opacity: 0 }, { opacity: 1, duration: 0.5 }, tD - 0.2);
    tl.fromTo(bgw, { scale: 1.0 }, { scale: 1.06, duration: 6, ease: "none" }, tD - 0.2);
    wordsIn(th, tD + 0.1, 0.14, 0.8);
  }

  // ================= ACT 2 — reveal (light) =================
  {
    const t0 = A.act2.start;
    const cover = morph(t0 - 0.9, false);
    const s = scene("light"); show(s, cover, A.act3a.start + 0.2);
    const mark = img("assets/brand/logo-mark.svg", "", "position:absolute;left:560px;top:410px;width:160px;height:160px;opacity:0"); s.appendChild(mark);
    const word = h("div", "display", "", "position:absolute;left:760px;top:405px;font-size:150px;color:var(--forest);line-height:1;white-space:nowrap"); s.appendChild(word);
    const tag = words("Carbon credits that *prove* *themselves.*", "display center", "top:66%;width:1500px;font-size:62px;color:var(--ink)"); s.appendChild(tag);
    const st = h("div", "sticker", "live on Base Sepolia", "position:absolute;left:1380px;top:380px;opacity:0"); s.appendChild(st);
    tl.fromTo(mark, { opacity: 0, scale: 0.3, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2.2)" }, cover + 0.1);
    typeIn(word, "VeriCanopy", cover + 0.6, 0.9, false);
    tl.fromTo(st, { opacity: 0, scale: 0.6, rotation: 8 }, { opacity: 1, scale: 1, rotation: -4, duration: 0.45, ease: "back.out(2)" }, cover + 1.7);
    wordsIn(tag, t0 + 1.6, 0.12);
    // morph to dark for act 3 (handled by act3)
  }

  // ================= ACT 3 — how it works (dark) =================
  {
    const tA = A.act3a.start, tB = A.act3b.start, tC = A.act3c.start, tD = A.act3d.start;
    const cover = morph(tA - 0.7, true);

    // --- 3.1 satellite + polygons + dataset rows
    const s = scene("dark"); show(s, cover, tA + 14.2);
    const base = img(sat("A_after.png")); s.appendChild(base);
    const dim = h("div", "veil", "", "background:linear-gradient(90deg, rgba(1,40,0,.1) 0%, rgba(1,40,0,.6) 55%, rgba(1,40,0,.9) 100%)"); s.appendChild(dim);
    const svg = h("div", "", `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0">
      <rect id="poly" x="190" y="150" width="620" height="620" fill="rgba(182,254,0,.08)" stroke="#b6fe00" stroke-width="5" rx="2"/>
      <rect id="twin" x="880" y="420" width="400" height="400" fill="rgba(255,210,63,.08)" stroke="#ffd23f" stroke-width="4" stroke-dasharray="14 10" rx="2"/>
      <text id="lp" x="200" y="810" fill="#b6fe00" font-size="26" font-weight="600" opacity="0">PROJECT · Tapajós block · 776 px</text>
      <text id="lt" x="880" y="860" fill="#ffd23f" font-size="26" font-weight="600" opacity="0">MATCHED TWIN · 2,396 px</text></svg>`); s.appendChild(svg);
    const poly = svg.querySelector("#poly"), twin = svg.querySelector("#twin");
    tl.set([poly, twin], { opacity: 0 }, 0);
    const list = h("div", "", "", "position:absolute;right:90px;top:170px;display:flex;flex-direction:column;gap:14px");
    const DS = [["S2", "Sentinel-2 L2A", "COPERNICUS/S2_SR_HARMONIZED"], ["S1", "Sentinel-1 GRD", "COPERNICUS/S1_GRD"], ["HG", "Hansen GFC 2025", "UMD/hansen/global_forest_change_2025"], ["GE", "GEDI L4B biomass", "LARSE/GEDI/GEDI04_B_002"], ["MO", "MODIS burned area", "MODIS/061/MCD64A1"], ["DW", "Dynamic World", "GOOGLE/DYNAMICWORLD/V1"]];
    DS.forEach(([k, n, m]) => list.appendChild(h("div", "row", `<span class="ico">${k}</span><span>${n}</span><span class="meta">${m}</span><span class="dot"></span>`, "width:820px")));
    s.appendChild(list);
    const lab = h("div", "label", '<span class="pill lime-pill">01 · Evidence</span><span class="pill dark-pill" style="margin-left:14px">Earth Engine · every monitoring period</span>', "left:60px;transform:none"); s.appendChild(lab);
    tl.fromTo(base, { scale: 1.1 }, { scale: 1.0, duration: 14, ease: "none" }, cover);
    tl.set(poly, { opacity: 1 }, cover + 0.3); drawPath(poly, cover + 0.3, 1.1);
    tl.to(svg.querySelector("#lp"), { opacity: 1, duration: 0.4 }, cover + 1.3);
    rowsIn([...list.children], cover + 1.6, 0.42);
    tl.set(twin, { opacity: 1 }, cover + 6.2); drawPath(twin, cover + 6.2, 0.9);
    tl.to(svg.querySelector("#lt"), { opacity: 1, duration: 0.4 }, cover + 7.0);
    fadeIn(lab, cover + 0.6, 0.5, { y: 20 });

    // --- 3.2 twin chart
    const s2 = scene("dark"); show(s2, tA + 14.0, tB);
    tl.fromTo(s2, { opacity: 0 }, { opacity: 1, duration: 0.5 }, tA + 14.0);
    const W = 1240, H = 560, L = 340, T = 200;
    const xs = (i) => L + (i / (EV.years.length - 1)) * W, ys = (v) => T + (1 - (v - 0.78) / 0.24) * H;
    const pts = (arr) => arr.map((v, i) => `${xs(i)},${ys(v)}`).join(" ");
    const fireI = EV.fires.findIndex((f) => f.fraction > 0.1);
    const chart = h("div", "", `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0">
      <g id="axes" opacity="0">${[0.8, 0.85, 0.9, 0.95, 1.0].map((v) => `<line x1="${L}" x2="${L + W}" y1="${ys(v)}" y2="${ys(v)}" stroke="rgba(255,255,255,.12)"/><text x="${L - 16}" y="${ys(v) + 9}" fill="rgba(244,243,239,.6)" font-size="22" text-anchor="end">${Math.round(v * 100)}%</text>`).join("")}
      ${EV.years.map((y, i) => `<text x="${xs(i)}" y="${T + H + 40}" fill="rgba(244,243,239,.6)" font-size="22" text-anchor="middle">${y}</text>`).join("")}</g>
      <line id="start" x1="${xs(5)}" x2="${xs(5)}" y1="${T}" y2="${T + H}" stroke="#b6fe00" stroke-dasharray="8 8" opacity="0"/><text id="startT" x="${xs(5) + 10}" y="${T + 30}" fill="#b6fe00" font-size="22" opacity="0">project start 2019</text>
      <polyline id="twinL" fill="none" stroke="#ffd23f" stroke-width="6" stroke-linejoin="round" points="${pts(EV.twin_cover)}"/>
      <polyline id="projL" fill="none" stroke="#b6fe00" stroke-width="7" stroke-linejoin="round" points="${pts(EV.project_cover)}"/>
      <line id="fire" x1="${xs(fireI)}" x2="${xs(fireI)}" y1="${T}" y2="${T + H}" stroke="#e63946" stroke-width="3" opacity="0"/>
      <text id="fireT" x="${xs(fireI) + 12}" y="${T + 70}" fill="#e63946" font-size="24" font-weight="600" opacity="0">fire 2023 · 18% burned</text>
      <g id="leg" opacity="0" transform="translate(${L},${T + H + 90})"><rect width="28" height="8" y="-4" fill="#b6fe00"/><text x="40" y="8" fill="#f4f3ef" font-size="24">Project cover</text><rect x="260" width="28" height="8" y="-4" fill="#ffd23f"/><text x="300" y="8" fill="#f4f3ef" font-size="24">Matched twin cover</text></g>
      </svg>`); s2.appendChild(chart);
    const gap = h("div", "", "", "position:absolute;left:1260px;top:470px;opacity:0;text-align:right");
    gap.innerHTML = `<div class="display" style="font-size:120px;color:var(--orange);line-height:.9"><span id="gapn">0.0</span><span style="font-size:60px"> pts</span></div><div class="sub" style="margin-top:8px">below the twin forest.<br>That gap is what the credit must pay for.</div>`;
    s2.appendChild(gap);
    const lab2 = h("div", "label", '<span class="pill lime-pill">01 · Evidence</span><span class="pill dark-pill" style="margin-left:14px">776 project px vs 2,396 twin px · period 2025</span>', "left:60px;transform:none"); s2.appendChild(lab2);
    const ttl = h("div", "display h3", "Forest cover: project vs matched twin", "position:absolute;left:340px;top:110px"); s2.appendChild(ttl);
    tl.to(chart.querySelector("#axes"), { opacity: 1, duration: 0.6 }, tA + 14.3);
    fadeIn(ttl, tA + 14.3); fadeIn(lab2, tA + 14.5, 0.5, { y: 20 });
    tl.to([chart.querySelector("#start"), chart.querySelector("#startT")], { opacity: 1, duration: 0.4 }, tA + 15.0);
    drawPath(chart.querySelector("#twinL"), tA + 15.3, 2.4, "power1.inOut");
    drawPath(chart.querySelector("#projL"), tA + 15.6, 2.6, "power1.inOut");
    tl.to(chart.querySelector("#leg"), { opacity: 1, duration: 0.4 }, tA + 17.6);
    tl.fromTo(chart.querySelector("#fire"), { opacity: 0, scaleY: 0, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: 0.35, ease: "power3.out" }, tA + 18.4);
    tl.to(chart.querySelector("#fireT"), { opacity: 1, duration: 0.3 }, tA + 18.7);
    fadeIn(gap, tA + 20.4);
    count(gap.querySelector("#gapn"), 0, (EV.twin_cover[11] - EV.project_cover[11]) * 100, tA + 20.6, 1.4, (v) => v.toFixed(1));

    // --- 3.3 chips (16 features)
    const s3 = scene("dark"); show(s3, tB - 0.3, tB + 8.2);
    tl.fromTo(s3, { opacity: 0 }, { opacity: 1, duration: 0.5 }, tB - 0.3);
    const F = ["loss_total", "loss_recent", "loss_twin_total", "loss_twin_recent", "ndvi_mean", "ndvi_trend", "ndvi_twin_delta", "vv_backscatter", "vh_backscatter", "biomass_agbd", "burn_fraction", "burn_twin", "cloudfree_frac", "dw_trees_frac", "dw_crops_frac", "support_ratio"];
    const grid = h("div", "", "", "position:absolute;left:160px;top:250px;width:1600px;display:flex;flex-wrap:wrap;gap:18px;justify-content:center");
    F.forEach((f, i) => grid.appendChild(h("div", "chip", `<small>f${String(i + 1).padStart(2, "0")}</small><span>${f}</span>`, "filter:blur(5px);opacity:.35")));
    s3.appendChild(grid);
    const cnt = h("div", "pill dark-pill mono", '<span>fv1 ·</span> <b id="fc">0</b><span>/ 16 features</span>', "position:absolute;left:50%;top:700px;transform:translateX(-50%);font-size:30px"); s3.appendChild(cnt);
    const lab3 = h("div", "label", '<span class="pill lime-pill">02 · Integrity score</span>', "left:60px;transform:none"); s3.appendChild(lab3);
    const h3t = words("Sixteen features. One honest number.", "display h3 center", "top:15%;width:1500px"); s3.appendChild(h3t);
    wordsIn(h3t, tB + 0.2); fadeIn(lab3, tB + 0.4, 0.5, { y: 20 });
    [...grid.children].forEach((c, i) => { const t = tB + 1.0 + i * 0.3; tl.to(c, { filter: "blur(0px)", opacity: 1, scale: 1.06, duration: 0.25 }, t); tl.to(c, { scale: 1, duration: 0.25 }, t + 0.25); tl.to(c, { filter: "blur(2px)", opacity: 0.75, duration: 0.3 }, t + 0.9); });
    count(cnt.querySelector("#fc"), 0, 16, tB + 1.0, 16 * 0.3, (v) => String(Math.round(v)), "none");
    tl.to([...grid.children], { filter: "blur(0px)", opacity: 1, duration: 0.5 }, tB + 6.4);

    // --- 3.4 network
    const s4 = scene("dark"); show(s4, tB + 8.0, tB + 14.5);
    tl.fromTo(s4, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tB + 8.0);
    const layers = [16, 16, 8, 1], LX = [360, 760, 1160, 1560];
    let nodes = "", edges = "";
    const ny = (n, i) => 540 + (i - (n - 1) / 2) * (n > 8 ? 46 : 70);
    for (let l = 0; l < layers.length - 1; l++) for (let i = 0; i < layers[l]; i++) for (let j = 0; j < layers[l + 1]; j++) edges += `<line class="e e${l}" x1="${LX[l]}" y1="${ny(layers[l], i)}" x2="${LX[l + 1]}" y2="${ny(layers[l + 1], j)}" stroke="#b6fe00" stroke-opacity=".18" stroke-width="1.3"/>`;
    for (let l = 0; l < layers.length; l++) for (let i = 0; i < layers[l]; i++) nodes += `<circle class="n n${l}" cx="${LX[l]}" cy="${ny(layers[l], i)}" r="${l === 3 ? 26 : 13}" fill="${l === 3 ? "#b6fe00" : "#0a3a0a"}" stroke="#b6fe00" stroke-width="2.5"/>`;
    const net = h("div", "", `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0">${edges}${nodes}
      <text x="360" y="150" fill="#f4f3ef" font-size="26" text-anchor="middle">16 inputs</text><text x="760" y="150" fill="#f4f3ef" font-size="26" text-anchor="middle">16 · ReLU</text><text x="1160" y="150" fill="#f4f3ef" font-size="26" text-anchor="middle">8 · ReLU</text><text x="1560" y="150" fill="#f4f3ef" font-size="26" text-anchor="middle">score · sigmoid</text></svg>`); s4.appendChild(net);
    const p417 = h("div", "", "", "position:absolute;left:1420px;top:620px;opacity:0;text-align:center;width:300px");
    p417.innerHTML = `<div class="display" style="font-size:110px;color:var(--lime);line-height:.9"><span id="p417">0</span></div><div class="sub">parameters</div><div class="cap muted" style="font-size:18px;margin-top:6px">MAE 0.0125 vs expert rule · monotonic</div>`;
    s4.appendChild(p417);
    const lab4 = h("div", "label", '<span class="pill lime-pill">02 · Integrity score</span><span class="pill dark-pill" style="margin-left:14px">distilled MLP · audited · hashed on-chain</span>', "left:60px;transform:none"); s4.appendChild(lab4);
    fadeIn(lab4, tB + 8.3, 0.5, { y: 20 });
    tl.fromTo(net.querySelectorAll(".n"), { opacity: 0, scale: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.02, ease: "back.out(2)" }, tB + 8.2);
    for (let l = 0; l < 3; l++) tl.fromTo(net.querySelectorAll(`.e${l}`), { strokeOpacity: 0 }, { strokeOpacity: 0.8, duration: 0.5, stagger: 0.002 }, tB + 9.2 + l * 0.9).to(net.querySelectorAll(`.e${l}`), { strokeOpacity: 0.18, duration: 0.6 }, tB + 9.9 + l * 0.9);
    tl.fromTo(net.querySelector(".n3"), { scale: 1 }, { scale: 1.5, duration: 0.3, yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, tB + 11.9);
    fadeIn(p417, tB + 11.0); count(p417.querySelector("#p417"), 0, 417, tB + 11.2, 1.3);

    // --- 3.5 score drop
    const s5 = scene("dark"); show(s5, tB + 14.3, tC);
    tl.fromTo(s5, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tB + 14.3);
    const yr5 = h("div", "mono", "Tapajós Riverine Forest Block · period <b id='y5'>2023</b>", "position:absolute;left:50%;top:190px;transform:translateX(-50%);font-size:30px;color:rgba(244,243,239,.7)"); s5.appendChild(yr5);
    const sc = h("div", "display big center", "0.0", "top:48%;color:var(--lime);font-size:360px"); s5.appendChild(sc);
    const scl = h("div", "sub center", "integrity score · 0–100 · how much of the claimed carbon the pixels support", "top:78%;width:1400px"); s5.appendChild(scl);
    const loss = h("div", "pill red-pill", "⚠ &nbsp;8,080 t of loss detected · buffer burned", "position:absolute;left:50%;top:850px;transform:translateX(-50%);font-size:30px;opacity:0"); s5.appendChild(loss);
    const lab5 = h("div", "label", '<span class="pill lime-pill">02 · Integrity score</span><span class="pill dark-pill" style="margin-left:14px">the score follows the forest</span>', "left:60px;transform:none;bottom:60px"); s5.appendChild(lab5);
    fadeIn(yr5, tB + 14.5); fadeIn(scl, tB + 14.8); fadeIn(lab5, tB + 14.6, 0.5, { y: 20 });
    count(sc, 0, 71.9, tB + 14.6, 1.6, (v) => v.toFixed(1));
    tl.to(yr5.querySelector("#y5"), { textContent: "2025", duration: 0 }, tB + 17.6);
    tl.to(yr5, { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1 }, tB + 17.5);
    count(sc, 71.9, 3.9, tB + 17.8, 1.4, (v) => v.toFixed(1), "power2.in");
    tl.to(sc, { color: "#e63946", duration: 0.5 }, tB + 18.6);
    punch(sc, { scale: 1.12 }, tB + 19.1); tl.to(sc, { scale: 1, duration: 0.5 }, tB + 19.4);
    slam(loss, tB + 19.3);

    // --- 3.6 terminal prove
    const s6 = scene("dark"); show(s6, tC - 0.3, tC + 7.8);
    tl.fromTo(s6, { opacity: 0 }, { opacity: 1, duration: 0.5 }, tC - 0.3);
    const term = h("div", "term", `<div class="bar"><i></i><i></i><i></i><span class="mono" style="margin-left:12px;font-size:16px;color:rgba(244,243,239,.5)">oracle · vericanopy-ai</span></div><div class="body"><div class="ln" id="l1"></div><div class="ln" id="l2"></div><div class="ln" id="l3"></div><div class="ln" id="l4"></div><div class="ln" id="l5"></div></div>`, "position:absolute;left:370px;top:230px"); s6.appendChild(term);
    const lab6 = h("div", "label", '<span class="pill lime-pill">03 · zkML proof</span><span class="pill dark-pill" style="margin-left:14px">EZKL 23 · Halo2 · KZG</span>', "left:60px;transform:none"); s6.appendChild(lab6);
    fadeIn(lab6, tC + 0.2, 0.5, { y: 20 });
    blurUp(term, tC - 0.1);
    typeIn(term.querySelector("#l1"), "$ vericanopy prove --project 1 --period 2025 --model mlp_fv1.onnx", tC + 0.4, 1.6);
    tl.set(term.querySelector("#l2"), { opacity: 1 }, tC + 2.3); term.querySelector("#l2").innerHTML = '<span style="color:rgba(244,243,239,.6)">→ features committed</span>  <span style="color:#b6fe00">poseidon 0x3b2e…91af</span>';
    const prog = h("div", "", '<span style="color:rgba(244,243,239,.6)">→ proving  </span><span class="bar-track" style="display:inline-block;vertical-align:middle;width:520px"><span class="bar-fill" id="pf" style="display:block;transform:scaleX(0)"></span></span>  <span id="pt">0.0 s</span>');
    term.querySelector("#l3").appendChild(prog); tl.set(term.querySelector("#l3"), { opacity: 1 }, tC + 2.9);
    tl.to(prog.querySelector("#pf"), { scaleX: 1, duration: 2.6, ease: "power1.inOut" }, tC + 3.0);
    count(prog.querySelector("#pt"), 0, 6.02, tC + 3.0, 2.6, (v) => v.toFixed(2) + " s", "power1.inOut");
    tl.set(term.querySelector("#l4"), { opacity: 1 }, tC + 5.8); term.querySelector("#l4").innerHTML = '<span style="color:#b6fe00">✓ proof.bin</span>  <b>4,416 bytes</b>  <span style="color:rgba(244,243,239,.6)">· score decoded from public instances</span>';
    tl.set(term.querySelector("#l5"), { opacity: 1 }, tC + 6.6); term.querySelector("#l5").innerHTML = '<span style="color:rgba(244,243,239,.6)">→ submitScore(…) on Base Sepolia</span>';

    // --- 3.7 block verify + revert
    const s7 = scene("dark"); show(s7, tC + 7.6, tC + 18.0);
    tl.fromTo(s7, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tC + 7.6);
    const blk = h("div", "card", "", "position:absolute;left:1030px;top:290px;width:640px;padding:36px 40px;opacity:0");
    blk.innerHTML = `<div class="mono" style="font-size:16px;letter-spacing:.14em;color:rgba(244,243,239,.5)">BASE SEPOLIA · BLOCK 49,551,1xx</div><div class="display" style="font-size:44px;margin-top:10px">IntegrityOracle.submitScore</div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:12px;font-size:24px">
      <div class="vrow" style="display:flex;justify-content:space-between"><span class="muted">Halo2Verifier</span><span class="mono">19,817 B · <span id="vst">verifying…</span></span></div>
      <div class="vrow" style="display:flex;justify-content:space-between"><span class="muted">model hash</span><span class="mono">0x9cfcdf…b2df5d ✓</span></div>
      <div class="vrow" style="display:flex;justify-content:space-between"><span class="muted">score (public instance)</span><span class="mono">3.9 → stored</span></div>
      </div><div style="margin-top:22px"><span class="pill cream-pill mono" id="txp" style="font-size:20px;opacity:0">tx 0xba0aaa…7ff4db ↗</span></div>`;
    s7.appendChild(blk);
    const proofChip = h("div", "pill lime-pill mono", "proof.bin · 4,416 B", "position:absolute;left:300px;top:470px;font-size:28px"); s7.appendChild(proofChip);
    const badProof = h("div", "pill red-pill mono", "forged proof · wrong score", "position:absolute;left:300px;top:470px;font-size:28px;opacity:0"); s7.appendChild(badProof);
    const chk = h("div", "display", "✓", "position:absolute;left:1480px;top:230px;font-size:120px;color:var(--lime);opacity:0"); s7.appendChild(chk);
    const rev = h("div", "display", "REVERT", "position:absolute;left:1180px;top:200px;font-size:110px;color:var(--red);opacity:0;letter-spacing:.05em"); s7.appendChild(rev);
    const cap7 = words("The oracle cannot invent a number.", "display h3", "position:absolute;left:300px;top:640px;width:640px"); s7.appendChild(cap7);
    const cap8 = words("Wrong proof? The transaction reverts.", "display h3", "position:absolute;left:300px;top:640px;width:640px"); s7.appendChild(cap8);
    const lab7 = h("div", "label", '<span class="pill lime-pill">03 · zkML proof</span><span class="pill dark-pill" style="margin-left:14px">verified on-chain before the score is stored</span>', "left:60px;transform:none"); s7.appendChild(lab7);
    fadeIn(lab7, tC + 7.9, 0.5, { y: 20 });
    blurUp(blk, tC + 7.8);
    tl.to(proofChip, { x: 700, duration: 0.8, ease: "power2.in" }, tC + 9.0);
    tl.to(proofChip, { opacity: 0, duration: 0.15 }, tC + 9.8);
    tl.to(blk, { scale: 1.03, duration: 0.15, yoyo: true, repeat: 1 }, tC + 9.8);
    tl.call(() => { blk.querySelector("#vst").textContent = "✓ verified"; blk.querySelector("#vst").style.color = "#b6fe00"; }, null, tC + 10.4);
    tl.call(() => { blk.querySelector("#vst").textContent = "verifying…"; blk.querySelector("#vst").style.color = ""; }, null, tC + 7.7);
    slam(chk, tC + 10.5);
    tl.to(blk.querySelector("#txp"), { opacity: 1, duration: 0.4 }, tC + 11.0);
    wordsIn(cap7, tC + 10.6);
    // revert beat
    wordsOut(cap7, tC + 13.6); fadeOut(chk, tC + 13.6);
    tl.fromTo(badProof, { opacity: 0, x: 0 }, { opacity: 1, duration: 0.3 }, tC + 13.9);
    tl.to(badProof, { x: 700, duration: 0.7, ease: "power2.in" }, tC + 14.3);
    tl.to(badProof, { opacity: 0, duration: 0.1 }, tC + 15.0);
    tl.to(blk, { x: -14, duration: 0.05, yoyo: true, repeat: 7 }, tC + 15.0);
    tl.to(blk, { borderColor: "#e63946", duration: 0.2 }, tC + 15.0);
    slam(rev, tC + 15.1);
    tl.call(() => { blk.querySelector("#vst").textContent = "✗ invalid"; blk.querySelector("#vst").style.color = "#e63946"; }, null, tC + 15.1);
    wordsIn(cap8, tC + 15.3);

    // --- 3.8 ML-DSA stamp
    const s8 = scene("dark"); show(s8, tC + 17.8, tD);
    tl.fromTo(s8, { opacity: 0 }, { opacity: 1, duration: 0.4 }, tC + 17.8);
    const man = h("div", "card", "", "position:absolute;left:330px;top:200px;width:820px;padding:40px 46px;opacity:0");
    man.innerHTML = `<div class="mono" style="font-size:16px;letter-spacing:.14em;color:rgba(244,243,239,.5)">MANIFEST · vc-manifest/1 · bafkreid…4jnmty</div>
      <div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;font-size:23px" class="mono">
      <div><span class="muted">project</span>  1 · Tapajós Riverine Forest Block</div><div><span class="muted">period</span>   2025 · provider earthengine</div>
      <div><span class="muted">datasets</span> S2 · S1 · Hansen 2025 · GEDI L4B · MCD64A1 · DW</div><div><span class="muted">geometry</span> sha256 0x7c1e…a0d3 · 180 H3 cells (res 8)</div>
      <div><span class="muted">model</span>    0x9cfcdf…b2df5d · code 0236ccf</div><div><span class="muted">score</span>    3.9 · proof 4,416 B</div></div>
      <div style="margin-top:24px;border-top:1px solid rgba(255,255,255,.1);padding-top:18px" class="mono"><span class="muted">signature</span> <span id="sig" style="color:#b6fe00;word-break:break-all;font-size:19px"></span></div>`;
    s8.appendChild(man);
    const seal = h("div", "", "", "position:absolute;left:1210px;top:300px;width:420px;height:420px;border-radius:50%;border:8px solid var(--lime);display:grid;place-items:center;text-align:center;opacity:0;box-shadow:0 0 0 14px rgba(182,254,0,.08)");
    seal.innerHTML = `<div><div class="display" style="font-size:74px;color:var(--lime);line-height:1">ML-DSA-65</div><div class="mono" style="font-size:22px;margin-top:8px">FIPS 204 · post-quantum</div><div class="mono" style="font-size:20px;color:rgba(244,243,239,.6);margin-top:6px">3,309-byte signature</div></div>`;
    s8.appendChild(seal);
    const cap9 = words("Signed so the record stays checkable for decades.", "display h3", "position:absolute;left:330px;top:820px;width:1300px"); s8.appendChild(cap9);
    const lab8 = h("div", "label", '<span class="pill lime-pill">03 · Signed evidence</span><span class="pill dark-pill" style="margin-left:14px">key registered on-chain · PQKeyRegistry</span>', "left:60px;transform:none;bottom:40px"); s8.appendChild(lab8);
    fadeIn(lab8, tC + 18.0, 0.5, { y: 20 });
    blurUp(man, tC + 18.0);
    const hex = "8f3a1c…".padEnd(1, " "); const sigHex = Array.from({ length: 96 }, (_, i) => ((i * 7919 + 13) % 256).toString(16).padStart(2, "0")).join("");
    typeIn(man.querySelector("#sig"), sigHex, tC + 19.2, 1.6, false);
    slam(seal, tC + 21.6);
    tl.fromTo(seal, { rotation: -12 }, { rotation: -8, duration: 0.3 }, tC + 21.6);
    wordsIn(cap9, tC + 22.4);

    // --- 3.9 living credit
    const s9 = scene("dark"); show(s9, tD - 0.3, A.act4.start + 0.4);
    tl.fromTo(s9, { opacity: 0 }, { opacity: 1, duration: 0.5 }, tD - 0.3);
    const tok = h("div", "card", "", "position:absolute;left:260px;top:220px;width:640px;padding:36px 40px;opacity:0");
    tok.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div class="mono" style="font-size:16px;letter-spacing:.14em;color:rgba(244,243,239,.5)">VERICREDIT · ERC-1155 · token 67557</div><span class="pill lime-pill mono" id="tscore" style="font-size:20px;padding:8px 16px">71.9 · Active</span></div>
      <div class="display" style="font-size:46px;margin-top:14px">Tapajós · vintage 2023</div>
      <div style="margin-top:10px;font-size:24px" class="muted">5,000 tCO2e · holder 0x33D2…2c94</div>
      <div style="margin-top:26px" class="mono"><div style="display:flex;justify-content:space-between;font-size:20px"><span class="muted">buffer pool (20 %)</span><span id="bufn">1,000 t</span></div><div class="bar-track" style="width:100%;margin-top:10px"><div class="bar-fill" id="buf"></div></div></div>`;
    s9.appendChild(tok);
    const ev = h("div", "", "", "position:absolute;left:1000px;top:220px;display:flex;flex-direction:column;gap:14px");
    const EVR = [["↓", "Loss detected · 8,080 t", "oracle · period 2025"], ["🔥", "Buffer burns first", "BufferPool.settleShortfall"], ["🔒", "Shortfall → project frozen", "transfers blocked"], ["✉", "3 holders notified", "impact inbox + webhook"], ["⚖", "Challenge opened · bond 0.0005 ETH", "resolver2"], ["✓", "2 of 3 resolvers recompute · upheld", "ChallengeManager"]];
    EVR.forEach(([i, a, b]) => ev.appendChild(h("div", "row", `<span class="ico">${i}</span><span>${a}</span><span class="meta">${b}</span><span class="dot"></span>`, "width:820px;font-size:26px")));
    s9.appendChild(ev);
    const lab9 = h("div", "label", '<span class="pill lime-pill">04 · A living credit</span><span class="pill dark-pill" style="margin-left:14px">the credit keeps watching the forest</span>', "left:60px;transform:none"); s9.appendChild(lab9);
    const cap10 = words("Not a certificate. A credit that keeps watching.", "display h3", "position:absolute;left:260px;top:760px;width:700px"); s9.appendChild(cap10);
    fadeIn(lab9, tD + 0.1, 0.5, { y: 20 });
    blurUp(tok, tD + 0.2);
    tl.set(tok.querySelector("#buf"), { scaleX: 1 }, 0);
    rowsIn([...ev.children], tD + 2.2, 2.4);
    tl.to(tok.querySelector("#buf"), { scaleX: 0.3, duration: 1.2, ease: "power2.inOut" }, tD + 5.0);
    count(tok.querySelector("#bufn"), 1000, 300, tD + 5.0, 1.2, (v) => Math.round(v).toLocaleString("en-US") + " t");
    tl.to(tok.querySelector("#buf"), { backgroundColor: "#e63946", duration: 0.4 }, tD + 5.4);
    tl.call(() => { const b = tok.querySelector("#tscore"); b.textContent = "3.9 · Impaired"; b.style.background = "#e63946"; b.style.color = "#fff"; }, null, tD + 7.6);
    tl.call(() => { const b = tok.querySelector("#tscore"); b.textContent = "71.9 · Active"; b.style.background = ""; b.style.color = ""; }, null, tD - 0.2);
    tl.to(tok, { x: -8, duration: 0.05, yoyo: true, repeat: 5 }, tD + 7.6);
    wordsIn(cap10, tD + 13.0);
  }

  // ================= ACT 4 — product (light, screenshots) =================
  {
    const t0 = A.act4.start;
    const cover = morph(t0 - 0.6, false, 0.8);
    const mk = (name, tStart, tEnd, label, build) => {
      const s = scene("light"); show(s, tStart, tEnd);
      const frame = h("div", "shot"); const camd = h("div", "cam"); camd.appendChild(img(shot(name), "", "")); frame.appendChild(camd); s.appendChild(frame);
      const lab = h("div", "label", `<span class="pill lime-pill" style="background:var(--forest);color:var(--lime)">${label}</span>`); s.appendChild(lab);
      blurUp(frame, tStart + 0.05, 0.8); fadeIn(lab, tStart + 0.5, 0.4, { y: 16 });
      if (build) build(s, frame, camd, tStart, tEnd);
      tl.to(frame, { opacity: 0, filter: "blur(14px)", scale: 0.97, duration: 0.4, ease: "power2.in" }, tEnd - 0.4);
      return s;
    };
    const url = h("div", "pill cream-pill mono", "vericanopy.vercel.app · Base Sepolia testnet", "position:absolute;right:40px;top:18px;font-size:19px;z-index:5;opacity:0;padding:8px 18px");
    stage.insertBefore(url, stage.querySelector(".grain"));
    tl.to(url, { opacity: 1, duration: 0.5 }, cover + 0.6); tl.to(url, { opacity: 0, duration: 0.4 }, A.act5.start - 0.6);

    mk("home", cover, t0 + 4.0, "Live on Base Sepolia", (s, f, c, ts) => { cam(c, { scale: 1.08, y: -40 }, ts + 1.6, 2.2, "power1.inOut"); });
    mk("explore", t0 + 3.8, t0 + 8.4, "Registry · every project on a map", (s, f, c, ts) => { cam(c, { scale: 1.25, x: -260, y: -220 }, ts + 1.2, 1.0); cam(c, { x: 60, y: -180 }, ts + 2.8, 0.9); });
    mk("project1", t0 + 8.2, t0 + 15.2, "Project · Sentinel-2 · twin chart · proof", (s, f, c, ts) => { cam(c, { scale: 1.45, x: -240, y: -120 }, ts + 1.0, 0.9); cam(c, { x: 330, y: 120 }, ts + 2.9, 0.9); cam(c, { scale: 1.0, x: 0, y: 0 }, ts + 4.9, 0.9); });
    mk("project1_proofs", t0 + 15.0, t0 + 18.2, "Proofs & signatures · verified on-chain", (s, f, c, ts) => { cam(c, { scale: 1.3, x: -150, y: -60 }, ts + 1.0, 1.0); });
    mk("register", t0 + 18.0, t0 + 22.4, "Register · overlap refused on-chain", (s, f, c, ts) => {
      cam(c, { scale: 1.35, x: 160, y: -140 }, ts + 0.9, 1.0);
      const toast = h("div", "pill red-pill mono", "OverlapDetected(cell 0x88a8…) · reverted", "position:absolute;left:50%;top:150px;transform:translateX(-50%);font-size:26px;opacity:0;z-index:3"); s.appendChild(toast);
      slam(toast, ts + 2.2);
    });
    mk("market", t0 + 22.2, t0 + 26.6, "Market · integrity on the price tag", (s, f, c, ts) => { cam(c, { scale: 1.4, x: 360, y: -60 }, ts + 1.0, 1.0); });
    mk("project1_credits", t0 + 26.4, t0 + 29.8, "Retire · signed certificate", (s, f, c, ts) => { cam(c, { scale: 1.25, x: 0, y: -140 }, ts + 0.9, 1.0); });
    // MCP line
    const s = scene("light"); show(s, t0 + 29.6, A.act5.start + 0.3);
    const term = h("div", "term", `<div class="bar"><i></i><i></i><i></i><span class="mono" style="margin-left:12px;font-size:16px;color:rgba(244,243,239,.5)">any MCP client · Claude Desktop / Claude Code / Cursor</span></div><div class="body" style="min-height:120px"><div class="ln" id="m1"></div><div class="ln" id="m2"></div></div>`, "position:absolute;left:370px;top:150px"); s.appendChild(term);
    const tools = h("div", "", "", "position:absolute;left:370px;top:470px;display:flex;flex-wrap:wrap;gap:12px;width:1180px");
    ["list_projects", "get_project", "get_submissions", "get_evidence", "explain_score", "list_listings", "prepare_buy_tx", "prepare_retire_tx", "get_challenge", "verify_manifest"].forEach((tname) => tools.appendChild(h("span", "pill cream-pill mono", tname, "font-size:22px;padding:10px 20px;opacity:0")));
    s.appendChild(tools);
    const lab = h("div", "label", '<span class="pill lime-pill" style="background:var(--forest);color:var(--lime)">MCP server · agents can verify too</span>'); s.appendChild(lab);
    blurUp(term, t0 + 29.7, 0.7); fadeIn(lab, t0 + 30.1, 0.4, { y: 16 });
    typeIn(term.querySelector("#m1"), "$ claude mcp add --transport http vericanopy https://vericanopy-api.onrender.com/mcp", t0 + 30.2, 1.7);
    tl.set(term.querySelector("#m2"), { opacity: 1 }, t0 + 32.2); term.querySelector("#m2").innerHTML = '<span style="color:#b6fe00">✓ connected</span> <span style="color:rgba(244,243,239,.6)">· 10 tools · 2 resources</span>';
    tl.fromTo(tools.children, { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: "back.out(2)" }, t0 + 32.6);
  }

  // ================= ACT 5 — receipts (dark) =================
  {
    const t0 = A.act5.start;
    const cover = morph(t0 - 0.6, true, 0.8);
    const s = scene("dark"); show(s, cover, t0 + 8.6);
    const head = words("Measured, not promised.", "display h2", "position:absolute;left:160px;top:120px"); s.appendChild(head);
    const list = h("div", "", "", "position:absolute;left:160px;top:280px;display:flex;flex-direction:column;gap:14px");
    const R = [["55", "contract tests · incl. a real proof verified by the deployed Halo2Verifier", "forge test"], ["31", "backend tests · indexer, verify, market, feeds, MCP", "pytest"], ["4,416 B", "proof size · 6.02 s proving · scale 9 · log-rows 16", "EZKL 23.0.5"], ["19,817 B", "Halo2Verifier deployed bytecode (limit 24,576)", "Base Sepolia"], ["417", "parameters · MAE 0.0125 vs expert rule · 0 monotonicity violations", "ONNX sha256 on-chain"], ["10", "satellite datasets via Earth Engine · live submissions since #4", "earthengine provider"]];
    R.forEach(([n, d, m]) => list.appendChild(h("div", "row", `<span class="display" style="font-size:40px;color:var(--lime);min-width:200px">${n}</span><span>${d}</span><span class="meta">${m}</span><span class="dot"></span>`, "width:1580px;font-size:25px")));
    s.appendChild(list);
    wordsIn(head, cover + 0.1); rowsIn([...list.children], cover + 0.8, 0.6);
    // address strip
    const s2 = scene("dark"); show(s2, t0 + 8.4, A.act6.start + 0.2);
    tl.fromTo(s2, { opacity: 0 }, { opacity: 1, duration: 0.4 }, t0 + 8.4);
    const h2 = words("Ten contracts. All public. All testnet.", "display h2 center", "top:26%;width:1600px"); s2.appendChild(h2);
    const strip = h("div", "", "", "position:absolute;left:0;top:520px;display:flex;gap:16px;white-space:nowrap");
    Object.entries(CONTRACTS).forEach(([n, a]) => strip.appendChild(h("span", "chip", `<small>${n}</small><span>${a}</span>`, "min-width:0;font-size:18px")));
    s2.appendChild(strip);
    const m = h("div", "center", '<span class="pill lime-pill">MIT · open source</span><span class="pill dark-pill" style="margin-left:14px">github.com/LSUDOKO/VeriCanopy</span>', "top:74%;white-space:nowrap;opacity:0"); s2.appendChild(m);
    const fadeL = h("div", "", "", "position:absolute;left:0;top:500px;width:220px;height:140px;background:linear-gradient(90deg,var(--forest),transparent);z-index:2"); s2.appendChild(fadeL);
    const fadeR = h("div", "", "", "position:absolute;right:0;top:500px;width:220px;height:140px;background:linear-gradient(270deg,var(--deep),transparent);z-index:2"); s2.appendChild(fadeR);
    wordsIn(h2, t0 + 8.6);
    tl.fromTo(strip, { x: 1920 }, { x: -2600, duration: 7.5, ease: "none" }, t0 + 8.6);
    fadeIn(m, t0 + 10.6);
  }

  // ================= ACT 6 — close (light) =================
  {
    const t0 = A.act6.start, end = A._end;
    const cover = morph(t0 - 0.6, false, 0.8);
    const s = scene("light"); show(s, cover, null);
    const l1 = words("Ratings you must trust.", "display h2 center", "top:36%;width:1500px"); s.appendChild(l1);
    const l2 = words("Proofs you can *check.*", "display h1 center", "top:50%;width:1500px"); s.appendChild(l2);
    wordsIn(l1, cover + 0.1); wordsIn(l2, cover + 1.3, 0.12);
    tl.to(l1.querySelectorAll(".w"), { opacity: 0.3, duration: 0.6 }, cover + 1.6);
    wordsOut(l1, t0 + 3.4); wordsOut(l2, t0 + 3.4);
    const mark = img("assets/brand/logo-mark.svg", "", "position:absolute;left:560px;top:380px;width:160px;height:160px;opacity:0"); s.appendChild(mark);
    const word = h("div", "display", "", "position:absolute;left:760px;top:375px;font-size:150px;color:var(--forest);line-height:1;white-space:nowrap"); s.appendChild(word);
    const tag = h("div", "sub center", "Carbon credits that prove themselves.", "top:60%;width:1500px;font-size:36px;opacity:0"); s.appendChild(tag);
    const pill = h("div", "pill cream-pill mono center", "", "top:71%;font-size:28px;padding:14px 30px;opacity:0;background:var(--forest);color:var(--lime);border:none"); s.appendChild(pill);
    const gh = h("div", "cap muted center", "github.com/LSUDOKO/VeriCanopy · Base Sepolia testnet · MIT", "top:81%;width:1200px;font-size:22px;opacity:0"); s.appendChild(gh);
    tl.fromTo(mark, { opacity: 0, scale: 0.3, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2.2)" }, t0 + 3.8);
    typeIn(word, "VeriCanopy", t0 + 4.2, 0.9, false);
    fadeIn(tag, t0 + 5.2);
    tl.set(pill, { opacity: 1 }, t0 + 5.6); typeIn(pill, "vericanopy.vercel.app", t0 + 5.6, 0.9, true);
    fadeIn(gh, t0 + 6.4);
    tl.to("#fade", { opacity: 1, duration: 1.2, ease: "power2.in" }, end - 1.3);
  }

  // ---------- public API ----------
  window.TOTAL = A._end;
  window.seek = (t) => { tl.time(Math.max(0, Math.min(t, tl.duration())), false); };
  window.tl = tl;
  tl.time(0);
})();
