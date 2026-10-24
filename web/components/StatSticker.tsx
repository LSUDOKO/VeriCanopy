/** Dashboard KPI as a round label (the brand's sticker language), with text + colour, never colour alone. */
export function StatSticker({ label, value, tone = "lime" }: { label: string; value: string; tone?: "lime" | "yellow" | "sky" | "orange" | "red" | "cream" }) {
  const bg: Record<string, string> = { lime: "var(--lime)", yellow: "var(--yellow)", sky: "var(--sky)", orange: "var(--orange)", red: "var(--red)", cream: "var(--cream)" };
  const ink = tone === "red" ? "#fff" : "var(--forest)";
  return (
    <div className="flex items-center gap-3 rounded-full py-2 pl-2 pr-5" style={{ background: "#fff", border: "1.5px solid var(--border)" }}>
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full display text-lg leading-none" style={{ background: bg[tone], color: ink, boxShadow: "inset 0 0 0 4px rgba(255,255,255,.4)" }}>
        {value.length > 6 ? <span className="text-sm">{value}</span> : value}
      </div>
      <div className="text-sm font-semibold leading-tight" style={{ color: "var(--forest)" }}>{label}</div>
    </div>
  );
}
