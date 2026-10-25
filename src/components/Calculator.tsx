"use client";

import { useId, useState } from "react";
import insights from "@/data/insights.json";

const C = insights.calculator;
const KM_PER_MILE = 1.609344;
const LB_PER_KG = 2.20462;
const STYLES = [
  { id: "smooth", label: "Smooth" },
  { id: "mixed", label: "Mixed" },
  { id: "aggressive", label: "Hard" },
] as const;
type Style = (typeof STYLES)[number]["id"];

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const int = (n: number) => Math.round(n).toLocaleString("en-US");

/** Yearly regen savings from the same per-km rates and conversions the product uses. */
export default function Calculator() {
  const [miles, setMiles] = useState(900);
  const [gas, setGas] = useState(C.defaultGasPriceUsd);
  const [style, setStyle] = useState<Style>("mixed");
  const id = useId();

  const kwh = miles * 12 * KM_PER_MILE * C.kwhPerKm[style];
  const gallons = kwh / (C.kwhPerGallon * C.engineEfficiency);
  const dollars = gallons * gas;
  const co2Lb = gallons * C.kgCo2PerGallon * LB_PER_KG;

  return (
    <section id="calculator" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>What would your braking save?</h2>
          <p>Move the sliders to match your driving. The math is the same the app uses, so treat it as an estimate, not a promise.</p>
        </div>
        <div className="calc" data-reveal>
          <div className="calc-inputs">
            <label className="calc-field" htmlFor={`${id}-miles`}>
              <span>Miles a month</span>
              <output htmlFor={`${id}-miles`}>{int(miles)}</output>
              <input id={`${id}-miles`} type="range" min={200} max={3000} step={50} value={miles} onChange={(e) => setMiles(Number(e.target.value))} />
            </label>
            <label className="calc-field" htmlFor={`${id}-gas`}>
              <span>Gas price</span>
              <output htmlFor={`${id}-gas`}>${gas.toFixed(2)}/gal</output>
              <input id={`${id}-gas`} type="range" min={2} max={6} step={0.05} value={gas} onChange={(e) => setGas(Number(e.target.value))} />
            </label>
            <fieldset className="calc-field">
              <legend>How you brake</legend>
              <div className="seg calc-seg">
                {STYLES.map((s) => (
                  <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="calc-result" aria-live="polite">
            <p className="calc-big">
              {usd(dollars)}
              <span>a year</span>
            </p>
            <dl className="calc-list">
              <div><dt>Gas not burned</dt><dd>{int(gallons)} gal</dd></div>
              <div><dt>Energy recovered</dt><dd>{int(kwh)} kWh</dd></div>
              <div><dt>CO₂ avoided</dt><dd>{int(co2Lb)} lb</dd></div>
            </dl>
            <p className="calc-basis">Estimate from {C.basis}. Real savings depend on your car, roads and weather.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
