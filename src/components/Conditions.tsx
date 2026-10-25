const CONDITIONS = ["Dry", "Wet", "Snow", "Mud"];

export default function Conditions() {
  return (
    <section id="conditions" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <span className="label">Conditions</span>
          <h2>Same route. Different grip.</h2>
          <p>Slippery roads cap how hard the motor can brake. Switch conditions and watch the score, the recovered energy and the map colors change on the same trip.</p>
          <div className="chips">
            {CONDITIONS.map((c) => (
              <span className="chip" key={c}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
