"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type Project } from "@/lib/api";
import dynamic from "next/dynamic";
import type { Overlay } from "@/components/MapView";
const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), { ssr: false });
import { ProjectList } from "@/components/ProjectList";
import { StatsBar } from "@/components/StatsBar";
import { ErrorState, Skeleton } from "@/components/States";

export default function Explore() {
  const q = useQuery({ queryKey: ["projects"], queryFn: () => api<{ projects: Project[] }>("/projects"), refetchInterval: 15_000 });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCells, setShowCells] = useState(false);
  const cells = useQuery({
    queryKey: ["cells", selected],
    queryFn: () => api<{ geojson: GeoJSON.GeoJSON }>(`/projects/${selected}/cells`),
    enabled: showCells && selected !== null,
  });
  const projects = q.data?.projects ?? [];
  const sel = projects.find((p) => p.id === selected);
  const overlays: Overlay[] = showCells && cells.data ? [{ id: "cells", geojson: cells.data.geojson, color: "#14b8a6", opacity: 0.25 }] : [];
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-3">
        <StatsBar />
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full md:w-96 overflow-y-auto border-r p-4" style={{ borderColor: "var(--border)", maxHeight: "calc(100vh - 160px)" }}>
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
          <label className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md px-2 py-1 text-xs shadow" style={{ background: "var(--surface)" }}>
            <input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} /> H3 cells of selected project
          </label>
        </MapView>
      </div>
    </div>
  );
}
