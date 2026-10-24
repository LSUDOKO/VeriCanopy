import Link from "next/link";

export function CTA() {
  return (
    <section className="section" style={{ background: "var(--white)" }}>
      <div className="wrap">
        <div className="reveal card-dark relative overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-24">
          <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(60% 80% at 50% 120%, rgba(122,209,1,.5), transparent)" }} aria-hidden />
          <div className="relative">
            <h2 className="display mx-auto max-w-3xl text-4xl sm:text-6xl">Register a polygon. Get it scored. Watch it every season.</h2>
            <p className="lede mx-auto mt-5 max-w-xl" style={{ color: "rgba(255,255,255,.7)" }}>Testnet today on Base Sepolia. No approval queue, no demo mode: the same pipeline that scored the pilot areas scores yours.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn btn-lime btn-lg">Register a project</Link>
              <Link href="/verify" className="btn btn-lg" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>Verify an attestation</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
