"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { reportUrl, type ReportVerify } from "@/lib/ask";
import { short } from "@/lib/format";

type Sig = { report_sha256?: string; pubkey_sha256?: string; pq_key_id?: string | null; cid?: string };

export function AuditorReport({ projectId, period }: { projectId: number; period: number }) {
  const [sig, setSig] = useState<Sig | null>(null);
  const [res, setRes] = useState<ReportVerify | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const check = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(reportUrl(projectId, period, "json"));
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail ?? r.statusText);
      const rep = await r.json();
      setSig(rep.signatures ?? null);
      setRes(await api<ReportVerify>("/reports/verify", { method: "POST", body: JSON.stringify(rep) }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label">Auditor report · period {period}</div>
          <div className="text-lg font-semibold tracking-tight">Signed with ML-DSA-65</div>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Score, drivers, evidence CIDs, on-chain transactions and challenge status in one document. The JSON is canonicalised and signed; the PDF is a rendering of it.
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-primary" href={reportUrl(projectId, period, "pdf")} target="_blank" rel="noreferrer">
            Download PDF
          </a>
          <a className="btn btn-ghost" href={reportUrl(projectId, period, "json")} target="_blank" rel="noreferrer">
            JSON
          </a>
          <button className="btn btn-ghost" onClick={check} disabled={busy}>
            {busy ? "Checking…" : "Verify signature"}
          </button>
        </div>
      </div>
      {err && <div className="text-sm" style={{ color: "var(--red)" }}>{err}</div>}
      {res && (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {(
            [
              ["ML-DSA-65 signature valid", res.signature_valid],
              ["Canonical sha256 matches", res.report_hash_matches],
              ["Signing key registered on-chain", res.key_registered_onchain],
              ["Key active", res.key_active],
            ] as [string, boolean][]
          ).map(([t, ok]) => (
            <div key={t} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: ok ? "var(--teal)" : "var(--red)" }}>
              <span style={{ color: ok ? "var(--teal)" : "var(--red)" }}>{ok ? "✓" : "✗"}</span>
              {t}
            </div>
          ))}
          <div className="sm:col-span-2 mono text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: "var(--fg-muted)" }}>
            <span title={sig?.report_sha256}>report {short(sig?.report_sha256)}</span>
            <span title={res.pubkey_sha256 ?? ""}>pubkey {short(res.pubkey_sha256)}</span>
            {res.key_owner && <span title={res.key_owner}>owner {short(res.key_owner)}</span>}
            {sig?.cid && <span title={sig.cid}>cid {short(sig.cid, 8)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
