export type MarketListing = {
  id: number;
  seller: string;
  token_id: string;
  project_id: number;
  project_name: string | null;
  country: string | null;
  project_status: string | null;
  integrity_status: string | null;
  score_bps: number | null;
  vintage: number;
  amount_listed: number;
  amount_left: number;
  price_per_unit_wei: string;
  active: boolean;
  tx_hash: string | null;
};
export type MarketStats = { open_units: number; units_traded: number; volume_wei: string; listings: number };
export const ethPerUnit = (wei: string) => Number(BigInt(wei)) / 1e18;
