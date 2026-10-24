"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "@/lib/api";

const compact = (n?: number | null) => (n === null || n === undefined ? "—" : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n));

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats"), refetchInterval: 30_000 });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-in", { y: 28, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.1, delay: 0.15 });
      gsap.to(".hero-video", { yPercent: 12, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);
  const s = stats.data;
  return (
    <section ref={root} className="relative -mt-14 flex min-h-[100svh] flex-col justify-end overflow-hidden" style={{ background: "var(--deep)", color: "#fff" }}>
      <video className="hero-video absolute inset-0 h-[112%] w-full object-cover opacity-80" src="/video/hero.mp4" poster="/video/poster.jpg" autoPlay muted loop playsInline aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(1,26,16,.55) 0%, rgba(1,26,16,.15) 40%, rgba(1,26,16,.85) 100%)" }} aria-hidden />
      <div className="wrap relative z-10 pb-16 pt-32 sm:pb-24">
        <div className="hero-in eyebrow mb-5 flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--lime)" }} aria-hidden />
          Live on Base Sepolia · real satellite data · open source
        </div>
        <h1 className="hero-in display max-w-4xl text-[2.75rem] leading-[1] sm:text-7xl lg:text-[6rem]">
          Carbon credits that <span style={{ color: "var(--lime)" }}>prove themselves.</span>
        </h1>
        <p className="hero-in lede mt-6 max-w-2xl" style={{ color: "rgba(255,255,255,.78)" }}>
          Satellite AI scores every forest. A zero-knowledge proof puts the score on-chain. The credit keeps watching.
        </p>
        <div className="hero-in mt-8 flex flex-wrap gap-3">
          <Link href="/explore" className="btn btn-lime btn-lg">Explore the registry</Link>
          <Link href="/how-it-works" className="btn btn-lg" style={{ background: "rgba(255,255,255,.12)", color: "#fff", backdropFilter: "blur(10px)" }}>How it works</Link>
        </div>
        <dl className="hero-in mt-14 grid max-w-3xl grid-cols-2 gap-y-6 border-t border-white/15 pt-6 sm:grid-cols-4" aria-label="Live network figures">
          {[
            ["Projects monitored", s ? String(s.projects) : "…"],
            ["Credits issued", s ? `${compact(s.credits_issued)} t` : "…"],
            ["Forest loss detected", s ? `${compact(s.tonnes_reversed)} t` : "…"],
            ["Buffer burned to cover it", s ? `${compact(s.tonnes_covered_by_buffers)} t` : "…"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-medium" style={{ color: "rgba(255,255,255,.6)" }}>{k}</dt>
              <dd className="display mt-1 text-2xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
