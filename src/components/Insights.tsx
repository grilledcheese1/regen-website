import insights from "@/data/insights.json";

const style = (name: string) => insights.byStyle.find((s) => s.style === name)!;
const smooth = style("smooth");
const mixed = style("mixed");
const aggressive = style("aggressive");
const [topCause, ...otherCauses] = insights.missedCauses;
const { coaching, money } = insights;

const THEMES = [
  {
    stat: `${Math.round(smooth.baselineScore)} vs ${Math.round(aggressive.baselineScore)}`,
    title: "Driving style beats the car.",
    body: `Smooth drivers started around ${Math.round(smooth.baselineScore)} on the regen score, mixed drivers near ${Math.round(mixed.baselineScore)}, aggressive drivers at ${Math.round(aggressive.baselineScore)}. Same physics, very different energy captured.`,
    note: `${smooth.drivers} smooth · ${mixed.drivers} mixed · ${aggressive.drivers} aggressive drivers`,
  },
  {
    stat: `${topCause.drivers} of ${coaching.drivers}`,
    title: "Most missed energy is late braking.",
    body: `${topCause.drivers} drivers lost the most to ${topCause.cause}. Next came ${otherCauses.map((c) => `${c.cause} (${c.drivers})`).join(" and ")}. Two of the three are fixable by changing when you lift off.`,
    note: `“${topCause.tip}”`,
  },
  {
    stat: `+${coaching.avgImprovement}`,
    title: "Coaching moves the score.",
    body: `${coaching.improved} of ${coaching.drivers} drivers improved over 26 weeks of tips. Drivers who took advice readily gained ${coaching.highCoachabilityAvgGain} points; the rest gained ${coaching.lowCoachabilityAvgGain}.`,
    note: `Best single gain: +${coaching.bestImprovement} points`,
  },
  {
    stat: `$${money.avgAnnualBrakeWearUsd}`,
    title: "The best move is often to stay.",
    body: `Brake wear averaged $${money.avgAnnualBrakeWearUsd} a year, so regen is one piece of the picture. Only ${money.switchRecommended} of ${insights.drivers} drivers were better off switching cars; ${money.keepRecommended} should keep theirs and drive smarter.`,
    note: `Switchers saved about $${money.avgSavingsWhenSwitching5yUsd.toLocaleString("en-US")} over five years`,
  },
];

export default function Insights() {
  return (
    <section id="evidence" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <span className="label">What drivers show</span>
          <h2>What {insights.drivers} simulated drivers taught us.</h2>
          <p>
            A qualitative read of the Regen Coach dataset: synthesized drivers, not real customer reports. Every number is an estimate.
          </p>
        </div>
        <ol className="themes" data-stagger>
          {THEMES.map((t, i) => (
            <li className="theme" key={t.title}>
              <span className="label">0{i + 1}</span>
              <div className="theme-stat">{t.stat}</div>
              <div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
                <p className="theme-note">{t.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
