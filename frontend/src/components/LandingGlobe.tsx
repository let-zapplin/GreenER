import { useEffect, useRef, useState } from "react";
import type { Map as MapTilerMap } from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import globeFallback from "../../assets/globe-fallback.png";

const demoRegions = [
  { name: "Brasil", city: "São Paulo", coordinates: [-46.63, -23.55] as [number, number], energy: 100, carbon: 80 },
  { name: "EUA", city: "Virgínia", coordinates: [-77.49, 39.04] as [number, number], energy: 100, carbon: 350 },
  { name: "Ásia", city: "Singapura", coordinates: [103.82, 1.35] as [number, number], energy: 100, carbon: 420 },
];

export default function LandingGlobe() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapTilerMap | null>(null);
  const rotating = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const selectRegion = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let visible = false;
    let dragging = false;
    let lastFrame = 0;
    let inspecting = false;
    const cleanups: Array<() => void> = [];
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    rotating.current = !motion.matches;
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
            sources: { land: { type: "geojson", data: `${import.meta.env.BASE_URL}maps/land.geojson` } },
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
          dragRotate: false, pitchWithRotate: false,
          forceNoAttributionControl: true,
          space: false, halo: false, logSDKVersion: false,
        });
        mapRef.current = map;
        const popup = new sdk.Popup({ closeButton: true, closeOnClick: false, focusAfterOpen: false, offset: 18, maxWidth: "240px", className: "landing-demo-popup" });
        popup.on("close", () => { inspecting = false; if (!disposed) setSelectedRegion(null); });
        function openRegion(index: number) {
          const region = demoRegions[index];
          const content = document.createElement("div");
          const badge = document.createElement("span"); badge.className = "landing-demo-badge"; badge.textContent = "DEMONSTRAÇÃO · DADOS FICTÍCIOS";
          const title = document.createElement("h3"); title.textContent = `${region.name} · ${region.city}`;
          const metrics = document.createElement("p"); metrics.textContent = `${region.energy} kWh × ${region.carbon} gCO₂e/kWh`;
          const result = document.createElement("strong"); result.textContent = `${region.energy * region.carbon / 1000} kg CO₂e estimados`;
          content.append(badge, title, metrics, result);
          popup.setLngLat(region.coordinates).setDOMContent(content).addTo(map);
          inspecting = true;
          setSelectedRegion(region.name);
        }
        demoRegions.forEach((region, index) => {
          const button = document.createElement("button");
          button.type = "button"; button.className = "landing-globe-marker";
          button.setAttribute("aria-label", `${region.name}, ${region.city}: exemplo fictício de ${region.energy * region.carbon / 1000} kg de CO₂e. Ver detalhes.`);
          const dot = document.createElement("span"); button.append(dot);
          const marker = new sdk.Marker({ element: button, opacityWhenCovered: 0 }).setLngLat(region.coordinates).addTo(map);
          const show = () => openRegion(index);
          const leave = () => { if (document.activeElement !== button) popup.remove(); };
          const blur = () => popup.remove();
          button.addEventListener("mouseenter", show); button.addEventListener("mouseleave", leave);
          button.addEventListener("focus", show); button.addEventListener("blur", blur); button.addEventListener("click", show);
          cleanups.push(() => { marker.remove(); button.removeEventListener("mouseenter", show); button.removeEventListener("mouseleave", leave); button.removeEventListener("focus", show); button.removeEventListener("blur", blur); button.removeEventListener("click", show); });
        });
        selectRegion.current = index => {
          inspecting = true;
          map.easeTo({ center: demoRegions[index].coordinates, duration: motion.matches ? 0 : 900 });
          openRegion(index);
        };
        cleanups.push(() => popup.remove());
        map.on("load", () => { if (!disposed) { setReady(true); map.resize(); } });
        map.on("error", () => { if (!disposed) setFailed(true); });
        map.on("dragstart", () => { dragging = true; });
        map.on("dragend", () => { dragging = false; });
        function animate(time: number) {
          if (disposed) return;
          const delta = Math.min((time - lastFrame) / 1000, 0.1);
          if (visible && !document.hidden && rotating.current && !dragging && !inspecting && !motion.matches && time - lastFrame >= 32) {
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
    function motionChange() { rotating.current = !motion.matches; }
    motion.addEventListener("change", motionChange);
    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect(); resize.disconnect();
      motion.removeEventListener("change", motionChange);
      cleanups.forEach(cleanup => cleanup());
      selectRegion.current = () => {};
      mapRef.current?.remove(); mapRef.current = null;
    };
  }, []);

  return <div className="landing-globe">
    <div className={`landing-globe-sphere${ready && !failed ? " is-ready" : ""}`}>
      {(!ready || failed) && <img className="landing-globe-fallback" src={globeFallback} alt="Globo terrestre" width="530" height="530" />}
      <div ref={container} className="landing-globe-map" aria-label="Globo terrestre 3D. Arraste para explorar as regiões." />
    </div>
    {ready && !failed && <div className="landing-globe-regions" aria-label="Explorar exemplos fictícios">{demoRegions.map((region, index) => <button key={region.name} type="button" aria-pressed={selectedRegion === region.name} onClick={() => selectRegion.current(index)}>{region.name}</button>)}</div>}
    {(!ready || failed) && <p className="landing-globe-caption">{failed ? "Visualização ilustrativa do planeta" : "Preparando o planeta…"}</p>}
  </div>;
}
