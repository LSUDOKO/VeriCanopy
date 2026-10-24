import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { MarketTeaser } from "@/components/landing/MarketTeaser";
import { Problem } from "@/components/landing/Problem";
import { Proof } from "@/components/landing/Proof";
import { Proves } from "@/components/landing/Proves";
import { Trust } from "@/components/landing/Trust";
import { Reveal } from "@/components/Reveal";

export default function Landing() {
  return (
    <div className="block">
      <Reveal />
      <Hero />
      <Problem />
      <Proves />
      <Proof />
      <MarketTeaser />
      <Trust />
      <CTA />
      <Footer />
    </div>
  );
}
