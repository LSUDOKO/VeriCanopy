"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { NETWORK_LABEL } from "@/lib/wagmi";
import { LogoMark } from "@/components/Logo";

const NAV = [
  ["/explore", "Registry"],
  ["/market", "Market"],
  ["/register", "Register"],
  ["/portfolio", "Portfolio"],
  ["/challenges", "Challenges"],
  ["/ask", "Ask"],
  ["/status", "Status"],
  ["/verify", "Verify"],
  ["/security", "Security"],
  ["/how-it-works", "How it works"],
] as const;

export function TopBar() {
  const path = usePathname();
  const chainId = useChainId();
  return (
    <header className="sticky top-0 z-40" style={{ background: "var(--forest)", color: "var(--lime)" }}>
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 display text-2xl" style={{ color: "var(--lime)" }}>
          <LogoMark size={30} />
          VeriCanopy
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 text-sm whitespace-nowrap" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="display rounded-md px-2 py-1.5 text-[15px] tracking-wide whitespace-nowrap hover:bg-[rgba(182,254,0,.15)]" style={path === href ? { background: "var(--lime)", color: "var(--forest)" } : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "var(--yellow)", color: "#5a3a12" }}>
            {NETWORK_LABEL[chainId] ?? `chain ${chainId}`}
          </span>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
        </div>
      </div>
      <nav className="md:hidden flex gap-1 overflow-x-auto px-2 pb-2 text-sm" aria-label="Main mobile">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="display rounded-md px-2 py-1 whitespace-nowrap" style={path === href ? { background: "var(--lime)", color: "var(--forest)" } : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
