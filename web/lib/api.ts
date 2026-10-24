export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const j = await r.json();
      msg = j.detail ?? j.error ?? msg;
    } catch {}
    throw new ApiError(msg, r.status);
  }
  return (await r.json()) as T;
}

export type Integrity = { score_bps: number | null; last_period: number | null; latest_submission: Submission | null };
export type Vintage = { token_id: string; vintage: number; issued: number; buffer: number; retired: number; burned: number };
export type Project = {
  id: number;
  developer: string;
  name: string | null;
  country: string | null;
  geometry: GeoJSON.Geometry | null;
  geometry_hash: string;
  h3_res: number;
  start_date: string | null;
  claimed_baseline_bps: number;
  status: string;
  metadata_uri: string | null;
  demo_id: string | null;
  cell_count: number;
  integrity_status: string | null;
  created_tx: string | null;
  integrity: Integrity;
  vintages: Vintage[];
};
export type Submission = {
  id: number;
  project_id: number;
  period: number;
  score_bps: number;
  reversal_tonnes: number;
  feature_commitment: string | null;
  model_hash: string | null;
  manifest_hash: string | null;
  manifest_cid: string | null;
  pq_key_id: string | null;
  oracle: string | null;
  stake: string | null;
  status: string;
  window_end: number | null;
  tx_hash: string | null;
  finalized_tx: string | null;
  proof_mode: "onchain" | "offchain" | "none";
  manifest?: Record<string, unknown> | null;
  manifest_url?: string | null;
};
export type Challenge = {
  id: number;
  submission_id: number;
  project_id?: number | null;
  period?: number | null;
  challenger: string;
  bond: string;
  reason: string;
  evidence_cid: string | null;
  votes_uphold: number;
  votes_reject: number;
  deadline: number | null;
  outcome: string;
  tx_hash?: string | null;
};
export type Stats = {
  projects: number;
  credits_issued: number;
  credits_retired: number;
  tonnes_reversed: number;
  tonnes_covered_by_buffers: number;
  indexed_block: number | null;
};
export type Deployments = {
  chainId: number;
  contracts: Record<string, `0x${string}`>;
  params: Record<string, number | string | boolean>;
};
export type Evidence = {
  available: boolean;
  reason?: string;
  period?: number;
  years?: number[];
  project_cover?: number[];
  twin_cover?: number[];
  fires?: { year: number; fraction: number }[];
  n_treat?: number;
  n_ctrl?: number;
  provider?: string;
  provenance?: string | null;
  manifest?: Record<string, unknown> | null;
};
