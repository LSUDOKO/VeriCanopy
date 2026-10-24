/** Letters lifted along a shallow arc, like the reference's rolling titles. */
export function ArcText({ text, drop = ".18em", tilt = "10deg", className = "" }: { text: string; drop?: string; tilt?: string; className?: string }) {
  const chars = Array.from(text);
  return (
    <span className={`arc ${className}`} style={{ ["--n" as string]: chars.length, ["--arc-drop" as string]: drop, ["--arc-tilt" as string]: tilt }} aria-label={text}>
      {chars.map((c, i) => (
        <span key={i} style={{ ["--i" as string]: i }} aria-hidden>{c === " " ? " " : c}</span>
      ))}
    </span>
  );
}
