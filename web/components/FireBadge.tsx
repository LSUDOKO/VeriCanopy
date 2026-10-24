"use client";

import { useQuery } from "@tanstack/react-query";
import { getFires } from "@/lib/feeds";

/** NASA FIRMS active-fire pill for a project (last 30 days). Renders nothing while loading. */
export function FireBadge({ projectId, days = 30 }: { projectId: number; days?: number }) {
  const q = useQuery({ queryKey: ["fires", projectId, days], queryFn: () => getFires(projectId, days), staleTime: 300_000 });
  const d = q.data;
  if (!d) return null;
  if (!d.available)
    return (
      <span className="pill text-xs" title={d.reason} style={{ color: "var(--fg-muted)" }}>
        Fire watch unavailable
      </span>
    );
  const hot = (d.count ?? 0) > 0;
  const tip = hot
    ? `${d.count} MODIS detection${d.count === 1 ? "" : "s"} in ${days} d · last ${d.last_detection ?? "—"} · max brightness ${d.max_brightness_k?.toFixed(0) ?? "—"} K · ${d.source}`
    : `No MODIS active-fire detections inside the parcel in the last ${days} days · ${d.source}`;
  return (
    <span
      className="pill inline-flex items-center gap-1.5 text-xs font-semibold"
      title={tip}
      style={{ background: hot ? "rgba(220,60,40,.12)" : "rgba(40,160,90,.12)", color: hot ? "var(--red)" : "var(--teal)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />
      {hot ? `${d.count} fire detection${d.count === 1 ? "" : "s"} · ${days}d` : `No fires · ${days}d`}
    </span>
  );
}
