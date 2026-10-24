/** Round label sticker, like a tape roll label: tone + 2-3 short lines. */
export function Sticker({
  tone = "lime",
  title,
  sub,
  foot,
  size = 200,
  className = "",
  style,
}: {
  tone?: "lime" | "yellow" | "sky" | "orange" | "red" | "forest" | "cream";
  title: string;
  sub?: string;
  foot?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const bg: Record<string, string> = { lime: "var(--lime)", yellow: "var(--yellow)", sky: "var(--sky)", orange: "var(--orange)", red: "var(--red)", forest: "var(--forest)", cream: "var(--cream)" };
  const ink = tone === "forest" || tone === "red" ? "#f4f3ef" : "#0b1f0a";
  return (
    <div className={`sticker ${className}`} style={{ width: size, height: size, background: bg[tone], color: ink, ...style }}>
      <svg className="ring" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <path id={`c-${title.replace(/\W/g, "")}`} d="M50 50 m-40 0 a40 40 0 1 1 80 0 a40 40 0 1 1 -80 0" />
        </defs>
        <text fontSize="5.4" fontFamily="var(--font-anton)" fill={ink} letterSpacing="1" opacity="0.85">
          <textPath href={`#c-${title.replace(/\W/g, "")}`} textLength="250" lengthAdjust="spacingAndGlyphs">{(foot ?? "VERICANOPY · PROVEN ON-CHAIN · ").repeat(2)}</textPath>
        </text>
      </svg>
      <div style={{ padding: size * 0.18, position: "relative" }}>
        <div className="display" style={{ fontSize: size * 0.17 }}>{title}</div>
        {sub && <div style={{ fontSize: size * 0.07, marginTop: size * 0.03, fontWeight: 600, lineHeight: 1.1 }}>{sub}</div>}
      </div>
    </div>
  );
}
