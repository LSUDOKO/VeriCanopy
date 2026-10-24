"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PhotoCard } from "./PhotoCard";
import { Sticker } from "./Sticker";

gsap.registerPlugin(ScrollTrigger);

const ROWS = [
  { word: "Prove", img: "/sat/A_after.png", alt: "Sentinel-2 over the Tapajós block", note: "every score starts with a proof.", sticker: { tone: "sky" as const, title: "EZKL", sub: "Halo2 · on-chain" } },
  { word: "Watch", img: "/sat/amazon_loss.jpg", alt: "Hansen forest loss over the Amazon", note: "the credit keeps watching the forest.", sticker: { tone: "yellow" as const, title: "Twin forest", sub: "matched controls" } },
  { word: "Burn", img: "/sat/chiapas_fire_wide.jpg", alt: "2021 fire scar from Sentinel-2", note: "when it burns, the buffer burns first.", sticker: { tone: "red" as const, title: "Reversal", sub: "buffer → burn → freeze" } },
];

/** Pinned horizontal strip of giant words with photo cards nested in the letters (sweet-tape "giant-pinning"). */
export function Giant() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const t = track.current!;
      const dist = () => t.scrollWidth - window.innerWidth;
      gsap.to(t, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: root.current, pin: true, scrub: 1, start: "top top", end: () => "+=" + dist(), invalidateOnRefresh: true } });
    }, root);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={root} className="crumple relative overflow-hidden" style={{ background: "var(--lime)", color: "var(--forest)" }}>
      <div className="px-6 pt-16 text-center">
        <span className="chip" style={{ ["--tag-bg" as string]: "var(--forest)", ["--tag-ink" as string]: "var(--lime)" }}>Why we exist</span>
        <h2 className="display mx-auto mt-4 max-w-4xl" style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)" }}>We&apos;re here for the seasons after the sale.</h2>
      </div>
      <div ref={track} className="flex h-[70vh] items-center gap-[6vw] px-[6vw] md:h-[80vh]">
        {ROWS.map((r, i) => (
          <div key={r.word} className="flex shrink-0 items-center gap-[2vw]">
            <span className="display" style={{ fontSize: "clamp(6rem, 30vh, 24rem)" }}>To</span>
            <PhotoCard src={r.img} alt={r.alt} className="aspect-square w-[28vh] rotate-[-3deg] md:w-[36vh]" />
            <span className="display" style={{ fontSize: "clamp(6rem, 30vh, 24rem)" }}>{r.word}</span>
            <div className="ml-[2vw] flex flex-col items-start gap-4">
              <Sticker tone={r.sticker.tone} title={r.sticker.title} sub={r.sticker.sub} size={150} style={{ transform: `rotate(${i % 2 ? 8 : -8}deg)` }} />
              <span className="hand max-w-[16rem] text-2xl">{r.note}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
