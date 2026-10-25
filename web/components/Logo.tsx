/**
 * VeriCanopy mark: a hexagonal canopy of six faceted panels with a downward chevron (the verified credit).
 * One colour only, neon green by default.
 */
const PATHS = [
  "M0,84 L64,50 L64,232 L0,194 Z",
  "M327,84 L263,50 L263,232 L327,194 Z",
  "M94,38 L164,2 L234,38 L234,114 L164,156 L94,114 Z",
  "M94,140 L154,178 L154,222 L94,184 Z",
  "M234,140 L174,178 L174,222 L234,184 Z",
  "M94,210 L164,252 L234,210 L234,252 L164,300 L94,252 Z",
];

function Mark({ color }: { color: string }) {
  return (
    <g fill={color} stroke={color} strokeWidth={10} strokeLinejoin="round">
      {PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

export function LogoMark({ size = 32, color = "#b6fe00", className = "" }: { size?: number; color?: string; className?: string; ink?: string; leaf?: string }) {
  return (
    <svg width={size} height={Math.round(size * 320 / 343)} viewBox="-8 -8 343 320" className={className} role="img" aria-label="VeriCanopy mark">
      <Mark color={color} />
    </svg>
  );
}

export function Logo({ size = 88, color = "#b6fe00", className = "" }: { size?: number; color?: string; className?: string; ink?: string; leaf?: string; text?: string }) {
  const h = Math.round(size * 0.2143);
  return (
    <svg width={size} height={h} viewBox="0 0 420 90" className={className} role="img" aria-label="VeriCanopy">
      <g transform="translate(4 6) scale(0.25)">
        <Mark color={color} />
      </g>
      <text x="100" y="56" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="46" fill={color} letterSpacing="0.5">
        VERICANOPY
      </text>
      <text x="101" y="76" fontFamily="var(--font-inter-tight), system-ui, sans-serif" fontSize="11.5" fontWeight="600" fill={color} letterSpacing="1.9">
        CREDITS THAT PROVE THEMSELVES
      </text>
    </svg>
  );
}
