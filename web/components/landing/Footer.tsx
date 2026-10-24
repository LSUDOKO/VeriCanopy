import Link from "next/link";
import { Logo } from "@/components/Logo";

const COLS: [string, [string, string][]][] = [
  ["Product", [["/explore", "Registry"], ["/market", "Market"], ["/register", "Register"], ["/portfolio", "Portfolio"], ["/challenges", "Challenges"]]],
  ["Verify", [["/verify", "Verify an attestation"], ["/ask", "Ask about a score"], ["/status", "Network status"], ["/security", "Security & trust"], ["/how-it-works", "How it works"]]],
  ["Open source", [["https://github.com/LSUDOKO/VeriCanopy", "GitHub"], ["https://github.com/LSUDOKO/VeriCanopy/blob/main/docs/ARCHITECTURE.md", "Architecture"], ["https://github.com/LSUDOKO/VeriCanopy/blob/main/docs/BENCHMARKS.md", "Benchmarks"], ["https://github.com/LSUDOKO/VeriCanopy/blob/main/docs/LIMITATIONS.md", "Limitations"], ["https://sepolia.basescan.org", "Basescan"]]],
];

export function Footer() {
  return (
    <footer className="border-t hairline" style={{ background: "var(--white)" }}>
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo size={26} />
          <p className="mt-4 max-w-xs text-sm" style={{ color: "var(--fg-muted)" }}>Carbon credits that prove themselves. Scored from satellite pixels, proven on-chain, signed for decades.</p>
          <span className="pill mt-5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lime)" }} aria-hidden />Testnet · Base Sepolia</span>
        </div>
        {COLS.map(([h, links]) => (
          <nav key={h} aria-label={h}>
            <div className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>{h}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([href, l]) => <li key={l}><Link href={href} className="hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{l}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap flex flex-wrap items-center justify-between gap-3 border-t py-5 text-xs hairline" style={{ color: "var(--fg-muted)" }}>
        <span>© 2026 VeriCanopy. Pilot areas are monitored by the VeriCanopy team and are not issued carbon projects. Testnet credits carry no value.</span>
        <span>Data: Copernicus Sentinel · NASA GEDI/MODIS · UMD Hansen GFC · Google Earth Engine</span>
      </div>
    </footer>
  );
}
