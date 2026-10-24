/**
 * VeriCanopy mark: three forest facets (an isometric crown) over a lime check-chevron, plus a small lime "+".
 * Redrawn as clean geometry from brand/logo-original.png. Same paths as public/brand/logo-mark*.svg.
 */
export function LogoMark({ size = 28, ink = "#012c19", leaf = "#7ad101", className = "" }: { size?: number; ink?: string; leaf?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="VeriCanopy mark">
      <polygon fill={ink} points="60,6 86,20 86,46 60,60 34,46 34,20" />
      <polygon fill={ink} points="8,38 30,26 30,64 19,78 8,72" />
      <polygon fill={ink} points="112,38 90,26 90,64 101,78 112,72" />
      <polygon fill={leaf} points="36,60 60,74 84,60 84,76 60,92 36,76" />
      <path fill={leaf} d="M98 4h8v8h8v8h-8v8h-8v-8h-8v-8h8z" />
    </svg>
  );
}

/** Mark + wordmark. `tone="light"` for dark backgrounds. */
export function Logo({ size = 28, tone = "dark", className = "", compact = false }: { size?: number; tone?: "dark" | "light"; className?: string; compact?: boolean }) {
  const ink = tone === "light" ? "#ffffff" : "#012c19";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ color: ink }}>
      <LogoMark size={size} ink={ink} />
      <span className={`display ${compact ? "hidden sm:inline" : ""}`} style={{ fontSize: size * 0.82, letterSpacing: "-0.035em", fontWeight: 700, lineHeight: 1 }}>
        Veri<span style={{ color: "#7ad101" }}>Canopy</span>
      </span>
    </span>
  );
}
