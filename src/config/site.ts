export const SITE = {
  name: "Regen Coach",
  tagline: "Every brake is free energy.",
  description:
    "Regen Coach shows how much you’re leaving on the road. We replay simulated hybrid drives on a real 3D city map and score how well each driver captures regenerative braking.",
  appUrl: "https://app.regentic.tech",
} as const;

export const MAP = {
  styles: {
    dark: "mapbox://styles/mapbox/dark-v11",
    bright: "mapbox://styles/mapbox/light-v11",
  },
  center: [-97.7431, 30.2672] as [number, number], // Austin, [lon, lat]
  zoom: 14.6,
  pitch: 62,
  bearing: -28,
  buildings: { dark: "#2a3138", bright: "#cfcfcf" },
  spinDegPerSec: 3,
} as const;

export type Theme = "dark" | "bright";
