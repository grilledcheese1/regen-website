import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Benefits from "@/components/Benefits";
import Calculator from "@/components/Calculator";
import Showcase from "@/components/Showcase";
import Motion from "@/components/Motion";
import Insights from "@/components/Insights";
import Leaders from "@/components/Leaders";
import TipFeedback from "@/components/TipFeedback";
import NextMovePreview from "@/components/NextMovePreview";
import Move from "@/components/Move";
import Trust from "@/components/Trust";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Motion />
      <Nav />
      <main>
        {/* Move's scrubbed timeline spans #journey and starts at #hero-anchor; keep Move last inside it. */}
        <div id="journey">
          <Hero />
          <Features />
          <Benefits />
          <Calculator />
          <NextMovePreview />
          <Insights />
          <Leaders />
          <TipFeedback />
          <Move />
        </div>
        <Showcase />
        <Trust />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
