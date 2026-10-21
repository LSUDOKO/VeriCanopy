import { bpsToScore, STATUS_META } from "@/lib/format";

export function IntegrityBadge({ scoreBps, status, size = "md" }: { scoreBps?: number | null; status: string; size?: "sm" | "md" | "lg" }) {
  const m = STATUS_META[status] ?? { label: status, icon: "·", color: "var(--fg-muted)" };
  const cls = size === "lg" ? "text-base px-3 py-1.5" : size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span
      role="status"
      aria-label={`Integrity ${bpsToScore(scoreBps)} of 100, ${m.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cls}`}
      style={{ borderColor: m.color, color: m.color, background: "color-mix(in srgb, " + m.color + " 10%, transparent)" }}
    >
      <span className="mono">{bpsToScore(scoreBps)}</span>
      <span aria-hidden>·</span>
      <span aria-hidden>{m.icon}</span>
      <span>{m.label}</span>
    </span>
  );
}
