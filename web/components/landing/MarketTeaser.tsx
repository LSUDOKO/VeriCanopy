"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { api } from "@/lib/api";
import type { MarketListing } from "@/lib/market";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { bpsToScore, integrityStatus } from "@/lib/format";

export function MarketTeaser() {
  const q = useQuery({ queryKey: ["market"], queryFn: () => api<{ listings: MarketListing[] }>("/market/listings"), refetchInterval: 30_000 });
  const rows = (q.data?.listings ?? []).slice(0, 3);
  return (
    <section className="section" style={{ background: "var(--white)" }}>
      <div className="wrap">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="eyebrow" style={{ color: "var(--teal)" }}>Marketplace</div>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Every price sits next to a live score.</h2>
            <p className="lede mt-4">Escrowed fixed-price listings on Base Sepolia. Frozen projects cannot trade. Proceeds are pulled, never pushed.</p>
          </div>
          <Link href="/market" className="explore" aria-label="Open the market">Market<span className="arrow">↗</span></Link>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {(rows.length ? rows : [null, null, null]).map((l, i) => (
            <li key={l?.id ?? i} className="reveal card p-6">
              {l ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-semibold">{l.project_name ?? `Project #${l.project_id}`}</div><div className="text-xs" style={{ color: "var(--fg-muted)" }}>{l.country} · vintage {l.vintage}</div></div>
                    <IntegrityBadge scoreBps={l.score_bps} status={integrityStatus(l.score_bps, l.project_status ?? "Active", 5000, l.integrity_status)} size="sm" />
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div><div className="label">Price / tonne</div><div className="display mono text-2xl">{formatEther(BigInt(l.price_per_unit_wei))} ETH</div></div>
                    <div className="text-right"><div className="label">Available</div><div className="mono text-lg">{l.amount_left.toLocaleString()} t</div></div>
                  </div>
                  <div className="mt-4 text-xs" style={{ color: "var(--fg-muted)" }}>Integrity {bpsToScore(l.score_bps)} · re-scored every monitoring period</div>
                </>
              ) : (
                <div className="h-36 animate-pulse rounded-2xl" style={{ background: "var(--fog)" }} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
