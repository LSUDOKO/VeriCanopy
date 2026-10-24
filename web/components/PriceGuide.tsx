"use client";

import { useQuery } from "@tanstack/react-query";
import { getPriceGuide, type PriceBand } from "@/lib/feeds";

const eth = (v: number | null) => (v === null ? "—" : v >= 0.01 ? v.toFixed(3) : v.toFixed(5));
const TONE: Record<PriceBand["band"], string> = { A: "var(--teal)", B: "var(--sky)", C: "var(--amber)", D: "var(--red)" };

/** Integrity-indexed reference prices (ETH / tCO2e) for the market page. */
export function PriceGuide() {
  const q = useQuery({ queryKey: ["price-guide"], queryFn: getPriceGuide, refetchInterval: 30_000 });
  const g = q.data;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-xl">Price guide</h2>
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>{g?.unit ?? "ETH per tCO2e"}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(g?.bands ?? (["A", "B", "C", "D"] as const).map((b) => ({ band: b }) as PriceBand)).map((b) => (
          <div key={b.band} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="display text-2xl" style={{ color: TONE[b.band] }}>{b.band}</span>
              <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                {b.score_min === undefined ? "" : b.score_max === null ? `≥ ${b.score_min}` : `${b.score_min}–${b.score_max}`}
              </span>
            </div>
            <div className="mt-2 mono text-lg">
              {b.reference_low_eth === undefined ? "…" : b.reference_low_eth === null ? "no data" : `${eth(b.reference_low_eth)} – ${eth(b.reference_high_eth)}`}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
              {b.basis ? `${b.trades} trade${b.trades === 1 ? "" : "s"} · ${b.listings} open listing${b.listings === 1 ? "" : "s"} · median ${eth(b.trade_median_eth ?? b.listing_median_eth)}` : "No listings or trades in this band yet"}
            </div>
          </div>
        ))}
      </div>
      {g && <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--fg-muted)" }}>{g.methodology}</p>}
    </section>
  );
}
