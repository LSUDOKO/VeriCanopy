import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  const links = [["/explore", "Registry"], ["/demo", "Demo"], ["/security", "Security"], ["https://github.com/LSUDOKO/VeriCanopy", "GitHub"]];
  return (
    <footer className="crumple crumple-dark arc-top relative overflow-hidden px-6 pb-10 pt-[14vw] sm:px-12" style={{ background: "var(--forest)", color: "var(--lime)" }}>
      <nav className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 display text-2xl">
        {links.map(([h, l]) => <Link key={l} href={h} className="hover:underline">{l}</Link>)}
      </nav>
      <div className="relative mt-10 text-center">
        <div className="mx-auto mb-8 w-max"><Logo size={120} /></div>
        <div className="display" style={{ fontSize: "clamp(4rem, 18vw, 20rem)", lineHeight: 0.8 }}>Prove<br />it stuck</div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--cream)" }}>
        <span>© 2026 VeriCanopy · IEEE ClimateChain hackathon build · demo polygons are not real carbon projects</span>
        <span>Data: Copernicus Sentinel · NASA GEDI/MODIS · UMD Hansen GFC · Google Earth Engine</span>
      </div>
    </footer>
  );
}
