import { LogoMark } from "@/components/Logo";

/** One-shot curtain on first paint; pure CSS so it never blocks hydration. */
export function Preloader() {
  return (
    <div className="preloader fixed inset-0 z-[100] grid place-items-center" style={{ background: "var(--forest)" }} aria-hidden>
      <div className="flex flex-col items-center gap-4">
        <div className="animate-[spin_1.2s_linear_infinite]"><LogoMark size={72} /></div>
        <div className="display text-3xl" style={{ color: "var(--lime)" }}>Checking the forest…</div>
      </div>
    </div>
  );
}
