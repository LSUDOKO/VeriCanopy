"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";
import { bpsToScore, fmt, tsToDate } from "@/lib/format";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { HashChip } from "@/components/HashChip";
import { RetireModal } from "@/components/Modals";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

type Portfolio = {
  address: string;
  holdings: { token_id: string; amount: number; project_id: number; project_name: string | null; project_status: string | null; vintage: number; score_now: number | null }[];
  retirements: { id: number; token_id: string; project_id: number; project_name: string | null; amount: number; beneficiary: string | null; score_at_retirement: number; score_now: number | null; ts: number | null; tx_hash: string | null }[];
  notifications: { id: number; kind: string; payload: Record<string, unknown> & { message?: string }; created_at: string | null; read: boolean }[];
};

export default function PortfolioPage() {
  const { address } = useAccount();
  const [manual, setManual] = useState("");
  const addr = (address ?? manual).toLowerCase();
  const q = useQuery({ queryKey: ["portfolio", addr], queryFn: () => api<Portfolio>(`/portfolio/${addr}`), enabled: !!addr, refetchInterval: 15_000 });
  const [retire, setRetire] = useState<{ tokenId: bigint; max: bigint } | null>(null);

  const certificate = (r: Portfolio["retirements"][number]) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>VeriCanopy retirement certificate #${r.id}</title><style>body{font-family:Inter,system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#10231b}h1{color:#0f3d2e}.k{color:#51635b;font-size:12px;text-transform:uppercase}.v{font-family:ui-monospace,monospace;margin-bottom:12px}</style></head><body><h1>Retirement certificate #${r.id}</h1><div class="k">Beneficiary</div><div class="v">${r.beneficiary ?? "—"}</div><div class="k">Project</div><div class="v">#${r.project_id} ${r.project_name ?? ""}</div><div class="k">Amount</div><div class="v">${r.amount} tCO2e (token ${r.token_id})</div><div class="k">Integrity score at retirement</div><div class="v">${bpsToScore(r.score_at_retirement)} / 100</div><div class="k">Retired at</div><div class="v">${tsToDate(r.ts)}</div><div class="k">Transaction</div><div class="v">${r.tx_hash ?? "—"}</div><div class="k">Live status</div><div class="v"><a href="${location.origin}/projects/${r.project_id}">${location.origin}/projects/${r.project_id}</a></div><p style="font-size:12px;color:#51635b">This credit is a <b>living credit</b>: its integrity score keeps updating. Check the live link for the current score and any reversal notices.</p></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vericanopy-retirement-${r.id}.html`;
    a.click();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      {!address && (
        <div className="mt-3 text-sm">
          Connect a wallet, or look up an address: <input className="input mono mt-1" placeholder="0x…" value={manual} onChange={(e) => setManual(e.target.value)} />
        </div>
      )}
      {q.isLoading && <Skeleton className="mt-4 h-40" />}
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="card p-4 lg:col-span-2">
            <h2 className="font-medium">Holdings</h2>
            {q.data.holdings.length === 0 ? (
              <EmptyState title="No credits held" hint="On testnet the demo issuer mints credits to buyer wallets." />
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead><tr className="label text-left"><th>Project</th><th>Vintage</th><th>Amount</th><th>Live integrity</th><th></th></tr></thead>
                <tbody>
                  {q.data.holdings.map((h) => (
                    <tr key={h.token_id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1"><a className="underline" href={`/projects/${h.project_id}`}>{h.project_name ?? `#${h.project_id}`}</a></td>
                      <td className="mono">{h.vintage}</td>
                      <td className="mono">{fmt(h.amount)}</td>
                      <td><IntegrityBadge scoreBps={h.score_now} status={h.project_status === "UnderReview" ? "UnderReview" : (h.score_now ?? 0) < 5000 ? "Impaired" : "Active"} size="sm" /></td>
                      <td><button className="btn btn-ghost" disabled={!address} onClick={() => setRetire({ tokenId: BigInt(h.token_id), max: BigInt(h.amount) })}>Retire…</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <h2 className="mt-6 font-medium">Retirements</h2>
            {q.data.retirements.length === 0 ? (
              <EmptyState title="No retirements yet" />
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead><tr className="label text-left"><th>#</th><th>Project</th><th>Amount</th><th>Beneficiary</th><th>Score then</th><th>Score now</th><th>Tx</th><th></th></tr></thead>
                <tbody>
                  {q.data.retirements.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1 mono">{r.id}</td>
                      <td><a className="underline" href={`/projects/${r.project_id}`}>{r.project_name ?? `#${r.project_id}`}</a></td>
                      <td className="mono">{fmt(r.amount)}</td>
                      <td>{r.beneficiary}</td>
                      <td className="mono">{bpsToScore(r.score_at_retirement)}</td>
                      <td className="mono" style={{ color: r.score_now !== null && r.score_now < r.score_at_retirement ? "var(--red)" : undefined }}>{bpsToScore(r.score_now)}</td>
                      <td><HashChip value={r.tx_hash} kind="tx" /></td>
                      <td><button className="btn btn-ghost" onClick={() => certificate(r)}>Certificate</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="card p-4">
            <h2 className="font-medium">Impact notices</h2>
            {q.data.notifications.length === 0 ? (
              <EmptyState title="Inbox empty" hint="You will be notified here when a project you hold or retired loses forest or changes status." />
            ) : (
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {q.data.notifications.map((n) => (
                  <li key={n.id} className="rounded-md border p-2" style={{ borderColor: n.kind === "reversal" ? "var(--red)" : "var(--amber)" }}>
                    <div className="text-xs label">{n.kind} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
                    <div>{n.payload.message as string}</div>
                    {Array.isArray(n.payload.impacted_retirements) && (n.payload.impacted_retirements as number[]).length > 0 && (
                      <div className="text-xs mt-1" style={{ color: "var(--red)" }}>Impacted retirements: #{(n.payload.impacted_retirements as number[]).join(", #")}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {retire && <RetireModal tokenId={retire.tokenId} max={retire.max} onClose={() => setRetire(null)} />}
    </div>
  );
}
