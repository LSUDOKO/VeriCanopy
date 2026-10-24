export function PhotoCard({ src, alt, caption, tape = true, className = "", style }: { src: string; alt: string; caption?: string; tape?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`photo-card ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" />
      {tape && <span className="tape" style={{ top: -10, left: "50%", marginLeft: -60, ["--r" as string]: "-3deg" }} aria-hidden />}
      {caption && <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs font-semibold" style={{ background: "rgba(1,57,0,.78)", color: "var(--lime)" }}>{caption}</div>}
    </div>
  );
}
