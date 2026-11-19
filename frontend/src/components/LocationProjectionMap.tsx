import { useEffect, useRef, useState } from "react";

import maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import "maplibre-gl-original/dist/maplibre-gl.css";

import type { MonitoredService } from "../types/service";
import type { ProjectionRegion } from "../types/projection";

import "./LocationProjectionMap.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

type LocationProjectionMapProps = {
  service: MonitoredService | null;

  regions: ProjectionRegion[];

  selectedRegionCodes: string[];

  onToggleRegion: (regionCode: string) => void;
};

/* =========================================================
   ENQUADRAMENTO DOS PONTOS
   ---------------------------------------------------------
   Mantemos essa função FORA do componente para que ela não
   dependa diretamente do estado interno do React.

   Ela recebe explicitamente:
   - mapa
   - serviço atual
   - regiões disponíveis
   ========================================================= */

function fitMapToProjectionPoints(
  map: MapLibreMap,
  service: MonitoredService | null,
  regions: ProjectionRegion[],
  duration = 450,
) {
  const bounds = new maplibregl.LngLatBounds();

  let validPointCount = 0;

  /* -------------------------------------------------------
     SERVIÇO DE ORIGEM
     ------------------------------------------------------- */

  const serviceLatitude = service?.location.latitude;

  const serviceLongitude = service?.location.longitude;

  if (serviceLatitude != null && serviceLongitude != null) {
    bounds.extend([serviceLongitude, serviceLatitude]);

    validPointCount += 1;
  }

  /* -------------------------------------------------------
     REGIÕES DISPONÍVEIS
     ------------------------------------------------------- */

  for (const region of regions) {
    if (region.latitude === null || region.longitude === null) {
      continue;
    }

    bounds.extend([region.longitude, region.latitude]);

    validPointCount += 1;
  }

  /* -------------------------------------------------------
     SEM PONTOS
     ------------------------------------------------------- */

  if (validPointCount === 0) {
    return;
  }

  /* -------------------------------------------------------
     APENAS UM PONTO
     ------------------------------------------------------- */

  if (validPointCount === 1) {
    map.easeTo({
      center: bounds.getCenter(),

      zoom: 1.7,

      duration,
    });

    return;
  }

  /* -------------------------------------------------------
     TODOS OS PONTOS
     ------------------------------------------------------- */

  map.fitBounds(bounds, {
    padding: {
      top: 52,
      right: 52,
      bottom: 52,
      left: 52,
    },

    maxZoom: 1.7,

    duration,
  });
}

export function LocationProjectionMap({
  service,
  regions,
  selectedRegionCodes,
  onToggleRegion,
}: LocationProjectionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const markersRef = useRef<Marker[]>([]);

  /*
   * Guarda sempre os dados mais recentes.
   *
   * O ResizeObserver é criado apenas uma vez.
   * Por isso ele consulta essas refs em vez de
   * depender diretamente de service/regions.
   */
  const latestDataRef = useRef({
    service,
    regions,
  });

  const [ready, setReady] = useState(false);

  const [failed, setFailed] = useState(false);

  const [showOriginNotice, setShowOriginNotice] = useState(false);

  const originNoticeTimeoutRef = useRef<number | null>(null);

  /* =========================================================
     ATUALIZA OS DADOS USADOS PELO RESIZE OBSERVER
     ========================================================= */

  useEffect(() => {
    latestDataRef.current = {
      service,
      regions,
    };
  }, [service, regions]);

  /* =========================================================
     INICIALIZAÇÃO DO MAPA
     ---------------------------------------------------------
     Esse efeito roda UMA VEZ.

     Não colocamos service/regions nas dependências porque
     não queremos destruir e recriar o mapa ao trocar serviço.
     ========================================================= */

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

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

        maxZoom: 5,

        scrollZoom: false,

        dragRotate: false,

        pitchWithRotate: false,

        touchPitch: false,

        renderWorldCopies: false,
      });

      /*
       * O mapa funciona como uma representação visual.
       *
       * Os marcadores continuam clicáveis, mas o usuário
       * não consegue mover ou alterar o zoom manualmente.
       */

     // map.dragPan.disable();

      map.dragRotate.disable();

      map.scrollZoom.disable();

      map.doubleClickZoom.disable();

      map.touchZoomRotate.disable();

      map.keyboard.disable();

      map.boxZoom.disable();
    } catch (error) {
      console.error("Não foi possível carregar o mapa da projeção:", error);

      setFailed(true);

      return;
    }

    mapRef.current = map;

    const handleLoad = () => {
      setReady(true);
    };

    map.on("load", handleLoad);

    /* -------------------------------------------------------
       RESPONSIVIDADE
       -------------------------------------------------------
       Quando o card muda de tamanho:

       1. avisamos o MapLibre sobre o novo tamanho;
       2. buscamos os dados MAIS RECENTES pela ref;
       3. reenquadramos todos os pontos.

       duration: 0 evita animações repetidas enquanto o
       usuário redimensiona a janela.
       ------------------------------------------------------- */

    const resizeObserver = new ResizeObserver(() => {
      map.resize();

      const { service: latestService, regions: latestRegions } =
        latestDataRef.current;

      fitMapToProjectionPoints(map, latestService, latestRegions, 0);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();

      markersRef.current.forEach((marker) => marker.remove());

      markersRef.current = [];

      map.off("load", handleLoad);

      if (originNoticeTimeoutRef.current !== null) {
        window.clearTimeout(originNoticeTimeoutRef.current);

        originNoticeTimeoutRef.current = null;
      }

      map.remove();

      mapRef.current = null;

      setReady(false);
    };
  }, []);

  /* =========================================================
     MARCADORES
     ---------------------------------------------------------
     ● origem       -> localização atual do serviço
     ● selecionado  -> região usada na projeção
     ○ disponível   -> região ainda não selecionada
     ========================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    /*
     * Remove os marcadores anteriores antes
     * de montar a nova representação.
     */

    markersRef.current.forEach((marker) => marker.remove());

    markersRef.current = [];

    const currentRegionCode = service?.location.region_code ?? null;

    /* -------------------------------------------------------
       LOCALIZAÇÃO ATUAL
       ------------------------------------------------------- */

    const serviceLatitude = service?.location.latitude;

    const serviceLongitude = service?.location.longitude;

    if (service && serviceLatitude != null && serviceLongitude != null) {
      const markerElement = document.createElement("button");

      markerElement.type = "button";

      markerElement.className = "location-projection-map-marker is-origin";

      markerElement.title = `${service.name} — localização atual`;

      markerElement.setAttribute(
        "aria-label",
        `${service.name}, localização atual`,
      );

      /*
       * A origem é obrigatória para a projeção.
       *
       * Ao clicar nela mostramos apenas um aviso
       * explicando por que não pode ser removida.
       */

      markerElement.addEventListener("click", () => {
        if (originNoticeTimeoutRef.current !== null) {
          window.clearTimeout(originNoticeTimeoutRef.current);
        }

        setShowOriginNotice(true);

        originNoticeTimeoutRef.current = window.setTimeout(() => {
          setShowOriginNotice(false);

          originNoticeTimeoutRef.current = null;
        }, 2800);
      });

      const marker = new maplibregl.Marker({
        element: markerElement,

        anchor: "center",
      })
        .setLngLat([serviceLongitude, serviceLatitude])
        .addTo(map);

      markersRef.current.push(marker);
    }

    /* -------------------------------------------------------
       REGIÕES DISPONÍVEIS
       ------------------------------------------------------- */

    for (const region of regions) {
      /*
       * A região atual já está representada pelo
       * marcador de origem.
       */

      if (region.regionCode === currentRegionCode) {
        continue;
      }

      if (region.latitude === null || region.longitude === null) {
        continue;
      }

      const isSelected = selectedRegionCodes.includes(region.regionCode);

      const markerElement = document.createElement("button");

      markerElement.type = "button";

      markerElement.className = isSelected
        ? "location-projection-map-marker is-projected"
        : "location-projection-map-marker is-available";

      markerElement.title = `${region.region} · ${region.country}`;

      markerElement.setAttribute(
        "aria-label",
        isSelected
          ? `Remover ${region.region} da projeção`
          : `Adicionar ${region.region} à projeção`,
      );

      markerElement.addEventListener("click", () => {
        onToggleRegion(region.regionCode);
      });

      const marker = new maplibregl.Marker({
        element: markerElement,

        anchor: "center",
      })
        .setLngLat([region.longitude, region.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [service, regions, selectedRegionCodes, onToggleRegion, ready]);

  /* =========================================================
     REENQUADRAMENTO
     ---------------------------------------------------------
     Quando o serviço ou as regiões mudarem, recalculamos
     a visão do mapa.

     Esse efeito NÃO recria o mapa.
     Apenas movimenta sua câmera.
     ========================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !ready) {
      return;
    }

    fitMapToProjectionPoints(map, service, regions);
  }, [ready, service, regions]);

  /* =========================================================
     ESTADO DE ERRO
     ========================================================= */

  if (failed) {
    return (
      <section className="location-projection-map-card">
        <div className="location-projection-map-error">
          <strong>Mapa indisponível</strong>

          <span>As localidades ainda podem ser selecionadas pela lista.</span>
        </div>
      </section>
    );
  }

  /* =========================================================
     INTERFACE
     ========================================================= */

  return (
    <section
      className="location-projection-map-card"
      aria-labelledby="projection-map-title"
    >
      <div className="location-projection-map-header">
        <div>
          <p className="analyses-section-label">MAPA DA PROJEÇÃO</p>

          <h3 id="projection-map-title">Distribuição geográfica</h3>

          <p>Selecione no mapa as regiões que deseja comparar.</p>
        </div>

        <span>{selectedRegionCodes.length} selecionadas</span>
      </div>

      <div className="location-projection-map-frame">
        <div
          ref={containerRef}
          className="location-projection-map-canvas"
          role="region"
          aria-label="Mapa das regiões disponíveis para projeção ambiental"
        />

        {!ready && (
          <div className="location-projection-map-loading">
            Carregando mapa…
          </div>
        )}

        <div
          className={
            showOriginNotice
              ? "location-projection-map-notice is-visible"
              : "location-projection-map-notice"
          }
          role="status"
          aria-live="polite"
        >
          <span>
            {showOriginNotice
              ? "A localização atual é a referência da projeção e não pode ser removida pelo mapa."
              : ""}
          </span>
        </div>
      </div>

      <div className="location-projection-map-legend">
        <span>
          <i className="is-origin" />
          Localização atual
        </span>

        <span>
          <i className="is-projected" />
          Projeção selecionada
        </span>

        <span>
          <i className="is-available" />
          Disponível
        </span>
      </div>
    </section>
  );
}
