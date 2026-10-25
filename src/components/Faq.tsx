import insights from "@/data/insights.json";

const FAQ = [
  {
    q: "Is any of this real customer data?",
    a: "No. The drivers, cars, contracts and banking are all simulated. The roads, terrain and the physics are real, so the numbers behave the way real ones would.",
  },
  {
    q: "How accurate are the savings?",
    a: `They are estimates from a physics model of a Camry Hybrid, averaged over ${insights.calculator.basis}. Your own savings depend on your car, your roads and the weather. Real driving data would narrow the range.`,
  },
  {
    q: "Will it try to sell me a new car?",
    a: `No. It ranks every option by what it costs you. For ${insights.money.keepRecommended} of ${insights.drivers} simulated drivers, the best move was to keep the car they have.`,
  },
  {
    q: "How is the regen score worked out?",
    a: "Each trip has a ceiling: the braking energy a hybrid could have recovered on that route. The score is how much you actually recovered, out of 100. Late braking, a full or cold battery, and low grip all lower it.",
  },
  {
    q: "What happens to my data?",
    a: "In this demo, nothing leaves your session. Each kind of analysis has its own permission, and Settings deletes everything in one step.",
  },
  {
    q: "Why would a car lender build this?",
    a: "Customers who get an honest answer at lease end are more likely to stay. Hybrid offers come with evidence from the customer's own driving, and fewer people need to call just to ask for a buyout figure.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Questions people ask.</h2>
        </div>
        <div className="faq" data-reveal>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
