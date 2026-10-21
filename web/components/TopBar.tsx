"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { NETWORK_LABEL } from "@/lib/wagmi";

const NAV = [
  ["/", "Explore"],
  ["/register", "Register"],
  ["/portfolio", "Portfolio"],
  ["/challenges", "Challenges"],
  ["/verify", "Verify"],
  ["/security", "Security"],
  ["/demo", "Demo"],
] as const;

export function TopBar() {
  const path = usePathname();
  const chainId = useChainId();
  return (
    <header className="sticky top-0 z-40 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-semibold" style={{ color: "var(--forest)" }}>
          <span aria-hidden className="inline-block h-6 w-6 rounded-full" style={{ background: "linear-gradient(135deg,var(--canopy),var(--teal))" }} />
          VeriCanopy
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-2.5 py-1.5 hover:bg-[var(--surface-2)]" style={path === href ? { background: "var(--surface-2)", fontWeight: 600 } : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
            {NETWORK_LABEL[chainId] ?? `chain ${chainId}`}
          </span>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </div>
      <nav className="md:hidden flex gap-1 overflow-x-auto px-2 pb-2 text-sm" aria-label="Main mobile">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-md px-2 py-1 whitespace-nowrap" style={path === href ? { background: "var(--surface-2)", fontWeight: 600 } : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
