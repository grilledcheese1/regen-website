"use client";

import { useEffect, useState } from "react";
import insights from "@/data/insights.json";

type Vote = "up" | "down";
const KEY = "regen-tip-votes";

export default function TipFeedback() {
  const [votes, setVotes] = useState<Record<string, Vote>>({});

  useEffect(() => {
    try {
      setVotes(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {}
  }, []);

  const vote = (cause: string, v: Vote) => {
    const next = { ...votes };
    if (next[cause] === v) delete next[cause];
    else next[cause] = v;
    setVotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const tips = insights.missedCauses.filter((c) => c.tip);
  const top = Math.max(...tips.map((t) => t.drivers));
  const picked = Object.keys(votes).length;

  return (
    <section id="tips" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>Which tip would you try first?</h2>
          <p>
            The three things that cost simulated drivers the most energy, ranked by how many of them hit it. Tell us which advice you would actually use.
          </p>
          {/* Kept inside the heading block so the journey dot's branches route around it, not through it. */}
          <p className="tip-foot">
            {picked === 0 ? "Votes stay in this browser; nothing is sent anywhere." : `${picked} of ${tips.length} answered. Saved in this browser only; nothing is sent anywhere.`}
          </p>
        </div>
        <ol className="tips" data-stagger>
          {tips.map((t, i) => (
            <li className="tip" key={t.cause}>
              <span className="label">#{i + 1} · {t.drivers} of {insights.coaching.drivers} drivers</span>
              <h3>{t.cause[0].toUpperCase() + t.cause.slice(1)}</h3>
              <p>{t.tip}</p>
              <span className="tip-track"><span style={{ width: `${(t.drivers / top) * 100}%` }} /></span>
              <div className="tip-vote">
                <button aria-pressed={votes[t.cause] === "up"} onClick={() => vote(t.cause, "up")}>I’d try this</button>
                <button aria-pressed={votes[t.cause] === "down"} onClick={() => vote(t.cause, "down")}>Not for me</button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
