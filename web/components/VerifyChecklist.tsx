"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export type VerifyResult = {
  ok: boolean;
  error?: string;
  manifest_hash_matches_chain?: boolean;
  key_registered?: boolean;
  signature_valid?: boolean;
  zk_proof_verified?: boolean;
  proof_mode?: string | null;
  details?: Record<string, unknown>;
};

export function VerifyChecklist({ r }: { r: VerifyResult }) {
  const rows: [string, boolean | undefined, string][] = [
    ["Manifest hash matches the on-chain submission", r.manifest_hash_matches_chain, "sha256 of the canonical manifest equals `manifestHash` stored by IntegrityOracle"],
    ["ML-DSA-65 public key registered on-chain", r.key_registered, "PQKeyRegistry holds sha256(pubKey) for this key id and the key bytes match"],
    ["ML-DSA-65 signature valid", r.signature_valid, "FIPS 204 signature over the canonical manifest verifies with the registered key"],
    [r.proof_mode === "offchain" ? "zk proof verified off-chain (fallback)" : "zk proof verified on-chain", r.zk_proof_verified, r.proof_mode === "offchain" ? "Proof hash anchored on-chain; verification ran in the oracle backend" : "Halo2Verifier accepted the proof in the submitScore transaction"],
  ];
  return (
    <div className="flex flex-col gap-2 text-sm">
      {r.error && <div style={{ color: "var(--red)" }}>{r.error}</div>}
      {rows.map(([t, ok, why]) => (
        <div key={t} className="flex items-start gap-2 rounded-md border p-2" style={{ borderColor: ok ? "var(--teal)" : "var(--red)" }}>
          <span aria-hidden style={{ color: ok ? "var(--teal)" : "var(--red)" }}>{ok ? "✓" : "✗"}</span>
          <div>
            <div>{t}</div>
            <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{why}</div>
          </div>
        </div>
      ))}
      <div className="font-medium" style={{ color: r.ok ? "var(--teal)" : "var(--red)" }}>{r.ok ? "All checks passed" : "Verification failed"}</div>
      {r.details && <pre className="mono text-xs overflow-auto rounded-md p-2" style={{ background: "var(--surface-2)" }}>{JSON.stringify(r.details, null, 1)}</pre>}
    </div>
  );
}

export function PQVerifyButton({ manifestCid }: { manifestCid: string | null }) {
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="btn btn-ghost"
        disabled={!manifestCid || busy}
        onClick={async () => {
          setBusy(true);
          try {
            setRes(await api<VerifyResult>("/verify/pq", { method: "POST", body: JSON.stringify({ manifest_cid: manifestCid }) }));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Verifying…" : "Verify ML-DSA-65 signature"}
      </button>
      {res && <div className="mt-2"><VerifyChecklist r={res} /></div>}
    </div>
  );
}
