"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    n: "01", title: "Satellite evidence", tag: "Earth Engine",
    body: "Every monitoring period the oracle pulls Sentinel-2 and Sentinel-1 composites, Hansen tree-cover loss, GEDI L4B biomass, MODIS burned area and Dynamic World for the project and for a matched twin forest nearby.",
    facts: [["1,000 / 6,000", "treatment / control samples"], ["16", "features per period"], ["6", "public datasets"]],
    media: <div className="grid grid-cols-2 gap-2">{[["/sat/A_before.png", "Tapajós · 2019"], ["/sat/A_after.png", "Tapajós · 2024"], ["/sat/C_before.png", "Manavgat · 2019"], ["/sat/C_fire2021.png", "Manavgat · 2021 fire"]].map(([s, c]) => (
      <figure key={s} className="photo-card aspect-square">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s} alt={c} loading="lazy" /><figcaption className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[11px] font-medium text-white" style={{ background: "linear-gradient(transparent, rgba(0,0,0,.6))" }}>{c}</figcaption></figure>
    ))}</div>,
  },
  {
    n: "02", title: "Integrity score", tag: "417-parameter model",
    body: "A small, audited neural network turns the feature vector into a 0–100 integrity score: how much of the claimed carbon the pixels actually support, net of what the twin forest did anyway.",
    facts: [["0.0125", "MAE vs expert rule"], ["0", "monotonicity violations"], ["200k", "training samples"]],
    media: <ScoreCard />,
  },
  {
    n: "03", title: "zkML proof on-chain", tag: "EZKL · Halo2 · KZG",
    body: "The inference runs inside a zero-knowledge circuit. The Halo2 verifier on Base Sepolia checks the proof before the score is stored, so the oracle cannot invent a number. The manifest is signed with ML-DSA-65.",
    facts: [["4,416 B", "proof size"], ["~6 s", "proving time"], ["19,817 B", "verifier bytecode"]],
    media: <ProofCard />,
  },
  {
    n: "04", title: "A living credit", tag: "ERC-1155 · buffer pool",
    body: "Credits carry the live score. When loss is detected, buffer credits burn first; a shortfall freezes the project, blocks transfers and notifies every holder. Anyone can challenge a score with a bond.",
    facts: [["2-of-3", "resolver votes"], ["0", "transfers while frozen"], ["1%", "marketplace fee"]],
    media: <LifeCard />,
  },
];

function ScoreCard() {
  const bars = [["Tree-cover retention", 82], ["Biomass vs twin", 71], ["Burned-area fraction", 97], ["Radar backscatter trend", 64], ["Dynamic World forest prob.", 88]];
  return (
    <div className="card-dark p-6">
      <div className="flex items-end justify-between"><span className="text-sm opacity-70">Tapajós · 2023</span><span className="display mono text-5xl">71.9</span></div>
      <div className="mt-5 space-y-3">{bars.map(([k, v]) => (
        <div key={k as string}><div className="flex justify-between text-xs opacity-80"><span>{k}</span><span className="mono">{v}</span></div><div className="mt-1 h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full" style={{ width: `${v}%`, background: "var(--lime)" }} /></div></div>
      ))}</div>
      <p className="mt-5 text-xs opacity-60">Illustrative weights. Features and commitment hash are on every manifest.</p>
    </div>
  );
}
function ProofCard() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between"><span className="text-sm" style={{ color: "var(--fg-muted)" }}>IntegrityOracle.submitScore</span><span className="pill" style={{ background: "var(--lime-soft)", color: "var(--forest)" }}>✓ verified on-chain</span></div>
      <pre className="mono mt-4 overflow-x-auto rounded-2xl p-4 text-[12px] leading-relaxed" style={{ background: "var(--fog)" }}>{`proof        0x1f8a…c2e4  (4,416 bytes)
instances    [feature_commitment, model_hash, score]
verifier     Halo2Verifier @ Base Sepolia
signature    ML-DSA-65 · 3,309 bytes · FIPS 204
manifest     bafkreier6kq3n…zu4lbq`}</pre>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
        {[["Halo2 + KZG", "proof system"], ["sha256", "manifest commit"], ["ML-DSA-65", "post-quantum"]].map(([a, b]) => <div key={a} className="rounded-2xl p-3" style={{ background: "var(--fog)" }}><div className="font-semibold">{a}</div><div style={{ color: "var(--fg-muted)" }}>{b}</div></div>)}
      </div>
    </div>
  );
}
function LifeCard() {
  const rows = [["2022", "Active", "71.9", "var(--teal)"], ["2023", "Impaired · 8,080 t reversed", "71.9", "var(--amber)"], ["2024", "Buffer burned · 6,000 t", "3.9", "var(--amber)"], ["2025", "Challenged · rejected 2-of-3", "3.9", "var(--red)"]];
  return (
    <div className="card p-6">
      <div className="text-sm" style={{ color: "var(--fg-muted)" }}>Project #1 · timeline</div>
      <ol className="mt-4 space-y-3">{rows.map(([y, e, s, c]) => (
        <li key={y} className="flex items-center gap-3 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /><span className="mono w-12" style={{ color: "var(--fg-muted)" }}>{y}</span><span className="flex-1">{e}</span><span className="mono font-semibold">{s}</span></li>
      ))}</ol>
      <div className="mt-5 flex gap-2 text-xs"><span className="pill">Holder notified</span><span className="pill">Transfers blocked when frozen</span></div>
    </div>
  );
}

/** Pinned horizontal walk through the four stages; stacks vertically on small screens and for reduced motion. */
export function Proves() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const t = track.current!;
      const dist = () => t.scrollWidth - t.clientWidth;
      gsap.to(t, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: root.current, pin: true, scrub: 0.6, start: "top top", end: () => "+=" + dist() * 1.1, invalidateOnRefresh: true } });
    });
    return () => mm.revert();
  }, []);
  return (
    <section ref={root} className="overflow-hidden" style={{ background: "var(--white)" }}>
      <div className="wrap pt-20 lg:pt-16">
        <div className="reveal max-w-2xl">
          <div className="eyebrow" style={{ color: "var(--teal)" }}>How VeriCanopy proves it</div>
          <h2 className="display mt-3 text-4xl sm:text-5xl">From pixels to a proof, in four steps.</h2>
        </div>
      </div>
      <div ref={track} className="mt-10 flex flex-col gap-14 px-5 pb-20 sm:px-8 motion-safe:lg:h-[calc(100vh-10rem)] motion-safe:lg:flex-row motion-safe:lg:items-center motion-safe:lg:gap-8 motion-safe:lg:pb-0 motion-safe:lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] motion-reduce:lg:mx-auto motion-reduce:lg:max-w-7xl">
        {STEPS.map((s) => (
          <article key={s.n} className="grid min-w-0 gap-8 lg:grid-cols-2 lg:items-center motion-safe:lg:w-[min(78vw,1040px)] motion-safe:lg:shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3"><span className="mono text-sm" style={{ color: "var(--fg-muted)" }}>{s.n}</span><span className="chip">{s.tag}</span></div>
              <h3 className="display mt-4 text-3xl sm:text-4xl">{s.title}</h3>
              <p className="mt-4 text-[17px]" style={{ color: "var(--fg-muted)" }}>{s.body}</p>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-5 hairline">{s.facts.map(([v, k]) => <div key={k} className="min-w-0"><dt className="display mono text-lg break-words">{v}</dt><dd className="mt-0.5 text-xs" style={{ color: "var(--fg-muted)" }}>{k}</dd></div>)}</dl>
            </div>
            <div className="min-w-0">{s.media}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
