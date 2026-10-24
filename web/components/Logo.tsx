"use client";
import { useId } from "react";

/**
 * VeriCanopy mark — a tree crown drawn as three overlapping canopy lobes over a short trunk, with a check-stroke
 * cut through the crown (verified canopy). One colour only: neon green by default; the check is negative space,
 * so the mark works on forest, cream or photo backgrounds.
 */
function Crown({ color, maskId }: { color: string; maskId: string }) {
  return (
    <>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d="M23 31l6 6 13-13" stroke="#000" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} fill={color}>
        <circle cx="22" cy="31" r="10" />
        <circle cx="42" cy="31" r="10" />
        <circle cx="32" cy="23" r="11" />
        <rect x="20" y="30" width="24" height="10" />
        <path d="M30 40h4v10h-4z" />
      </g>
      <path d="M24 50h16" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

export function LogoMark({ size = 32, color = "#b6fe00", className = "" }: { size?: number; color?: string; className?: string; ink?: string; leaf?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="VeriCanopy mark">
      <Crown color={color} maskId={`vc-${id}`} />
    </svg>
  );
}

export function Logo({ size = 88, color = "#b6fe00", className = "" }: { size?: number; color?: string; className?: string; ink?: string; leaf?: string; text?: string }) {
  const id = useId().replace(/:/g, "");
  const h = Math.round(size * 0.225);
  return (
    <svg width={size} height={h} viewBox="0 0 400 90" className={className} role="img" aria-label="VeriCanopy">
      <g transform="translate(3 3) scale(1.3)">
        <Crown color={color} maskId={`vcl-${id}`} />
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
