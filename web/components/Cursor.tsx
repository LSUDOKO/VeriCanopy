"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

/** Custom pointer (sweet-tape style): a tilted arrow that follows with a quick setter, grows on interactive
 *  targets and squashes on press. Fine pointers only; hidden for touch, keyboard users and reduced motion. */
export function Cursor() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const el = document.createElement("div");
    el.className = "cursor-arrow";
    el.setAttribute("aria-hidden", "true");
    document.body.append(el);
    document.documentElement.classList.add("has-cursor");
    gsap.set(el, { autoAlpha: 0, rotation: 7, scale: 1, transformOrigin: "11px 8px" });
    const setX = gsap.quickSetter(el, "x", "px");
    const setY = gsap.quickSetter(el, "y", "px");
    let tx = 0, ty = 0, cx = 0, cy = 0, shown = false, hover: Element | null = null, down = false;
    const tick = () => { cx += (tx - cx) * 0.35; cy += (ty - cy) * 0.35; setX(cx); setY(cy); };
    gsap.ticker.add(tick);
    const state = () => gsap.to(el, { scale: down ? 0.82 : hover ? 1.35 : 1, rotation: hover ? -8 : 7, duration: 0.35, ease: "power3.out", overwrite: "auto" });
    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cx = tx; cy = ty; gsap.to(el, { autoAlpha: 1, duration: 0.3 }); }
      const t = (e.target as Element | null)?.closest?.('a, button, [role="button"], input, select, textarea, label, summary, [data-cursor]') ?? null;
      if (t !== hover) { hover = t; state(); }
    };
    const leave = () => { shown = false; gsap.to(el, { autoAlpha: 0, duration: 0.25 }); };
    const pdown = () => { down = true; state(); };
    const pup = () => { down = false; state(); };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", pdown, { passive: true });
    document.addEventListener("pointerup", pup, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", pdown);
      document.removeEventListener("pointerup", pup);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      document.documentElement.classList.remove("has-cursor");
      el.remove();
    };
  }, []);
  return null;
}
