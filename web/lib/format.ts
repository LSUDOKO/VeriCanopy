export const short = (h?: string | null, n = 6) => (h ? (h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h) : "—");
export const bpsToScore = (bps?: number | null) => (bps === null || bps === undefined ? "—" : (bps / 100).toFixed(1));
export const fmt = (n?: number | null) => (n === null || n === undefined ? "—" : n.toLocaleString());
export const fmtEth = (wei?: string | bigint | null, unit = "ETH") => {
  if (wei === null || wei === undefined) return "—";
  const v = Number(BigInt(wei)) / 1e18;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${unit}`;
};
export const tsToDate = (ts?: number | null) => (ts ? new Date(ts * 1000).toLocaleString() : "—");
export const tokenIdParts = (tokenId: string | bigint) => {
  const t = BigInt(tokenId);
  return { projectId: Number(t >> 16n), vintage: Number(t & 0xffffn) };
};
export type IntegrityStatus = "Active" | "UnderReview" | "Impaired" | "Frozen";
export const STATUS_META: Record<string, { label: string; icon: string; color: string }> = {
  Active: { label: "Active", icon: "✓", color: "#0f8f5a" },
  UnderReview: { label: "Under review", icon: "⏳", color: "#e3a008" },
  Impaired: { label: "Impaired", icon: "⚠", color: "#ff7a1a" },
  Frozen: { label: "Frozen", icon: "⛔", color: "#e63946" },
  Pending: { label: "Pending", icon: "·", color: "#4f5f4b" },
  Disputed: { label: "Disputed", icon: "⚠", color: "#e63946" },
  Retired: { label: "Retired", icon: "✓", color: "#4f5f4b" },
  Finalized: { label: "Finalised", icon: "✓", color: "#0f8f5a" },
  Challenged: { label: "Challenged", icon: "⚖", color: "#e3a008" },
  Rejected: { label: "Rejected", icon: "✗", color: "#e63946" },
  Voided: { label: "Voided", icon: "·", color: "#4f5f4b" },
  Open: { label: "Open", icon: "⚖", color: "#e3a008" },
  Upheld: { label: "Upheld", icon: "✓", color: "#0f8f5a" },
};
/** Project integrity status: Frozen/Impaired from the credit contract, else derived from score and registry status. */
export function integrityStatus(score_bps: number | null | undefined, projectStatus: string, impairThresholdBps = 5000, onChain?: string | null): string {
  if (onChain === "Frozen" || onChain === "Impaired") return onChain; // VeriCredit's own state wins
  if (projectStatus === "UnderReview" || projectStatus === "Disputed") return projectStatus;
  if (score_bps === null || score_bps === undefined) return projectStatus === "Active" ? "Active" : projectStatus;
  return score_bps < impairThresholdBps ? "Impaired" : "Active";
}
