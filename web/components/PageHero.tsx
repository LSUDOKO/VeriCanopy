export function PageHero({ title, lede, eyebrow, children }: { title: string; lede?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="page-hero">
      <div className="wrap flex flex-wrap items-end justify-between gap-6 pb-8 pt-10 sm:pt-14">
        <div className="max-w-2xl">
          {eyebrow && <div className="eyebrow mb-3" style={{ color: "var(--teal)" }}>{eyebrow}</div>}
          <h1 className="display text-4xl sm:text-5xl">{title}</h1>
          {lede && <p className="lede mt-3">{lede}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
