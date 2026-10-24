import { api } from "@/lib/api";

export type Driver = {
  feature: string;
  label: string;
  value: number;
  display: string;
  baseline: number;
  baseline_display: string;
  contribution: number;
  sentence: string;
};

export type Explain = {
  available: boolean;
  reason?: string;
  project_id: number;
  project_name: string | null;
  period: number;
  score: number;
  score_bps: number;
  model_hash: string | null;
  model_hash_matches_artifact: boolean;
  feature_version: string | null;
  method: string;
  summary: string;
  positive_drivers: Driver[];
  negative_drivers: Driver[];
  drivers: Driver[];
  data_sources: { id: string | null; name: string; role: string }[];
  provenance: string | null;
  date_ranges: Record<string, [string, string]> | null;
  created_at: string | null;
  proof: { mode: string | null; verified_onchain: boolean; tx_hash: string | null; tx_url: string | null; status: string; finalized_tx: string | null };
  signature: { algorithm: string | null; pq_key_id: string | null; manifest_sha256: string | null; manifest_cid: string | null };
  challenges: { id: number; reason: string; outcome: string }[];
};

export type ReportVerify = {
  ok: boolean;
  signature_valid: boolean;
  report_hash_matches: boolean;
  key_registered_onchain: boolean;
  key_active: boolean;
  key_owner: string | null;
  pubkey_sha256: string | null;
};

export const fetchExplain = (pid: number, period: number) => api<Explain>(`/projects/${pid}/periods/${period}/explain`);
export const reportUrl = (pid: number, period: number, ext: "json" | "pdf") => `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/v1/projects/${pid}/periods/${period}/report.${ext}`;

export const MCP_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/mcp`;

export const MCP_TOOLS: [string, string][] = [
  ["list_projects", "Every registered forest project with status and latest score"],
  ["get_project", "One project: geometry hash, vintages, integrity"],
  ["get_submissions", "Score submissions for a project with proof and tx links"],
  ["get_evidence", "Twin-chart series (project vs matched controls) for a period"],
  ["explain_score", "Deterministic per-feature attribution of a period's score"],
  ["list_listings", "Open marketplace listings with price and integrity"],
  ["prepare_buy_tx", "Unsigned Marketplace.buy calldata for your wallet to sign"],
  ["prepare_retire_tx", "Unsigned VeriCredit.retire calldata with beneficiary"],
  ["get_challenge", "A challenge, its votes and outcome"],
  ["verify_manifest", "Re-run the ML-DSA-65 / chain-hash checks on a manifest CID"],
];
