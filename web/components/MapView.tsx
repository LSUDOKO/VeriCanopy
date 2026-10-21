"use client";

import { Map as MLMap, NavigationControl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { Project } from "@/lib/api";
import { integrityStatus, STATUS_META } from "@/lib/format";

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export type Overlay = { id: string; geojson: GeoJSON.GeoJSON; color: string; opacity?: number; outline?: boolean };

export function MapView({
  projects = [],
  overlays = [],
  selected,
  onSelect,
  fitTo,
  className = "",
  children,
}: {
  projects?: Project[];
  overlays?: Overlay[];
  selected?: number | null;
  onSelect?: (id: number) => void;
  fitTo?: GeoJSON.Geometry | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new MLMap({ container: el.current, style: STYLE, center: [-40, 5], zoom: 1.6, attributionControl: { compact: true } });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      ready.current = true;
      m.addSource("projects", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "projects-fill", type: "fill", source: "projects", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
      m.addLayer({ id: "projects-line", type: "line", source: "projects", paint: { "line-color": ["get", "color"], "line-width": 2 } });
      m.on("click", "projects-fill", (e) => {
        const f = e.features?.[0];
        if (f && onSelect) onSelect(Number(f.properties?.id));
      });
      m.on("mouseenter", "projects-fill", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "projects-fill", () => (m.getCanvas().style.cursor = ""));
      syncRef.current();
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const features = projects
      .filter((p) => p.geometry)
      .map((p) => ({
        type: "Feature" as const,
        geometry: p.geometry as GeoJSON.Geometry,
        properties: { id: p.id, color: STATUS_META[integrityStatus(p.integrity.score_bps, p.status)]?.color ?? "#2e7d4f", selected: p.id === selected },
      }));
    (m.getSource("projects") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    m.setPaintProperty("projects-line", "line-width", ["case", ["==", ["get", "id"], selected ?? -1], 4, 2]);
    for (const o of overlays) {
      const sid = `ov-${o.id}`;
      if (m.getSource(sid)) {
        (m.getSource(sid) as GeoJSONSource).setData(o.geojson);
      } else {
        m.addSource(sid, { type: "geojson", data: o.geojson });
        m.addLayer({ id: `${sid}-fill`, type: "fill", source: sid, paint: { "fill-color": o.color, "fill-opacity": o.opacity ?? 0.35 } });
        m.addLayer({ id: `${sid}-line`, type: "line", source: sid, paint: { "line-color": o.color, "line-width": 1 } });
      }
    }
    for (const id of Object.keys(m.getStyle().sources)) {
      if (id.startsWith("ov-") && !overlays.some((o) => `ov-${o.id}` === id)) {
        m.removeLayer(`${id}-fill`);
        m.removeLayer(`${id}-line`);
        m.removeSource(id);
      }
    }
  };

  useEffect(() => {
    syncRef.current = sync;
  });
  useEffect(() => {
    syncRef.current();
  }, [projects, overlays, selected]);

  useEffect(() => {
    const m = map.current;
    if (!m || !fitTo) return;
    const b = bounds(fitTo);
    if (b) m.fitBounds(b, { padding: 40, maxZoom: 12, duration: 600 });
  }, [fitTo]);

  return (
    <div className={`relative ${className}`}>
      <div ref={el} className="absolute inset-0" role="region" aria-label="Project map" />
      {children}
    </div>
  );
}

export function bounds(g: GeoJSON.Geometry | GeoJSON.GeoJSON): [[number, number], [number, number]] | null {
  const pts: number[][] = [];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") pts.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  if ("coordinates" in g) walk(g.coordinates);
  else if (g.type === "FeatureCollection") g.features.forEach((f) => walk((f.geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates));
  else if (g.type === "Feature") walk((g.geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates);
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}
