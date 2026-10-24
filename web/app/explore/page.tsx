"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { api, type Project } from "@/lib/api";
import type { Overlay } from "@/components/MapView";
import { ProjectList } from "@/components/ProjectList";
import { StatsBar } from "@/components/StatsBar";
import { ErrorState, Skeleton } from "@/components/States";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false });

const SOURCES: [string, string][] = [
  ["/logos/esa.svg", "Copernicus Sentinel-1/2"],
  ["/logos/nasa.svg", "NASA GEDI · MODIS"],
  ["/logos/earthengine.svg", "Earth Engine"],
  ["/logos/base.svg", "Base Sepolia"],
];

export default function ExplorePage() {
  const q = useQuery({ queryKey: ["projects"], queryFn: () => api<{ projects: Project[] }>("/projects"), refetchInterval: 15_000 });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCells, setShowCells] = useState(false);
  const cells = useQuery({ queryKey: ["cells", selected], queryFn: () => api<{ geojson: GeoJSON.GeoJSON }>(`/projects/${selected}/cells`), enabled: showCells && selected !== null });
  const projects = q.data?.projects ?? [];
  const sel = projects.find((p) => p.id === selected);
  const overlays: Overlay[] = showCells && cells.data ? [{ id: "cells", geojson: cells.data.geojson, color: "#b6fe00", opacity: 0.35 }] : [];
  return (
    <div className="flex flex-1 flex-col">
      <div className="crumple" style={{ background: "var(--lime)", color: "var(--forest)" }}>
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pb-5 pt-6">
          <div>
            <h1 className="display text-5xl sm:text-7xl">The registry</h1>
            <p className="mt-1 max-w-xl text-sm font-semibold">Every project, its live integrity score, and the forest it claims. Scores come from satellite pixels and carry an on-chain proof.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SOURCES.map(([src, name]) => (
              <span key={name} className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(255,255,255,.75)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-4 w-auto max-w-[70px]" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-4">
        <StatsBar />
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full overflow-y-auto border-r p-4 md:w-96" style={{ borderColor: "var(--border)", maxHeight: "calc(100vh - 200px)" }}>
          {q.isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}
          {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
          {q.data && <ProjectList projects={projects} selected={selected} onSelect={setSelected} />}
        </aside>
        <MapView className="min-h-[60vh] flex-1" projects={projects} overlays={overlays} selected={selected} onSelect={setSelected} fitTo={sel?.geometry ?? null}>
          <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow" style={{ background: "var(--forest)", color: "var(--lime)" }}>
            <input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} /> Show locked H3 cells
          </label>
        </MapView>
      </div>
    </div>
  );
}
