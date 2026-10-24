"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Deployments } from "@/lib/api";

type Bench = {
  zk_benchmarks: Record<string, number | string> | null;
  pq_benchmarks: { ml_dsa_65: Record<string, number | string>; ecdsa_secp256k1: Record<string, number | string>; machine: string } | null;
  training_report: Record<string, number | string> | null;
  gas_report: string | null;
};

const v = (x: number | string | undefined | null, unit = "") => (x === undefined || x === null ? "—" : `${typeof x === "number" ? x.toLocaleString(undefined, { maximumFractionDigits: 3 }) : x}${unit}`);

export default function SecurityPage() {
  const b = useQuery({ queryKey: ["benchmarks"], queryFn: () => api<Bench>("/benchmarks") });
  const d = useQuery({ queryKey: ["deployments"], queryFn: () => api<Deployments>("/deployments") });
  const pq = b.data?.pq_benchmarks;
  const zk = b.data?.zk_benchmarks;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-6 text-sm">
      <h1 className="display text-5xl sm:text-6xl">Security & trust model</h1>

      <section className="card p-4">
        <h2 className="font-medium">What is proven, and by what</h2>
        <table className="mt-2 w-full">
          <thead><tr className="label text-left"><th>Claim</th><th>Covered by</th></tr></thead>
          <tbody>
            {[
              ["The registered model was used, unmodified", "zk proof (fixed params; verifier bound to the circuit) + ModelRegistry"],
              ["The score follows from the committed features", "zk proof (Poseidon feature commitment is a public instance)"],
              ["The features came from the stated satellite data", "NOT the zk proof → reproducible manifest + open challenge game"],
              ["The scoring rule is scientifically right", "NOT cryptography → open methodology + governance"],
            ].map(([a, c]) => (
              <tr key={a} className="border-t" style={{ borderColor: "var(--border)" }}><td className="py-1 pr-3">{a}</td><td style={{ color: "var(--fg-muted)" }}>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-medium">Post-quantum scope (honest)</h2>
        <table className="mt-2 w-full">
          <thead><tr className="label text-left"><th>Element</th><th>Quantum-safe?</th></tr></thead>
          <tbody>
            {[
              ["Manifest attestations (ML-DSA-65, FIPS 204)", "✅ Yes"],
              ["Hash commitments (SHA-256, keccak256)", "✅ Considered safe with sufficient output size"],
              ["Ethereum transaction signatures (ECDSA)", "❌ No; outside our control; roadmap: PQ account abstraction"],
              ["zk proofs (Halo2 + KZG)", "❌ No (pairing-based); roadmap: hash-based STARK proofs"],
              ["Overall", "Records are double-anchored: forging history requires breaking both ML-DSA and the chain"],
            ].map(([a, c]) => (
              <tr key={a} className="border-t" style={{ borderColor: "var(--border)" }}><td className="py-1 pr-3">{a}</td><td>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-medium">Trust model (MVP)</h2>
        <table className="mt-2 w-full">
          <thead><tr className="label text-left"><th>Component</th><th>MVP assumption</th><th>Production path</th></tr></thead>
          <tbody>
            {[
              ["Satellite data", "Public datasets via Earth Engine (fixture samples when no credentials)", "Multiple providers, data-availability commitments"],
              ["Feature extraction", "Reproducible manifest; anyone can recompute; challengeable", "zk/TEE proof of extraction"],
              ["Model inference", "Cryptographically proven (EZKL)", "PQ-friendly proof system"],
              ["Challenge resolution", "2-of-3 resolver multisig", "Staked, decentralised resolvers"],
              ["Registry admin", "Multisig / deployer (testnet)", "DAO / standards body"],
              ["Signatures", "ML-DSA-65 on manifests + ECDSA on txs", "PQ account abstraction"],
            ].map(([a, c, p]) => (
              <tr key={a} className="border-t" style={{ borderColor: "var(--border)" }}><td className="py-1 pr-3">{a}</td><td>{c}</td><td style={{ color: "var(--fg-muted)" }}>{p}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-medium">Measured: ECDSA secp256k1 vs ML-DSA-65</h2>
        <div className="text-xs" style={{ color: "var(--fg-muted)" }}>Measured by ai/pq/bench.py on {pq?.machine ?? "—"}. Dashes mean not measured.</div>
        <table className="mt-2 w-full mono">
          <thead><tr className="label text-left"><th>Metric</th><th>ECDSA</th><th>ML-DSA-65</th></tr></thead>
          <tbody>
            {[
              ["Public key size", v(pq?.ecdsa_secp256k1.public_key_bytes, " B"), v(pq?.ml_dsa_65.public_key_bytes, " B")],
              ["Signature size", v(pq?.ecdsa_secp256k1.signature_bytes, " B"), v(pq?.ml_dsa_65.signature_bytes, " B")],
              ["Sign time", v(pq?.ecdsa_secp256k1.sign_ms, " ms"), v(pq?.ml_dsa_65.sign_ms, " ms")],
              ["Verify time", v(pq?.ecdsa_secp256k1.verify_ms, " ms"), v(pq?.ml_dsa_65.verify_ms, " ms")],
            ].map(([a, b2, c]) => (
              <tr key={a} className="border-t" style={{ borderColor: "var(--border)" }}><td className="py-1">{a}</td><td>{b2}</td><td>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-medium">Measured: zkML (EZKL / Halo2-KZG)</h2>
        <table className="mt-2 w-full mono">
          <tbody>
            {[
              ["Circuit log-rows", v(zk?.logrows)],
              ["Input / output scale", `${v(zk?.input_scale)} / ${v(zk?.output_scale)}`],
              ["Proving time (mean)", v(zk?.prove_seconds_mean, " s")],
              ["Proof size", v(zk?.proof_bytes, " B")],
              ["Float vs proven max abs error", v(zk?.float_vs_proven_max_abs_err)],
              ["Verifier bytecode", "see docs/BENCHMARKS.md"],
            ].map(([a, c]) => (
              <tr key={a} className="border-t" style={{ borderColor: "var(--border)" }}><td className="py-1">{a}</td><td>{c}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4">
        <h2 className="font-medium">Deployed contracts (chain {d.data?.chainId ?? "—"})</h2>
        <ul className="mt-2 mono text-xs">
          {d.data ? Object.entries(d.data.contracts).map(([k, a]) => <li key={k}>{k}: {a}</li>) : <li>—</li>}
        </ul>
      </section>
    </div>
  );
}
