"use client";

import { useState } from "react";

export function ManifestViewer({ manifest }: { manifest: Record<string, unknown> | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!manifest) return <div className="text-sm" style={{ color: "var(--fg-muted)" }}>No manifest available.</div>;
  return (
    <div>
      <button className="btn btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Hide" : "Show"} manifest JSON
      </button>
      {open && (
        <pre className="mono mt-2 max-h-96 overflow-auto rounded-md p-3 text-xs" style={{ background: "var(--surface-2)" }}>
          {JSON.stringify(manifest, null, 1)}
        </pre>
      )}
    </div>
  );
}
