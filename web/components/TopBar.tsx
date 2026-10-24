"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { NETWORK_LABEL } from "@/lib/wagmi";
import { Logo } from "@/components/Logo";

const PRIMARY = [
  ["/explore", "Registry"],
  ["/market", "Market"],
  ["/register", "Register"],
  ["/portfolio", "Portfolio"],
  ["/challenges", "Challenges"],
  ["/ask", "Ask"],
] as const;
const MORE = [
  ["/verify", "Verify an attestation"],
  ["/status", "Network status"],
  ["/how-it-works", "How it works"],
  ["/security", "Security & trust"],
  ["https://github.com/LSUDOKO/VeriCanopy", "GitHub"],
] as const;

export function TopBar() {
  const path = usePathname();
  const chainId = useChainId();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const onLanding = path === "/";
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    if (!more) return;
    const off = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [more]);
  const current = (href: string) => (path === href || (href !== "/" && path.startsWith(href + "/")) ? "page" : undefined);
  const moreActive = MORE.some(([h]) => current(h));
  return (
    <header className={`sticky top-0 z-40 border-b ${onLanding ? "glass-dark border-white/10" : "glass hairline"}`} style={onLanding ? { color: "#fff" } : undefined}>
      <div className="wrap flex h-14 items-center gap-3">
        <Link href="/" className="shrink-0" aria-label="VeriCanopy">
          <Logo size={26} tone={onLanding ? "light" : "dark"} compact />
        </Link>
        <nav className="mx-auto hidden items-center gap-0.5 lg:flex" aria-label="Main" style={onLanding ? { ["--fg" as string]: "#fff" } : undefined}>
          {PRIMARY.map(([href, label]) => (
            <Link key={href} href={href} className="nav-link" aria-current={current(href)} style={onLanding ? { color: "#fff" } : undefined}>{label}</Link>
          ))}
          <div ref={moreRef} className="relative">
            <button type="button" className="nav-link flex items-center gap-1" aria-haspopup="menu" aria-expanded={more} aria-current={moreActive ? "page" : undefined} onClick={() => setMore((v) => !v)} style={onLanding ? { color: "#fff" } : undefined}>
              More <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            {more && (
              <div role="menu" className="card absolute left-1/2 top-full mt-2 w-60 -translate-x-1/2 p-1.5 text-[var(--ink)]" style={{ boxShadow: "0 20px 50px rgba(0,0,0,.15)" }}>
                {MORE.map(([href, label]) => (
                  <Link key={href} role="menuitem" href={href} className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--fog)]" aria-current={current(href)} onClick={() => setMore(false)} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap lg:ml-0">
          <span className="pill hidden sm:inline-flex" style={onLanding ? { background: "rgba(255,255,255,.14)", color: "#fff" } : undefined}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lime)" }} aria-hidden />
            {NETWORK_LABEL[chainId] ?? `chain ${chainId}`}
          </span>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              {open ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto lg:hidden" style={{ background: "var(--white)", color: "var(--ink)" }}>
          <nav className="wrap flex flex-col py-4" aria-label="Main mobile">
            {[...PRIMARY, ...MORE].map(([href, label]) => (
              <Link key={href} href={href} className="display flex items-center justify-between border-b py-4 text-2xl hairline" aria-current={current(href)} onClick={() => setOpen(false)} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                {label}
                <span aria-hidden style={{ color: "var(--fg-muted)" }}>→</span>
              </Link>
            ))}
            <p className="mt-6 text-sm" style={{ color: "var(--fg-muted)" }}>Testnet · Base Sepolia · credits carry no real value.</p>
          </nav>
        </div>
      )}
    </header>
  );
}
