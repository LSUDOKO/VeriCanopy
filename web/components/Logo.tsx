/**
 * VeriCanopy mark: three overlapping canopy arcs forming a shield-like crown, with a check-stroke cut through
 * the centre (verify + canopy). Wordmark in the display face. Works on lime, forest and cream.
 */
export function LogoMark({ size = 32, ink = "#013900", leaf = "#b6fe00", className = "" }: { size?: number; ink?: string; leaf?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="VeriCanopy mark">
      <circle cx="32" cy="32" r="30" fill={ink} />
      <path d="M12 36c4-12 12-18 20-18s16 6 20 18c-6-4-13-6-20-6s-14 2-20 6Z" fill={leaf} />
      <path d="M17 44c3-8 8-12 15-12s12 4 15 12c-5-3-10-4-15-4s-10 1-15 4Z" fill={leaf} opacity=".75" />
      <path d="M22 39l6 6 14-14" stroke={ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ size = 88, ink = "#013900", leaf = "#b6fe00", text = "#013900", className = "" }: { size?: number; ink?: string; leaf?: string; text?: string; className?: string }) {
  const h = Math.round(size * 0.26);
  return (
    <svg width={size} height={h} viewBox="0 0 350 90" className={className} role="img" aria-label="VeriCanopy">
      <circle cx="45" cy="45" r="42" fill={ink} />
      <path d="M17 50c5-16 16-24 28-24s23 8 28 24c-8-5-18-8-28-8s-20 3-28 8Z" fill={leaf} />
      <path d="M24 61c4-11 11-16 21-16s17 5 21 16c-7-4-14-5-21-5s-14 1-21 5Z" fill={leaf} opacity=".75" />
      <path d="M31 54l8 8 19-19" stroke={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="100" y="56" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="46" fill={text} letterSpacing="0.5">VERI</text>
      <text x="100" y="56" dx="86" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="46" fill={leaf === "#b6fe00" && text === "#013900" ? "#2e7d4f" : leaf} letterSpacing="0.5">CANOPY</text>
      <text x="101" y="76" fontFamily="var(--font-inter-tight), system-ui, sans-serif" fontSize="12" fontWeight="600" fill={text} letterSpacing="2.2">CREDITS THAT PROVE THEMSELVES</text>
    </svg>
  );
}
