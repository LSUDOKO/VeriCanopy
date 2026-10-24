import Link from "next/link";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: "var(--surface-2)" }} aria-hidden />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: { href: string; label: string } }) {
  return (
    <div className="card relative flex items-center gap-4 overflow-hidden p-5">
      <span className="tape" style={{ top: -10, left: 20, width: 80, ["--r" as string]: "-5deg" }} aria-hidden />
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full display text-2xl" style={{ background: "var(--yellow)", color: "#5a3a12", boxShadow: "inset 0 0 0 4px rgba(255,255,255,.4)" }}>·</div>
      <div className="flex-1">
        <div className="display text-2xl" style={{ color: "var(--forest)" }}>{title}</div>
        {hint && <div className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>{hint}</div>}
      </div>
      {action && <Link href={action.href} className="btn btn-lime">{action.label}</Link>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="card p-6 text-center" role="alert" style={{ borderColor: "var(--red)" }}>
      <div className="display text-2xl" style={{ color: "var(--red)" }}>Could not load this</div>
      <div className="mt-1 text-sm mono break-all" style={{ color: "var(--fg-muted)" }}>{msg}</div>
      {onRetry && (
        <button className="btn btn-ghost mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
