import "./Home.css";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import camaleaoVerde from "../../assets/camaleao-verde.png";
import iconFolha from "../../assets/icones/icon-folha.png";
import energiaIcon from "../../assets/icones/icon-dado.png";
import evolucaoIcon from "../../assets/icones/icon-barras.png";

export function Home() {
  const [hoveredView, setHoveredView] = useState<string | null>(null);
  const [focusedView, setFocusedView] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wavePosition, setWavePosition] = useState({
    x: 50,
    y: 50,
  });
  const waveTimeoutRef = useRef<number | null>(null);
  const view = focusedView ?? hoveredView;

  useEffect(() => {
    return () => {
      if (waveTimeoutRef.current !== null) {
        window.clearTimeout(waveTimeoutRef.current);
      }
    };
  }, []);

  function handlePreview(element: HTMLAnchorElement) {
    const rect = element.getBoundingClientRect();
    const home = element.closest(".home");

    if (!home) return;

    const homeRect = home.getBoundingClientRect();
    const x =
      ((rect.left + rect.width / 2 - homeRect.left) / homeRect.width) * 100;
    const y =
      ((rect.top + rect.height / 2 - homeRect.top) / homeRect.height) * 100;

    setWavePosition({ x, y });
    setIsTransitioning(true);

    if (waveTimeoutRef.current !== null) {
      window.clearTimeout(waveTimeoutRef.current);
    }
    waveTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      waveTimeoutRef.current = null;
    }, 700);
  }

  return (
    <main className="home" data-view={view ?? "default"}>
      <div
        className={`adaptation-wave ${isTransitioning ? "active" : ""}`}
        style={{
          left: `${wavePosition.x}%`,
          top: `${wavePosition.y}%`,
        }}
        aria-hidden="true"
      />

      <section className="home-hero">
        <div className="home-content">
          <span className="home-eyebrow">VISÃO ADAPTATIVA</span>

          <h1>
            O que você gostaria de
            <span> analisar hoje?</span>
          </h1>

          <p className="home-description">
            Escolha uma perspectiva para explorar os dados dos seus serviços e
            entender melhor o impacto ambiental.
          </p>
        </div>

        <div className="home-visual">
          <div className="tech-pattern" aria-hidden="true">
            <span className="tech-line tech-line-1" />
            <span className="tech-line tech-line-2" />
            <span className="tech-line tech-line-3" />
          </div>

          <div className="chameleon-wrapper">
            <img
              src={camaleaoVerde}
              alt="Camaleão GreenER"
              className="home-chameleon"
            />
          </div>
        </div>
      </section>

      <section className="analysis-selector">
        <Link
          to="/analises"
          className="analysis-option"
          data-view="impacto"
          onPointerEnter={(event) => {
            setHoveredView("impacto");
            handlePreview(event.currentTarget);
          }}
          onPointerLeave={() => setHoveredView(null)}
          onFocus={(event) => {
            setFocusedView("impacto");
            handlePreview(event.currentTarget);
          }}
          onBlur={() => setFocusedView(null)}
        >
          <div className="analysis-icon">
            <img src={iconFolha} alt="" />
          </div>
          <div>
            <strong>Impacto ambiental</strong>
            <p>Analise emissões, consumo energético e impacto geral.</p>
          </div>
        </Link>

        <Link
          to="/monitoramento"
          className="analysis-option"
          data-view="servicos"
          onPointerEnter={(event) => {
            setHoveredView("servicos");
            handlePreview(event.currentTarget);
          }}
          onPointerLeave={() => setHoveredView(null)}
          onFocus={(event) => {
            setFocusedView("servicos");
            handlePreview(event.currentTarget);
          }}
          onBlur={() => setFocusedView(null)}
        >
          <div className="analysis-icon">
            <img src={energiaIcon} alt="" />
          </div>

          <div>
            <strong>Serviços</strong>
            <p>Descubra quais serviços possuem maior impacto.</p>
          </div>
        </Link>

        <Link
          to="/analises"
          className="analysis-option"
          data-view="evolucao"
          onPointerEnter={(event) => {
            setHoveredView("evolucao");
            handlePreview(event.currentTarget);
          }}
          onPointerLeave={() => setHoveredView(null)}
          onFocus={(event) => {
            setFocusedView("evolucao");
            handlePreview(event.currentTarget);
          }}
          onBlur={() => setFocusedView(null)}
        >
          <div className="analysis-icon">
            <img src={evolucaoIcon} alt="" />
          </div>

          <div>
            <strong>Evolução do impacto</strong>
            <p>Acompanhe como seu impacto muda ao longo do tempo.</p>
          </div>
        </Link>
      </section>
    </main>
  );
}
