import Link from "next/link";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: "var(--surface-2)" }} aria-hidden />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: { href: string; label: string } }) {
  return (
    <div className="card relative flex items-center gap-4 overflow-hidden p-6">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl" style={{ background: "var(--fog)", color: "var(--fg-muted)" }}>○</div>
      <div className="flex-1">
        <div className="display text-xl">{title}</div>
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
      <div className="display text-xl" style={{ color: "var(--red)" }}>Could not load this</div>
      <div className="mt-1 text-sm mono break-all" style={{ color: "var(--fg-muted)" }}>{msg}</div>
      {onRetry && (
        <button className="btn btn-ghost mt-3" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
