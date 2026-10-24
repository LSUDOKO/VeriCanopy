"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";
import { api, type Project } from "@/lib/api";
import type { Overlay } from "@/components/MapView";
import { ProjectList } from "@/components/ProjectList";
import { StatsBar } from "@/components/StatsBar";
import { PageHero } from "@/components/PageHero";
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
      <PageHero eyebrow="Registry" title="Every project, scored from orbit." lede="Live integrity scores for every registered forest. Scores come from satellite pixels and carry an on-chain proof.">
        <div className="flex flex-wrap items-center gap-2">
          {SOURCES.map(([src, name]) => (
            <span key={name} className="pill" style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-4 w-auto max-w-[70px]" />
              {name}
            </span>
          ))}
        </div>
      </PageHero>
      <div className="wrap py-5">
        <StatsBar />
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full overflow-y-auto border-r p-4 hairline md:w-96" style={{ maxHeight: "calc(100vh - 56px)" }}>
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
          <label className="glass absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow">
            <input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} /> Show locked H3 cells
          </label>
        </MapView>
      </div>
    </div>
  );
}
