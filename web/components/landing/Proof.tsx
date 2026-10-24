"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { API_URL, api, type Project, type Submission } from "@/lib/api";
import { Compare } from "@/components/Compare";
import { HashChip } from "@/components/HashChip";
import { bpsToScore } from "@/lib/format";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://sepolia.basescan.org";

/** A real finalised submission from the API, with its proof, signature and the Sentinel-2 pair it was scored on. */
export function Proof() {
  const pid = 1;
  const p = useQuery({ queryKey: ["project", pid], queryFn: () => api<Project>(`/projects/${pid}`) });
  const h = useQuery({ queryKey: ["history", pid], queryFn: () => api<{ submissions: Submission[] }>(`/projects/${pid}/history`) });
  const tiles = useQuery({ queryKey: ["tiles", pid, undefined], queryFn: () => api<{ before: { year: number; url?: string }; after: { year: number; url?: string }; pending: boolean; source: string }>(`/projects/${pid}/tiles`) });
  const sub = h.data?.submissions.filter((s) => s.proof_mode === "onchain" && s.status === "Finalized").sort((a, b) => b.period - a.period)[0] ?? h.data?.submissions.at(-1);
  const peak = h.data?.submissions.filter((x) => x.status === "Finalized" && sub && x.period < sub.period && x.score_bps > sub.score_bps).sort((a, b) => b.score_bps - a.score_bps)[0];
  const before = tiles.data?.before.url ? `${API_URL}${tiles.data.before.url}` : "/sat/A_before.png";
  const after = tiles.data?.after.url ? `${API_URL}${tiles.data.after.url}` : "/sat/A_after.png";
  return (
    <section className="section" style={{ background: "var(--forest)", color: "#fff" }}>
      <div className="wrap grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="reveal">
          <div className="eyebrow">Proof, not promise</div>
          <h2 className="display mt-3 text-4xl sm:text-5xl">This is a real score. Drag to see what it saw.</h2>
          <p className="lede mt-5" style={{ color: "rgba(255,255,255,.72)" }}>
            {p.data?.name ?? "Tapajós Riverine Forest Block"} in Pará, Brazil. Sentinel-2 true colour, {tiles.data?.before.year ?? 2019} against {tiles.data?.after.year ?? 2024}, composited by Earth Engine for this exact polygon.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
            <div><dt className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Integrity score · {sub?.period ?? "—"}</dt><dd className="display mt-1 text-4xl tabular-nums">{sub ? bpsToScore(sub.score_bps) : "…"}</dd>{peak && <dd className="mt-1 text-xs" style={{ color: "rgba(255,255,255,.55)" }}>down from {bpsToScore(peak.score_bps)} in {peak.period} after {peak.reversal_tonnes.toLocaleString()} t of loss</dd>}</div>
            <div><dt className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Loss detected</dt><dd className="display mt-1 text-4xl tabular-nums">{sub ? `${sub.reversal_tonnes.toLocaleString()} t` : "…"}</dd></div>
            <div><dt className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>zk proof</dt><dd className="mt-1 flex items-center gap-2"><span className="pill" style={{ background: "rgba(122,209,1,.18)", color: "var(--lime-2)" }}>{sub?.proof_mode === "onchain" ? "✓ Halo2 verified on-chain" : "…"}</span></dd></div>
            <div><dt className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Signature</dt><dd className="mt-1"><span className="pill" style={{ background: "rgba(122,209,1,.18)", color: "var(--lime-2)" }}>ML-DSA-65 · FIPS 204</span></dd></div>
            <div className="col-span-2 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5" style={{ ["--surface-2" as string]: "rgba(255,255,255,.08)", ["--border" as string]: "rgba(255,255,255,.15)" }}>
              <span className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Submit tx</span><HashChip value={sub?.tx_hash} kind="tx" />
              <span className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Manifest</span><HashChip value={sub?.manifest_cid} kind="cid" />
              <span className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>Model</span><HashChip value={sub?.model_hash} />
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/projects/${pid}`} className="btn btn-lime">Open the evidence</Link>
            <Link href="/verify" className="btn" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>Verify it yourself</Link>
            {sub?.tx_hash && <a href={`${EXPLORER}/tx/${sub.tx_hash}`} target="_blank" rel="noreferrer" className="btn" style={{ color: "rgba(255,255,255,.8)" }}>View on Basescan ↗</a>}
          </div>
        </div>
        <div className="reveal">
          <Compare before={before} after={after} beforeLabel={`${tiles.data?.before.year ?? 2019}`} afterLabel={`${tiles.data?.after.year ?? 2024}`} alt="Sentinel-2 over the Tapajós block" className="float aspect-[4/3]" />
          <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,.5)" }}>{tiles.data?.source ?? "Copernicus Sentinel-2 L2A via Google Earth Engine"} · contains modified Copernicus data.</p>
        </div>
      </div>
    </section>
  );
}
