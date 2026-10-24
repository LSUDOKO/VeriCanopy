import { LogoMark } from "@/components/Logo";

/** Wavy lime ribbon with a marquee, like a strip of tape across the page. */
export function Band({ text, tone = "lime", tilt = -3 }: { text: string; tone?: "lime" | "orange"; tilt?: number }) {
  const items = Array.from({ length: 6 }, (_, i) => (
    <span key={i} className="display inline-flex items-center gap-8" style={{ fontSize: "clamp(2.4rem, 6vw, 5.5rem)" }}>
      {text}
      <span className="inline-grid place-items-center rounded-full" style={{ width: "1.1em", height: "1.1em", background: tone === "lime" ? "var(--forest)" : "var(--cream)" }}>
        <LogoMark size={40} />
      </span>
    </span>
  ));
  return (
    <div className="relative -my-10 z-20" style={{ transform: `rotate(${tilt}deg) scale(1.06)` }} aria-hidden>
      <div className="band py-3" style={{ background: tone === "lime" ? "var(--lime)" : "var(--orange)", color: tone === "lime" ? "var(--forest)" : "var(--deep)", boxShadow: "0 12px 30px rgba(0,0,0,.25)" }}>
        <div className="band-track">{items}{items}</div>
      </div>
    </div>
  );
}
