"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getRetirements } from "@/lib/feeds";
import { PageHero } from "@/components/PageHero";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { HashChip } from "@/components/HashChip";
import { bpsToScore, tsToDate } from "@/lib/format";

export default function RetirementsPage() {
  const q = useQuery({ queryKey: ["retirements"], queryFn: () => getRetirements(), refetchInterval: 20_000 });
  const rows = q.data?.retirements ?? [];
  return (
    <div className="flex flex-1 flex-col">
      <PageHero title="Retirements" lede="Every retired tonne gets a certificate that links back to the on-chain burn, the project's integrity score at that moment, and the beneficiary." />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
        {q.isLoading && <Skeleton className="h-40" />}
        {q.data && rows.length === 0 && <EmptyState title="No retirements yet" hint="Retire credits from a project page or your portfolio to issue the first certificate." action={{ href: "/portfolio", label: "Portfolio" }} />}
        {rows.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead><tr className="text-left text-xs" style={{ color: "var(--fg-muted)" }}><th className="px-4 py-2">Serial</th><th className="px-4 py-2">Project</th><th className="px-4 py-2">Vintage</th><th className="px-4 py-2 text-right">tCO2e</th><th className="px-4 py-2">Score</th><th className="px-4 py-2">Beneficiary</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Tx</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-black/5">
                    <td className="px-4 py-2 mono"><Link className="underline" href={`/retirements/${r.id}`}>{r.serial}</Link></td>
                    <td className="px-4 py-2">{r.project_name ?? `#${r.project_id ?? "?"}`}</td>
                    <td className="px-4 py-2 mono">{r.vintage ?? "—"}</td>
                    <td className="px-4 py-2 text-right mono">{r.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 mono">{bpsToScore(r.score_at_retirement_bps)}</td>
                    <td className="px-4 py-2 truncate max-w-[14rem]">{r.beneficiary || "—"}</td>
                    <td className="px-4 py-2 text-xs">{tsToDate(r.ts)}</td>
                    <td className="px-4 py-2"><HashChip value={r.tx_hash} kind="tx" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
