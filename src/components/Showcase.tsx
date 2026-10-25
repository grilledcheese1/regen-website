export default function Showcase() {
  return (
    <section id="drive" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <span className="label">The drive</span>
          <h2>Then see the receipt.</h2>
        </div>
        <div className="receipt">
          <div className="code" role="img" aria-label="Sample trip report">
            <div className="lights"><i /><i /><i /></div>
            <div className="k">trip · downtown loop · dry</div>
            <div className="score"><b>77</b><span>/100 · Leaving energy on the road</span></div>
            <div><span className="g">■</span> descent capture ......... 91%</div>
            <div><span className="a">■</span> stop capture ............ 58%</div>
            <div><span className="r">■</span> brake smoothness ........ 34%</div>
            <br />
            <div className="k">vs. conventional car</div>
            <div>fuel ....... <span className="g">−0.42 gal</span></div>
            <div>cost ....... <span className="g">−$1.47</span></div>
            <div>co2 ........ <span className="g">−8.3 lb</span></div>
            <br />
            <div className="k">coach</div>
            <div>Ease off earlier into the Congress Ave stop. A longer, lighter brake recovers about 2× more.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
