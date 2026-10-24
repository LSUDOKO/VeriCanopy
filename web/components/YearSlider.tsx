"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL, api } from "@/lib/api";

type Tiles = { before: { year: number; url?: string }; after: { year: number; url?: string }; pending: boolean; source: string };

/** Scrub Sentinel-2 composites year by year. Tiles come from `/projects/{id}/tiles?period=YEAR` (cached per year). */
export function YearSlider({ projectId, years = Array.from({ length: 9 }, (_, i) => 2017 + i), onYear }: { projectId: number; years?: number[]; onYear?: (y: number) => void }) {
  const [year, setYear] = useState(years[years.length - 1]);
  const [playing, setPlaying] = useState(false);
  const q = useQuery({
    queryKey: ["tile-year", projectId, year],
    queryFn: () => api<Tiles>(`/projects/${projectId}/tiles?period=${year}`),
    refetchInterval: (r) => (r.state.data?.pending ? 4000 : false),
    placeholderData: keepPreviousData, // previous year's tile stays up while the next one loads (crossfade)
  });
  const url = q.data?.after.url ? `${API_URL}${q.data.after.url}` : undefined;
  const shown = url ? { url, year: q.data?.after.year ?? year } : null;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setYear((y) => years[(years.indexOf(y) + 1) % years.length]), 1600);
    return () => clearInterval(t);
  }, [playing, years]);
  useEffect(() => onYear?.(year), [year, onYear]);

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[4/3] w-full" style={{ background: "var(--fog)" }}>
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={shown.url} src={shown.url} alt={`Sentinel-2 composite ${shown.year}`} className="absolute inset-0 h-full w-full object-cover" style={{ animation: "vc-fade .6s ease" }} />
        )}
        {!shown && (
          <div className="absolute inset-0 grid place-items-center text-sm" style={{ color: "var(--fg-muted)" }}>
            {q.data?.pending ? "Rendering Sentinel-2 composite…" : q.isLoading ? "Loading…" : "No imagery for this year yet"}
          </div>
        )}
        <div className="absolute left-3 top-3 pill bg-black/60 text-white mono text-sm">{year}</div>
        {q.data?.pending && shown && <div className="absolute right-3 top-3 pill bg-black/60 text-white text-xs">rendering {year}…</div>}
        <style>{`@keyframes vc-fade{from{opacity:0}to{opacity:1}}`}</style>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" className="btn btn-ghost h-8 w-8 rounded-full p-0" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={years.length - 1}
          step={1}
          value={years.indexOf(year)}
          onChange={(e) => {
            setPlaying(false);
            setYear(years[Number(e.target.value)]);
          }}
          className="w-full accent-[var(--teal)]"
          aria-label="Year"
        />
        <div className="hidden sm:flex gap-1 text-[10px] mono" style={{ color: "var(--fg-muted)" }}>
          <span>{years[0]}</span>–<span>{years[years.length - 1]}</span>
        </div>
      </div>
      <div className="px-4 pb-3 text-xs" style={{ color: "var(--fg-muted)" }}>{q.data?.source ?? "Copernicus Sentinel-2 L2A via Google Earth Engine"}</div>
    </div>
  );
}
