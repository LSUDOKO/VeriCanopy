import { Band } from "@/components/landing/Band";
import { Footer } from "@/components/landing/Footer";
import { Giant } from "@/components/landing/Giant";
import { Hero } from "@/components/landing/Hero";
import { MakeItStick } from "@/components/landing/MakeItStick";
import { Preloader } from "@/components/landing/Preloader";
import { Showcase } from "@/components/landing/Showcase";
import { Trust } from "@/components/landing/Trust";

export default function Landing() {
  return (
    <div className="flex flex-col">
      <Preloader />
      <Hero />
      <Band text="When forests get messy, something has to hold" />
      <Showcase />
      <Giant />
      <Band text="Scored · proven · signed · watched" tone="orange" tilt={2} />
      <Trust />
      <MakeItStick />
      <Footer />
    </div>
  );
}
