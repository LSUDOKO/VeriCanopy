"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getRetirement } from "@/lib/feeds";
import { ErrorState, Skeleton } from "@/components/States";
import { bpsToScore, short } from "@/lib/format";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://sepolia.basescan.org";

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["retirement", id], queryFn: () => getRetirement(Number(id)) });
  const r = q.data;
  const date = r?.ts ? new Date(r.ts * 1000) : null;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 print:py-0">
      <style>{`@media print { header, nav, .no-print, .cursor-arrow { display: none !important } body { background: #fff } .cert { box-shadow: none !important; border: 1px solid #ddd } }`}</style>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.isLoading && <Skeleton className="h-[32rem]" />}
      {r && (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link href="/retirements" className="underline">← All retirements</Link>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print / Save PDF</button>
              {r.tx_hash && <a className="btn btn-primary" href={`${EXPLORER}/tx/${r.tx_hash}`} target="_blank" rel="noreferrer">Verify on-chain</a>}
            </div>
          </div>
          <article className="cert card relative overflow-hidden p-8 sm:p-12" style={{ background: "var(--surface, #fff)", borderRadius: 24 }}>
            <div className="absolute inset-x-0 top-0 h-2" style={{ background: "linear-gradient(90deg,var(--forest),var(--lime))" }} />
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-original.png" alt="VeriCanopy" className="h-14 w-14 rounded-xl object-contain" />
                <div>
                  <div className="display text-2xl leading-none">VeriCanopy</div>
                  <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Satellite-verified forest carbon · Base Sepolia</div>
                </div>
              </div>
              <div className="text-right">
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Certificate</div>
                <div className="mono text-lg">{r.serial}</div>
              </div>
            </header>

            <h1 className="display mt-10 text-4xl sm:text-5xl tracking-tight">Certificate of Retirement</h1>
            <p className="mt-3 max-w-2xl text-base" style={{ color: "var(--fg-muted)" }}>
              This certifies that the carbon credits below were permanently retired on-chain and can never be transferred or sold again.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Retired</div>
                <div className="display text-5xl">{r.amount.toLocaleString()} <span className="text-2xl">tCO2e</span></div>
              </div>
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>On behalf of</div>
                <div className="display text-3xl break-words">{r.beneficiary || short(r.holder)}</div>
              </div>
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Project</div>
                <div className="text-lg font-semibold">{r.project_name ?? `Project #${r.project_id}`}{r.country ? ` · ${r.country}` : ""}</div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>Vintage {r.vintage ?? "—"} · token {r.token_id}</div>
              </div>
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Integrity score at retirement</div>
                <div className="text-lg font-semibold">{bpsToScore(r.score_at_retirement_bps)} / 100</div>
                <div className="text-sm" style={{ color: "var(--fg-muted)" }}>zkML-proven, ML-DSA-65 signed</div>
              </div>
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Date</div>
                <div className="text-lg font-semibold">{date ? date.toLocaleDateString(undefined, { dateStyle: "long" }) : "—"}</div>
              </div>
              <div>
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>Retired by</div>
                <div className="mono text-sm break-all">{r.holder}</div>
              </div>
            </div>

            <footer className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t pt-5 text-xs" style={{ borderColor: "var(--border)", color: "var(--fg-muted)" }}>
              <div>
                <div>Transaction</div>
                {r.tx_hash ? <a className="mono underline break-all" href={`${EXPLORER}/tx/${r.tx_hash}`} target="_blank" rel="noreferrer">{r.tx_hash}</a> : <span>—</span>}
              </div>
              <div className="text-right">Retirement #{r.id} · RetirementRegistry · chain 84532</div>
            </footer>
          </article>
        </>
      )}
    </div>
  );
}
