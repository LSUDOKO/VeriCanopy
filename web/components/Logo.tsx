/**
 * VeriCanopy mark — a tree crown drawn as three overlapping canopy lobes over a short trunk, with a check-stroke
 * running through the crown (verified canopy). Monochrome-safe: ink on leaf, or leaf on ink.
 */
function Crown({ ink, leaf }: { ink: string; leaf: string }) {
  return (
    <>
      <circle cx="32" cy="32" r="30" fill={ink} />
      {/* crown lobes */}
      <circle cx="22" cy="31" r="10" fill={leaf} />
      <circle cx="42" cy="31" r="10" fill={leaf} />
      <circle cx="32" cy="23" r="11" fill={leaf} />
      <rect x="20" y="30" width="24" height="10" fill={leaf} />
      {/* trunk */}
      <path d="M30 40h4v10h-4z" fill={leaf} />
      <path d="M24 50h16" stroke={leaf} strokeWidth="3" strokeLinecap="round" />
      {/* verification stroke */}
      <path d="M23 31l6 6 13-13" stroke={ink} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

export function LogoMark({ size = 32, ink = "#013900", leaf = "#b6fe00", className = "" }: { size?: number; ink?: string; leaf?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="VeriCanopy mark">
      <Crown ink={ink} leaf={leaf} />
    </svg>
  );
}

export function Logo({ size = 88, ink = "#013900", leaf = "#b6fe00", text = "#013900", className = "" }: { size?: number; ink?: string; leaf?: string; text?: string; className?: string }) {
  const h = Math.round(size * 0.225);
  const accent = leaf === "#b6fe00" && text === "#013900" ? "#2e7d4f" : leaf;
  return (
    <svg width={size} height={h} viewBox="0 0 400 90" className={className} role="img" aria-label="VeriCanopy">
      <g transform="translate(3 3) scale(1.3)">
        <Crown ink={ink} leaf={leaf} />
      </g>
      <text x="100" y="56" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="46" fill={text} letterSpacing="0.5">
        VERI<tspan fill={accent}>CANOPY</tspan>
      </text>
      <text x="101" y="76" fontFamily="var(--font-inter-tight), system-ui, sans-serif" fontSize="11.5" fontWeight="600" fill={text} letterSpacing="1.9">
        CREDITS THAT PROVE THEMSELVES
      </text>
    </svg>
  );
}
