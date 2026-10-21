"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "@/lib/api";
import { fmt } from "@/lib/format";

export function StatsBar() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats"), refetchInterval: 15_000 });
  const items: [string, string][] = [
    ["Projects", isLoading ? "…" : fmt(data?.projects)],
    ["Credits issued", isLoading ? "…" : fmt(data?.credits_issued)],
    ["Credits retired", isLoading ? "…" : fmt(data?.credits_retired)],
    ["tCO2e reversed", isLoading ? "…" : fmt(data?.tonnes_reversed)],
    ["Covered by buffers", isLoading ? "…" : fmt(data?.tonnes_covered_by_buffers)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(([k, v]) => (
        <div key={k} className="card px-3 py-2">
          <dt className="label">{k}</dt>
          <dd className="mono text-lg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
