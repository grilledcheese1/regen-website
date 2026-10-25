import insights from "@/data/insights.json";

const r = insights.receipt;
const dots = (label: string, width = 22) => `${label} ${".".repeat(Math.max(2, width - label.length))}`;

/** One real generated trip from the product (see scripts/build-insights.mjs), shown as a terminal report. */
export default function Showcase() {
  return (
    <section id="drive" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Then see the receipt.</h2>
        </div>
        <div className="receipt">
          <div className="code" role="img" aria-label={`Sample trip report: regen score ${r.score} out of 100`}>
            <div className="lights"><i /><i /><i /></div>
            <div className="k">
              trip · {r.route} route · {r.driver} driver · {r.condition} · {r.distanceKm} km · simulated
            </div>
            <div className="score"><b>{r.score}</b><span>/100 · regen score (estimate)</span></div>
            <div><span className="g">■</span> {dots("energy recovered")} {r.recoveredKwh} of {r.ceilingKwh} kWh</div>
            <div><span className="r">■</span> {dots("lost as brake heat")} {r.heatLossKwh} kWh</div>
            {r.missed.map((m) => (
              <div key={m.cause}><span className="a">■</span> {dots(`missed: ${m.cause}`)} {m.count}×</div>
            ))}
            <br />
            <div className="k">vs. conventional car, this trip</div>
            <div>fuel ....... <span className="g">−{r.gallons} gal</span></div>
            <div>cost ....... <span className="g">−${r.dollars.toFixed(2)}</span></div>
            <div>co2 ........ <span className="g">−{r.co2Lb} lb</span></div>
            <br />
            <div className="k">coach</div>
            <div>{r.tip}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
