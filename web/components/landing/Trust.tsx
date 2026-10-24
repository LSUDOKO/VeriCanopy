const LOGOS: [string, string, string][] = [
  ["/logos/esa.svg", "Copernicus Sentinel-1/2", "ESA"],
  ["/logos/nasa.svg", "NASA GEDI L4B · MODIS", "NASA"],
  ["/logos/earthengine.svg", "Google Earth Engine", "Google"],
  ["/logos/base.svg", "Base Sepolia", "Base"],
  ["/logos/ethereum.svg", "EVM · Solidity 0.8.26", "Ethereum"],
  ["/logos/vercel.svg", "Web on Vercel", "Vercel"],
  ["/logos/render.svg", "API on Render", "Render"],
  ["/logos/postgresql.svg", "Neon Postgres", "PostgreSQL"],
];
const PILLARS: [string, string][] = [
  ["Zero-knowledge inference", "EZKL compiles the scoring model to a Halo2 circuit. The on-chain verifier rejects any score the model did not produce from the committed features."],
  ["Post-quantum signatures", "Every manifest is signed with ML-DSA-65 (FIPS 204) and the public key is registered on-chain, so attestations stay checkable for decades."],
  ["Open and reproducible", "Contracts, model, circuit and oracle are open source. Resolvers recompute the manifest from public datasets before they vote."],
];

export function Trust() {
  return (
    <section className="section" style={{ background: "var(--fog)" }}>
      <div className="wrap">
        <div className="reveal max-w-2xl">
          <div className="eyebrow" style={{ color: "var(--teal)" }}>Trust model</div>
          <h2 className="display mt-3 text-4xl sm:text-5xl">Built on data you can check yourself.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PILLARS.map(([t, d]) => (
            <div key={t} className="reveal card p-7"><h3 className="display text-xl">{t}</h3><p className="mt-3 text-[15px]" style={{ color: "var(--fg-muted)" }}>{d}</p></div>
          ))}
        </div>
        <div className="reveal mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LOGOS.map(([src, label, name]) => (
            <div key={name} className="card flex items-center gap-3 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={name} className="h-6 w-auto max-w-[84px]" />
              <span className="text-[13px] font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs" style={{ color: "var(--fg-muted)" }}>Logos belong to their owners and mark data sources and infrastructure, not endorsement.</p>
      </div>
    </section>
  );
}
