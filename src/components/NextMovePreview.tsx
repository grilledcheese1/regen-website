import { SITE } from "@/config/site";
import { PERSONAS } from "@/config/personas";

/**
 * A preview of the Next Move app in its own light, red style, so the hand-off from this page to the
 * app reads as intentional rather than as a theme change.
 */
export default function NextMovePreview() {
  return (
    <section id="next-move" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Then, your smartest next move.</h2>
          <p>
            Your driving, your contract and your budget, turned into one recommended step: keep the car, buy it out, or switch.
            Three simulated customers get three different answers.
          </p>
        </div>
        <ul className="nm-cards" data-stagger>
          {PERSONAS.map((p) => (
            <li className="nm-card" key={p.id}>
              <div className="nm-top">
                <span className="nm-name">{p.name}</span>
                <span className="nm-status">{p.status}</span>
              </div>
              <p className="nm-situation">{p.situation}</p>
              <p className="nm-result">{p.result}</p>
              <p className="nm-step">
                <span>Next step</span>
                {p.nextStep}
              </p>
            </li>
          ))}
        </ul>
        <div className="nm-foot" data-reveal>
          <a href={SITE.nextMoveUrl} className="btn nm-btn">Open Next Move</a>
          <span>Simulated customers. Not a Toyota offer, quote or credit decision.</span>
        </div>
      </div>
    </section>
  );
}
