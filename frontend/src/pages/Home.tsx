import "./Home.css";
import { useState, type MouseEvent } from "react";
import camaleaoVerde from "../../assets/camaleao-verde.png";
import iconFolha from "../../assets/icones/icon-folha.png";
import energiaIcon from "../../assets/icones/icon-dado.png";
import evolucaoIcon from "../../assets/icones/icon-barras.png";

export function Home() {
  /* esses consts iniciais são os estados da transição*/
  const [view, setView] = useState<string | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const [wavePosition, setWavePosition] = useState({
    x: 50,
    y: 50,
  });

  function handleViewChange(
    selectedView: string,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const newView = view === selectedView ? null : selectedView;

    setView(newView);

    if (newView) {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      /* Esse trecho é o que faz a transição ocorrer atráves dos botões visualmente, ele localiza o centro dos botões*/
      const home = button.closest(".home");

      // Segurança: se não encontrar a Home, interrompe
      if (!home) return;

      // . Descobre posição e tamanho da Home
      const homeRect = home.getBoundingClientRect();

      // . Calcula o centro do botão dentro da Home
      const x =
        ((rect.left + rect.width / 2 - homeRect.left) / homeRect.width) * 100;

      const y =
        ((rect.top + rect.height / 2 - homeRect.top) / homeRect.height) * 100;

      // 6. Guarda essa posição
      setWavePosition({ x, y });

      // 7. Inicia a animação
      setIsTransitioning(true);

      // 8. Encerra depois de 700ms
      setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
    }
  }

  return (
    /*esse trecho da primeira linha é o que muda automaticamente o estado conforme o click */
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
        <button
          className="analysis-option"
          data-view="impacto"
          onClick={(event) => handleViewChange("impacto", event)}
        >
          <div className="analysis-icon">
            <img src={iconFolha} alt="" />
          </div>
          <div>
            <strong>Impacto ambiental</strong>
            <p>Analise emissões, consumo energético e impacto geral.</p>
          </div>
        </button>

        <button
          className="analysis-option"
          data-view="servicos"
          onClick={(event) => handleViewChange("servicos", event)}
        >
          <div className="analysis-icon">
            <img src={energiaIcon} alt="" />
          </div>

          <div>
            <strong>Serviços</strong>
            <p>Descubra quais serviços possuem maior impacto.</p>
          </div>
        </button>

        <button
          className="analysis-option"
          data-view="evolucao"
          onClick={(event) => handleViewChange("evolucao", event)}
        >
          <div className="analysis-icon">
            <img src={evolucaoIcon} alt="" />
          </div>

          <div>
            <strong>Evolução</strong>
            <p>Acompanhe como seu impacto muda ao longo do tempo.</p>
          </div>
        </button>
      </section>

      <p className="view-debug">Perspectiva selecionada: {view ?? "nenhuma"}</p>
    </main>
  );
}
