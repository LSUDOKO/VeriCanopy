"use client";

import { useQuery } from "@tanstack/react-query";
import { getStatus, type Check } from "@/lib/feeds";
import { PageHero } from "@/components/PageHero";
import { ExplorerLink } from "@/components/HashChip";
import { ErrorState, Skeleton } from "@/components/States";

const LABEL: Record<string, string> = {
  database: "Database (Neon Postgres)",
  rpc: "Base Sepolia RPC",
  indexer: "Chain indexer",
  earth_engine: "Google Earth Engine",
  pq_signer: "ML-DSA-65 signer",
  keeper: "Keeper wallet",
  content_store: "Content store (CIDv1 blobs)",
};

function Dot({ check }: { check: Check }) {
  const warn = check.warn === true;
  const color = check.ok ? (warn ? "var(--amber)" : "var(--teal)") : "var(--red)";
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px ${color}22` }} aria-label={check.ok ? "ok" : "failing"} />;
}

function detail(name: string, c: Check): string {
  switch (name) {
    case "database":
      return c.ok ? `responding in ${c.latency_ms} ms` : String(c.error ?? "unreachable");
    case "rpc":
      return c.ok ? `chain ${c.chain_id} · head #${Number(c.head_block).toLocaleString()} · ${c.latency_ms} ms` : String(c.error ?? `chain ${c.chain_id}, expected ${c.expected_chain_id}`);
    case "indexer":
      return c.indexed_block ? `block #${Number(c.indexed_block).toLocaleString()}${c.lag_blocks !== null && c.lag_blocks !== undefined ? ` · ${c.lag_blocks} behind head` : ""}` : "no blocks indexed";
    case "earth_engine":
      return c.configured ? `service account · project ${c.project ?? "—"}` : "credentials not configured";
    case "pq_signer":
      return c.ok ? "secret key loaded" : "no secret key";
    case "keeper":
      return c.address ? `${String(c.address).slice(0, 8)}… · ${c.balance_eth === null ? "balance unknown" : `${Number(c.balance_eth).toFixed(4)} ETH`}` : "no keeper key configured";
    case "content_store":
      return `${c.blobs} blobs · ${(Number(c.bytes) / 1e6).toFixed(1)} MB`;
    default:
      return c.ok ? "ok" : "failing";
  }
}

export default function StatusPage() {
  const q = useQuery({ queryKey: ["status"], queryFn: getStatus, refetchInterval: 30_000 });
  const s = q.data;
  const headline = s?.status === "operational" ? "All systems operational" : s?.status === "degraded" ? "Partially degraded" : s?.status === "outage" ? "Service outage" : "Checking…";
  const tone = s?.status === "operational" ? "var(--teal)" : s?.status === "degraded" ? "var(--amber)" : "var(--red)";
  return (
    <div className="flex flex-1 flex-col">
      <PageHero title="Status" lede="Live health of the VeriCanopy API, indexer, oracle dependencies and the Base Sepolia contracts. Refreshes every 30 seconds." />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
        {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderLeft: `4px solid ${tone}` }}>
          <div>
            <div className="display text-2xl">{headline}</div>
            <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{s ? `Checked ${new Date(s.checked_at * 1000).toLocaleTimeString()} · chain ${s.chain_id}` : "Contacting API…"}</div>
          </div>
          <a className="btn btn-ghost text-sm" href={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/status`} target="_blank" rel="noreferrer">Raw JSON</a>
        </div>

        <section className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {!s && Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 m-3" />)}
          {s &&
            Object.entries(s.checks).map(([name, c]) => (
              <div key={name} className="flex items-center gap-4 px-5 py-3.5">
                <Dot check={c} />
                <div className="flex-1">
                  <div className="font-semibold">{LABEL[name] ?? name}</div>
                  <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{detail(name, c)}</div>
                </div>
                <div className="text-xs font-semibold" style={{ color: c.ok ? "var(--teal)" : "var(--red)" }}>{c.ok ? (c.warn ? "Lagging" : "Operational") : "Down"}</div>
              </div>
            ))}
        </section>

        {s && (
          <section className="grid gap-4 md:grid-cols-3">
            {Object.entries(s.workers).map(([k, v]) => (
              <div key={k} className="card p-4">
                <div className="label text-xs" style={{ color: "var(--fg-muted)" }}>{k.replaceAll("_", " ")}</div>
                <div className="mt-1 text-sm">
                  {v ? Object.entries(v).map(([kk, vv]) => (
                    <div key={kk} className="flex justify-between gap-2"><span style={{ color: "var(--fg-muted)" }}>{kk}</span><span className="mono truncate">{String(vv ?? "—")}</span></div>
                  )) : <span style={{ color: "var(--fg-muted)" }}>none yet</span>}
                </div>
              </div>
            ))}
          </section>
        )}

        {s && (
          <section className="card p-5">
            <h2 className="display text-xl">Contracts · Base Sepolia</h2>
            <table className="data-table mt-3 w-full text-sm">
              <tbody>
                {Object.entries(s.contracts).map(([n, a]) => (
                  <tr key={n}>
                    <td className="py-1.5 font-semibold">{n}</td>
                    <td className="py-1.5 text-right"><ExplorerLink hash={a} kind="address" label={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
