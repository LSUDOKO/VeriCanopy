"use client";

import { useRef, useState } from "react";

/** Before/after image slider. Pointer drag or arrow keys; no library. */
export function Compare({ before, after, beforeLabel, afterLabel, alt, className = "" }: { before: string; after: string; beforeLabel: string; afterLabel: string; alt: string; className?: string }) {
  const [x, setX] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setX(Math.min(98, Math.max(2, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className={`compare ${className}`}
      style={{ ["--x" as string]: `${x}%` }}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons > 0 && move(e.clientX)}
      role="slider"
      aria-label="Compare before and after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(2, v - 4)); if (e.key === "ArrowRight") setX((v) => Math.min(98, v + 4)); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={`${alt}, ${beforeLabel}`} />
      <div className="after">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after} alt={`${alt}, ${afterLabel}`} />
      </div>
      <div className="handle" aria-hidden />
      <div className="knob" aria-hidden><svg width="18" height="12" viewBox="0 0 18 12"><path d="M5 1L1 6l4 5M13 1l4 5-4 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
      <span className="tag" style={{ left: 12 }}>{beforeLabel}</span>
      <span className="tag" style={{ right: 12 }}>{afterLabel}</span>
    </div>
  );
}
