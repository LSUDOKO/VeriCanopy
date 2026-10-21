export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md ${className}`} style={{ background: "var(--surface-2)" }} aria-hidden />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="font-medium">{title}</div>
      {hint && <div className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="card p-6 text-center" role="alert" style={{ borderColor: "var(--red)" }}>
      <div className="font-medium" style={{ color: "var(--red)" }}>Something went wrong</div>
      <div className="mt-1 text-sm mono break-all" style={{ color: "var(--fg-muted)" }}>{msg}</div>
      {onRetry && (
        <button className="btn btn-ghost mt-3" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
