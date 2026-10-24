import Link from "next/link";
import { Sticker } from "./Sticker";
import { PhotoCard } from "./PhotoCard";

/** "THE PROOF" product-style showcase: one giant disc, tags on the left, props around. */
export function Showcase() {
  const tags = ["zk proof", "ML-DSA-65", "twin forest", "buffer burn"];
  return (
    <section className="crumple arc-bottom relative overflow-hidden px-6 pb-[18vw] pt-16 sm:px-12" style={{ background: "var(--orange)", color: "var(--deep)" }}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center"><span className="pill" style={{ background: "var(--yellow)", color: "#5a3a12" }}>Meet the one who checks</span></div>
        <div className="relative mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-[220px_1fr_220px]">
          <div className="hidden lg:flex flex-col gap-3">
            {tags.map((t) => <span key={t} className="pill w-max" style={{ background: "var(--yellow)", color: "#5a3a12" }}>{t}</span>)}
            <p className="mt-6 max-w-[220px] text-base font-semibold text-[#5a3a12]">Scores every season. Compares with matched twin forest. Comes with a proof. No drama.</p>
          </div>
          <div className="relative text-center">
            <div className="display" style={{ fontSize: "clamp(5rem, 18vw, 20rem)", color: "var(--yellow)" }}>The</div>
            <div className="relative z-10 -my-[4vw] flex justify-center">
              <Sticker tone="yellow" title="Integrity score" sub="0–100 · twin-forest matched · proven on-chain" size={300} foot="SCORED FROM SATELLITE PIXELS · PROVEN WITH EZKL · " />
            </div>
            <div className="display -mt-2" style={{ fontSize: "clamp(5rem, 18vw, 20rem)", color: "var(--yellow)" }}>Proof</div>
            <Link href="/projects/1" className="absolute right-[12%] top-[38%] hidden md:grid h-28 w-28 place-items-center rounded-full border-4 border-dotted border-forest bg-cream display text-2xl text-forest hover:rotate-6 transition" aria-label="Explore project A">Explore ↗</Link>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-4">
            <span className="hand text-2xl -rotate-6">roll it!</span>
            <Sticker tone="sky" title="ZK proof" sub="4,416 B · verified on Base" size={120} />
            <Sticker tone="lime" title="ML-DSA" sub="FIPS 204 signed" size={120} />
            <Sticker tone="red" title="Frozen" sub="C · 1.2 MtCO2e lost" size={120} />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PhotoCard src="/sat/A_before.png" alt="Project A 2019" caption="A · 2019" className="aspect-square -rotate-2" />
          <PhotoCard src="/sat/A_after.png" alt="Project A 2023" caption="A · 2023" className="aspect-square rotate-1" />
          <PhotoCard src="/sat/C_before.png" alt="Project C 2019" caption="C · 2019" className="aspect-square rotate-2" />
          <PhotoCard src="/sat/C_fire2021.png" alt="Project C 2021 fire year" caption="C · 2021 fire" className="aspect-square -rotate-1" />
        </div>
      </div>
    </section>
  );
}
