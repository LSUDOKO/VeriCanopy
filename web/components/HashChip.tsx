"use client";

import { useState } from "react";
import { short } from "@/lib/format";
import { API_URL } from "@/lib/api";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "";

export function ExplorerLink({ hash, kind, label }: { hash: string; kind: "tx" | "address"; label?: string }) {
  if (!EXPLORER) return <span className="mono" title={hash}>{label ?? short(hash)}</span>;
  return (
    <a className="underline mono" href={`${EXPLORER}/${kind}/${hash}`} target="_blank" rel="noreferrer" title={hash}>
      {label ?? short(hash)}
    </a>
  );
}

export function HashChip({ value, kind = "hash", label }: { value?: string | null; kind?: "hash" | "tx" | "address" | "cid"; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="mono text-xs" style={{ color: "var(--fg-muted)" }}>—</span>;
  const href = kind === "cid" ? `${API_URL}/api/v1/ipfs/${value.replace("ipfs://", "")}` : EXPLORER && (kind === "tx" || kind === "address") ? `${EXPLORER}/${kind}/${value}` : undefined;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs mono" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }} title={value}>
      {label && <span className="label">{label}</span>}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="underline">
          {short(value)}
        </a>
      ) : (
        <span>{short(value)}</span>
      )}
      <button
        type="button"
        aria-label="Copy"
        className="opacity-60 hover:opacity-100"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {}
        }}
      >
        {copied ? "✓" : "⧉"}
      </button>
    </span>
  );
}
