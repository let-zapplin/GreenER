import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl-original/dist/maplibre-gl.css";
import type { MonitoredService, ServiceStatus } from "../types/service";
import "./ServicesMap.css";
import { isSameMapTarget, type MapCameraTarget } from "../lib/mapFocus";

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-180, -85],
  [180, 85],
];

const FOCUS_ZOOM = 16;
const FOCUS_ZOOM_BY_CITY: Record<string, number> = { Toronto: 14 };
const FOCUS_PITCH = 62;
const FLY_DURATION = 3200;
const OVERVIEW_DURATION = 1800;
const ORBIT_DEGREES_PER_MS = 0.006;

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const BUILDINGS_LAYER_ID = "services-3d-buildings";

function addBuildingsLayer(map: MapLibreMap) {
  if (map.getLayer(BUILDINGS_LAYER_ID) || !map.getSource("openmaptiles")) {
    return;
  }

  const labelLayer = map
    .getStyle()
    .layers?.find((layer) => layer.type === "symbol");

  map.addLayer(
    {
      id: BUILDINGS_LAYER_ID,
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      filter: [
        "all",
        ["match", ["geometry-type"], ["MultiPolygon", "Polygon"], true, false],
        ["!=", ["get", "hide_3d"], true],
      ],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "render_height"], 0],
          0,
          "#16292b",
          60,
          "#1f3c3f",
          140,
          "#2a5154",
          240,
          "#37686b",
        ],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.92,
      },
    },
    labelLayer?.id,
  );
}

function hideBoundaries(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "line") continue;

    const sourceLayer =
      "source-layer" in layer ? layer["source-layer"] : undefined;
    const isBoundary =
      sourceLayer === "boundary" ||
      layer.id.startsWith("boundary_") ||
      layer.id.includes("admin") ||
      layer.id.includes("border");

    if (isBoundary) {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

function hideRoadNames(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue;

    const sourceLayer =
      "source-layer" in layer ? layer["source-layer"] : undefined;
    if (sourceLayer === "transportation_name") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

function formatPlace(location: MonitoredService["location"]) {
  const { city, region, country } = location;
  return `${city ? `${city} · ` : ""}${region}, ${country}`;
}

function buildPopupContent(title: string, subtitle: string) {
  const content = document.createElement("div");
  content.className = "services-map-popup-content";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const meta = document.createElement("span");
  meta.textContent = subtitle;

  content.append(heading, meta);
  return content;
}

const statusPriority: ServiceStatus[] = [
  "unavailable",
  "removed",
  "no_metrics",
  "new",
  "returned",
  "active",
];

const statusLabels: Record<ServiceStatus, string> = {
  active: "Ativo",
  new: "Novo",
  returned: "Retornou",
  no_metrics: "Sem métricas",
  unavailable: "Indisponível",
  removed: "Removido",
};

type ServiceGroup = {
  key: string;
  longitude: number;
  latitude: number;
  status: ServiceStatus;
  services: MonitoredService[];
};

function buildGroupPopupContent(
  group: ServiceGroup,
  onSelect: (service: MonitoredService) => void,
) {
  const content = document.createElement("div");

  content.className = "services-map-group-popup";

  const heading = document.createElement("strong");

  heading.textContent = `${group.services.length} serviços neste local`;

  const place = document.createElement("span");

  place.className = "services-map-group-popup-place";

  place.textContent = formatPlace(group.services[0].location);

  const list = document.createElement("div");

  list.className = "services-map-group-popup-list";

  for (const service of group.services) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = `services-map-group-service ${service.status}`;

    button.setAttribute(
      "aria-label",
      `Selecionar ${service.name}. ${statusLabels[service.status]}.`,
    );

    const dot = document.createElement("span");

    dot.className = "services-map-group-service-dot";

    dot.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");

    name.className = "services-map-group-service-name";

    name.textContent = service.name;

    const status = document.createElement("span");

    status.className = "services-map-group-service-status";

    status.textContent = statusLabels[service.status];

    button.append(dot, name, status);

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      onSelect(service);
    });

    list.append(button);
  }

  content.append(heading, place, list);

  return content;
}

function groupServices(services: MonitoredService[]) {
  const grouped = new Map<string, ServiceGroup>();
  let withoutLocation = 0;

  for (const service of services) {
    const { latitude, longitude } = service.location;
    if (latitude === null || longitude === null) {
      withoutLocation += 1;
      continue;
    }

    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.services.push(service);
    } else {
      grouped.set(key, {
        key,
        latitude,
        longitude,
        status: service.status,
        services: [service],
      });
    }
  }

  const groups = [...grouped.values()].map((group) => ({
    ...group,
    status:
      statusPriority.find((status) =>
        group.services.some((service) => service.status === status),
      ) ?? group.services[0].status,
  }));

  return { groups, withoutLocation };
}

export type MapFocusRequest = {
  key: number;
  longitude: number;
  latitude: number;
  label: string;
  city?: string | null;
  place?: string;
  scrollToMap?: boolean;
};

type ServicesMapProps = {
  services: MonitoredService[];
  focus?: MapFocusRequest | null;
  onSelectService?: (serviceId: string) => void;
  onClearSelection?: () => void;
  onLoadingChange?: (loading: boolean) => void;
};

export function ServicesMap({
  services,
  focus,
  onSelectService,
  onClearSelection,
  onLoadingChange,
}: ServicesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectServiceRef = useRef(onSelectService);
  const loadedRef = useRef(false);
  const orbitFrameRef = useRef<number | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const pendingArrivalRef = useRef<{
    map: MapLibreMap;
    handler: () => void;
  } | null>(null);
  const pendingIdleRef = useRef<{
    map: MapLibreMap;
    handler: () => void;
  } | null>(null);
  const pendingFocusRef = useRef<MapFocusRequest | null>(null);
  const activeTargetRef = useRef<MapCameraTarget | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  function clearLoadingTimeout() {
    if (loadingTimeoutRef.current !== null) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  function startLoadingTimeout() {
    clearLoadingTimeout();
    setLoadingError(null);

    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null;
      onLoadingChange?.(false);

      setLoadingError(
        "O mapa está demorando para carregar. Verifique sua conexão.",
      );
    }, 30_000);
  }
  useEffect(() => {
    onSelectServiceRef.current = onSelectService;
  }, [onSelectService]);

  const { groups, withoutLocation } = useMemo(
    () => groupServices(services),
    [services],
  );

  const markerKey = useMemo(
    () =>
      groups
        .map(
          (group) =>
            `${group.key}:${group.status}:${group.services
              .map((service) => `${service.id}:${service.status}`)
              .sort()
              .join(",")}`,
        )
        .join("|"),
    [groups],
  );

  const legendStatuses = statusPriority.filter((status) =>
    services.some((service) => service.status === status),
  );

  const focusKey = focus?.key;

  const cancelOrbit = () => {
    activeTargetRef.current = null;
    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current);
      orbitFrameRef.current = null;
    }

    const pending = pendingArrivalRef.current;
    if (pending) {
      pending.map.off("moveend", pending.handler);
      pendingArrivalRef.current = null;
    }

    // Cancela também a espera pelos detalhes do destino anterior.
    const pendingIdle = pendingIdleRef.current;
    if (pendingIdle) {
      pendingIdle.map.off("idle", pendingIdle.handler);
      pendingIdleRef.current = null;
    }

    if (pending || pendingIdle) {
      onLoadingChange?.(false);
    }
  };

  const startOrbit = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
  ) => {
    cancelOrbit();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const center: [number, number] = [longitude, latitude];
    let lastFrame = performance.now();
    const step = (now: number) => {
      const elapsed = Math.min(now - lastFrame, 64);
      lastFrame = now;
      map.jumpTo({
        center,
        bearing: (map.getBearing() + elapsed * ORBIT_DEGREES_PER_MS) % 360,
      });
      orbitFrameRef.current = requestAnimationFrame(step);
    };

    orbitFrameRef.current = requestAnimationFrame(step);
  };

  const flyToPoint = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
    city?: string | null,
  ) => {
    const target: MapCameraTarget = {
      longitude,
      latitude,
      zoom: (city && FOCUS_ZOOM_BY_CITY[city]) || FOCUS_ZOOM,
      pitch: FOCUS_PITCH,
    };

    // Outro serviço no mesmo destino mantém o voo/carregamento já iniciado.
    if (
      activeTargetRef.current &&
      isSameMapTarget(activeTargetRef.current, target)
    ) {
      return;
    }

    const center = map.getCenter();
    const alreadyFramed = isSameMapTarget(
      {
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
      },
      target,
    );

    // Não interrompe a órbita nem reinicia o loading se a câmera já está no ponto.
    if (
      alreadyFramed &&
      !activeTargetRef.current &&
      (!map.isMoving() || orbitFrameRef.current !== null)
    ) {
      // O pointerdown no marcador/popup pode ter pausado a órbita.
      // Retoma sem deslocar a câmera ou reabrir o indicador de carregamento.
      if (orbitFrameRef.current === null) {
        startOrbit(map, longitude, latitude);
      }
      return;
    }

    cancelOrbit();
    // Encerra o voo anterior antes de registrar o moveend do novo destino.
    map.stop();
    if (alreadyFramed) {
      startOrbit(map, longitude, latitude);
      return;
    }

    activeTargetRef.current = target;
    onLoadingChange?.(true);

    const onArrive = () => {
      if (pendingArrivalRef.current?.handler !== onArrive) return;
      pendingArrivalRef.current = null;

      const finishLoading = () => {
        // Ignora uma conclusão antiga caso o destino já tenha mudado.
        if (pendingIdleRef.current?.handler !== finishLoading) return;
        pendingIdleRef.current = null;
        activeTargetRef.current = null;
        onLoadingChange?.(false);
        startOrbit(map, longitude, latitude);
      };

      pendingIdleRef.current = { map, handler: finishLoading };
      if (map.loaded()) {
        finishLoading();
      } else {
        map.once("idle", finishLoading);
      }
    };

    pendingArrivalRef.current = { map, handler: onArrive };
    map.once("moveend", onArrive);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    map.flyTo({
      center: [longitude, latitude],
      zoom: target.zoom,
      pitch: target.pitch,
      bearing: 0,
      duration: reducedMotion ? 0 : FLY_DURATION,
      curve: 1.42,
      essential: true,
    });
  };

  const openPopup = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
    title: string,
    subtitle: string,
  ) => {
    const popup =
      popupRef.current ??
      new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        focusAfterOpen: false,
        offset: 18,
        maxWidth: "280px",
        className: "services-map-popup",
      });

    popupRef.current = popup;
    popup
      .setLngLat([longitude, latitude])
      .setDOMContent(buildPopupContent(title, subtitle))
      .addTo(map);
  };

  const focusPoint = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
    city: string | null | undefined,
    title: string,
    subtitle: string,
  ) => {
    flyToPoint(map, longitude, latitude, city);
    openPopup(map, longitude, latitude, title, subtitle);
  };

  const selectServiceFromMap = (
    map: MapLibreMap,
    service: MonitoredService,
  ) => {
    popupRef.current?.remove();

    const callback = onSelectServiceRef.current;

    if (callback) {
      callback(service.id);
      return;
    }

    const { latitude, longitude, city } = service.location;

    if (latitude === null || longitude === null) {
      return;
    }

    focusPoint(
      map,
      longitude,
      latitude,
      city,
      service.name,
      formatPlace(service.location),
    );
  };

  const openServiceGroupPopup = (map: MapLibreMap, group: ServiceGroup) => {
    const popup =
      popupRef.current ??
      new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        focusAfterOpen: false,
        offset: 18,
        maxWidth: "320px",
        className: "services-map-popup",
      });

    popupRef.current = popup;

    popup.setMaxWidth("320px");

    popup
      .setLngLat([group.longitude, group.latitude])
      .setDOMContent(
        buildGroupPopupContent(group, (service) => {
          popup.remove();

          selectServiceFromMap(map, service);
        }),
      )
      .addTo(map);
  };

  const showOverview = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    cancelOrbit();
    popupRef.current?.remove();
    map.stop();
    onClearSelection?.();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    map.fitBounds(WORLD_BOUNDS, {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : OVERVIEW_DURATION,
      bearing: 0,
      pitch: 0,
      padding: 0,
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE,
        center: [0, 15],
        zoom: 1.2,
        bearing: 0,
        pitch: 0,
        minZoom: 0.5,
        maxZoom: 19,

        maxPitch: 70,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
      });
    } catch (error) {
      console.error("Não foi possível inicializar o mapa:", error);
      setFailed(true);
      onLoadingChange?.(false);
      return;
    }

    mapRef.current = map;
    map.fitBounds(WORLD_BOUNDS, { animate: false, padding: 0 });
    setReady(true);

    const applyMapLayers = () => {
      addBuildingsLayer(map);
      hideBoundaries(map);
      hideRoadNames(map);
    };

    const onStyleLoad = () => applyMapLayers();

    const onLoad = () => {
      loadedRef.current = true;
      onLoadingChange?.(false);
      applyMapLayers();

      const pending = pendingFocusRef.current;
      if (pending) {
        pendingFocusRef.current = null;
        focusPoint(
          map,
          pending.longitude,
          pending.latitude,
          pending.city,
          pending.label,
          pending.place ?? "",
        );
      }
    };
    map.on("style.load", onStyleLoad);
    map.on("load", onLoad);

    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);

    return () => {
      resize.disconnect();
      cancelOrbit();
      popupRef.current?.remove();
      popupRef.current = null;
      map.off("style.load", onStyleLoad);
      map.off("load", onLoad);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!focus) return;

    if (focus.scrollToMap) {
      containerRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      });
    }

    const map = mapRef.current;
    if (!map) return;

    if (!loadedRef.current) {
      pendingFocusRef.current = focus;
      return;
    }

    focusPoint(
      map,
      focus.longitude,
      focus.latitude,
      focus.city,
      focus.label,
      focus.place ?? "",
    );
  }, [focusKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stopOrbit = () => cancelOrbit();

    container.addEventListener("pointerdown", stopOrbit, true);
    container.addEventListener("wheel", stopOrbit, {
      capture: true,
      passive: true,
    });

    return () => {
      container.removeEventListener("pointerdown", stopOrbit, true);
      container.removeEventListener("wheel", stopOrbit, true);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const markers: Marker[] = groups.map((group) => {
      const names = group.services.map((service) => service.name).join(", ");
      const { city, country } = group.services[0].location;
      const place = [city, country].filter(Boolean).join(", ");

      const element = document.createElement("button");
      element.type = "button";
      element.className = `services-map-marker ${group.status}`;
      element.setAttribute(
        "aria-label",
        `${names} — ${place}. Aproximar no mapa.`,
      );
      element.title = names;

      const dot = document.createElement("span");
      dot.className = "services-map-marker-dot";
      element.append(dot);

      if (group.services.length > 1) {
        const count = document.createElement("span");
        count.className = "services-map-marker-count";
        count.textContent = String(group.services.length);
        element.append(count);
      }

      element.addEventListener("click", (event) => {
        event.stopPropagation();

        if (group.services.length === 1) {
          selectServiceFromMap(map, group.services[0]);

          return;
        }

        openServiceGroupPopup(map, group);
      });

      return new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([group.longitude, group.latitude])
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [markerKey, ready]);

  if (failed) {
    return (
      <div className="services-map-notice" role="status">
        <strong>Não foi possível carregar o mapa</strong>
        <p>Verifique se o navegador tem suporte a WebGL e tente novamente.</p>
      </div>
    );
  }

  return (
    <>
      <div className="services-map-shell">
        <div
          ref={containerRef}
          className="services-map-canvas"
          role="region"
          aria-label={
            focus
              ? `Mapa dos serviços. Último foco: ${focus.label}`
              : "Mapa dos serviços"
          }
        />
        <button
          type="button"
          className="services-map-overview-button"
          onClick={showOverview}
          title="Voltar para a visão geral do mundo"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
          </svg>
          Visão geral
        </button>
        {ready && groups.length === 0 && (
          <p className="services-map-empty">
            Nenhum serviço com coordenadas cadastradas.
          </p>
        )}
      </div>
      <div className="services-map-footer">
        <ul className="services-map-legend" aria-label="Legenda dos status">
          {legendStatuses.map((status) => (
            <li key={status}>
              <span
                className={`services-map-legend-dot ${status}`}
                aria-hidden="true"
              />
              {statusLabels[status]}
            </li>
          ))}
        </ul>
        {withoutLocation > 0 && (
          <p className="services-map-note">
            {withoutLocation}{" "}
            {withoutLocation === 1
              ? "serviço sem localização cadastrada"
              : "serviços sem localização cadastrada"}
          </p>
        )}
      </div>
    </>
  );
}
