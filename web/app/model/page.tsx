"use client";

import { useQuery } from "@tanstack/react-query";
import { getModel } from "@/lib/feeds";
import { PageHero } from "@/components/PageHero";
import { ExplorerLink, HashChip } from "@/components/HashChip";
import { ErrorState, Skeleton } from "@/components/States";

const n = (v: unknown, d = 2) => (typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: d }) : "—");

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--fg-muted)" }}>{k}</span>
      <span className="text-right mono">{v}</span>
    </div>
  );
}

export default function ModelPage() {
  const q = useQuery({ queryKey: ["model"], queryFn: getModel, staleTime: 60_000 });
  const m = q.data;
  const t = m?.training ?? {};
  const zk = m?.zk ?? {};
  const pq = m?.pq ?? {};
  return (
    <div className="flex flex-1 flex-col">
      <PageHero title="Model registry" lede="The scoring model every credit is judged by: its weights are hashed on-chain, its circuit is proven with Halo2, and its inputs are satellite-derived features." />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        {!m && <Skeleton className="h-64" />}
        {m && (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="display text-xl">Integrity scorer · {String(t.feature_version ?? "fv1")}</h2>
                  <span className="pill text-xs font-semibold" style={{ background: m.artifact.matches_chain ? "rgba(40,160,90,.12)" : "rgba(220,60,40,.12)", color: m.artifact.matches_chain ? "var(--teal)" : "var(--red)" }}>
                    {m.artifact.matches_chain ? "Artifact hash matches chain" : "Artifact hash mismatch"}
                  </span>
                </div>
                <Row k="Architecture" v={String(t.architecture ?? "—")} />
                <Row k="Parameters" v={n(t.n_params, 0)} />
                <Row k="Training / holdout samples" v={`${n(t.train_samples, 0)} / ${n(t.holdout_samples, 0)}`} />
                <Row k="MAE vs expert rule (holdout)" v={n(t.mae_holdout, 4)} />
                <Row k="Max abs error (holdout)" v={n(t.max_abs_err_holdout, 4)} />
                <Row k="Monotonicity violations" v={`${n(t.monotonicity_violation_rate_support, 3)} / ${n(t.monotonicity_violation_rate_reversal, 3)}`} />
                <Row k="On-chain model hash" v={<HashChip value={m.chain.model_hash} />} />
                <Row k="ONNX sha256 (repo)" v={<HashChip value={m.artifact.onnx_sha256} />} />
                <Row k="Verifying key sha256" v={<HashChip value={m.artifact.vk_sha256} />} />
                <Row k="Halo2 verifier" v={m.chain.verifier ? <ExplorerLink hash={m.chain.verifier} kind="address" /> : "—"} />
                <Row k="Model registry" v={m.chain.registry ? <ExplorerLink hash={m.chain.registry} kind="address" /> : "—"} />
                <Row k="Active on-chain" v={m.chain.active === undefined ? m.chain.read_from : m.chain.active ? "yes" : "no"} />
                <Row k="Output scale" v={String(m.chain.output_scale ?? m.params.outputScale ?? "—")} />
              </div>
              <div className="card p-5">
                <h2 className="display text-xl">zkML circuit</h2>
                <Row k="Scheme" v={String(zk.scheme ?? "Halo2 + KZG")} />
                <Row k="Prover" v={`EZKL ${String(zk.ezkl_version ?? "")}`} />
                <Row k="Log-rows" v={String(zk.logrows ?? "—")} />
                <Row k="Scales (input/param/output)" v={`${zk.input_scale} / ${zk.param_scale} / ${zk.output_scale}`} />
                <Row k="Visibility" v={`${zk.input_visibility} / ${zk.param_visibility} / ${zk.output_visibility}`} />
                <Row k="Proof size" v={`${n(zk.proof_bytes, 0)} B`} />
                <Row k="Proving time (mean / max)" v={`${n(zk.prove_seconds_mean)} s / ${n(zk.prove_seconds_max)} s`} />
                <Row k="Float vs proven, max err" v={n(zk.float_vs_proven_max_abs_err, 5)} />
                <Row k="Proving key" v={`${(Number(zk.pk_bytes ?? 0) / 1e6).toFixed(0)} MB`} />
                <h2 className="display text-xl mt-6">Signatures</h2>
                <Row k="Algorithm" v="ML-DSA-65 (FIPS 204)" />
                <Row k="Public key / signature" v={`${n((pq as Record<string, Record<string, unknown>>).ml_dsa_65?.pk_bytes ?? 1952, 0)} B / ${n((pq as Record<string, Record<string, unknown>>).ml_dsa_65?.sig_bytes ?? 3309, 0)} B`} />
              </div>
            </section>

            <section className="card p-5">
              <h2 className="display text-xl">Input features ({m.features.length})</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.features.map((f) => <span key={f} className="chip mono text-xs">{f}</span>)}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="display text-xl">Satellite data sources</h2>
              <table className="data-table mt-3 w-full text-sm">
                <thead><tr className="text-left text-xs" style={{ color: "var(--fg-muted)" }}><th className="py-1">Dataset</th><th className="py-1">Earth Engine id</th><th className="py-1">Used for</th></tr></thead>
                <tbody>
                  {m.datasets.map((d) => (
                    <tr key={d.id}><td className="py-1.5 font-semibold">{d.name}</td><td className="py-1.5 mono text-xs">{d.id}</td><td className="py-1.5">{d.use}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card p-5">
              <h2 className="display text-xl">Protocol parameters</h2>
              <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
                {Object.entries(m.params).map(([k, v]) => <Row key={k} k={k} v={String(v)} />)}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
