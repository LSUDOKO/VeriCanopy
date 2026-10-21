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
  Active: { label: "Active", icon: "✓", color: "var(--teal)" },
  UnderReview: { label: "Under review", icon: "⏳", color: "var(--amber)" },
  Impaired: { label: "Impaired", icon: "⚠", color: "var(--amber)" },
  Frozen: { label: "Frozen", icon: "⛔", color: "var(--red)" },
  Pending: { label: "Pending", icon: "·", color: "var(--fg-muted)" },
  Disputed: { label: "Disputed", icon: "⚠", color: "var(--red)" },
  Retired: { label: "Retired", icon: "✓", color: "var(--fg-muted)" },
  Finalized: { label: "Finalised", icon: "✓", color: "var(--teal)" },
  Challenged: { label: "Challenged", icon: "⚖", color: "var(--amber)" },
  Rejected: { label: "Rejected", icon: "✗", color: "var(--red)" },
  Voided: { label: "Voided", icon: "·", color: "var(--fg-muted)" },
  Open: { label: "Open", icon: "⚖", color: "var(--amber)" },
  Upheld: { label: "Upheld", icon: "✓", color: "var(--teal)" },
};
/** Project integrity status: Frozen/Impaired from the credit contract, else derived from score and registry status. */
export function integrityStatus(score_bps: number | null | undefined, projectStatus: string, impairThresholdBps = 5000): string {
  if (projectStatus === "UnderReview" || projectStatus === "Disputed") return projectStatus;
  if (score_bps === null || score_bps === undefined) return projectStatus === "Active" ? "Active" : projectStatus;
  return score_bps < impairThresholdBps ? "Impaired" : "Active";
}
