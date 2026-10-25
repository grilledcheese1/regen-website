"use client";

import { useEffect, useRef } from "react";
import { motionValue, scroll, springValue } from "motion";

const FEATURES = [
  { ico: "01 · MAP", title: "A real 3D city", body: "Drives replay on real roads, buildings and terrain, so every hill and red light is where it should be." },
  { ico: "02 · SCORE", title: "Regen, scored", body: "Each segment is graded teal, amber or rose. Switch the driving style, or the road from dry to wet, snow or mud, and the score re-runs on the same route." },
  { ico: "03 · SAVINGS", title: "Gallons, dollars, CO₂", body: "See what your braking saved against a conventional car, with one coaching tip for the next drive." },
  { ico: "04 · DECIDE", title: "Your next move", body: "Your driving, contract and budget become one recommended step: keep the car, buy it out, or switch." },
];

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Each step fills in as it scrolls through. One scroll progress, smoothed by a spring, drives everything:
 * the rule draws left to right with a head riding its tip, the title wipes in word by word right behind it,
 * then the detail fades up.
 */
export default function Features() {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!document.documentElement.classList.contains("motion")) return;
    const stops: VoidFunction[] = [];

    list.current!.querySelectorAll<HTMLElement>(".step").forEach((step) => {
      const words = Array.from(step.querySelectorAll<HTMLElement>(".fw"));
      const fill = step.querySelector<HTMLElement>(".rule-fill")!;
      const head = step.querySelector<HTMLElement>(".rule-head")!;
      const body = step.querySelector<HTMLElement>(".step-body")!;

      const raw = motionValue(0);
      const smooth = springValue(raw, { stiffness: 90, damping: 24, mass: 1 });

      const render = (v: number) => {
        const line = clamp(v / 0.3);
        fill.style.transform = `scaleX(${line})`;
        head.style.left = `${line * 100}%`;
        head.style.opacity = String(line > 0.001 && line < 0.999 ? 1 : 0);

        const text = clamp((v - 0.12) / 0.68);
        words.forEach((w, i) => w.style.setProperty("--c", `${100 - clamp(text * words.length - i) * 100}%`));

        const b = clamp((v - 0.75) / 0.25);
        body.style.opacity = String(b);
        body.style.transform = `translateY(${(1 - b) * 14}px)`;
      };
      render(0);

      stops.push(
        smooth.on("change", render),
        scroll((progress: number) => raw.set(progress), { target: step, offset: ["start 92%", "start 40%"] }),
      );
    });

    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <section id="how" className="section">
      <div className="container">
        <div className="head" data-reveal>
          <h2>See the energy you missed.</h2>
          <p>Replay, score, save, decide. Every number shows its work.</p>
        </div>
        <ol ref={list} className="steps">
          {FEATURES.map((f) => (
            <li className="step" key={f.title}>
              <div className="rule" aria-hidden>
                <i className="rule-fill" />
                <i className="rule-head" />
              </div>
              <span className="label">{f.ico}</span>
              <h3>
                {f.title.split(" ").map((w, i) => (
                  <span className="fw" data-w={w} key={i}>{w} </span>
                ))}
              </h3>
              <p className="step-body">{f.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
