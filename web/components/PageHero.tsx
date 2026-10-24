export function PageHero({ title, lede, children }: { title: string; lede?: string; children?: React.ReactNode }) {
  return (
    <div className="page-hero crumple">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pb-6 pt-7">
        <div>
          <h1 className="display text-5xl sm:text-7xl">{title}</h1>
          {lede && <p className="mt-2 max-w-2xl text-sm font-semibold sm:text-base">{lede}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
