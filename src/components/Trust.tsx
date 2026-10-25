const POINTS = [
  {
    title: "Simulated today, real data later.",
    body: "Every driver and drive here is simulated on real Austin roads. Next comes a phone app, then a plug-in car adapter, then connected-vehicle data with your consent. Only the data source changes.",
  },
  {
    title: "Every number says where it came from.",
    body: "Figures are labeled observed, reported, modeled or synthetic, and the formula is one tap away.",
  },
  {
    title: "Your data, your call.",
    body: "Driving and banking analysis each need their own permission. Turn either off, or delete everything, from Settings.",
  },
  {
    title: "No pretend approvals.",
    body: "Regentic never claims a quote, a credit decision, a discount or a booking. When a real quote is needed, it says so and tells you how to get one.",
  },
];

export default function Trust() {
  return (
    <section id="trust" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Built to be checked.</h2>
          <p>Advice about your money should show its work. Here is how Regentic keeps itself honest.</p>
        </div>
        <dl className="trust" data-stagger>
          {POINTS.map((p) => (
            <div className="trust-item" key={p.title}>
              <dt>{p.title}</dt>
              <dd>{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
