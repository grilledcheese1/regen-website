import { SITE } from "@/config/site";
import insights from "@/data/insights.json";

export default function Hero() {
  return (
    <section id="top" className="section hero">
      <div className="container">
        <h1 className="hero-title">
          <span className="w">Every</span> <span className="w">brake</span> <span className="w">is</span>{" "}
          <em>
            <span className="w">free</span> <span className="w">energy.</span>
            <span className="regen-bar" aria-hidden />
          </em>
        </h1>
        <p className="sub hero-rest">
          Regen Coach shows how much you’re leaving on the road. {SITE.description.split(". ")[1]}
        </p>
        <div className="cta-row hero-rest">
          <a href={SITE.appUrl} className="btn btn-primary">Find your next move</a>
          <a href="#how" className="btn btn-ghost">How it scores</a>
        </div>
        <div id="hero-anchor" className="hero-anchor hero-rest" aria-hidden />
        <p className="hero-figures">
          A simulated driver recovers {insights.annual.gallons} gal, ${insights.annual.dollars} and {insights.annual.co2Lb} lb of CO₂ a year.
        </p>
      </div>
    </section>
  );
}
