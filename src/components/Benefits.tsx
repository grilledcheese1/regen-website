import insights from "@/data/insights.json";

const { annual, money } = insights;

// Each claim is backed by a figure from insights.json or a behavior of the Next Move app.
const BENEFITS = [
  {
    claim: "Know what your braking is worth.",
    detail: `About $${annual.dollars} a year back on a typical simulated commute, measured on the route you actually drive.`,
    source: annual.basis,
  },
  {
    claim: "No lease-end surprises.",
    detail: "Mileage overage, turn-in fees and the buyout price show up months before the deadline, not at the dealer.",
    source: "Next Move · contract and usage inputs",
  },
  {
    claim: "Every option, side by side.",
    detail: "Keep, buy out, lease or switch: monthly cost, cash up front, debt and equity at the end, in plain words.",
    source: "Next Move · 36-month comparison",
  },
  {
    claim: "Sometimes the answer is: keep it.",
    detail: `${money.keepRecommended} of ${insights.drivers} simulated drivers were better off keeping their car. When switching does win, it saved about $${money.avgSavingsWhenSwitching5yUsd.toLocaleString("en-US")} over five years.`,
    source: `${insights.drivers} simulated drivers`,
  },
  {
    claim: "One clear next step.",
    detail: "Request a quote, keep the current plan, or fix the budget first, with the reason and the numbers behind it.",
    source: "Next Move · recommendation",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>What you get out of it.</h2>
          <p>Less guessing about your car and your money, and a reason behind every number.</p>
        </div>
        <ul className="benefits" data-stagger>
          {BENEFITS.map((b) => (
            <li className="benefit" key={b.claim}>
              <h3>{b.claim}</h3>
              <div>
                <p>{b.detail}</p>
                <p className="benefit-source">{b.source}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
