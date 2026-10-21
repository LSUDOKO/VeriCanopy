"use client";

import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Evidence } from "@/lib/api";

export function TwinChart({ ev, startYear }: { ev: Evidence; startYear?: number | null }) {
  if (!ev.available || !ev.years) return null;
  const data = ev.years.map((y, i) => ({
    year: y,
    project: +(100 * (ev.project_cover?.[i] ?? 0)).toFixed(2),
    twins: +(100 * (ev.twin_cover?.[i] ?? 0)).toFixed(2),
    fire: +(100 * (ev.fires?.[i]?.fraction ?? 0)).toFixed(2),
  }));
  const fires = (ev.fires ?? []).filter((f) => f.fraction > 0.02);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
          <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="fire" name="Burned this year" fill="var(--red)" stroke="var(--red)" fillOpacity={0.15} />
          <Line type="monotone" dataKey="twins" name="Matched twin forest (cover %)" stroke="var(--amber)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="project" name="Project (cover %)" stroke="var(--canopy)" strokeWidth={2.5} dot={false} />
          {startYear && <ReferenceLine x={startYear} stroke="var(--teal)" strokeDasharray="4 4" label={{ value: "project start", fontSize: 11, fill: "var(--teal)" }} />}
          {fires.map((f) => (
            <ReferenceLine key={f.year} x={f.year} stroke="var(--red)" label={{ value: "fire", fontSize: 11, fill: "var(--red)" }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreHistoryChart({ points }: { points: { period: number; score_bps: number; status: string }[] }) {
  const data = points.map((p) => ({ period: p.period, score: p.score_bps / 100, status: p.status }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "var(--surface)", borderColor: "var(--border)", fontSize: 12 }} />
          <ReferenceLine y={50} stroke="var(--amber)" strokeDasharray="4 4" label={{ value: "impair threshold", fontSize: 11, fill: "var(--amber)" }} />
          <ReferenceLine y={70} stroke="var(--teal)" strokeDasharray="4 4" label={{ value: "issuance threshold", fontSize: 11, fill: "var(--teal)" }} />
          <Line type="monotone" dataKey="score" name="Integrity score" stroke="var(--canopy)" strokeWidth={2.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
