"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "@/lib/api";
import { StatSticker } from "./StatSticker";

const compact = (n?: number | null) => (n === null || n === undefined ? "—" : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n));

export function StatsBar() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats"), refetchInterval: 15_000 });
  const v = (n?: number | null) => (isLoading ? "…" : compact(n));
  return (
    <div className="flex flex-wrap gap-3">
      <StatSticker label="Projects registered" value={v(data?.projects)} tone="lime" />
      <StatSticker label="Credits issued (tCO2e)" value={v(data?.credits_issued)} tone="yellow" />
      <StatSticker label="Credits retired" value={v(data?.credits_retired)} tone="sky" />
      <StatSticker label="Forest lost, detected (tCO2e)" value={v(data?.tonnes_reversed)} tone="orange" />
      <StatSticker label="Covered by buffer burns" value={v(data?.tonnes_covered_by_buffers)} tone="red" />
    </div>
  );
}
