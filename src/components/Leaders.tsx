"use client";

import { useState } from "react";
import insights from "@/data/insights.json";

type Style = "all" | "smooth" | "mixed" | "aggressive";
type Sort = "final" | "gain";

const ROW = 52;
const CARDS: { id: Style; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "smooth", label: "Smooth" },
  { id: "mixed", label: "Mixed" },
  { id: "aggressive", label: "Aggressive" },
];

const cohort = (id: Style) => insights.byStyle.find((s) => s.style === id);

export default function Leaders() {
  const [style, setStyle] = useState<Style>("all");
  const [sort, setSort] = useState<Sort>("final");

  const value = (d: (typeof insights.leaders)[number]) => (sort === "final" ? d.finalScore : d.improvement);
  const ranked = [...insights.leaders].sort((a, b) => value(b) - value(a));
  const visible = ranked.filter((d) => style === "all" || d.style === style);
  const max = sort === "final" ? 100 : Math.max(...insights.leaders.map((d) => d.improvement));
  const slot = new Map(visible.map((d, i) => [d.name, i]));

  return (
    <section id="leaders" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Who captures the most?</h2>
          <p>
            {insights.leaders.length} simulated drivers after 26 weeks of coaching. Pick a driving style to see its cohort, then flip between the best score and the biggest climb.
          </p>
        </div>

        <div className="lead-cards" role="radiogroup" aria-label="Driving style" data-reveal>
          {CARDS.map((c) => {
            const co = cohort(c.id);
            const score = co ? Math.round(co.finalScore) : Math.round(insights.leaders.reduce((a, d) => a + d.finalScore, 0) / insights.leaders.length);
            const gain = co ? co.improvement : insights.coaching.avgImprovement;
            return (
              <button
                key={c.id}
                role="radio"
                aria-checked={style === c.id}
                className={`lead-card${style === c.id ? " on" : ""}`}
                onClick={() => setStyle(c.id)}
              >
                <span className="label">{c.label}</span>
                <span className="lead-score">{score}</span>
                <span className="lead-sub">avg score · +{gain} gained</span>
              </button>
            );
          })}
        </div>

        <div className="lead-board" data-reveal>
          <div className="lead-bar">
            <div className="seg" role="tablist" aria-label="Sort by">
              <button role="tab" aria-selected={sort === "final"} onClick={() => setSort("final")}>Best score</button>
              <button role="tab" aria-selected={sort === "gain"} onClick={() => setSort("gain")}>Biggest climb</button>
            </div>
            <span className="lead-note">Simulated drivers · scores out of 100</span>
          </div>
          <ol className="lead-list" style={{ height: Math.max(visible.length, 1) * ROW }}>
            {ranked.map((d) => {
              const i = slot.get(d.name);
              const on = i !== undefined;
              return (
                <li
                  key={d.name}
                  className="lead-row"
                  style={{ transform: `translateY(${(i ?? ranked.indexOf(d)) * ROW}px)`, opacity: on ? 1 : 0, pointerEvents: on ? "auto" : "none" }}
                  aria-hidden={!on}
                >
                  <span className="lead-rank">{on ? i + 1 : ""}</span>
                  <span className="lead-name">
                    {d.name}
                    <small>{d.style} · misses {d.missed}</small>
                  </span>
                  <span className="lead-track">
                    <span className="lead-fill" style={{ width: `${(value(d) / max) * 100}%` }} />
                  </span>
                  <span className="lead-val">{sort === "final" ? Math.round(d.finalScore) : `+${d.improvement}`}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
