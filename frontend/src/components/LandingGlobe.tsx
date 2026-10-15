import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import type { Map as MapTilerMap } from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import globeFallback from "../../assets/globe-fallback.png";

export default function LandingGlobe() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapTilerMap | null>(null);
  const rotating = useRef(true);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let visible = false;
    let dragging = false;
    let lastFrame = 0;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    rotating.current = !motion.matches;
    setPaused(motion.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(element);

    async function initialize() {
      try {
        const sdk = await import("@maptiler/sdk");
        if (disposed || !element) return;
        sdk.config.telemetry = false;
        const key = import.meta.env.VITE_MAPTILER_API_KEY?.trim();
        const map = new sdk.Map({
          container: element, apiKey: key || undefined,
          style: key ? sdk.MapStyle.SATELLITE : {
            version: 8,
            sources: { land: { type: "geojson", data: `${import.meta.env.BASE_URL}maps/land.geojson`, attribution: '© <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>' } },
            layers: [
              { id: "ocean", type: "background", paint: { "background-color": "#123f49" } },
              { id: "land", type: "fill", source: "land", paint: { "fill-color": "#8dbd98" } },
              { id: "coast", type: "line", source: "land", paint: { "line-color": "#bee0b7", "line-width": 0.5, "line-opacity": 0.45 } },
            ],
          },
          projection: "globe", center: [-46, -15], zoom: 1.6 + Math.log2(element.clientWidth / 520),
          minZoom: 0, maxZoom: 2, navigationControl: false, geolocateControl: false,
          scaleControl: false, terrainControl: false, fullscreenControl: false,
          scrollZoom: false, doubleClickZoom: false, touchZoomRotate: false,
          dragRotate: false, pitchWithRotate: false, attributionControl: { compact: true },
          space: false, halo: false, logSDKVersion: false,
        });
        mapRef.current = map;
        map.on("load", () => { if (!disposed) { setReady(true); map.resize(); } });
        map.on("error", () => { if (!disposed) setFailed(true); });
        map.on("dragstart", () => { dragging = true; });
        map.on("dragend", () => { dragging = false; });
        function animate(time: number) {
          if (disposed) return;
          const delta = Math.min((time - lastFrame) / 1000, 0.1);
          if (visible && !document.hidden && rotating.current && !dragging && !motion.matches && time - lastFrame >= 32) {
            const center = map.getCenter();
            map.jumpTo({ center: [center.lng + delta * 2, center.lat] });
          }
          if (time - lastFrame >= 32) lastFrame = time;
          frame = requestAnimationFrame(animate);
        }
        frame = requestAnimationFrame(animate);
      } catch (error) {
        if (!disposed) { console.error("Não foi possível inicializar o globo:", error); setFailed(true); }
      }
    }
    const resize = new ResizeObserver(() => {
      if (!mapRef.current || !element.clientWidth) return;
      mapRef.current.resize();
      mapRef.current.setZoom(Math.max(0, 1.6 + Math.log2(element.clientWidth / 520)));
    });
    resize.observe(element);
    function motionChange() { rotating.current = !motion.matches; setPaused(motion.matches); }
    motion.addEventListener("change", motionChange);
    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect(); resize.disconnect();
      motion.removeEventListener("change", motionChange);
      mapRef.current?.remove(); mapRef.current = null;
    };
  }, []);

  return <div className="landing-globe">
    <div className={`landing-globe-sphere${ready && !failed ? " is-ready" : ""}`}>
      {(!ready || failed) && <img className="landing-globe-fallback" src={globeFallback} alt="Globo terrestre" width="530" height="530" />}
      <div ref={container} className="landing-globe-map" aria-label="Globo terrestre 3D. Arraste para explorar as regiões." />
    </div>
    {ready && !failed ? <button className="landing-globe-toggle" type="button" aria-pressed={paused} onClick={() => { rotating.current = paused; setPaused(!paused); }}>{paused ? <PlayIcon size={16}/> : <PauseIcon size={16}/>} {paused ? "Girar globo" : "Pausar rotação"}</button> : <p className="landing-globe-caption">{failed ? "Visualização ilustrativa do planeta" : "Preparando o planeta…"}</p>}
    <p className="landing-globe-credit"><a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a><span> · </span><a href={import.meta.env.VITE_MAPTILER_API_KEY ? "https://www.maptiler.com/copyright/" : "https://www.naturalearthdata.com/"} target="_blank" rel="noopener noreferrer">{import.meta.env.VITE_MAPTILER_API_KEY ? "Map data" : "Natural Earth"}</a></p>
  </div>;
}
