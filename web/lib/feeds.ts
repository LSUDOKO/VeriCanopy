import { api } from "./api";

export type Fires = {
  project_id: number;
  days: number;
  source: string;
  available: boolean;
  reason?: string;
  count?: number;
  max_brightness_k?: number | null;
  last_detection?: string | null;
  points?: GeoJSON.FeatureCollection;
};
export type Alert = { id: string; kind: string; project_id: number | null; project_name: string | null; title: string; body: string; tx_hash: string | null; tx_url: string | null; ts: number };
export type PriceBand = {
  band: "A" | "B" | "C" | "D";
  score_min: number;
  score_max: number | null;
  listings: number;
  trades: number;
  listing_median_eth: number | null;
  listing_min_eth: number | null;
  listing_max_eth: number | null;
  trade_median_eth: number | null;
  reference_low_eth: number | null;
  reference_high_eth: number | null;
  basis: "trades" | "listings" | null;
};
export type PriceGuideData = { unit: string; bands: PriceBand[]; methodology: string };
export type Check = { ok: boolean; [k: string]: unknown };
export type Status = {
  status: "operational" | "degraded" | "outage";
  checked_at: number;
  chain_id: number;
  explorer_url: string;
  checks: Record<string, Check>;
  workers: Record<string, Record<string, unknown> | null>;
  contracts: Record<string, string>;
};
export type ModelCard = {
  chain: { model_hash: string | null; verifier: string | null; registry: string | null; artifacts_uri?: string; active?: boolean; feature_version?: number; output_scale?: number; read_from: string; error?: string };
  artifact: { onnx_sha256: string | null; vk_sha256: string | null; matches_chain: boolean };
  training: Record<string, unknown>;
  features: string[];
  zk: Record<string, unknown>;
  pq: Record<string, unknown>;
  datasets: { name: string; id: string; use: string }[];
  params: Record<string, number | string | boolean>;
};
export type RetirementRow = {
  id: number;
  serial: string;
  holder: string;
  token_id: string;
  amount: number;
  beneficiary: string | null;
  score_at_retirement_bps: number;
  ts: number | null;
  tx_hash: string | null;
  tx_url: string | null;
  project_id: number | null;
  project_name: string | null;
  country: string | null;
  vintage: number | null;
};
export type Ring = {
  project_id: number;
  km: number;
  ring: GeoJSON.Feature;
  years: number[];
  loss_pct: { parcel: Record<string, number>; ring: Record<string, number> } | null;
  source: string;
  error?: string;
};

export const getFires = (pid: number, days = 30) => api<Fires>(`/projects/${pid}/fires?days=${days}`);
export const getAlerts = (pid?: number) => api<{ alerts: Alert[] }>(`/alerts${pid ? `?project_id=${pid}` : ""}`);
export const getPriceGuide = () => api<PriceGuideData>("/market/price-guide");
export const getStatus = () => api<Status>("/status");
export const getModel = () => api<ModelCard>("/model");
export const getRetirements = (holder?: string) => api<{ retirements: RetirementRow[] }>(`/retirements${holder ? `?holder=${holder}` : ""}`);
export const getRetirement = (id: number) => api<RetirementRow>(`/retirements/${id}`);
export const getRing = (pid: number, km = 10) => api<Ring>(`/projects/${pid}/ring?km=${km}`);
