"use client";

import { PageHero } from "@/components/PageHero";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { keccak256, stringToHex } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { api } from "@/lib/api";
import { useContract } from "@/lib/contracts";
import { decodeRevert } from "@/lib/errors";
import { useToast } from "@/components/Toast";
import type { Overlay } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false });

type Overlap = { h3_res: number; fine_cell_root?: string | null; cells: string[]; cell_count: number; geometry_sha256: string; conflicts: { cell: string; project_id: number; project_name: string | null }[]; conflict_cells_geojson: GeoJSON.GeoJSON | null; cells_geojson: GeoJSON.GeoJSON };

const BATCH = 60;

function rect(lon: number, lat: number, w: number, h: number): GeoJSON.Polygon {
  return { type: "Polygon", coordinates: [[[lon, lat], [lon + w, lat], [lon + w, lat + h], [lon, lat + h], [lon, lat]]] };
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [geomText, setGeomText] = useState("");
  const [geom, setGeom] = useState<GeoJSON.Geometry | null>(null);
  const [overlap, setOverlap] = useState<Overlap | null>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("2020-01-01");
  const [baseline, setBaseline] = useState("1.2");
  const [progress, setProgress] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [insist, setInsist] = useState(false);
  const reg = useContract("ProjectRegistry");
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();

  const parse = () => {
    setErr("");
    try {
      const j = JSON.parse(geomText);
      const g: GeoJSON.Geometry = j.type === "Feature" ? j.geometry : j.type === "FeatureCollection" ? j.features[0].geometry : j;
      if (!["Polygon", "MultiPolygon"].includes(g.type)) throw new Error("need a Polygon or MultiPolygon");
      setGeom(g);
      return g;
    } catch (e) {
      setErr(`Invalid GeoJSON: ${(e as Error).message}`);
      return null;
    }
  };

  const precheck = async () => {
    const g = parse();
    if (!g) return;
    try {
      const r = await api<Overlap>("/projects/overlap-check", { method: "POST", body: JSON.stringify({ geometry: g, h3_res: 8 }) });
      setOverlap(r);
      setStep(2);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const overlays: Overlay[] = useMemo(() => {
    const o: Overlay[] = [];
    if (overlap) o.push({ id: "cells", geojson: overlap.cells_geojson, color: "#14b8a6", opacity: 0.2 });
    if (overlap?.conflict_cells_geojson) o.push({ id: "conflicts", geojson: overlap.conflict_cells_geojson, color: "#dc2626", opacity: 0.6 });
    return o;
  }, [overlap]);

  const submit = async () => {
    if (!reg || !overlap || !geom || !client) return;
    setErr("");
    setProgress([]);
    const log = (s: string) => setProgress((p) => [...p, s]);
    try {
      const meta = { name, geometry: geom, start_date: start, claimed_baseline_rate: Number(baseline) / 100, h3_res: 8, cell_count: overlap.cell_count };
      const metaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/v1/evidence`, { method: "POST", body: (() => { const fd = new FormData(); fd.append("file", new Blob([JSON.stringify(meta)], { type: "application/json" }), "metadata.json"); return fd; })() });
      if (!metaRes.ok) throw new Error(`metadata upload failed (${metaRes.status})`);
      const { cid } = await metaRes.json();
      if (!cid) throw new Error("metadata upload returned no CID");
      const geometryHash = overlap.geometry_sha256 as `0x${string}`;
      const startTs = BigInt(Math.floor(new Date(start).getTime() / 1000));
      const h1 = await writeContractAsync({ ...reg, functionName: "createProject", args: [geometryHash, (overlap.fine_cell_root as `0x${string}` | null | undefined) ?? keccak256(stringToHex("fine-root-not-computed-in-browser")), 8, startTs, Math.round(Number(baseline) * 100), `ipfs://${cid}`] });
      log(`createProject tx ${h1}`);
      const r1 = await client.waitForTransactionReceipt({ hash: h1 });
      const topic = r1.logs.find((l) => l.topics.length >= 3);
      const projectId = topic ? BigInt(topic.topics[1]!) : 0n;
      log(`project #${projectId} created; adding ${overlap.cell_count} cells in batches of ${BATCH}`);
      const cells = overlap.cells.map((c) => BigInt(c));
      for (let i = 0; i < cells.length; i += BATCH) {
        const h = await writeContractAsync({ ...reg, functionName: "addCells", args: [projectId, cells.slice(i, i + BATCH)] });
        await client.waitForTransactionReceipt({ hash: h });
        log(`addCells ${Math.min(i + BATCH, cells.length)}/${cells.length} ✓`);
      }
      log("Submitted for activation by the registry issuer.");
      toast.push({ title: "Project registered", body: `#${projectId} · ${overlap.cell_count} cells locked`, kind: "success" });
      setStep(5);
    } catch (e) {
      const msg = decodeRevert(e);
      setErr(msg);
      toast.push({ title: "Registration rejected on-chain", body: msg, kind: "error" });
    }
  };

  return (
    <div className="flex flex-1 flex-col"><PageHero title="Register a project" lede="Paste or upload the boundary. We lock its H3 cells on-chain so the same land can never be registered twice, then the oracle starts scoring it every monitoring period." /><div className="mx-auto w-full max-w-6xl px-4 pb-6">
      <ol className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Steps">
        {["Polygon", "Overlap pre-check", "Metadata", "Transactions", "Done"].map((s, i) => (
          <li key={s} className="rounded-full border px-3 py-1" style={{ borderColor: step === i + 1 ? "var(--canopy)" : "var(--border)", fontWeight: step === i + 1 ? 600 : 400 }}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card p-4 flex flex-col gap-3 text-sm">
          {step === 1 && (
            <>
              <label>
                <span className="label">Paste GeoJSON (Polygon / MultiPolygon / Feature), EPSG:4326</span>
                <textarea className="input mono h-48" value={geomText} onChange={(e) => setGeomText(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[lon,lat],…]]}' />
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost" onClick={() => setGeomText(JSON.stringify(rect(-54.74, -3.38, 0.12, 0.1)))}>Example: overlaps the Tapajós block</button>
                <button className="btn btn-ghost" onClick={() => setGeomText(JSON.stringify(rect(-60.1, -8.2, 0.1, 0.08)))}>Example: fresh land (Rondônia)</button>
                <label className="btn btn-ghost cursor-pointer">
                  Upload .geojson
                  <input type="file" accept=".json,.geojson" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setGeomText(await f.text()); }} />
                </label>
              </div>
              <button className="btn btn-primary" onClick={precheck}>Compute H3 cells & pre-check overlap →</button>
            </>
          )}
          {step === 2 && overlap && (
            <>
              <div><span className="label">H3 cells (res {overlap.h3_res})</span><div className="mono text-lg">{overlap.cell_count}</div></div>
              <div><span className="label">Geometry sha256</span><div className="mono text-xs break-all">{overlap.geometry_sha256}</div></div>
              {overlap.conflicts.length ? (
                <div className="rounded-md border p-3" style={{ borderColor: "var(--red)", color: "var(--red)" }} role="alert">
                  <b>Overlap detected:</b> {overlap.conflicts.length} cell(s) already belong to {[...new Set(overlap.conflicts.map((c) => `Project #${c.project_id} (${c.project_name ?? "unnamed"})`))].join(", ")}. The contract will revert with <span className="mono">OverlapDetected</span>.
                  <label className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--fg)" }}>
                    <input type="checkbox" checked={insist} onChange={(e) => setInsist(e.target.checked)} /> Attempt the on-chain registration anyway (demo of the revert)
                  </label>
                </div>
              ) : (
                <div className="rounded-md border p-3" style={{ borderColor: "var(--teal)", color: "var(--teal)" }}>✓ No overlap with registered land.</div>
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" disabled={overlap.conflicts.length > 0 && !insist} onClick={() => setStep(3)}>Continue →</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <label><span className="label">Project name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label><span className="label">Start date</span><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
              <label><span className="label">Claimed annual deforestation baseline (%/yr)</span><input className="input mono" value={baseline} onChange={(e) => setBaseline(e.target.value)} /></label>
              <div className="text-xs" style={{ color: "var(--fg-muted)" }}>PDD upload / claim extraction (F8) is a roadmap feature.</div>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-primary" disabled={!name} onClick={() => setStep(4)}>Continue →</button>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <div>Wallet: <span className="mono">{address ?? "not connected"}</span></div>
              <div className="text-xs" style={{ color: "var(--fg-muted)" }}>createProject → addCells ×{Math.ceil((overlap?.cell_count ?? 0) / BATCH)} batches. Each new cell is one cold storage write.</div>
              <div className="text-xs" style={{ color: "var(--amber)" }}>Note: browser registration commits the res-8 cells (Tier-1 lock). The res-11 fine-cell Merkle root used for sliver fraud proofs is computed server-side when available; otherwise a placeholder root is stored and Tier-2 proofs are not possible for this project.</div>
              <button className="btn btn-primary" disabled={!isConnected || !reg} onClick={submit}>Send transactions</button>
              <ul className="mono text-xs flex flex-col gap-1">{progress.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </>
          )}
          {step === 5 && <div style={{ color: "var(--teal)" }}>✓ Registered. The issuer activates the project after review; the indexer will list it within a few blocks.</div>}
          {err && <div className="rounded-md border p-2 text-xs" style={{ borderColor: "var(--red)", color: "var(--red)" }} role="alert">{err}</div>}
        </div>
        <MapView className="h-[28rem] card overflow-hidden" overlays={overlays} fitTo={geom} />
      </div>
    </div>
    </div>
  );
}
