"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type Project } from "@/lib/api";
import { bpsToScore, fmt } from "@/lib/format";
import { IntegrityBadge } from "@/components/IntegrityBadge";
import { useToast } from "@/components/Toast";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";

type Timeline = {
  available?: boolean;
  reason?: string;
  years: number[];
  provenance: string | null;
  projects: Record<string, { name: string; start_year: number; claimed_baseline_rate: number; fire_year: number | null; years: Record<string, { score_bps: number; reversal_tco2e: number; fire_fraction: number; reversal_fraction: number }> }>;
};

const STEPS = [
  { title: "The problem", body: "Forest carbon credits are checked once, by someone you must trust. Peer-reviewed studies of dozens of REDD+ projects found persistent over-crediting, and a credit verified at issuance is never re-checked when the forest later burns." },
  { title: "Double registration is refused", body: "Demo Project D overlaps Project A. Its H3 cells are already owned on-chain, so addCells reverts with OverlapDetected(cell, projectId). Try it on the Register page with the 'overlaps Demo A' example." },
  { title: "Twin forest + proven score", body: "Each project is compared with matched 'twin' forest outside it. The 16-feature vector is scored by a tiny MLP inside an EZKL circuit; the on-chain Halo2 verifier accepts the proof before the score is stored. Project B's inflated baseline produces a low score and a large claim gap." },
  { title: "The forest burns, the credit corrects itself", body: "Move the slider to the fire year for Project C: the integrity score collapses, the buffer pool burns credits automatically, and every holder and retiree receives an impact notice. A shortfall freezes the project's credits." },
  { title: "Challenge, verify, sign for decades", body: "Anyone can challenge a pending score with a bond; resolvers recompute the manifest and vote; the loser is slashed. Every manifest is ML-DSA-65 (post-quantum) signed and anchored on-chain — verify it on the Verify page." },
];

export default function DemoPage() {
  const t = useQuery({ queryKey: ["demo-timeline"], queryFn: () => api<Timeline>("/demo/timeline") });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<{ projects: Project[] }>("/projects") });
  const [year, setYear] = useState(2018);
  const [step, setStep] = useState(0);
  const toast = useToast();
  const data = t.data && t.data.available !== false ? t.data : null;
  const years = data?.years ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const onchainByDemo = useMemo(() => Object.fromEntries((projects.data?.projects ?? []).filter((p) => p.demo_id).map((p) => [p.demo_id!, p])), [projects.data]);

  const burnedAt = (k: string) => {
    const p = data?.projects[k];
    if (!p?.fire_year || year < p.fire_year) return 0;
    return p.years[String(p.fire_year)]?.reversal_tco2e ?? 0;
  };
  const goToYear = (y: number) => {
    setYear(y);
    if (!data) return;
    for (const p of Object.values(data.projects)) {
      const row = p.years[String(y)];
      if (p.fire_year === y && row && row.reversal_tco2e > 0) {
        toast.push({ title: `🔥 ${p.name}: forest loss detected in ${y}`, body: `${fmt(row.reversal_tco2e)} tCO2e reversed → buffer burn + impact notices to holders and retirees.`, kind: "error" });
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-5">
      <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--surface-2)", borderLeft: "4px solid var(--amber)" }}>
        Replay of real pipeline outputs ({data?.provenance ?? "—"} data) on testnet contracts. Demo projects were drawn by the VeriCanopy team and are not real registered projects.
      </div>
      <h1 className="text-2xl font-semibold">Guided demo</h1>
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Demo steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button className="rounded-full border px-3 py-1" style={{ borderColor: step === i ? "var(--canopy)" : "var(--border)", fontWeight: step === i ? 600 : 400 }} onClick={() => setStep(i)}>
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="card p-4 text-sm">
        <h2 className="font-medium">{STEPS[step].title}</h2>
        <p className="mt-1" style={{ color: "var(--fg-muted)" }}>{STEPS[step].body}</p>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Previous</button>
          <button className="btn btn-primary" disabled={step === STEPS.length - 1} onClick={() => { setStep(step + 1); if (step + 1 === 3) goToYear(2021); }}>Next →</button>
        </div>
      </div>

      <div className="card p-4">
        <label className="flex items-center gap-3 text-sm">
          <span className="label">Monitoring year</span>
          <input type="range" min={years[0]} max={years[years.length - 1]} value={year} onChange={(e) => goToYear(Number(e.target.value))} className="flex-1" aria-label="Monitoring year" />
          <span className="mono text-lg w-14">{year}</span>
        </label>
        {t.isLoading && <Skeleton className="mt-3 h-40" />}
        {t.error && <ErrorState error={t.error} onRetry={() => t.refetch()} />}
        {t.data && t.data.available === false && <EmptyState title="Demo data not generated" hint="Run `make demo-data` to precompute the 2018–2025 pipeline outputs." />}
        {data && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.entries(data.projects).map(([k, p]) => {
              const row = p.years[String(year)];
              const prev = p.years[String(year - 1)];
              const burned = burnedAt(k);
              const status = !row ? "Pending" : burned > 0 ? "Frozen" : row.score_bps < 5000 ? "Impaired" : "Active";
              const drop = row && prev ? row.score_bps - prev.score_bps : 0;
              const oc = onchainByDemo[k];
              return (
                <div key={k} className="rounded-md border p-3" style={{ borderColor: status === "Frozen" ? "var(--red)" : "var(--border)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs" style={{ color: "var(--fg-muted)" }}>start {p.start_year} · claimed baseline {(100 * p.claimed_baseline_rate).toFixed(1)}%/yr{oc ? ` · on-chain #${oc.id}` : ""}</div>
                    </div>
                    <IntegrityBadge scoreBps={row?.score_bps ?? null} status={status} />
                  </div>
                  {!row && <div className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>Not yet started in {year}.</div>}
                  {row && (
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <dt className="label">Score</dt><dd className="mono">{bpsToScore(row.score_bps)} {drop !== 0 && <span style={{ color: drop < 0 ? "var(--red)" : "var(--teal)" }}>({drop > 0 ? "+" : ""}{(drop / 100).toFixed(1)})</span>}</dd>
                      <dt className="label">Forest lost this year</dt><dd className="mono">{(100 * row.reversal_fraction).toFixed(1)} %</dd>
                      <dt className="label">Burned fraction</dt><dd className="mono">{(100 * row.fire_fraction).toFixed(1)} %</dd>
                      <dt className="label">Reversal</dt><dd className="mono" style={{ color: row.reversal_tco2e > 0 ? "var(--red)" : undefined }}>{fmt(row.reversal_tco2e)} tCO2e</dd>
                    </dl>
                  )}
                  {burned > 0 && (
                    <div className="mt-2 rounded-md p-2 text-xs" style={{ background: "color-mix(in srgb, var(--red) 10%, transparent)", color: "var(--red)" }}>
                      ⛔ Buffer burn {fmt(burned)} tCO2e requested; buffer exhausted → credits frozen; holders and retirees notified.
                    </div>
                  )}
                  {oc && <a className="mt-2 inline-block text-xs underline" href={`/projects/${oc.id}`}>Open on-chain project →</a>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
