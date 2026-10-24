/** Dashboard KPI tile: value + label, colour dot as a secondary cue only. */
export function StatSticker({ label, value, tone = "lime" }: { label: string; value: string; tone?: "lime" | "yellow" | "sky" | "orange" | "red" | "cream" }) {
  const dot: Record<string, string> = { lime: "var(--teal)", yellow: "var(--amber)", sky: "var(--sky)", orange: "var(--orange)", red: "var(--red)", cream: "var(--grey)" };
  return (
    <div className="card flex min-w-[9.5rem] flex-col gap-1 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--fg-muted)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: dot[tone] }} aria-hidden />{label}</div>
      <div className="display text-2xl tabular-nums">{value}</div>
    </div>
  );
}
