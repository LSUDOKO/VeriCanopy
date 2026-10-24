"use client";

import { useQuery } from "@tanstack/react-query";
import { getRing, type Ring } from "@/lib/feeds";

/** Leakage ring data for MapView: `{ data, paint }` is ready for `addSource`/`addLayer` (fill + line). */
export function useRing(projectId: number, km = 10) {
  const q = useQuery({ queryKey: ["ring", projectId, km], queryFn: () => getRing(projectId, km), staleTime: 600_000 });
  const ring = q.data;
  return {
    ...q,
    layer: ring
      ? {
          id: `ring-${projectId}`,
          data: ring.ring as GeoJSON.Feature,
          paint: { fill: { "fill-color": "#f59e0b", "fill-opacity": 0.12 }, line: { "line-color": "#f59e0b", "line-width": 1.5, "line-dasharray": [2, 2] } },
        }
      : undefined,
  };
}

/** Legend + parcel-vs-ring loss table (Hansen, % of year-2000 forest lost per year). */
export function RingLegend({ ring }: { ring?: Ring }) {
  if (!ring) return null;
  const years = ring.years;
  const lp = ring.loss_pct;
  const peak = lp ? Math.max(...years.map((y) => Math.max(lp.parcel[y] ?? 0, lp.ring[y] ?? 0)), 0.01) : 1;
  return (
    <div className="card p-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "rgba(245,158,11,.25)", border: "1.5px dashed #f59e0b" }} aria-hidden />
        <span className="font-semibold">Leakage ring · {ring.km} km</span>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
        Forest loss just outside the parcel. If loss inside falls while the ring spikes, pressure moved rather than stopped.
      </p>
      {lp ? (
        <div className="mt-3 grid gap-1">
          {years.map((y) => (
            <div key={y} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-2 text-xs">
              <span className="mono">{y}</span>
              <Bar v={lp.parcel[y] ?? 0} peak={peak} color="var(--teal)" label="parcel" />
              <Bar v={lp.ring[y] ?? 0} peak={peak} color="#f59e0b" label="ring" />
            </div>
          ))}
          <div className="mt-1 flex gap-4 text-[10px]" style={{ color: "var(--fg-muted)" }}>
            <span><i className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--teal)" }} /> inside parcel</span>
            <span><i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#f59e0b" }} /> ring</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs" style={{ color: "var(--fg-muted)" }}>{ring.error ?? "Per-year loss not computed yet (requires Earth Engine)."}</p>
      )}
      <p className="mt-2 text-[10px]" style={{ color: "var(--fg-muted)" }}>{ring.source}</p>
    </div>
  );
}

function Bar({ v, peak, color, label }: { v: number; peak: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${v.toFixed(3)} %`}>
      <div className="h-2 flex-1 rounded-full" style={{ background: "var(--fog)" }}>
        <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (100 * v) / peak)}%`, background: color }} />
      </div>
      <span className="mono w-12 text-right">{v.toFixed(2)}%</span>
    </div>
  );
}
