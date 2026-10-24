"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Project } from "@/lib/api";
import { integrityStatus } from "@/lib/format";
import { IntegrityBadge } from "./IntegrityBadge";

export function ProjectList({ projects, selected, onSelect }: { projects: Project[]; selected?: number | null; onSelect?: (id: number) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const rows = useMemo(
    () =>
      projects.filter((p) => {
        const s = integrityStatus(p.integrity.score_bps, p.status, 5000, p.integrity_status);
        return (!q || (p.name ?? "").toLowerCase().includes(q.toLowerCase()) || String(p.id) === q) && (!status || s === status) && (p.integrity.score_bps ?? 0) >= minScore * 100;
      }),
    [projects, q, status, minScore],
  );
  return (
    <div className="flex flex-col gap-3">
      <input className="input" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
      <div className="flex gap-2 text-sm">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {["Active", "UnderReview", "Impaired", "Frozen", "Pending", "Disputed"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap">
          <span className="label">min score</span>
          <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Minimum score" />
          <span className="mono text-xs w-6">{minScore}</span>
        </label>
      </div>
      <ul className="flex flex-col gap-2" aria-label="Projects">
        {rows.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect?.(p.id)}
              className="card w-full p-3 text-left hover:shadow-sm"
              style={selected === p.id ? { borderColor: "var(--canopy)" } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{p.name ?? `Project #${p.id}`}</div>
                  <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    #{p.id} · {p.country ?? "—"} · {p.cell_count} cells · {p.status}
                  </div>
                </div>
                <IntegrityBadge scoreBps={p.integrity.score_bps} status={integrityStatus(p.integrity.score_bps, p.status, 5000, p.integrity_status)} size="sm" />
              </div>
              <Link href={`/projects/${p.id}`} className="mt-2 inline-block text-xs underline" onClick={(e) => e.stopPropagation()}>
                Open project →
              </Link>
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm p-3" style={{ color: "var(--fg-muted)" }}>No projects match.</li>}
      </ul>
    </div>
  );
}
