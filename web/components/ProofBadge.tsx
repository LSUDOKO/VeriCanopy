import { ExplorerLink } from "./HashChip";

export function ProofBadge({ mode, txHash }: { mode?: "onchain" | "offchain" | null; txHash?: string | null }) {
  if (!mode) return <span className="text-xs" style={{ color: "var(--fg-muted)" }}>No proof yet</span>;
  const onchain = mode === "onchain";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium" style={{ borderColor: onchain ? "var(--teal)" : "var(--amber)", color: onchain ? "var(--teal)" : "var(--amber)" }}>
      <span aria-hidden>{onchain ? "✓" : "◐"}</span>
      {onchain ? "Proof verified on-chain" : "Verified off-chain (fallback)"}
      {txHash && <ExplorerLink hash={txHash} kind="tx" label="tx" />}
    </span>
  );
}
