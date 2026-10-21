"use client";

import { useQuery } from "@tanstack/react-query";
import { use, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { api, type Challenge, type Evidence, type Project, type Submission } from "@/lib/api";
import { useContract } from "@/lib/contracts";
import { bpsToScore, fmt, fmtEth, integrityStatus, STATUS_META, tsToDate } from "@/lib/format";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { ProofBadge } from "@/components/ProofBadge";
import { HashChip } from "@/components/HashChip";
import dynamic from "next/dynamic";
const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false });
import { ScoreHistoryChart, TwinChart } from "@/components/TwinChart";
import { ManifestViewer } from "@/components/ManifestViewer";
import { ChallengeModal, RetireModal } from "@/components/Modals";
import { PQVerifyButton } from "@/components/VerifyChecklist";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

const TABS = ["Evidence", "Integrity history", "Claim vs reality", "Credits", "Proofs & signatures", "Challenges"] as const;

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pid = Number(id);
  const q = useQuery({ queryKey: ["project", pid], queryFn: () => api<Project>(`/projects/${pid}`), refetchInterval: 15_000 });
  const hist = useQuery({ queryKey: ["history", pid], queryFn: () => api<{ submissions: Submission[]; reversals: { period: number; tonnes: number; covered: number; shortfall: number; tx_hash: string | null }[]; challenges: Challenge[] }>(`/projects/${pid}/history`), refetchInterval: 15_000 });
  const ev = useQuery({ queryKey: ["evidence", pid], queryFn: () => api<Evidence>(`/projects/${pid}/evidence`) });
  const credit = useContract("VeriCredit");
  const onchain = useReadContract({ ...(credit ?? { abi: [], address: undefined }), functionName: "integrityOf", args: [BigInt(pid)], query: { enabled: !!credit, refetchInterval: 10_000 } });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Evidence");
  const [challenge, setChallenge] = useState<Submission | null>(null);
  const [retire, setRetire] = useState<{ tokenId: bigint; max: bigint } | null>(null);
  const { address } = useAccount();

  if (q.isLoading) return <div className="mx-auto max-w-6xl p-6"><Skeleton className="h-40" /></div>;
  if (q.error || !q.data) return <div className="mx-auto max-w-6xl p-6"><ErrorState error={q.error ?? "not found"} onRetry={() => q.refetch()} /></div>;
  const p = q.data;
  // viem decodes the named struct as an object: { scoreBps, status, lastPeriod }
  const oc = onchain.data as { scoreBps: number; status: number; lastPeriod: number } | undefined;
  const chainStatus = oc ? (["Active", "UnderReview", "Impaired", "Frozen"][oc.status] ?? "Active") : null;
  const scoreBps = oc && oc.lastPeriod > 0 ? oc.scoreBps : p.integrity.score_bps;
  const status = chainStatus && (chainStatus === "Frozen" || chainStatus === "Impaired") ? chainStatus : integrityStatus(scoreBps, p.status);
  const latest = p.integrity.latest_submission;
  const subs = hist.data?.submissions ?? [];
  const finalized = subs.filter((s) => s.status === "Finalized");
  const latestFinal = finalized[finalized.length - 1];
  const claimedPct = p.claimed_baseline_bps / 100;
  const diag = (ev.data?.manifest as { diagnostics?: Record<string, number> } | undefined)?.diagnostics;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{p.name ?? `Project #${pid}`}</h1>
          <div className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            #{pid} · {p.country ?? "—"} · developer <span className="mono">{p.developer}</span> · start {p.start_date ?? "—"} · {p.cell_count} H3 cells (res {p.h3_res}) · registry status {p.status}
          </div>
          {p.demo_id && <div className="mt-1 text-xs" style={{ color: "var(--amber)" }}>Demo project drawn by the VeriCanopy team; not a real registered carbon project.</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <IntegrityBadge scoreBps={scoreBps} status={status} size="lg" />
          <ProofBadge mode={latestFinal?.proof_mode ?? latest?.proof_mode} txHash={latestFinal?.tx_hash ?? latest?.tx_hash} />
          {oc && oc.lastPeriod > 0 && <span className="text-xs" style={{ color: "var(--fg-muted)" }}>score & status read directly from chain (period {oc.lastPeriod})</span>}
        </div>
      </header>

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b" style={{ borderColor: "var(--border)" }} aria-label="Project tabs">
        {TABS.map((t) => (
          <button key={t} className="whitespace-nowrap px-3 py-2 text-sm" style={tab === t ? { borderBottom: "2px solid var(--canopy)", fontWeight: 600 } : undefined} onClick={() => setTab(t)} aria-selected={tab === t} role="tab">
            {t}
          </button>
        ))}
      </nav>

      <section className="mt-4">
        {tab === "Evidence" && (
          <div className="grid gap-4 md:grid-cols-2">
            <MapView className="h-80 card overflow-hidden" projects={[p]} selected={pid} fitTo={p.geometry} />
            <div className="card p-4">
              <div className="label">Forest cover: project vs matched twins</div>
              {ev.isLoading && <Skeleton className="h-64 mt-2" />}
              {ev.data && !ev.data.available && <EmptyState title="No evidence yet" hint={ev.data.reason} />}
              {ev.data?.available && <TwinChart ev={ev.data} startYear={p.start_date ? Number(p.start_date.slice(0, 4)) : null} />}
              {ev.data?.available && (
                <div className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>
                  {ev.data.n_treat} project pixels vs {ev.data.n_ctrl} control pixels · period {ev.data.period} · data provenance: <b>{ev.data.provenance ?? ev.data.provider}</b>
                  {ev.data.provider === "fixture" && " (synthetic fixture samples; set Earth Engine credentials for live satellite data)"}
                </div>
              )}
              <div className="mt-3 text-xs" style={{ color: "var(--fg-muted)" }}>Sentinel-2 before/after tiles: — (not available without Earth Engine credentials)</div>
            </div>
          </div>
        )}

        {tab === "Integrity history" && (
          <div className="card p-4">
            {finalized.length === 0 ? <EmptyState title="No finalised scores yet" /> : <ScoreHistoryChart points={finalized} />}
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th>Period</th><th>Score</th><th>Reversal</th><th>Status</th><th>Model</th><th>Manifest</th><th>Tx</th><th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-1 mono">{s.period}</td>
                    <td className="mono">{bpsToScore(s.score_bps)}</td>
                    <td className="mono">{fmt(s.reversal_tonnes)} t</td>
                    <td style={{ color: STATUS_META[s.status]?.color }}>{STATUS_META[s.status]?.icon} {s.status}</td>
                    <td><HashChip value={s.model_hash} /></td>
                    <td><HashChip value={s.manifest_cid} kind="cid" /></td>
                    <td><HashChip value={s.tx_hash} kind="tx" /></td>
                    <td><ProofBadge mode={s.proof_mode} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hist.data?.reversals.length ? (
              <div className="mt-4">
                <div className="label">Reversals (buffer burns)</div>
                <ul className="text-sm">
                  {hist.data.reversals.map((r, i) => (
                    <li key={i} className="mono">
                      {r.period}: {fmt(r.tonnes)} t lost · {fmt(r.covered)} t burned from buffer · shortfall {fmt(r.shortfall)} t {r.shortfall > 0 && <span style={{ color: "var(--red)" }}>⛔ frozen</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {tab === "Claim vs reality" && (
          <div className="card p-4 text-sm">
            <div className="mb-2 rounded-md px-3 py-2 text-xs" style={{ background: "var(--surface-2)" }}>Model estimate for demonstration. Not an accusation. PDD claim extraction (F8) is a roadmap feature; the claimed baseline below is the value the developer registered on-chain.</div>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="label">Claimed annual deforestation baseline</dt><dd className="mono text-lg">{claimedPct.toFixed(2)} %/yr</dd></div>
              <div><dt className="label">Observed twin-forest loss rate</dt><dd className="mono text-lg">{diag ? (100 * diag.control_loss_rate).toFixed(2) + " %/yr" : "—"}</dd></div>
              <div><dt className="label">Observed project loss rate</dt><dd className="mono text-lg">{diag ? (100 * diag.project_loss_rate).toFixed(2) + " %/yr" : "—"}</dd></div>
              <div><dt className="label">Support ratio (observed / claimed effect)</dt><dd className="mono text-lg">{ev.data?.manifest ? String((ev.data.manifest as { features: number[] }).features[0]) : "—"}</dd></div>
              <div><dt className="label">Observed avoided emissions</dt><dd className="mono text-lg">{diag ? fmt(Math.round(diag.observed_avoided_tco2e_per_year)) + " tCO2e/yr" : "—"}</dd></div>
              <div><dt className="label">Claimed avoided emissions</dt><dd className="mono text-lg">{diag ? fmt(Math.round(diag.claimed_avoided_tco2e_per_year)) + " tCO2e/yr" : "—"}</dd></div>
            </dl>
          </div>
        )}

        {tab === "Credits" && (
          <div className="card p-4">
            {p.vintages.length === 0 ? (
              <EmptyState title="No vintages issued" hint="Issuance requires a finalised integrity score ≥ 70." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="label text-left"><th>Vintage</th><th>Token id</th><th>Issued</th><th>Buffer</th><th>Burned</th><th>Retired</th><th></th></tr></thead>
                <tbody>
                  {p.vintages.map((v) => (
                    <tr key={v.token_id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-1 mono">{v.vintage}</td>
                      <td className="mono">{v.token_id}</td>
                      <td className="mono">{fmt(v.issued)}</td>
                      <td className="mono">{fmt(v.buffer)}</td>
                      <td className="mono">{fmt(v.burned)}</td>
                      <td className="mono">{fmt(v.retired)}</td>
                      <td><button className="btn btn-ghost" disabled={!address || status === "Frozen"} onClick={() => setRetire({ tokenId: BigInt(v.token_id), max: BigInt(v.issued - v.buffer - v.retired) })}>Retire…</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-3 text-xs" style={{ color: "var(--fg-muted)" }}>Buying on testnet: the demo issuer mints vintages to buyer wallets via `mintVintage`; see the Portfolio page for holdings and retirements.</div>
          </div>
        )}

        {tab === "Proofs & signatures" && (
          <div className="card p-4 text-sm flex flex-col gap-3">
            {!latest && <EmptyState title="No submissions yet" />}
            {latest && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><span className="label">Model hash</span><div><HashChip value={latest.model_hash} /></div></div>
                  <div><span className="label">Feature commitment (Poseidon, public instance)</span><div><HashChip value={latest.feature_commitment} /></div></div>
                  <div><span className="label">Manifest hash (on-chain)</span><div><HashChip value={latest.manifest_hash} /></div></div>
                  <div><span className="label">Manifest CID</span><div><HashChip value={latest.manifest_cid} kind="cid" /></div></div>
                  <div><span className="label">PQ key id (ML-DSA-65)</span><div><HashChip value={latest.pq_key_id} /></div></div>
                  <div><span className="label">Submission tx</span><div><HashChip value={latest.tx_hash} kind="tx" /></div></div>
                </div>
                <ProofBadge mode={latest.proof_mode} txHash={latest.tx_hash} />
                <PQVerifyButton manifestCid={latest.manifest_cid} />
                <ManifestViewer manifest={ev.data?.manifest ?? null} />
              </>
            )}
          </div>
        )}

        {tab === "Challenges" && (
          <div className="card p-4 text-sm">
            {latest && latest.status === "Pending" && (
              <button className="btn btn-primary mb-3" onClick={() => setChallenge(latest)}>
                Challenge this score (window ends {tsToDate(latest.window_end)})
              </button>
            )}
            {(hist.data?.challenges ?? []).length === 0 ? (
              <EmptyState title="No challenges" hint="Anyone can dispute a pending score by posting a bond." />
            ) : (
              <ul className="flex flex-col gap-2">
                {hist.data!.challenges.map((c) => (
                  <li key={c.id} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex justify-between"><span>#{c.id} on submission #{c.submission_id} · {c.reason}</span><span style={{ color: STATUS_META[c.outcome]?.color }}>{STATUS_META[c.outcome]?.icon} {c.outcome}</span></div>
                    <div className="text-xs mono mt-1" style={{ color: "var(--fg-muted)" }}>challenger {c.challenger} · bond {fmtEth(c.bond)} · votes uphold {c.votes_uphold} / reject {c.votes_reject} · evidence {c.evidence_cid ?? "—"}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      {challenge && <ChallengeModal submission={challenge} onClose={() => setChallenge(null)} />}
      {retire && <RetireModal tokenId={retire.tokenId} max={retire.max} onClose={() => setRetire(null)} />}
    </div>
  );
}
