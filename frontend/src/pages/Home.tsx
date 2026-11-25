import "./Home.css";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import iconFolha from "../../assets/icones/icon-folha.png";
import iconDado from "../../assets/icones/icon-dado.png";
import iconBarras from "../../assets/icones/icon-barras.png";

import karmaFace from "../../assets/karma/karma-face.png";
import karmaThinking from "../../assets/karma/karma-face-pensando.gif";
import karma1 from "../../assets/karma/karma-1.png";
import karma2 from "../../assets/karma/karma-2.png";

import { AssistantChat } from "../components/AssistantChat";
import { useAuth } from "../hooks/useAuth";

type View = "impacto" | "servicos" | "evolucao";

type HomeStage = "intro" | "opening" | "conversation";

type ViewOption = {
  id: View;
  title: string;
  description: string;
  icon: string;
};

const VIEWS: ViewOption[] = [
  {
    id: "impacto",
    title: "Impacto ambiental",
    description: "Emissões, consumo energético e impacto geral.",
    icon: iconFolha,
  },
  {
    id: "servicos",
    title: "Serviços",
    description: "Compare serviços e identifique os maiores impactos.",
    icon: iconDado,
  },
  {
    id: "evolucao",
    title: "Evolução",
    description: "Entenda como o impacto muda ao longo do tempo.",
    icon: iconBarras,
  },
];

const KARMA_AVATARS = [karmaFace, karma1, karma2];

export function Home() {
  const { user } = useAuth();

  const [view, setView] = useState<View | null>(null);

  const [stage, setStage] = useState<HomeStage>("intro");

  const [isTransitioning, setIsTransitioning] = useState(false);

  const [isKarmaThinking, setIsKarmaThinking] = useState(false);

  const [karmaAvatarIndex, setKarmaAvatarIndex] = useState(0);

  const [isKarmaAvatarChanging, setIsKarmaAvatarChanging] = useState(false);

  const avatarTransitionTimer = useRef<number | undefined>(undefined);

  const [wavePosition, setWavePosition] = useState({
    x: 50,
    y: 50,
  });

  const waveTimer = useRef<number | undefined>(undefined);

  const stageTimer = useRef<number | undefined>(undefined);

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "visitante";

  useEffect(() => {
    return () => {
      window.clearTimeout(waveTimer.current);

      window.clearTimeout(stageTimer.current);

      window.clearTimeout(avatarTransitionTimer.current);
    };
  }, []);

  function positionWave(element: HTMLElement) {
    const home = element.closest(".home");

    if (!home) {
      return;
    }

    const rect = element.getBoundingClientRect();

    const homeRect = home.getBoundingClientRect();

    setWavePosition({
      x: ((rect.left + rect.width / 2 - homeRect.left) / homeRect.width) * 100,

      y: ((rect.top + rect.height / 2 - homeRect.top) / homeRect.height) * 100,
    });
  }

  function beginConversation(
    event: MouseEvent<HTMLButtonElement>,
    selectedView?: View,
  ) {
    if (stage !== "intro") {
      return;
    }

    if (selectedView) {
      setView(selectedView);
    }

    positionWave(event.currentTarget);

    setIsTransitioning(true);
    setStage("opening");

    window.clearTimeout(waveTimer.current);

    window.clearTimeout(stageTimer.current);

    waveTimer.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 900);

    stageTimer.current = window.setTimeout(() => {
      setStage("conversation");
    }, 950);
  }

  function returnToIntro() {
    window.clearTimeout(waveTimer.current);
    window.clearTimeout(stageTimer.current);

    setIsTransitioning(false);
    setIsKarmaThinking(false);

    setView(null);
    setStage("intro");
  }

  function changeKarmaAvatar() {
    if (isKarmaThinking || isKarmaAvatarChanging) {
      return;
    }

    setIsKarmaAvatarChanging(true);

    window.clearTimeout(avatarTransitionTimer.current);

    avatarTransitionTimer.current = window.setTimeout(() => {
      setKarmaAvatarIndex((current) => (current + 1) % KARMA_AVATARS.length);

      setIsKarmaAvatarChanging(false);
    }, 180);
  }

  return (
    <main className="home" data-view={view ?? "default"} data-stage={stage}>
      <div
        className={`adaptation-wave ${isTransitioning ? "active" : ""}`}
        style={{
          left: `${wavePosition.x}%`,
          top: `${wavePosition.y}%`,
        }}
        aria-hidden="true"
      />

      <section className="home-intro" aria-hidden={stage === "conversation"}>
        <div className="home-intro-content">
          <p className="home-greeting">Olá, {firstName}.</p>

          <h1>
            <span className="home-title-main">O que seus dados querem</span>

            <span className="home-title-highlight">te contar hoje?</span>
          </h1>

          <p className="home-intro-description">
            Explore os dados, compare serviços e descubra como suas decisões
            afetam o impacto ambiental.
          </p>

          <button
            type="button"
            className="home-conversation-entry"
            onClick={beginConversation}
          >
            <span>Pergunte alguma coisa para a Karma...</span>

            <i aria-hidden="true">→</i>
          </button>

          <div className="home-intro-hint">
            <span>ou comece por uma perspectiva</span>
          </div>

          <section
            className="analysis-selector"
            aria-label="Perspectiva de análise"
          >
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="analysis-option"
                onClick={(event) => beginConversation(event, item.id)}
              >
                <span className="analysis-icon">
                  <img src={item.icon} alt="" />
                </span>

                <span className="analysis-text">
                  <strong>{item.title}</strong>

                  <span>{item.description}</span>
                </span>

                <span className="analysis-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </section>
        </div>

        <div className="home-intro-atmosphere" aria-hidden="true">
          <span className="home-orbit home-orbit-one" />
          <span className="home-orbit home-orbit-two" />
          <span className="home-orbit home-orbit-three" />

          <span className="home-intro-core" />
        </div>
      </section>

      <section className="home-conversation" aria-hidden={stage === "intro"}>
        <aside className="karma-stage">
          <div className="karma-aura">
            <span
              className="karma-aura-ring karma-aura-ring-one"
              aria-hidden="true"
            />

            <span
              className="karma-aura-ring karma-aura-ring-two"
              aria-hidden="true"
            />

            <button
              type="button"
              className="karma-avatar-button"
              onClick={changeKarmaAvatar}
              aria-label="Alterar aparência da Karma"
              title={
                isKarmaThinking
                  ? "Karma está analisando seus dados"
                  : "Clique para mudar a aparência da Karma"
              }
            >
              <img
                src={
                  isKarmaThinking
                    ? karmaThinking
                    : KARMA_AVATARS[karmaAvatarIndex]
                }
                alt="Karma, assistente virtual do GreenER"
                className={[
                  "karma-avatar",
                  isKarmaThinking ? "is-thinking" : "",
                  isKarmaAvatarChanging ? "is-changing" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />

              {!isKarmaThinking && (
                <span className="karma-avatar-hint" aria-hidden="true">
                  Trocar visual
                </span>
              )}
            </button>
          </div>

          <div className="karma-introduction">
            <span className="karma-label">KARMA // ASSISTENTE GREENER</span>

            <h2>Prazer, {firstName}.</h2>

            <p>
              Eu sou a Karma. Posso ajudar você a interpretar seus dados
              ambientais, comparar serviços e encontrar padrões que merecem
              atenção.
            </p>

            <span
              className={
                isKarmaThinking ? "karma-status is-thinking" : "karma-status"
              }
            >
              <i aria-hidden="true" />

              {isKarmaThinking
                ? "Analisando seus dados..."
                : "Pronta para conversar"}
            </span>
          </div>
        </aside>

        <div className="home-chat">
          <AssistantChat
            autoFocus={stage === "conversation"}
            onLoadingChange={setIsKarmaThinking}
            onBack={returnToIntro}
          />
        </div>
      </section>
    </main>
  );
}
