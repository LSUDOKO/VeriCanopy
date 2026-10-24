"use client";

import { PageHero } from "@/components/PageHero";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { api, type Challenge } from "@/lib/api";
import { useContract } from "@/lib/contracts";
import { decodeRevert } from "@/lib/errors";
import { fmtEth, STATUS_META } from "@/lib/format";
import { HashChip } from "@/components/HashChip";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { useToast } from "@/components/Toast";

function Countdown({ to }: { to: number | null }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(t);
  }, []);
  if (!to || !now) return <span>—</span>;
  const s = Math.max(0, Math.floor(to - now));
  return <span className="mono">{s > 0 ? `${Math.floor(s / 60)}m ${s % 60}s left` : "resolution period over"}</span>;
}

export default function ChallengesPage() {
  const q = useQuery({ queryKey: ["challenges"], queryFn: () => api<{ challenges: Challenge[] }>("/challenges"), refetchInterval: 10_000 });
  const cm = useContract("ChallengeManager");
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();
  const act = async (fn: "vote" | "resolveTimeout", args: unknown[]) => {
    if (!cm) return;
    try {
      const h = await writeContractAsync({ ...cm, functionName: fn, args });
      toast.push({ title: `${fn} sent`, body: h, kind: "success" });
    } catch (e) {
      toast.push({ title: "Transaction failed", body: decodeRevert(e), kind: "error" });
    }
  };
  const list = q.data?.challenges ?? [];
  const open = list.filter((c) => c.outcome === "Open");
  const done = list.filter((c) => c.outcome !== "Open");
  const Row = ({ c }: { c: Challenge }) => (
    <li className="card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b>Challenge #{c.id}</b> on submission #{c.submission_id} · <a className="underline" href={`/projects/${c.project_id}`}>project #{c.project_id}</a> period {c.period} · reason <span className="mono">{c.reason}</span>
        </div>
        <span style={{ color: STATUS_META[c.outcome]?.color }}>{STATUS_META[c.outcome]?.icon} {c.outcome}</span>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
        challenger <span className="mono">{c.challenger}</span> · bond {fmtEth(c.bond)} · votes uphold {c.votes_uphold} / reject {c.votes_reject} · evidence <HashChip value={c.evidence_cid} kind="cid" /> · {c.outcome === "Open" && <Countdown to={c.deadline} />}
      </div>
      {c.outcome === "Open" && (
        <div className="mt-2 flex gap-2">
          <button className="btn btn-ghost" disabled={!isConnected} onClick={() => act("vote", [BigInt(c.id), true])}>Vote: uphold (resolver)</button>
          <button className="btn btn-ghost" disabled={!isConnected} onClick={() => act("vote", [BigInt(c.id), false])}>Vote: reject (resolver)</button>
          <button className="btn btn-ghost" disabled={!isConnected} onClick={() => act("resolveTimeout", [BigInt(c.id)])}>Resolve timeout</button>
        </div>
      )}
    </li>
  );
  return (
    <div className="flex flex-1 flex-col"><PageHero title="Challenges" lede="Any pending score can be disputed with a bond. Resolvers recompute the manifest and vote; the losing side pays." /><div className="mx-auto w-full max-w-5xl px-4 pb-6">
      
      {q.isLoading && <Skeleton className="mt-4 h-32" />}
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <h2 className="mt-5 font-medium">Open ({open.length})</h2>
          {open.length === 0 ? <EmptyState title="No open challenges" /> : <ul className="mt-2 flex flex-col gap-2">{open.map((c) => <Row key={c.id} c={c} />)}</ul>}
          <h2 className="mt-5 font-medium">History ({done.length})</h2>
          {done.length === 0 ? <EmptyState title="No resolved challenges yet" /> : <ul className="mt-2 flex flex-col gap-2">{done.map((c) => <Row key={c.id} c={c} />)}</ul>}
        </>
      )}
    </div>
    </div>
  );
}
