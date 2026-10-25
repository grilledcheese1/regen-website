"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAP, type Theme } from "@/config/site";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "bright" ? "bright" : "dark";
}

function addBuildings(map: mapboxgl.Map, theme: Theme) {
  if (map.getLayer("buildings-3d")) return;
  map.addLayer({
    id: "buildings-3d",
    source: "composite",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 13,
    filter: ["==", "extrude", "true"],
    paint: {
      "fill-extrusion-color": MAP.buildings[theme],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "min_height"],
      "fill-extrusion-opacity": 0.7,
    },
  });
}

/** Small 3D city map that slowly orbits and follows the page theme. */
export default function MapPreview() {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!TOKEN);

  useEffect(() => {
    if (!TOKEN || !el.current) return;
    mapboxgl.accessToken = TOKEN;

    let theme = currentTheme();
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: el.current,
        style: MAP.styles[theme],
        center: MAP.center,
        zoom: MAP.zoom,
        pitch: MAP.pitch,
        bearing: MAP.bearing,
        interactive: false,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    map.on("style.load", () => addBuildings(map, theme));
    map.on("error", () => setFailed(true));

    let raf = 0;
    let last = performance.now();
    const spin = (now: number) => {
      map.setBearing(map.getBearing() + ((now - last) / 1000) * MAP.spinDegPerSec);
      last = now;
      raf = requestAnimationFrame(spin);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) raf = requestAnimationFrame(spin);

    const observer = new MutationObserver(() => {
      const next = currentTheme();
      if (next === theme) return;
      theme = next;
      map.setStyle(MAP.styles[theme]);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      map.remove();
    };
  }, []);

  return (
    <div className="map-wrap">
      <span className="pill map-tag">SIMULATED DRIVE · AUSTIN</span>
      <div ref={el} className="mapbox-canvas" />
      {failed && (
        <div className="map-fallback">
          Map unavailable.
          <br />
          Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
        </div>
      )}
    </div>
  );
}
