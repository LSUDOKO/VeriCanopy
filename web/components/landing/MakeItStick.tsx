import Link from "next/link";
import { PhotoCard } from "./PhotoCard";

export function MakeItStick() {
  return (
    <section className="crumple arc-top relative px-6 pb-20 pt-[16vw] sm:px-12" style={{ background: "var(--lime)", color: "var(--forest)" }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <PhotoCard src="/sat/amazon_wide.jpg" alt="Sentinel-2 mosaic over the Amazon near Project A" tape={false} className="aspect-square rounded-[48px] rotate-[-2deg]" caption="Sentinel-2 · 50 km around the Tapajós block · 2023–24" />
        <div className="relative rounded-[48px] p-10 text-center" style={{ background: "var(--forest)", color: "var(--lime)" }}>
          <div className="display" style={{ fontSize: "clamp(3.5rem, 9vw, 8rem)" }}>Let&apos;s make it stick.</div>
          <p className="mt-6 text-base font-semibold" style={{ color: "var(--cream)" }}>Register a polygon, get it scored, watch it every season.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-lime text-base">Register a project</Link>
            <Link href="/verify" className="btn btn-ghost text-base" style={{ borderColor: "var(--lime)", color: "var(--lime)" }}>Verify an attestation</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
