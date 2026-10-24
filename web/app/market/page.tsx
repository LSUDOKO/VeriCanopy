"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { api } from "@/lib/api";
import { useContract } from "@/lib/contracts";
import { decodeRevert } from "@/lib/errors";
import { bpsToScore, integrityStatus } from "@/lib/format";
import type { MarketListing, MarketStats } from "@/lib/market";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { PageHero } from "@/components/PageHero";
import { BuyModal, WithdrawProceeds } from "@/components/MarketModals";
import { StatSticker } from "@/components/StatSticker";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { HashChip } from "@/components/HashChip";
import { PriceGuide } from "@/components/PriceGuide";
import { useToast } from "@/components/Toast";

const compact = (n: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function MarketPage() {
  const q = useQuery({ queryKey: ["market"], queryFn: () => api<{ listings: MarketListing[] }>("/market/listings"), refetchInterval: 10_000 });
  const stats = useQuery({ queryKey: ["market-stats"], queryFn: () => api<MarketStats>("/market/stats"), refetchInterval: 15_000 });
  const trades = useQuery({ queryKey: ["market-trades"], queryFn: () => api<{ trades: { id: number; buyer: string; token_id: string; amount: number; paid_wei: string; tx_hash: string | null; ts: number | null }[] }>("/market/trades?limit=12"), refetchInterval: 15_000 });
  const [buy, setBuy] = useState<MarketListing | null>(null);
  const [sort, setSort] = useState<"price" | "score" | "vintage">("price");
  const [minScore, setMinScore] = useState(0);
  const { address } = useAccount();
  const market = useContract("Marketplace");
  const cancel = useWriteContract();
  const toast = useToast();
  const rows = useMemo(() => {
    const r = (q.data?.listings ?? []).filter((l) => (l.score_bps ?? 0) >= minScore * 100);
    return r.sort((a, b) => (sort === "price" ? Number(BigInt(a.price_per_unit_wei) - BigInt(b.price_per_unit_wei)) : sort === "score" ? (b.score_bps ?? 0) - (a.score_bps ?? 0) : b.vintage - a.vintage));
  }, [q.data, sort, minScore]);

  return (
    <div className="flex flex-1 flex-col">
      <PageHero eyebrow="Marketplace" title="Market" lede="Buy and sell living forest credits on Base Sepolia. Every tonne carries the project's live integrity score, and frozen projects cannot trade.">
        <div className="flex flex-wrap gap-2">
          <StatSticker label="Tonnes for sale" value={stats.data ? compact(stats.data.open_units) : "…"} tone="lime" />
          <StatSticker label="Tonnes traded" value={stats.data ? compact(stats.data.units_traded) : "…"} tone="yellow" />
          <StatSticker label="Volume (ETH)" value={stats.data ? Number(formatEther(BigInt(stats.data.volume_wei))).toFixed(3) : "…"} tone="sky" />
        </div>
      </PageHero>
      <div className="wrap py-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">Sort
            <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="price">Lowest price</option>
              <option value="score">Highest integrity</option>
              <option value="vintage">Newest vintage</option>
            </select>
          </label>
          <label className="flex items-center gap-2">Min integrity <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} /><span className="mono w-6">{minScore}</span></label>
          <span className="ml-auto text-xs" style={{ color: "var(--fg-muted)" }}>Testnet only. Prices are in Base Sepolia ETH and carry no real value.</span>
        </div>
        <div className="mt-4"><WithdrawProceeds /></div>
        {q.isLoading && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>}
        {q.error && <div className="mt-4"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>}
        {q.data && rows.length === 0 && <div className="mt-4"><EmptyState title="Nothing listed right now" hint="Holders list credits from their Portfolio. Check back after the next monitoring period." /></div>}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((l) => {
            const status = integrityStatus(l.score_bps, l.project_status ?? "Active", 5000, l.integrity_status);
            const mine = address && l.seller === address.toLowerCase();
            return (
              <li key={l.id} className="card relative overflow-hidden p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <a href={`/projects/${l.project_id}`} className="font-semibold text-lg leading-tight hover:underline">{l.project_name ?? `Project #${l.project_id}`}</a>
                    <div className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>{l.country} · vintage {l.vintage} · listing #{l.id}</div>
                  </div>
                  <IntegrityBadge scoreBps={l.score_bps} status={status} size="sm" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="label">Price / tonne</span><div className="mono text-lg">{formatEther(BigInt(l.price_per_unit_wei))} ETH</div></div>
                  <div><span className="label">Available</span><div className="mono text-lg">{l.amount_left.toLocaleString()} t</div></div>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}><div className="h-full" style={{ width: `${Math.round((100 * (l.amount_listed - l.amount_left)) / Math.max(l.amount_listed, 1))}%`, background: "var(--lime)" }} /></div>
                <div className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>{(l.amount_listed - l.amount_left).toLocaleString()} of {l.amount_listed.toLocaleString()} sold · seller <HashChip value={l.seller} kind="address" /></div>
                <div className="mt-3 flex gap-2">
                  {mine ? (
                    <button className="btn btn-ghost" disabled={!market || cancel.isPending} onClick={() => market && cancel.writeContract({ ...market, functionName: "cancel", args: [BigInt(l.id)] }, { onError: (e) => toast.push({ title: "Cancel failed", body: decodeRevert(e), kind: "error" }), onSuccess: () => toast.push({ title: "Listing cancelled", body: "Credits return to your wallet.", kind: "success" }) })}>Cancel listing</button>
                  ) : (
                    <button className="btn btn-primary" disabled={status === "Frozen"} onClick={() => setBuy(l)}>{status === "Frozen" ? "Frozen — cannot trade" : "Buy"}</button>
                  )}
                  <a className="btn btn-ghost" href={`/projects/${l.project_id}`}>Evidence</a>
                </div>
                <div className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>Integrity {bpsToScore(l.score_bps)} · updates every monitoring period</div>
              </li>
            );
          })}
        </ul>
        <section className="mt-8">
          <h2 className="display text-2xl">Price guide by integrity band</h2>
          <div className="mt-3"><PriceGuide /></div>
        </section>

        <section className="mt-8">
          <h2 className="display text-2xl">Recent trades</h2>
          {trades.data?.trades.length ? (
            <table className="data-table mt-3">
              <thead><tr><th>When</th><th>Buyer</th><th>Token</th><th>Tonnes</th><th>Paid</th><th>Tx</th></tr></thead>
              <tbody>{trades.data.trades.map((t) => (
                <tr key={t.id}>
                  <td>{t.ts ? new Date(t.ts * 1000).toLocaleString() : "—"}</td><td><HashChip value={t.buyer} kind="address" /></td><td className="mono">{t.token_id}</td><td className="mono">{t.amount.toLocaleString()}</td><td className="mono">{formatEther(BigInt(t.paid_wei))} ETH</td><td><HashChip value={t.tx_hash} kind="tx" /></td>
                </tr>))}</tbody>
            </table>
          ) : <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>No trades yet. Be the first.</p>}
        </section>
      </div>
      {buy && <BuyModal listing={buy} onClose={() => setBuy(null)} />}
    </div>
  );
}
