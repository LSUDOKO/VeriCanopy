"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Logo } from "@/components/Logo";
import { Sticker } from "./Sticker";
import { PhotoCard } from "./PhotoCard";

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-word", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.12, delay: 0.1 });
      gsap.from(".prop", { scale: 0.6, opacity: 0, rotate: "+=20", duration: 0.9, ease: "back.out(1.6)", stagger: 0.08, delay: 0.7 });
      const onMove = (e: MouseEvent) => {
        const dx = (e.clientX / window.innerWidth - 0.5) * 2;
        const dy = (e.clientY / window.innerHeight - 0.5) * 2;
        gsap.to(".prop", { x: (i) => dx * (10 + i * 8), y: (i) => dy * (8 + i * 6), duration: 1.2, ease: "power2.out", overwrite: "auto" });
      };
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden" style={{ background: "var(--forest)" }}>
      <div className="crumple arc-bottom relative z-10 overflow-hidden pb-[14vw] pt-10 text-center" style={{ background: "var(--lime)", color: "var(--forest)" }}>
        <div className="absolute left-5 top-4 hidden sm:block text-left display text-sm leading-tight">⋮ Proving forests<br />since the first pixel</div>
        <div className="mx-auto flex items-center justify-center gap-4 display text-xl sm:text-2xl">
          <span>We&apos;re</span>
          <Logo size={150} />
          <span>here to</span>
        </div>
        <h1 className="display mt-2 overflow-hidden" style={{ fontSize: "clamp(5.5rem, 22vw, 26rem)" }}>
          <span className="block overflow-hidden"><span className="hero-word inline-block" style={{ transform: "rotate(-2deg)" }}>Prove</span></span>
          <span className="block overflow-hidden"><span className="hero-word inline-block" style={{ transform: "rotate(1.5deg)" }}>it stuck</span></span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl px-6 text-lg font-semibold">
          Every forest credit scored from real satellite pixels, proven with zero-knowledge math on-chain, and re-checked every season. When the forest goes, the credit knows.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/explore" className="btn btn-primary text-base">Open the registry</Link>
          <Link href="/demo" className="btn btn-ghost text-base">Watch the 2021 fire</Link>
        </div>
      </div>

      <div className="relative z-20 -mt-[9vw] flex justify-center">
        <Sticker tone="yellow" title="Integrity 71.9" sub="Demo Project A · 2023 · proof verified on Base" size={230} className="prop !relative" style={{ transform: "rotate(-8deg)" }} />
      </div>

      <div className="crumple crumple-dark relative min-h-[60vh] px-6 pb-24 pt-10 sm:px-12" style={{ background: "var(--forest)" }}>
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="relative">
            <div className="prop !relative rotate-[-5deg] rounded-md p-6 text-left" style={{ background: "var(--yellow)", color: "#5a3a12", maxWidth: 360 }}>
              <span className="tape" style={{ top: -14, left: 60, ["--r" as string]: "4deg" }} aria-hidden />
              <div className="display text-3xl">Monitoring list</div>
              <ul className="hand mt-3 space-y-1 text-xl">
                <li>○ compare with twin forest</li>
                <li>○ prove the score (EZKL)</li>
                <li>○ sign it for 30 years (ML-DSA)</li>
                <li>○ burn buffer if it burns</li>
              </ul>
            </div>
            <PhotoCard src="/sat/A_after.png" alt="Sentinel-2 true colour over Demo Project A, 2023" caption="Sentinel-2 · Pará, Brazil · 2023" className="prop !relative mt-10 aspect-[4/3] w-72 rotate-3" />
          </div>
          <div className="kraft-paper rotate-[1.5deg] rounded-sm p-8 sm:p-12">
            <span className="tape" style={{ top: -12, right: 80, ["--r" as string]: "-6deg" }} aria-hidden />
            <h2 className="display relative text-4xl leading-[0.9] sm:text-6xl" style={{ color: "#7a4a12" }}>
              Over-credited baselines, phantom forests, credits sold twice, fires nobody reported. We always check by you.
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
