"use client";

import { PageHero } from "@/components/PageHero";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Project } from "@/lib/api";
import { VerifyChecklist, type VerifyResult } from "@/components/VerifyChecklist";

export default function VerifyPage() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<{ projects: Project[] }>("/projects") });
  const [cid, setCid] = useState("");
  const [manifest, setManifest] = useState("");
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setRes(null);
    try {
      const body = manifest.trim() ? { manifest: JSON.parse(manifest) } : { manifest_cid: cid.trim() };
      setRes(await api<VerifyResult>("/verify/pq", { method: "POST", body: JSON.stringify(body) }));
    } catch (e) {
      setRes({ ok: false, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const subs = (projects.data?.projects ?? []).map((p) => p.integrity.latest_submission).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <div className="flex flex-1 flex-col"><PageHero eyebrow="Independent check" title="Verify an attestation" lede="Independent of this site: re-check the manifest hash against the chain, the ML-DSA-65 signature against the registered key, and the zk proof status." /><div className="wrap max-w-4xl py-8">
      
      <div className="card mt-4 p-4 flex flex-col gap-3 text-sm">
        <label>
          <span className="label">Select a submission</span>
          <select className="input mono" value={cid} onChange={(e) => setCid(e.target.value)}>
            <option value="">—</option>
            {subs.map((s) => (
              <option key={s.id} value={s.manifest_cid ?? ""}>
                #{s.id} · project {s.project_id} · {s.period} · {s.manifest_cid}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">…or paste a manifest CID</span>
          <input className="input mono" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="bafkrei…" />
        </label>
        <label>
          <span className="label">…or paste signed manifest JSON</span>
          <textarea className="input mono h-32" value={manifest} onChange={(e) => setManifest(e.target.value)} />
        </label>
        <button className="btn btn-primary self-start" onClick={run} disabled={busy || (!cid && !manifest)}>
          {busy ? "Verifying…" : "Run checks"}
        </button>
        {res && <VerifyChecklist r={res} />}
      </div>
    </div>
    </div>
  );
}
