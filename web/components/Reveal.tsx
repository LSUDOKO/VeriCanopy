"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Fades `.reveal` elements up as they enter; mount once per page. Reduced motion shows everything at once. */
export function Reveal() {
  useEffect(() => {
    const els = gsap.utils.toArray<HTMLElement>(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(els, { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      ScrollTrigger.batch(els, {
        start: "top 88%",
        once: true,
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
      });
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => { clearTimeout(t); ctx.revert(); };
  }, []);
  return null;
}
