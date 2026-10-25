"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "@/config/site";
import insights from "@/data/insights.json";
import MapPreviewClient from "./MapPreviewClient";

const CORNER = 12; // matches the demo's rounded-lg corners
const OUTLINE_PX = 18; // dot diameter while it traces the square

const FIGURES = [
  { key: "gallons", label: "gal saved", value: insights.annual.gallons, fmt: (n: number) => n.toFixed(1) },
  { key: "dollars", label: "saved", value: insights.annual.dollars, fmt: (n: number) => `$${Math.round(n)}` },
  { key: "co2", label: "lb CO₂ cut", value: insights.annual.co2Lb, fmt: (n: number) => String(Math.round(n)) },
  { key: "kwh", label: "kWh back", value: insights.annual.kwh, fmt: (n: number) => String(Math.round(n)) },
] as const;

/**
 * One dot starts where the hero stats used to be and rides the page while a readout beside it counts up a
 * simulated driver's year of regen. It then flies to the map square, traces its outline, and the map fills in.
 * All driven by one scrubbed timeline over #journey.
 */
export default function Move() {
  const dotRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("motion")) return;
    gsap.registerPlugin(ScrollTrigger);

    const dot = dotRef.current!;
    const readout = readoutRef.current!;
    const values = Array.from(readout.querySelectorAll<HTMLElement>("[data-fig]"));
    const stage = stageRef.current!;
    const square = squareRef.current!;
    const path = pathRef.current!;
    const fill = fillRef.current!;
    const journey = document.getElementById("journey")!;
    const anchor = document.getElementById("hero-anchor")!;

    const NS = "http://www.w3.org/2000/svg";
    const brushSvg = document.createElementNS(NS, "svg");
    brushSvg.setAttribute("class", "brush");
    brushSvg.setAttribute("aria-hidden", "true");
    const brush = document.createElementNS(NS, "path");
    brushSvg.appendChild(brush);
    journey.appendChild(brushSvg);

    let ctx: gsap.Context | undefined;
    let entered = false;

    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        const vw = root.clientWidth;
        const vh = window.innerHeight;
        const small = vw < 768;
        const pad = small ? 20 : 32;
        const containerLeft = Math.max(0, (vw - 1200) / 2);
        const laneX = containerLeft + pad + (small ? 14 : 22);
        const dMin = small ? 10 : 14;
        const dMax = small ? 28 : 44;

        // Square outline in the demo's own pixels; the dot rides the same path.
        const s = square.offsetWidth;
        path.setAttribute(
          "d",
          `M${CORNER},0 H${s - CORNER} A${CORNER},${CORNER} 0 0 1 ${s},${CORNER} V${s - CORNER} A${CORNER},${CORNER} 0 0 1 ${s - CORNER},${s} H${CORNER} A${CORNER},${CORNER} 0 0 1 0,${s - CORNER} V${CORNER} A${CORNER},${CORNER} 0 0 1 ${CORNER},0Z`,
        );
        const len = path.getTotalLength();
        const sqLeft = (vw - s) / 2;
        const sqTop = (stage.offsetHeight - s) / 2;

        // Where the hero stat cards used to sit, in page coordinates.
        const a = anchor.getBoundingClientRect();
        const startX = a.left + a.width / 2;
        const startPageY = a.top + a.height / 2 + window.scrollY;

        const S = { x: startX, y: startPageY - window.scrollY, d: dMin, o: entered ? 1 : 0, ro: entered ? 1 : 0, p: 0, dx: 1, dy: 0 };
        const hw = readout.offsetWidth / 2;
        const hh = readout.offsetHeight / 2;
        const render = () => {
          dot.style.opacity = String(S.o);
          dot.style.width = dot.style.height = `${S.d}px`;
          dot.style.transform = `translate3d(${S.x - S.d / 2}px, ${S.y - S.d / 2}px, 0)`;
          readout.style.opacity = String(S.ro);
          // The readout sits on the outward side of the dot's heading, clear of the line it draws.
          const k = S.d / 2 + 14 + Math.abs(S.dx) * hw + Math.abs(S.dy) * hh;
          const cx = Math.min(Math.max(S.x + S.dx * k, hw + 8), vw - hw - 8);
          const cy = Math.min(Math.max(S.y + S.dy * k, hh + 72), vh - hh - 8);
          readout.style.transform = `translate3d(${cx - hw}px, ${cy - hh}px, 0)`;
          FIGURES.forEach((f, i) => (values[i].textContent = f.fmt(f.value * S.p)));
        };
        render();
        if (!entered) {
          gsap.to(S, {
            o: 1, ro: 1, duration: 0.6, delay: window.scrollY < 10 ? 1.9 : 0, ease: "power2.out",
            onUpdate: render, onComplete: () => (entered = true),
          });
        }

        // Timeline progress 0..1 is scroll 0 .. journey bottom at viewport bottom. The map stage sticks for the
        // last stretch (from `fStart`), so the flight, trace and fill all play while it holds still.
        const journeyBottom = journey.getBoundingClientRect().bottom + window.scrollY;
        const range = journeyBottom - vh;
        const trackTop = stage.parentElement!.getBoundingClientRect().top + window.scrollY;
        const fStart = Math.min(0.9, trackTop / range);
        const L = 1 - fStart;

        // The dot's route from the hero to the square's top-left corner, as a pure function of progress t.
        const tEnd = fStart + L * 0.15;
        const sqCx = sqLeft + s / 2;
        const sqCy = sqTop + s / 2;
        const cornerX = sqLeft + CORNER;
        const cornerDx = (cornerX - sqCx) / Math.hypot(cornerX - sqCx, sqTop - sqCy);
        const cornerDy = (sqTop - sqCy) / Math.hypot(cornerX - sqCx, sqTop - sqCy);
        const ease2 = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        const smooth = (u: number) => u * u * (3 - 2 * u);
        const laneEnd = { x: laneX, y: vh * 0.5 };
        const route = (t: number) => {
          if (t <= fStart) {
            const p = t / fStart;
            const scroll = t * range;
            const eq = smooth(Math.min(1, scroll / (vh * 0.7)));
            return {
              x: startX + (laneX - startX) * eq + Math.sin(p * Math.PI * 6) * (small ? 4 : 8) * eq,
              y: (startPageY - scroll) * (1 - eq) + (vh * 0.5 + Math.sin(p * Math.PI * 3) * vh * 0.05) * eq,
              d: dMin + (dMax - dMin) * smooth(p),
              p,
              dx: 1,
              dy: 0,
            };
          }
          const f = ease2(Math.min(1, (t - fStart) / (L * 0.15)));
          return {
            x: laneEnd.x + (cornerX - laneEnd.x) * f,
            y: laneEnd.y + (sqTop - laneEnd.y) * f,
            d: dMax + (OUTLINE_PX - dMax) * f,
            p: 1,
            dx: 1 + (cornerDx - 1) * f,
            dy: cornerDy * f,
          };
        };

        // Smooth brush: a ribbon, as wide as the dot, laid along the route in page coordinates.
        const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
        const N = 280;
        const pts = Array.from({ length: N + 1 }, (_, i) => {
          const t = (tEnd * i) / N;
          const r = route(t);
          return { x: r.x, y: r.y + t * range - journeyTop, w: r.d * 0.3 };
        });
        const sides = pts.map((q, i) => {
          const a2 = pts[Math.max(0, i - 1)];
          const b2 = pts[Math.min(N, i + 1)];
          const tx = b2.x - a2.x;
          const ty = b2.y - a2.y;
          const m = Math.hypot(tx, ty) || 1;
          const nx = -ty / m;
          const ny = tx / m;
          return { l: [q.x + nx * q.w, q.y + ny * q.w], r: [q.x - nx * q.w, q.y - ny * q.w] };
        });
        const drawBrush = (t: number) => {
          const k = Math.min(N, Math.floor((t / tEnd) * N));
          if (k < 1) return brush.setAttribute("d", "");
          const left = sides.slice(0, k + 1).map((q) => `${q.l[0].toFixed(1)},${q.l[1].toFixed(1)}`);
          const right = sides.slice(0, k + 1).reverse().map((q) => `${q.r[0].toFixed(1)},${q.r[1].toFixed(1)}`);
          brush.setAttribute("d", `M${left.join("L")}L${right.join("L")}Z`);
        };

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          // scrub: true (no lag) keeps the brush's head exactly under the dot.
          scrollTrigger: { trigger: journey, start: 0, end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
        });

        // A + B. Leave the hero for the left lane, swell, then fly to the square's corner, leaving the brush behind.
        const P = { t: 0 };
        tl.to(P, {
          t: tEnd,
          duration: tEnd,
          onUpdate() {
            Object.assign(S, route(P.t));
            drawBrush(P.t);
            render();
          },
        }, 0);

        // C. Trace the outline; the stroke draws where the dot has been.
        const T = { p: 0 };
        tl.to(T, {
          p: 1,
          duration: L * 0.5,
          immediateRender: false,
          onUpdate() {
            const pt = path.getPointAtLength(T.p * len);
            S.x = sqLeft + pt.x;
            S.y = sqTop + pt.y;
            const ox = S.x - sqCx;
            const oy = S.y - sqCy;
            const om = Math.hypot(ox, oy) || 1;
            S.dx = ox / om;
            S.dy = oy / om;
            path.style.strokeDashoffset = String(1 - T.p);
            render();
          },
        }, fStart + L * 0.15);

        // D. The dot dissolves into the square as the map fills from the bottom.
        tl.to(S, { o: 0, ro: 0, d: 0, duration: L * 0.08, immediateRender: false, onUpdate: render }, fStart + L * 0.65);
        tl.fromTo(
          fill,
          { clipPath: `inset(100% 0% 0% 0% round ${CORNER}px)` },
          { clipPath: `inset(0% 0% 0% 0% round ${CORNER}px)`, duration: L * 0.3, ease: "power2.inOut" },
          fStart + L * 0.65,
        );
        tl.to({}, { duration: 0.0001 }, 0.9999); // pin the timeline length to exactly 1
      });
    };

    build();
    let timer: number;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      ctx?.revert();
      brushSvg.remove();
    };
  }, []);

  return (
    <section id="move" className="move">
      <div className="container">
        <div className="head" data-reveal>
          <span className="label">Your next move</span>
          <h2>Find your next move.</h2>
          <p>Every figure you watched climb came from a drive like this one. Replay yours on a real 3D city map.</p>
        </div>
      </div>

      <div className="demo-track">
        <div ref={stageRef} className="demo-stage">
          <div ref={squareRef} className="demo-square">
            <svg className="demo-outline" aria-hidden>
              <path ref={pathRef} pathLength={1} />
            </svg>
            <div ref={fillRef} className="demo-fill">
              <MapPreviewClient />
              <a href={SITE.appUrl} className="btn btn-primary map-cta">Open the full demo</a>
            </div>
          </div>
        </div>
      </div>

      <div ref={dotRef} className="journey-dot" aria-hidden />
      <div ref={readoutRef} className="journey-readout" aria-hidden>
        {FIGURES.map((f, i) => (
          <div key={f.key} className="fig" style={{ marginLeft: i * 18 }}>
            <b data-fig>{f.fmt(0)}</b>
            <span>{f.label}</span>
          </div>
        ))}
        <small>per year · simulated driver</small>
      </div>
    </section>
  );
}
