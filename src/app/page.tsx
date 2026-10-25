import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Showcase from "@/components/Showcase";
import Conditions from "@/components/Conditions";
import Motion from "@/components/Motion";
import Insights from "@/components/Insights";
import Move from "@/components/Move";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Motion />
      <Nav />
      <main>
        <div id="journey">
          <Hero />
          <Features />
          <Conditions />
          <Insights />
          <Move />
        </div>
        <Showcase />
      </main>
      <Footer />
    </>
  );
}
