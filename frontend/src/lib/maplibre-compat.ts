// MapTiler 4.2 expects the namespace default export removed in MapLibre 6.
// Keep that import shape while using the patched MapLibre renderer.
import * as maplibregl from "maplibre-gl-original";
import workerUrl from "maplibre-gl-original/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
export * from "maplibre-gl-original";
export default maplibregl;
