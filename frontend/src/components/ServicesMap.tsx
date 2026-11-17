import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Popup,
} from "maplibre-gl";
import "maplibre-gl-original/dist/maplibre-gl.css";
import type { MonitoredService, ServiceStatus } from "../types/service";
import "./ServicesMap.css";
import { isSameMapTarget, type MapCameraTarget } from "../lib/mapFocus";
import {
  buildServiceFeatureCollection,
  type ServicePointFeatureCollection,
} from "../lib/serviceGeoJson";

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-180, -85],
  [180, 85],
];

const FOCUS_ZOOM = 16;

const FOCUS_ZOOM_BY_CITY: Record<string, number> = {
  Toronto: 14,
};

const FOCUS_PITCH = 58;

// Etapa 1: a câmera sobe antes de viajar.
const TRANSITION_OUT_ZOOM = 7;
const TRANSITION_OUT_DURATION = 650;

// Etapa 2: deslocamento geográfico.
const TRANSITION_TRAVEL_ZOOM = 6.5;
const TRANSITION_TRAVEL_DURATION = 1700;

// Etapa 3: aproximação final.
const TRANSITION_IN_DURATION = 720;

// Retorno para a visão geral.
//
// 1. Solta a câmera do serviço.
// 2. Sobe para uma altitude intermediária.
// 3. Abre a visão mundial.

const OVERVIEW_RELEASE_ZOOM = 11;
const OVERVIEW_MID_ZOOM = 5.5;

const OVERVIEW_RELEASE_DURATION = 650;
const OVERVIEW_MID_DURATION = 850;
const OVERVIEW_WORLD_DURATION = 1100;

const ORBIT_DEGREES_PER_MS = 0.004;

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const BUILDINGS_LAYER_ID = "services-3d-buildings";
const SERVICES_SOURCE_ID = "greener-services";
// Camada de brilho dos agrupamentos
const CLUSTER_GLOW_LAYER_ID = "greener-service-cluster-glow";
const CLUSTERS_LAYER_ID = "greener-service-clusters";
const CLUSTER_COUNTS_LAYER_ID = "greener-service-cluster-counts";
const SERVICE_POINTS_LAYER_ID = "greener-service-points";

//essas duas funções "ease" controlam velocidade da camera
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function addServiceLayers(
  map: MapLibreMap,
  data: ServicePointFeatureCollection,
) {
  if (!map.getSource(SERVICES_SOURCE_ID)) {
    map.addSource(SERVICES_SOURCE_ID, {
      type: "geojson",
      data,

      cluster: true,
      clusterRadius: 48,
      clusterMaxZoom: 18,

      clusterProperties: {
        statusRank: [
          "max",
          [
            "match",
            ["get", "status"],

            "unavailable",
            7,

            "error",
            6,

            "removed",
            5,

            "no_metrics",
            4,

            "new",
            3,

            "returned",
            2,

            "active",
            1,

            0,
          ],
        ],

        selectedStatusRank: [
          "max",
          [
            "case",

            ["==", ["get", "selected"], true],

            [
              "match",
              ["get", "status"],

              "unavailable",
              7,

              "error",
              6,

              "removed",
              5,

              "no_metrics",
              4,

              "new",
              3,

              "returned",
              2,

              "active",
              1,

              0,
            ],

            0,
          ],
        ],
      },
    });
  }

  if (!map.getLayer(CLUSTER_GLOW_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_GLOW_LAYER_ID,

      type: "circle",

      source: SERVICES_SOURCE_ID,

      filter: ["has", "point_count"],

      paint: {
        "circle-color": "#2fc21f",

        "circle-radius": [
          "step",
          ["get", "point_count"],
          23,
          10,
          26,
          50,
          32,
          100,
          37,
        ],

        "circle-opacity": 0.8,

        "circle-blur": 0.9,
      },
    });
  }

  if (!map.getLayer(CLUSTERS_LAYER_ID)) {
    map.addLayer({
      id: CLUSTERS_LAYER_ID,
      type: "circle",
      source: SERVICES_SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "match",

          [
            "case",

            [">", ["get", "selectedStatusRank"], 0],

            ["get", "selectedStatusRank"],

            ["get", "statusRank"],
          ],

          7,
          "#ff5e57",

          6,
          "#e879f9",

          5,
          "#b58cff",

          4,
          "#ffb84d",

          3,
          "#ffd84a",

          2,
          "#59dbe8",

          1,
          "#4a9741",

          "#1d6658",
        ],

        "circle-radius": [
          "step",
          ["get", "point_count"],

          18,

          10,
          22,

          50,
          28,

          100,
          34,
        ],

        "circle-stroke-color": [
          "case",

          [">", ["get", "selectedStatusRank"], 0],

          "#ffffff",

          [
            "match",
            ["get", "statusRank"],

            7,
            "#ff5e57",

            6,
            "#e879f9",

            5,
            "#b58cff",

            4,
            "#ffb84d",

            3,
            "#ffd84a",

            2,
            "#59dbe8",

            1,
            "#74e866",

            "#a8ef9c",
          ],
        ],

        "circle-stroke-width": [
          "case",

          [">", ["get", "selectedStatusRank"], 0],

          3,

          2,
        ],
      },
    });
  }

  if (!map.getLayer(CLUSTER_COUNTS_LAYER_ID)) {
    map.addLayer({
      id: CLUSTER_COUNTS_LAYER_ID,
      type: "symbol",
      source: SERVICES_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#f4fff4",
      },
    });
  }

  if (!map.getLayer(SERVICE_POINTS_LAYER_ID)) {
    map.addLayer({
      id: SERVICE_POINTS_LAYER_ID,
      type: "circle",
      source: SERVICES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "match",
          ["get", "status"],
          "active",
          "#74e866",
          "new",
          "#ffd84a",
          "returned",
          "#59dbe8",
          "no_metrics",
          "#ffb84d",
          "unavailable",
          "#ff5e57",
          "error",
          "#e879f9",
          "removed",
          "#b58cff",
          "#74e866",
        ],
        "circle-radius": ["case", ["==", ["get", "selected"], true], 9, 7],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "selected"], true],
          "#ffffff",
          "#0c282b",
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "selected"], true],
          3,
          2,
        ],
      },
    });
  }
}

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
  "error",
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
  error: "Erro na coleta",
  removed: "Removido",
};

function buildGroupPopupContent(
  services: MonitoredService[],
  onSelectService: (serviceId: string) => void,
) {
  const content = document.createElement("div");

  content.className = "services-map-popup-content";

  const heading = document.createElement("strong");

  heading.textContent = `${services.length} serviços neste local`;

  const list = document.createElement("div");

  list.className = "services-map-popup-service-list";

  for (const service of services) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `services-map-popup-service ${service.status}`;

    button.dataset.serviceId = service.id;

    const name = document.createElement("span");

    name.dataset.serviceName = "true";

    name.textContent = service.name;

    const status = document.createElement("small");

    status.dataset.serviceStatus = "true";

    status.textContent = statusLabels[service.status];

    button.append(name, status);

    button.addEventListener("click", () => {
      onSelectService(service.id);
    });

    list.append(button);
  }

  content.append(heading, list);

  return content;
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
  selectedServiceId?: string | null;
  focus?: MapFocusRequest | null;
  onSelectService?: (serviceId: string) => void;
  onClearSelection?: () => void;
  onLoadingChange?: (loading: boolean) => void;
};

export function ServicesMap({
  services,
  selectedServiceId = null,
  focus,
  onSelectService,
  onClearSelection,
  onLoadingChange,
}: ServicesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectServiceRef = useRef(onSelectService);
  const servicesRef = useRef(services);
  const loadedRef = useRef(false);
  const orbitFrameRef = useRef<number | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const groupPopupContentRef = useRef<HTMLDivElement | null>(null);
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

useEffect(() => {
  /*
   * Mantém os callbacks do MapLibre
   * com acesso à versão atual dos serviços.
   */
  servicesRef.current =
    services;

  /*
   * Se não existe popup agrupado aberto,
   * não precisamos atualizar nada.
   */
  const content =
    groupPopupContentRef.current;

  if (!content) {
    return;
  }

  const buttons =
    content.querySelectorAll<HTMLButtonElement>(
      ".services-map-popup-service",
    );

  let visibleServices = 0;

  buttons.forEach((button) => {
    const serviceId =
      button.dataset.serviceId;

    if (!serviceId) {
      return;
    }

    const service =
      services.find(
        (item) =>
          item.id === serviceId,
      );

    /*
     * Se o serviço deixou de existir,
     * removemos sua opção.
     */
    if (!service) {
      button.remove();
      return;
    }

    visibleServices += 1;

    /*
     * Atualiza também a classe,
     * fazendo a cor acompanhar o status.
     */
    button.className =
      `services-map-popup-service ${service.status}`;

    const name =
      button.querySelector<HTMLElement>(
        "[data-service-name]",
      );

    if (name) {
      name.textContent =
        service.name;
    }

    const status =
      button.querySelector<HTMLElement>(
        "[data-service-status]",
      );

    if (status) {
      status.textContent =
        statusLabels[
          service.status
        ];
    }
  });

  /*
   * Atualiza a quantidade mostrada
   * no cabeçalho.
   */
  const heading =
    content.querySelector("strong");

  if (heading) {
    heading.textContent =
      `${visibleServices} serviços neste local`;
  }

  /*
   * Se deixou de ser um agrupamento,
   * o popup não faz mais sentido.
   */
  if (visibleServices < 2) {
    popupRef.current?.remove();

    popupRef.current = null;

    groupPopupContentRef.current =
      null;
  }
}, [services]);
  const featureCollection = useMemo(
    () => buildServiceFeatureCollection(services, selectedServiceId),
    [services, selectedServiceId],
  );
  const withoutLocation = services.length - featureCollection.features.length;

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

    // Evita iniciar novamente uma transição
    // que já está indo para o mesmo destino.
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

    if (alreadyFramed) {
      activeTargetRef.current = null;
      onLoadingChange?.(false);

      return;
    }

    // Cancela qualquer transição anterior.
    cancelOrbit();
    map.stop();

    activeTargetRef.current = target;

    onLoadingChange?.(true);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Acessibilidade:
    // se o usuário pediu redução de movimento,
    // não executamos a sequência cinematográfica.
    if (reducedMotion) {
      map.jumpTo({
        center: [longitude, latitude],
        zoom: target.zoom,
        pitch: target.pitch,
        bearing: 0,
      });

      activeTargetRef.current = null;

      onLoadingChange?.(false);

      return;
    }

    /**
     * Registra uma etapa da animação.
     *
     * Quando o MapLibre emitir "moveend",
     * chamamos a próxima etapa.
     */
    const waitForMoveEnd = (next: () => void) => {
      const handler = () => {
        if (pendingArrivalRef.current?.handler !== handler) {
          return;
        }

        pendingArrivalRef.current = null;

        next();
      };

      pendingArrivalRef.current = {
        map,
        handler,
      };

      map.once("moveend", handler);
    };

    /**
     * FINAL
     *
     * Esperamos os tiles terminarem de
     * carregar antes de desligar o loading.
     */
    const finishTransition = () => {
      const finishLoading = () => {
        if (pendingIdleRef.current?.handler !== finishLoading) {
          return;
        }

        pendingIdleRef.current = null;

        activeTargetRef.current = null;

        onLoadingChange?.(false);

        startOrbit(map, longitude, latitude);
      };

      pendingIdleRef.current = {
        map,
        handler: finishLoading,
      };

      if (map.loaded()) {
        finishLoading();
      } else {
        map.once("idle", finishLoading);
      }
    };

    /**
     * ETAPA 3
     *
     * Mergulho final.
     *
     * Aqui entram:
     * - zoom alto
     * - pitch 3D
     * - desaceleração suave
     */
    const approachDestination = () => {
      waitForMoveEnd(finishTransition);

      map.easeTo({
        center: [longitude, latitude],

        zoom: target.zoom,

        pitch: target.pitch,

        bearing: 0,

        duration: TRANSITION_IN_DURATION,

        easing: easeOutCubic,

        essential: false,
      });
    };

    /**
     * ETAPA 2
     *
     * Viaja até a região do serviço
     * ainda em uma altitude relativamente alta.
     */
    const travelToDestination = () => {
      waitForMoveEnd(approachDestination);

      map.flyTo({
        center: [longitude, latitude],

        zoom: Math.min(TRANSITION_TRAVEL_ZOOM, target.zoom - 1),

        pitch: 0,

        bearing: 0,

        duration: TRANSITION_TRAVEL_DURATION,

        curve: 1.05,

        easing: easeInOutCubic,

        essential: false,
      });
    };

    /**
     * ETAPA 1
     *
     * Se estivermos próximos de um serviço,
     * primeiro subimos.
     *
     * Se já estivermos na visão mundial,
     * pulamos essa etapa.
     */
    const shouldZoomOut = map.getZoom() > TRANSITION_OUT_ZOOM + 0.5;

    if (!shouldZoomOut) {
      travelToDestination();

      return;
    }

    waitForMoveEnd(travelToDestination);

    map.easeTo({
      zoom: TRANSITION_OUT_ZOOM,

      pitch: 0,

      bearing: 0,

      duration: TRANSITION_OUT_DURATION,

      easing: easeInOutCubic,

      essential: false,
    });
  };

  const startOrbit = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
  ) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Se por algum motivo já existir uma órbita,
    // encerramos apenas aquele animationFrame.
    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current);

      orbitFrameRef.current = null;
    }

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

  const createPopup = (closeOnClick: boolean, maxWidth: string) => {
    popupRef.current?.remove();

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick,
      focusAfterOpen: false,
      offset: 18,
      maxWidth,
      className: "services-map-popup",
    });

    popupRef.current = popup;

    return popup;
  };

  const openPopup = (
    map: MapLibreMap,
    longitude: number,
    latitude: number,
    title: string,
    subtitle: string,
  ) => {
    const popup = createPopup(true, "280px");

    popup
      .setLngLat([longitude, latitude])
      .setDOMContent(buildPopupContent(title, subtitle))
      .addTo(map);
  };

const openGroupPopup = (
  map: MapLibreMap,
  longitude: number,
  latitude: number,
  groupedServices: MonitoredService[],
) => {
  const popup =
    createPopup(false, "320px");

  const content =
    buildGroupPopupContent(
      groupedServices,
      (serviceId) => {
        popup.remove();

        popupRef.current = null;
        groupPopupContentRef.current =
          null;

        selectServiceFromMap(
          serviceId,
        );
      },
    );

  /*
   * Guardamos uma referência para o HTML
   * que está atualmente aberto no mapa.
   */
  groupPopupContentRef.current =
    content;

  popup
    .setLngLat([
      longitude,
      latitude,
    ])
    .setDOMContent(content)
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

  const selectServiceFromMap = (serviceId: string) => {
    popupRef.current?.remove();

    // Ativa o estado de transição antes de selecionar o serviço.
    // Isso evita o painel aparecer por um instante
    // antes da câmera começar a se mover.
    onLoadingChange?.(true);

    onSelectServiceRef.current?.(serviceId);
  };
  const showOverview = () => {
    const map = mapRef.current;

    if (!map || !loadedRef.current) {
      return;
    }

    cancelOrbit();

    popupRef.current?.remove();

    map.stop();

    /*
     * Ativamos o loading antes de limpar a seleção.
     *
     * Assim a saída do painel e o início
     * da transição acontecem juntos.
     */
    onLoadingChange?.(true);

    onClearSelection?.();

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    /*
     * Acessibilidade:
     * pula toda a animação.
     */
    if (reducedMotion) {
      map.fitBounds(WORLD_BOUNDS, {
        animate: false,
        bearing: 0,
        pitch: 0,
        padding: 0,
      });

      onLoadingChange?.(false);

      return;
    }

    /*
     * FINAL
     *
     * Espera os tiles terminarem de carregar
     * antes de remover o efeito de transição.
     */
    const finishOverview = () => {
      activeTargetRef.current = null;

      const finishLoading = () => {
        onLoadingChange?.(false);
      };

      if (map.loaded()) {
        finishLoading();
      } else {
        map.once("idle", finishLoading);
      }
    };

    /*
     * ETAPA 3
     *
     * Abre definitivamente para
     * a visão mundial.
     */
    const openWorld = () => {
      map.once("moveend", finishOverview);

      map.fitBounds(WORLD_BOUNDS, {
        animate: true,

        duration: OVERVIEW_WORLD_DURATION,

        bearing: 0,
        pitch: 0,

        padding: 0,
      });
    };

    /*
     * ETAPA 2
     *
     * Câmera sobe bastante,
     * já completamente horizontal.
     */
    const riseToMidAltitude = () => {
      map.once("moveend", openWorld);

      map.easeTo({
        zoom: OVERVIEW_MID_ZOOM,

        pitch: 0,
        bearing: 0,

        duration: OVERVIEW_MID_DURATION,

        easing: easeInOutCubic,

        essential: false,
      });
    };

    /*
     * Dependendo da posição atual,
     * podemos evitar movimentos desnecessários.
     */

    const currentZoom = map.getZoom();

    if (currentZoom <= OVERVIEW_MID_ZOOM + 0.5) {
      openWorld();

      return;
    }

    if (currentZoom <= OVERVIEW_RELEASE_ZOOM + 0.5) {
      riseToMidAltitude();

      return;
    }

    /*
     * ETAPA 1
     *
     * Sai do nível da rua/prédios.
     *
     * Não removemos totalmente o pitch ainda:
     * isso deixa a saída menos "seca".
     */

    map.once("moveend", riseToMidAltitude);

    map.easeTo({
      zoom: OVERVIEW_RELEASE_ZOOM,

      pitch: 28,
      bearing: map.getBearing(),

      duration: OVERVIEW_RELEASE_DURATION,

      easing: easeInOutCubic,

      essential: false,
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

    const applyMapLayers = () => {
      addBuildingsLayer(map);
      hideBoundaries(map);
      hideRoadNames(map);
      addServiceLayers(map, featureCollection);
    };

    const onStyleLoad = () => applyMapLayers();

    const onClusterClick = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];

      const geometry = feature?.geometry;

      const clusterId = Number(feature?.properties?.cluster_id);

      const pointCount = Number(feature?.properties?.point_count);

      const source = map.getSource(SERVICES_SOURCE_ID) as
        | GeoJSONSource
        | undefined;

      if (
        !source ||
        !Number.isInteger(clusterId) ||
        !Number.isInteger(pointCount) ||
        !geometry ||
        geometry.type !== "Point"
      ) {
        return;
      }

      const [longitude, latitude] = geometry.coordinates;

      try {
        const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);

        const coordinates = leaves
          .map((leaf) => {
            if (leaf.geometry.type !== "Point") {
              return null;
            }

            return leaf.geometry.coordinates;
          })
          .filter((coordinate): coordinate is number[] => coordinate !== null);

        const firstCoordinate = coordinates[0];

        const sameLocation =
          firstCoordinate !== undefined &&
          coordinates.every(
            (coordinate) =>
              Math.abs(coordinate[0] - firstCoordinate[0]) < 0.0001 &&
              Math.abs(coordinate[1] - firstCoordinate[1]) < 0.0001,
          );

        if (sameLocation) {
          const serviceIds = new Set(
            leaves.flatMap((leaf) => {
              const serviceId = leaf.properties?.serviceId;

              return typeof serviceId === "string" ? [serviceId] : [];
            }),
          );

          const groupedServices = servicesRef.current.filter((service) =>
            serviceIds.has(service.id),
          );

          if (groupedServices.length > 1) {
            cancelOrbit();
            map.stop();

            openGroupPopup(map, longitude, latitude, groupedServices);

            return;
          }
        }

        const zoom = await source.getClusterExpansionZoom(clusterId);

        if (!Number.isFinite(zoom)) {
          return;
        }

        map.easeTo({
          center: [longitude, latitude],
          zoom: Math.min(zoom, map.getMaxZoom()),
        });
      } catch (error: unknown) {
        console.error(
          "Não foi possível interagir com o agrupamento do mapa:",
          error,
        );
      }
    };

    const onServiceClick = (event: MapLayerMouseEvent) => {
      const serviceId = event.features?.[0]?.properties?.serviceId;
      if (typeof serviceId === "string") {
        selectServiceFromMap(serviceId);
      }
    };

    const onLayerMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const onLayerMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const onLoad = () => {
      loadedRef.current = true;
      onLoadingChange?.(false);
      applyMapLayers();
      setReady(true);

      map.on("click", CLUSTERS_LAYER_ID, onClusterClick);
      map.on("click", SERVICE_POINTS_LAYER_ID, onServiceClick);
      map.on("mouseenter", CLUSTERS_LAYER_ID, onLayerMouseEnter);
      map.on("mouseleave", CLUSTERS_LAYER_ID, onLayerMouseLeave);
      map.on("mouseenter", SERVICE_POINTS_LAYER_ID, onLayerMouseEnter);
      map.on("mouseleave", SERVICE_POINTS_LAYER_ID, onLayerMouseLeave);

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
      map.off("click", CLUSTERS_LAYER_ID, onClusterClick);
      map.off("click", SERVICE_POINTS_LAYER_ID, onServiceClick);
      map.off("mouseenter", CLUSTERS_LAYER_ID, onLayerMouseEnter);
      map.off("mouseleave", CLUSTERS_LAYER_ID, onLayerMouseLeave);
      map.off("mouseenter", SERVICE_POINTS_LAYER_ID, onLayerMouseEnter);
      map.off("mouseleave", SERVICE_POINTS_LAYER_ID, onLayerMouseLeave);
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const source = mapRef.current?.getSource(SERVICES_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    source?.setData(featureCollection);
  }, [featureCollection, ready]);

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
        {ready && featureCollection.features.length === 0 && (
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
