// Where the product (regen-analysis) is served. Set NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000 to point the
// buttons at a local copy of the app.
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://regentic.tech").replace(/\/$/, "");

export const SITE = {
  name: "Regentic",
  tagline: "Every brake is free energy.",
  description:
    "Regentic turns how you drive into your smartest next move: see what your braking saves on a real 3D map, then get one clear recommendation for your car, your contract and your budget.",
  appUrl: `${APP_ORIGIN}/home`, // the product's home page
  nextMoveUrl: `${APP_ORIGIN}/next-move`,
} as const;

// Keyless 3D map, matching the product's FreeTripMap: MapLibre GL with OpenFreeMap streets and buildings,
// and Mapzen's open Terrarium terrain tiles on AWS.
export const MAP = {
  styles: {
    dark: "https://tiles.openfreemap.org/styles/dark",
    bright: "https://tiles.openfreemap.org/styles/positron",
  },
  terrainTiles: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
  terrainAttribution: "Terrain: Mapzen / AWS Open Data",
  terrainExaggeration: 1.4,
  hillshadeExaggeration: 0.5,
  buildingDefaultHeightM: 6,
  // Camera over the Mount Bonnell demo trip (src/data/demo-trip.json); the map centers on the trip itself.
  zoom: 13.5,
  pitch: 55,
  bearing: -28,
  buildings: { dark: "#2a3138", bright: "#cfcfcf" },
  spinDegPerSec: 3,
  replaySpeed: 8, // simulated seconds per real second for the car replay
  // Regen capture while braking, regen / (regen + friction): teal at 0.7+, amber from 0.35, rose below.
  capture: { good: 0.7, mid: 0.35, minBrakeKw: 0.5 },
  line: { width: 5, glowWidth: 14, glowBlur: 8, glowOpacity: 0.5 },
} as const;

export type Theme = "dark" | "bright";
