"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP, type Theme } from "@/config/site";
import demo from "@/data/demo-trip.json";

// [t s, lon, lat, speed m/s, regen kW, friction kW, missed cause or null]
type Sample = [number, number, number, number, number, number, string | null];
const SAMPLES = demo.samples as Sample[];
const T_END = SAMPLES[SAMPLES.length - 1][0];
const MPH = 2.23694;

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "bright" ? "bright" : "dark";
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

type Grade = "good" | "mid" | "bad" | "none";
function grade(s: Sample): Grade {
  const regen = s[4];
  const friction = s[5];
  if (regen + friction < MAP.capture.minBrakeKw) return "none";
  const c = regen / (regen + friction);
  return c >= MAP.capture.good ? "good" : c >= MAP.capture.mid ? "mid" : "bad";
}

/** The trip as runs of one color, so the line changes color exactly where the capture grade changes. */
function routeFeatures(): GeoJSON.FeatureCollection {
  const color: Record<Grade, string> = {
    good: cssVar("--good"),
    mid: cssVar("--mid"),
    bad: cssVar("--bad"),
    none: cssVar("--muted"),
  };
  const features: GeoJSON.Feature[] = [];
  let run: [number, number][] = [];
  let g = grade(SAMPLES[0]);
  SAMPLES.forEach((s, i) => {
    const next = grade(s);
    if (next !== g && run.length) {
      run.push([s[1], s[2]]); // share the joint so runs touch
      features.push({ type: "Feature", properties: { color: color[g] }, geometry: { type: "LineString", coordinates: run } });
      run = [];
      g = next;
    }
    run.push([s[1], s[2]]);
    if (i === SAMPLES.length - 1 && run.length > 1) {
      features.push({ type: "Feature", properties: { color: color[g] }, geometry: { type: "LineString", coordinates: run } });
    }
  });
  return { type: "FeatureCollection", features };
}

const point = (c: [number, number]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } }],
});

/** Mapzen terrain, hillshade and 3D buildings on top of the OpenFreeMap base style, then the demo trip. */
function addLayers(map: maplibregl.Map, theme: Theme) {
  if (map.getSource("dem")) return;
  const dem = {
    type: "raster-dem" as const,
    tiles: [MAP.terrainTiles],
    encoding: "terrarium" as const,
    tileSize: 256,
    maxzoom: 15,
  };
  map.addSource("dem", { ...dem, attribution: MAP.terrainAttribution });
  map.addSource("shade", dem);
  const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  map.addLayer(
    {
      id: "hillshade",
      type: "hillshade",
      source: "shade",
      paint: { "hillshade-exaggeration": MAP.hillshadeExaggeration, "hillshade-shadow-color": "#000000" },
    },
    firstSymbol,
  );
  if (map.getLayer("building")) map.setLayoutProperty("building", "visibility", "none");
  map.addLayer(
    {
      id: "buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": MAP.buildings[theme],
        "fill-extrusion-opacity": 0.7,
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], MAP.buildingDefaultHeightM],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      },
    },
    firstSymbol,
  );
  map.setTerrain({ source: "dem", exaggeration: MAP.terrainExaggeration });

  // The Mount Bonnell trip, colored by regen capture, with missed-regen rings and the replay car.
  const L = MAP.line;
  map.addSource("route", { type: "geojson", data: routeFeatures() });
  map.addSource("missed", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: SAMPLES.filter((s) => s[6]).map((s) => ({
        type: "Feature",
        properties: { cause: s[6] },
        geometry: { type: "Point", coordinates: [s[1], s[2]] },
      })),
    },
  });
  map.addSource("car", { type: "geojson", data: point([SAMPLES[0][1], SAMPLES[0][2]]) });
  map.addLayer({ id: "route-glow", type: "line", source: "route",
    paint: { "line-color": ["get", "color"], "line-width": L.glowWidth, "line-blur": L.glowBlur, "line-opacity": L.glowOpacity } });
  map.addLayer({ id: "route", type: "line", source: "route",
    layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": L.width } });
  map.addLayer({ id: "missed", type: "circle", source: "missed",
    paint: { "circle-radius": 7, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": cssVar("--bad"), "circle-stroke-width": 2 } });
  map.addLayer({ id: "car-halo", type: "circle", source: "car",
    paint: { "circle-radius": 16, "circle-color": cssVar("--accent"), "circle-opacity": 0.25 } });
  map.addLayer({ id: "car", type: "circle", source: "car",
    paint: { "circle-radius": 7, "circle-color": cssVar("--accent"), "circle-stroke-color": cssVar("--text"), "circle-stroke-width": 2 } });
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Small 3D map of the simulated Mount Bonnell descent: the route colored by regen capture, a car replaying the
 * drive and a live telemetry readout, while the camera slowly orbits. No API key needed.
 */
export default function MapPreview() {
  const el = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    // MapLibre logs console errors when WebGL is missing; check first and show the fallback quietly.
    if (!hasWebGL()) {
      setFailed(true);
      return;
    }

    const lons = SAMPLES.map((s) => s[1]);
    const lats = SAMPLES.map((s) => s[2]);
    const center: [number, number] = [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];

    let theme = currentTheme();
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: el.current,
        style: MAP.styles[theme],
        center,
        zoom: MAP.zoom,
        pitch: MAP.pitch,
        bearing: MAP.bearing,
        maxPitch: 80,
        interactive: false,
        attributionControl: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    // Top-right keeps the required credit clear of the "Open the full demo" button.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
    map.on("style.load", () => addLayers(map, theme));
    // Only a failed base style is fatal; a single missing tile is not.
    map.on("error", () => {
      if (!map.isStyleLoaded()) setFailed(true);
    });

    const fields = hud.current ? Array.from(hud.current.querySelectorAll<HTMLElement>("[data-v]")) : [];
    const showSample = (i: number, u: number) => {
      const a = SAMPLES[i];
      const b = SAMPLES[Math.min(i + 1, SAMPLES.length - 1)];
      const lerp = (k: 1 | 2 | 3 | 4 | 5) => a[k] + (b[k] - a[k]) * u;
      (map.getSource("car") as maplibregl.GeoJSONSource | undefined)?.setData(point([lerp(1), lerp(2)]));
      const values = [Math.round(lerp(3) * MPH), lerp(4).toFixed(1), lerp(5).toFixed(1)];
      fields.forEach((f, k) => (f.textContent = String(values[k])));
    };

    let raf = 0;
    let last = performance.now();
    let simT = 0;
    let idx = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      map.setBearing(map.getBearing() + dt * MAP.spinDegPerSec);
      // Replay the trip on its own clock, looping at the end.
      simT = (simT + dt * MAP.replaySpeed) % T_END;
      if (simT < SAMPLES[idx][0]) idx = 0;
      while (idx < SAMPLES.length - 2 && SAMPLES[idx + 1][0] <= simT) idx++;
      const span = SAMPLES[idx + 1][0] - SAMPLES[idx][0] || 1;
      showSample(idx, Math.min(1, (simT - SAMPLES[idx][0]) / span));
      raf = requestAnimationFrame(tick);
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.on("load", () => {
      // Start the credit collapsed behind its ⓘ button so it doesn't cover the map tag; it opens on click.
      el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      if (reduced) showSample(0, 0);
      else raf = requestAnimationFrame(tick);
    });

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
      <span className="pill map-tag">SIMULATED DRIVE · MOUNT BONNELL, AUSTIN</span>
      <div ref={el} className="map-canvas" />
      <div ref={hud} className="map-hud" aria-hidden>
        <span><b data-v>0</b> mph</span>
        <span className="g"><b data-v>0.0</b> kW regen</span>
        <span className="r"><b data-v>0.0</b> kW brakes</span>
      </div>
      {failed && <div className="map-fallback">Map unavailable in this browser.</div>}
    </div>
  );
}
