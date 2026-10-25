"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SITE } from "@/config/site";
import insights from "@/data/insights.json";
import MapPreviewClient from "./MapPreviewClient";

const CORNER = 12; // matches the demo's rounded-lg corners
const OUTLINE_PX = 18; // dot diameter while it traces the square
const STEP = 4; // px between route samples
const LAG = 0.25; // screen rise per px of horizontal travel; recovered at half speed on the next vertical run

const FIGURES = [
  { key: "gallons", label: "gal saved", value: insights.annual.gallons, fmt: (n: number) => n.toFixed(1) },
  { key: "dollars", label: "saved", value: insights.annual.dollars, fmt: (n: number) => `$${Math.round(n)}` },
  { key: "co2", label: "lb CO₂ cut", value: insights.annual.co2Lb, fmt: (n: number) => String(Math.round(n)) },
  { key: "kwh", label: "kWh back", value: insights.annual.kwh, fmt: (n: number) => String(Math.round(n)) },
] as const;

type Pt = { x: number; y: number };
type Route = { pts: Pt[]; cum: number[]; len: number };

/** Evenly spaced samples along a polyline, keeping every corner exactly. */
function sample(corners: Pt[]): Route {
  const pts: Pt[] = [corners[0]];
  for (let i = 1; i < corners.length; i++) {
    const a = corners[i - 1];
    const b = corners[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / STEP));
    for (let k = 1; k <= n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1] };
}

/** Point at arc length `s` along a sampled route. */
function at(r: Route, s: number): Pt {
  const d = Math.min(Math.max(s, 0), r.len);
  let lo = 0;
  let hi = r.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (r.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const span = r.cum[hi] - r.cum[lo] || 1;
  const u = (d - r.cum[lo]) / span;
  return { x: r.pts[lo].x + (r.pts[hi].x - r.pts[lo].x) * u, y: r.pts[lo].y + (r.pts[hi].y - r.pts[lo].y) * u };
}

/**
 * Scroll position at which the dot reaches each sample. Vertical runs keep the dot near mid-screen;
 * a horizontal run can't advance with the page, so the dot rises a little and catches up afterwards.
 */
function scrollMap(r: Route, vh: number, lag0: number): number[] {
  let lag = lag0;
  const out = [r.pts[0].y - vh / 2 + lag];
  for (let i = 1; i < r.pts.length; i++) {
    const dx = Math.abs(r.pts[i].x - r.pts[i - 1].x);
    const dy = r.pts[i].y - r.pts[i - 1].y;
    lag = dx > Math.abs(dy) ? lag + LAG * dx : Math.max(0, lag - 0.5 * Math.max(0, dy));
    out.push(Math.max(r.pts[i].y - vh / 2 + lag, out[i - 1] + 0.01));
  }
  return out;
}

/** Arc length reached at scroll `s`, given each sample's scroll value. */
function arcAt(r: Route, scrolls: number[], s: number): number {
  if (s <= scrolls[0]) return 0;
  const last = scrolls.length - 1;
  if (s >= scrolls[last]) return r.len;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (scrolls[mid] <= s) lo = mid;
    else hi = mid;
  }
  const u = (s - scrolls[lo]) / (scrolls[hi] - scrolls[lo] || 1);
  return r.cum[lo] + (r.cum[hi] - r.cum[lo]) * u;
}

/** Page box from offsets, so in-flight reveal transforms don't skew the route. */
function pageBox(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
}

/** Page box of an element's text (not its full block), for routing around a heading. */
function textBox(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const t = range.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const b = pageBox(el);
  return { left: b.left + t.left - e.left, right: b.left + t.right - e.left, top: b.top + t.top - e.top, bottom: b.top + t.bottom - e.top };
}

/** Union of the text boxes of a heading block's children (heading, intro, notes). */
function blockBox(head: HTMLElement) {
  const boxes = Array.from(head.children)
    .filter((c): c is HTMLElement => c instanceof HTMLElement && c.offsetHeight > 0)
    .map(textBox);
  return {
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
  };
}

/**
 * One dot starts where the hero stats used to be and rides the left lane while a readout beside it counts up a
 * simulated driver's year of regen. Under the calculator it turns sharply into the right lane, splits into three
 * around the tips heading, passes through each tip card, merges again, runs along the top of "Find your next move"
 * while the heading fills with red, then flies to the map square, traces its outline, and the map fills in.
 * All driven by one scrubbed timeline over #journey.
 */
export default function Move() {
  const dotRef = useRef<HTMLDivElement>(null);
  const branchRefs = useRef<(HTMLDivElement | null)[]>([]);
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
    const sideDots = branchRefs.current.filter((d): d is HTMLDivElement => d !== null);
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
    const mk = (cls: string) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("class", cls);
      brushSvg.appendChild(p);
      return p;
    };
    const ribbonIn = mk("ribbon"); // hero → left lane, widening with the dot
    const trunkA = mk("line"); // left lane, the 90° turn, right lane
    const branchLines = [mk("line"), mk("line"), mk("line")]; // around the tips heading and through the cards
    const trunkB = mk("line"); // merge, underline the heading, down to the map
    const ribbonOut = mk("ribbon"); // last stretch of the drop onto the square, narrowing
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
        const laneL = containerLeft + pad + (small ? 14 : 22);
        const laneR = vw - laneL;
        const dMin = small ? 10 : 14;
        const dLane = small ? 18 : 26;
        const dBranch = small ? 10 : 14;

        const s = square.offsetWidth;
        const sqLeft = (vw - s) / 2;
        const sqTop = (stage.offsetHeight - s) / 2;

        // Timeline progress 0..1 is scroll 0 .. journey bottom at viewport bottom. The map stage sticks for the
        // last stretch (from `fStart`), so the trace and fill play while it holds still.
        const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
        const journeyBottom = journey.getBoundingClientRect().bottom + window.scrollY;
        const range = journeyBottom - vh;
        const trackTop = stage.parentElement!.getBoundingClientRect().top + window.scrollY;
        const fStart = Math.min(0.9, trackTop / range);
        const L = 1 - fStart;
        const sEnd = fStart * range; // scroll at which the dot reaches the square's top edge

        // --- Landmarks, in page coordinates ---
        const a = anchor.getBoundingClientRect();
        const startX = a.left + a.width / 2;
        const startPageY = a.top + a.height / 2 + window.scrollY;
        const eqLen = vh * 0.7; // scroll over which the dot eases from the hero into the left lane

        const calc = document.querySelector<HTMLElement>(".calc");
        const tipsHead = document.querySelector<HTMLElement>("#tips .head");
        const cards = Array.from(document.querySelectorAll<HTMLElement>("#tips .tip")).slice(0, 3);
        const moveHead = document.querySelector<HTMLElement>(".move .head h2")!;

        const laneStart = { x: laneL, y: eqLen + vh / 2 };
        const turnY = calc ? pageBox(calc).bottom + 48 : laneStart.y + vh;
        // The line runs along the top of "Find your next move", then drops past the right end of its block.
        const mh = textBox(moveHead);
        const mBlock = blockBox(moveHead.parentElement!);
        const mergeX = Math.max(12, mBlock.left - 32);
        const ulEndX = Math.min(vw - 12, mBlock.right + 32);
        // The line drops straight onto the square's top edge (page y of that edge once the stage sticks), at an x
        // inside the straight part of the edge, so it meets the outline at a clean 90° and turns along it.
        const edgeY = sEnd + sqTop;
        const dropX = Math.min(Math.max(ulEndX, sqLeft + CORNER + dLane), sqLeft + s - CORNER - dLane);
        const jogY = mBlock.bottom + 40;

        // Branch geometry around the tips heading and through its three cards.
        const canSplit = Boolean(tipsHead) && cards.length === 3;
        let splitY = turnY + vh * 0.5;
        let mergeY = splitY + vh * 0.5;
        let branches: Route[] = [];
        let cardEntry: number[] = [];
        if (canSplit) {
          const th = blockBox(tipsHead!);
          const boxes = cards.map(pageBox);
          const cardsTop = Math.min(...boxes.map((b) => b.top));
          const cardsBottom = Math.max(...boxes.map((b) => b.bottom));
          splitY = th.top - 40;
          mergeY = cardsBottom + 64;
          const above = cardsTop - 28;
          const below = cardsBottom + 28;
          const xs = [Math.max(12, th.left - 28), Math.min(laneR - 40, th.right + 28), laneR];
          branches = boxes.map((b, k) => {
            const cx = (b.left + b.right) / 2;
            return sample([
              { x: laneR, y: splitY },
              { x: xs[k], y: splitY },
              { x: xs[k], y: above },
              { x: cx, y: above },
              { x: cx, y: below },
              { x: mergeX, y: below },
              { x: mergeX, y: mergeY },
            ]);
          });
          // Arc length at which each branch reaches its card's top edge.
          cardEntry = boxes.map((b, k) => {
            const r = branches[k];
            const i = r.pts.findIndex((p) => p.y >= b.top);
            return i < 0 ? r.len : r.cum[i];
          });
        }

        const routeA = sample([laneStart, { x: laneL, y: turnY }, { x: laneR, y: turnY }, { x: laneR, y: splitY }]);
        const scrollA = scrollMap(routeA, vh, 0);
        const sSplit = scrollA[scrollA.length - 1];
        const sMerge = Math.max(mergeY - vh / 2, sSplit + 240);
        const ulY = Math.max(mh.top - 20, mergeY + 12);
        const routeB = sample([
          { x: mergeX, y: mergeY },
          { x: mergeX, y: ulY },
          { x: ulEndX, y: ulY },
          { x: ulEndX, y: jogY },
          { x: dropX, y: jogY },
          { x: dropX, y: Math.max(edgeY, jogY + 40) },
        ]);
        // The last stretch of the drop narrows from the lane width to the tracing dot, as a ribbon.
        const tail = Math.min(140, Math.max(20, (edgeY - jogY) * 0.8));
        const tailStart = routeB.len - tail;

        // Square outline in the demo's own pixels, starting where the line lands and running clockwise.
        const m = dropX - sqLeft;
        const C = CORNER;
        path.setAttribute(
          "d",
          `M${m},0 H${s - C} A${C},${C} 0 0 1 ${s},${C} V${s - C} A${C},${C} 0 0 1 ${s - C},${s} H${C} A${C},${C} 0 0 1 0,${s - C} V${C} A${C},${C} 0 0 1 ${C},0 H${m}`,
        );
        const len = path.getTotalLength();
        // Route B starts with whatever lag puts the dot at the merge at `sMerge`. After the run along the heading,
        // the dot's screen height glides to the square's top edge, so it lands exactly on the edge at `sEnd`.
        const rawB = scrollMap(routeB, vh, sMerge - (mergeY - vh / 2));
        const glideFrom = ulY - mergeY + (ulEndX - mergeX);
        const scrollB: number[] = [];
        routeB.pts.forEach((p, i) => {
          const w = Math.min(1, Math.max(0, (routeB.cum[i] - glideFrom) / (routeB.len - glideFrom || 1)));
          const screenY = (p.y - rawB[i]) * (1 - w) + sqTop * w;
          scrollB.push(Math.max(p.y - screenY, i ? scrollB[i - 1] + 0.01 : -Infinity));
        });

        // Static stroke geometry, in #journey coordinates; progress is revealed with dash offsets.
        const toD = (r: Route) => "M" + r.pts.map((p) => `${p.x.toFixed(1)},${(p.y - journeyTop).toFixed(1)}`).join("L");
        trunkA.setAttribute("d", toD(routeA));
        trunkA.setAttribute("stroke-width", String(dLane));
        trunkB.setAttribute("d", toD(routeB));
        trunkB.setAttribute("stroke-width", String(dLane));
        branchLines.forEach((line, k) => {
          line.setAttribute("d", branches[k] ? toD(branches[k]) : "");
          line.setAttribute("stroke-width", String(dBranch));
        });
        const reveal = (line: SVGPathElement, total: number, done: number) => {
          line.style.visibility = done > 0.5 ? "visible" : "hidden";
          line.style.strokeDasharray = `${total} ${total}`;
          line.style.strokeDashoffset = String(total - done);
        };

        // Dot and readout state, in viewport coordinates.
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

        const smooth = (u: number) => u * u * (3 - 2 * u);
        const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
        const side = (x: number) => (x < vw / 2 ? 1 : -1); // readout on the content side of the lane

        // Phase 1: ease from the hero into the left lane (viewport coordinates as a function of scroll).
        const easeIn = (scroll: number) => {
          const eq = smooth(Math.min(1, scroll / eqLen));
          return {
            x: startX + (laneL - startX) * eq,
            y: (startPageY - scroll) * (1 - eq) + (vh / 2) * eq,
            d: dMin + (dLane - dMin) * eq,
          };
        };

        const sqCx = sqLeft + s / 2;
        const sqCy = sqTop + s / 2;
        // Dot size along route B: lane width, narrowing to the tracing size over the tail of the drop.
        const sizeB = (arc: number) => dLane + (OUTLINE_PX - dLane) * clamp01((arc - tailStart) / tail);

        // Widening/narrowing ribbons, drawn up to the dot (round caps both ends).
        const fmt = (q: number[]) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;
        const ribbon = (pts: { x: number; y: number; w: number }[]) => {
          if (pts.length < 2) return "";
          const sides = pts.map((q, i) => {
            const a2 = pts[Math.max(0, i - 1)];
            const b2 = pts[Math.min(pts.length - 1, i + 1)];
            const m = Math.hypot(b2.x - a2.x, b2.y - a2.y) || 1;
            const nx = -(b2.y - a2.y) / m;
            const ny = (b2.x - a2.x) / m;
            return { l: [q.x + nx * q.w, q.y + ny * q.w], r: [q.x - nx * q.w, q.y - ny * q.w] };
          });
          const head = pts[pts.length - 1];
          const left = sides.map((q) => fmt(q.l));
          const right = sides.slice().reverse().map((q) => fmt(q.r));
          return `M${left.join("L")}A${head.w},${head.w} 0 0 0 ${right[0]}L${right.join("L")}A${pts[0].w},${pts[0].w} 0 0 0 ${left[0]}Z`;
        };
        const N = 80;
        const drawIn = (scroll: number) => {
          const upto = Math.min(scroll, eqLen);
          if (upto <= 1) return ribbonIn.setAttribute("d", "");
          const pts = Array.from({ length: N + 1 }, (_, i) => {
            const sc = (upto * i) / N;
            const r = easeIn(sc);
            return { x: r.x, y: r.y + sc - journeyTop, w: r.d / 2 };
          });
          ribbonIn.setAttribute("d", ribbon(pts));
        };
        const drawOut = (arcB: number) => {
          if (arcB <= tailStart) return ribbonOut.setAttribute("d", "");
          const pts = Array.from({ length: 21 }, (_, i) => {
            const arc = tailStart + ((arcB - tailStart) * i) / 20;
            const q = at(routeB, arc);
            return { x: q.x, y: q.y - journeyTop, w: sizeB(arc) / 2 };
          });
          ribbonOut.setAttribute("d", ribbon(pts));
        };

        const setHighlight = (pct: number) => moveHead.style.setProperty("--hl", `${pct.toFixed(1)}%`);

        const update = (t: number) => {
          const scroll = t * range;
          S.p = clamp01(scroll / (sEnd || 1));
          drawIn(scroll);

          // Strokes along the page route.
          reveal(trunkA, routeA.len, arcAt(routeA, scrollA, scroll));
          const inBranch = canSplit && scroll > sSplit && scroll < sMerge;
          const u = canSplit ? clamp01((scroll - sSplit) / (sMerge - sSplit)) : 0;
          branches.forEach((r, k) => {
            reveal(branchLines[k], r.len, u * r.len);
            cards[k]?.classList.toggle("lit", u * r.len >= cardEntry[k]);
          });
          const arcB = scroll >= sMerge ? arcAt(routeB, scrollB, scroll) : 0;
          reveal(trunkB, routeB.len, Math.min(arcB, tailStart));
          drawOut(arcB);
          // The heading fills red behind the dot as it runs along the top of the heading.
          const head = at(routeB, arcB);
          const onTop = scroll >= sMerge && head.y >= ulY - 0.5;
          setHighlight(onTop ? clamp01((head.x - mh.left) / (mh.right - mh.left || 1)) * 110 : -10);

          // The dot(s).
          sideDots.forEach((d) => (d.style.opacity = inBranch ? String(S.o) : "0"));
          // The readout steps aside while the dot splits and while it runs along the heading block.
          const besideHeading = scroll >= sMerge && mBlock.bottom - scroll > 64 && t <= fStart;
          S.ro = inBranch || besideHeading ? 0 : S.o;
          if (scroll < eqLen) {
            Object.assign(S, easeIn(scroll), { dx: 1, dy: 0 });
          } else if (scroll <= sSplit || !canSplit) {
            const q = at(routeA, arcAt(routeA, scrollA, scroll));
            Object.assign(S, { x: q.x, y: q.y - scroll, d: dLane, dx: side(q.x), dy: 0 });
          } else if (inBranch) {
            const q = at(branches[1], u * branches[1].len);
            Object.assign(S, { x: q.x, y: q.y - scroll, d: dBranch });
            [0, 2].forEach((k, i) => {
              const p = at(branches[k], u * branches[k].len);
              const el = sideDots[i];
              if (!el) return;
              el.style.width = el.style.height = `${dBranch}px`;
              el.style.transform = `translate3d(${p.x - dBranch / 2}px, ${p.y - scroll - dBranch / 2}px, 0)`;
            });
          } else {
            const q = at(routeB, arcB);
            Object.assign(S, { x: q.x, y: q.y - scroll, d: sizeB(arcB), dx: side(q.x), dy: 0 });
          }
          render();
        };

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          // scrub: true (no lag) keeps the brush's head exactly under the dot.
          scrollTrigger: { trigger: journey, start: 0, end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
        });

        // A + B. The page route down to the square's top edge, leaving the brush behind.
        const P = { t: 0 };
        update(Math.min(window.scrollY / range, fStart));
        tl.to(P, { t: fStart, duration: fStart, onUpdate: () => update(P.t) }, 0);

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
        }, fStart);

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
    // Rebuild when layout settles or changes: web fonts, a filter changing the leaderboard height, a resize.
    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        build();
        ScrollTrigger.refresh();
      }, 250);
    };
    document.fonts?.ready.then(schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(journey);
    window.addEventListener("resize", schedule);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      ctx?.revert();
      brushSvg.remove();
      document.querySelectorAll("#tips .tip.lit").forEach((c) => c.classList.remove("lit"));
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
      {[0, 1].map((i) => (
        <div key={i} ref={(el) => { branchRefs.current[i] = el; }} className="journey-dot" aria-hidden />
      ))}
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
