import Link from "next/link";
import { PageHero } from "@/components/PageHero";

const STEPS: [string, string, string][] = [
  ["Register land", "A developer submits a polygon. Its H3 cells are locked on-chain; any later polygon touching those cells is rejected with OverlapDetected. No land can be sold twice.", "Registry"],
  ["Score from pixels", "Every monitoring period the oracle pulls Sentinel-1/2, Hansen loss, GEDI biomass and MODIS fire for the project and for matched twin forest nearby, then builds a 16-number feature vector.", "Earth Engine"],
  ["Prove the model ran", "A small neural network turns features into an integrity score. An EZKL zero-knowledge proof of that inference is verified on-chain before the score is stored, so the oracle cannot invent a number.", "EZKL · Halo2"],
  ["Sign for decades", "The full manifest (datasets, dates, code commit, features) is signed with ML-DSA-65, a NIST post-quantum signature, and pinned by content hash.", "FIPS 204"],
  ["Challenge it", "Anyone can dispute a pending score by posting a bond. Three resolvers recompute the manifest and vote; the losing side is slashed.", "Game theory"],
  ["Live credits", "Credits are ERC-1155 vintages that carry the live score. If the forest burns, buffer credits burn first; a shortfall freezes the project and every holder is told.", "VeriCredit"],
  ["Trade with eyes open", "The Market shows the live integrity next to every price. Frozen projects cannot trade at all.", "Marketplace"],
];

export default function HowItWorks() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHero eyebrow="Pipeline" title="How it works" lede="Seven steps from a polygon to a credit that keeps proving itself. Everything below runs on Base Sepolia today with real satellite data." />
      <ol className="wrap grid gap-4 py-10 sm:grid-cols-2">
        {STEPS.map(([t, d, tag], i) => (
          <li key={t} className="card relative flex gap-5 p-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full display text-lg" style={{ background: "var(--forest)", color: "#fff" }}>{i + 1}</div>
            <div>
              <div className="chip mb-2">{tag}</div>
              <h2 className="display text-xl">{t}</h2>
              <p className="mt-2 text-[15px]" style={{ color: "var(--fg-muted)" }}>{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="wrap mb-14 flex flex-wrap gap-3">
        <Link href="/explore" className="btn btn-primary">Open the registry</Link>
        <Link href="/market" className="btn btn-lime">See what is for sale</Link>
        <Link href="/security" className="btn btn-ghost">Read the trust model</Link>
      </div>
    </div>
  );
}
