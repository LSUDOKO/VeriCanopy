const LOGOS: [string, string, string][] = [
  ["/logos/esa.svg", "Copernicus Sentinel-1/2", "ESA"],
  ["/logos/nasa.svg", "NASA GEDI L4B · MODIS", "NASA"],
  ["/logos/earthengine.svg", "Google Earth Engine", "Google"],
  ["/logos/base.svg", "Base Sepolia", "Base"],
  ["/logos/ethereum.svg", "EVM · Solidity", "Ethereum"],
  ["/logos/vercel.svg", "Web on Vercel", "Vercel"],
  ["/logos/render.svg", "API on Render", "Render"],
  ["/logos/postgresql.svg", "Neon Postgres", "PostgreSQL"],
];

/** Data + infrastructure providers, official marks, used for attribution only. */
export function Trust() {
  return (
    <section className="crumple px-6 pb-14 pt-28 sm:px-12" style={{ background: "var(--cream)", color: "var(--forest)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="display text-center text-3xl sm:text-5xl">Built on data you can check yourself</div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {LOGOS.map(([src, label, name]) => (
            <div key={name} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#fff", border: "1.5px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={name} className="h-7 w-auto max-w-[96px]" />
              <span className="text-sm font-semibold leading-tight">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: "var(--fg-muted)" }}>Logos belong to their owners and mark data sources and infrastructure, not endorsement.</p>
      </div>
    </section>
  );
}
