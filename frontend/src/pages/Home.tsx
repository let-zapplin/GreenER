import "./Home.css";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import camaleaoVerde from "../../assets/camaleao-verde.png";
import iconFolha from "../../assets/icones/icon-folha.png";
import iconDado from "../../assets/icones/icon-dado.png";
import iconBarras from "../../assets/icones/icon-barras.png";
import { AssistantChat } from "../components/AssistantChat";

type View = "impacto" | "servicos" | "evolucao";

const VIEWS: { id: View; title: string; description: string; icon: string }[] =
  [
    {
      id: "impacto",
      title: "Impacto ambiental",
      description: "Emissões, consumo energético e impacto geral.",
      icon: iconFolha,
    },
    {
      id: "servicos",
      title: "Serviços",
      description: "Quais serviços possuem maior impacto.",
      icon: iconDado,
    },
    {
      id: "evolucao",
      title: "Evolução",
      description: "Como seu impacto muda ao longo do tempo.",
      icon: iconBarras,
    },
  ];

export function Home() {
  const [view, setView] = useState<View | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [wavePosition, setWavePosition] = useState({ x: 50, y: 50 });
  const waveTimer = useRef<number | undefined>(undefined);

  // Evita setState depois de sair da página
  useEffect(() => () => window.clearTimeout(waveTimer.current), []);

  function handleViewChange(
    selected: View,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const next = view === selected ? null : selected;
    setView(next);

    if (!next) return;

    const home = event.currentTarget.closest(".home");
    if (!home) return;

    // A onda nasce no centro do botão clicado, em % da Home
    const rect = event.currentTarget.getBoundingClientRect();
    const homeRect = home.getBoundingClientRect();

    setWavePosition({
      x: ((rect.left + rect.width / 2 - homeRect.left) / homeRect.width) * 100,
      y: ((rect.top + rect.height / 2 - homeRect.top) / homeRect.height) * 100,
    });

    setIsTransitioning(true);
    window.clearTimeout(waveTimer.current);
    waveTimer.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 700);
  }

  return (
    <main className="home" data-view={view ?? "default"}>
      <div
        className={`adaptation-wave ${isTransitioning ? "active" : ""}`}
        style={{ left: `${wavePosition.x}%`, top: `${wavePosition.y}%` }}
        aria-hidden="true"
      />

      <div className="home-grid">
        <header className="home-hero">
          <div className="home-content">
            <h1>O que você gostaria de analisar hoje?</h1>
            <p className="home-description">
              Escolha uma perspectiva para explorar os dados dos seus serviços e
              entender melhor o impacto ambiental.
            </p>
          </div>

          <div className="home-visual">
            <img
              src={camaleaoVerde}
              alt="Camaleão GreenER"
              className="home-chameleon"
            />
          </div>
        </header>

        <div className="home-chat">
          <AssistantChat />
        </div>

        <section className="analysis-selector" aria-label="Perspectiva de análise">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="analysis-option"
              aria-pressed={view === item.id}
              onClick={(event) => handleViewChange(item.id, event)}
            >
              <span className="analysis-icon">
                <img src={item.icon} alt="" />
              </span>
              <span className="analysis-text">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
