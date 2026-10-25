"use client";

import dynamic from "next/dynamic";

/** Mapbox GL needs `window`, so it never renders on the server. */
const MapPreviewClient = dynamic(() => import("./MapPreview"), {
  ssr: false,
  loading: () => <div className="map-wrap" aria-busy="true" />,
});

export default MapPreviewClient;
