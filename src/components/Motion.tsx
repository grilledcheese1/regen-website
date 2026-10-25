"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Runs every animation on the page. Elements opt in with data attributes; see globals.css `html.motion`. */
export default function Motion() {
  useEffect(() => {
    if (document.documentElement.classList.contains("motion") === false) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Nav drops in
      gsap.fromTo(".nav", { y: -64, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" });

      // Hero: the headline arrives at speed, brakes hard, lurches forward, and the energy comes back as a charge bar.
      const words = gsap.utils.toArray<HTMLElement>(".hero-title .w");
      gsap.set(words, { visibility: "visible", x: () => -window.innerWidth * 1.1, skewX: -18 });
      gsap.set(".hero-rest", { visibility: "visible", opacity: 0, y: 24 });
      gsap.set(".regen-bar", { scaleX: 0, transformOrigin: "left center" });

      gsap
        .timeline({ delay: 0.15 })
        .to(words, { x: 0, skewX: 0, duration: 0.95, stagger: 0.07, ease: "expo.out" })
        .to(".hero-title", { x: 14, scaleX: 0.985, transformOrigin: "100% 50%", duration: 0.09, ease: "power2.out" }, "-=0.35")
        .to(".hero-title", { x: 0, scaleX: 1, duration: 0.7, ease: "elastic.out(1, 0.35)" })
        .to(".regen-bar", { scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.05")
        .to(".hero-rest", { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" }, "-=0.55");

      // Scroll reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.set(el, { visibility: "visible" });
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 82%" } },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((group) => {
        const items = Array.from(group.children);
        gsap.set(items, { visibility: "visible" });
        gsap.fromTo(
          items,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: group, start: "top 80%" } },
        );
      });

      // Trip report types out line by line
      gsap.fromTo(
        ".code > div",
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, stagger: 0.06, duration: 0.4, ease: "power2.out", scrollTrigger: { trigger: ".code", start: "top 80%" } },
      );
    });

    // Nav jumps: a curtain wipes up over the page, the page cuts to the target underneath, and the curtain exits upward.
    const curtain = document.createElement("div");
    curtain.className = "curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.appendChild(curtain);
    let busy = false;

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('.nav a[href^="#"]');
      if (link === null || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = link.getAttribute("href")!.slice(1);
      const target = id === "top" ? document.body : document.getElementById(id);
      if (target === null) return;
      e.preventDefault();
      if (busy) return;
      busy = true;
      const navH = document.querySelector<HTMLElement>(".nav")?.offsetHeight ?? 0;
      const y = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY - navH;

      gsap
        .timeline({ onComplete: () => { busy = false; } })
        .set(curtain, { yPercent: 0, y: 0 })
        .fromTo(curtain, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "expo.inOut" })
        .add(() => {
          window.scrollTo(0, y);
          ScrollTrigger.update();
          history.replaceState(null, "", `#${id}`);
        })
        .to(curtain, { yPercent: -100, duration: 0.55, ease: "expo.inOut" }, "+=0.05");
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      curtain.remove();
      ctx.revert();
    };
  }, []);

  return null;
}
