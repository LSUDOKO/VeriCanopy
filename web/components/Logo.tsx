/** VeriCanopy badge: a leaf-shaped blob (dark forest) carrying the wordmark in lime, with a canopy swoosh. */
export function Logo({ size = 88, className = "" }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.62);
  return (
    <svg width={size} height={h} viewBox="0 0 200 124" className={className} role="img" aria-label="VeriCanopy">
      <defs>
        <filter id="lg-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <path
        d="M22 36C34 10 76 2 114 4c40 2 76 12 82 42 5 26-10 50-40 62-34 14-96 16-130-4C-8 90 4 54 22 36Z"
        fill="#013900"
        filter="url(#lg-shadow)"
      />
      <path d="M150 30c22 6 34 22 26 40-6 12-20 10-18-4 2-12-8-24-8-36Z" fill="#b6fe00" opacity="0.95" />
      <text x="100" y="58" textAnchor="middle" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="42" fill="#b6fe00" letterSpacing="1">
        VERI
      </text>
      <text x="100" y="98" textAnchor="middle" fontFamily="var(--font-anton), Impact, 'Arial Narrow', sans-serif" fontSize="42" fill="#f4f3ef" letterSpacing="1">
        CANOPY
      </text>
      <path d="M40 106c40 10 90 10 124-4" stroke="#b6fe00" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="VeriCanopy mark">
      <path d="M8 22C14 8 36 2 50 8c12 5 14 22 6 36-8 14-32 20-46 10C-2 46 1 32 8 22Z" fill="#013900" />
      <path d="M20 40c6-18 20-24 26-22-2 8-10 22-26 22Z" fill="#b6fe00" />
      <path d="M22 44l22-20" stroke="#013900" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
