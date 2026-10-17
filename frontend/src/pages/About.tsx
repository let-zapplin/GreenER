import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import gustavoPhoto from "../../assets/pfps/gustavo.jpg";
import igorPhoto from "../../assets/pfps/igor.jpg";
import marcelloPhoto from "../../assets/pfps/marcello.jpg";
import patriciaPhoto from "../../assets/pfps/patricia.jpg";
import vitorPhoto from "../../assets/pfps/vitor.jpg";
import "./About.css";

const actions = [
  [
    "Monitorar",
    "Coletamos CPU, memória e disco de cada serviço em intervalos regulares.",
  ],
  [
    "Estimar",
    "Convertemos o uso em energia (kWh) e em emissão de CO₂e conforme a região.",
  ],
  [
    "Decidir",
    "Mostramos ranking, comparativos e oportunidades de redução de emissões.",
  ],
];
const challenges = [
  [
    "warning",
    "O problema",
    "Equipes sabem quanto custa rodar um serviço, mas raramente sabem quanto carbono ele gera.",
  ],
  [
    "download",
    "O que recebemos",
    "Uma API com as métricas dos serviços e outra com a intensidade de carbono de cada região.",
  ],
  [
    "check",
    "O que entregamos",
    "Um painel com consumo em kWh, emissão de CO₂e, mapas dos serviços, ranking e comparativos.",
  ],
];
const journey = [
  [
    "Entender o desafio",
    "Estudamos a proposta da Unilaunch e as APIs disponíveis.",
  ],
  [
    "Modelar os dados",
    "Desenhamos o modelo conceitual com serviços, coletas, métricas e regiões.",
  ],
  ["Prototipar as telas", "Definimos a identidade visual e as telas no Figma."],
  [
    "Desenvolver por sprints",
    "Evoluímos o produto em entregas curtas, validadas a cada sprint.",
  ],
];
const team = [
  "Gustavo Koiti",
  "Igor Souza",
  "Marcello Campbell",
  "Patricia Maidana",
  "Vitor Hirch",
];

function AboutIcon({ kind }: { kind: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "person" ? (
        <>
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </>
      ) : kind === "warning" ? (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5m0 3v.1" />
        </>
      ) : kind === "download" ? (
        <>
          <path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
    </svg>
  );
}

export function About() {
  return (
    <div className="about-screen">
      <main className="about-page">
        <section className="about-hero" aria-labelledby="about-title">
          <div>
            <p className="about-eyebrow">SOBRE O PROJETO</p>
            <h1 id="about-title">Software também tem pegada de carbono.</h1>
            <p className="about-description">
              O GreenER é um projeto da ABP do 2º semestre do DSM da FATEC
              Jacareí, feito em parceria com a Unilaunch, para ajudar empresas a
              enxergar o impacto ambiental das suas aplicações.
            </p>
          </div>
          <img
            className="about-logo"
            src={logo}
            alt="GreenER, camaleão verde com circuitos"
          />
        </section>

        <section
          className="about-grid about-facts"
          aria-label="Instituição e parceria"
        >
          <article className="about-card">
            <h2>FATEC Jacareí</h2>
            <p>DSM, ABP do 2º semestre</p>
          </article>
          <article className="about-card">
            <h2>Unilaunch</h2>
            <p>empresa parceira do projeto</p>
          </article>
          <article className="about-card">
            <h2>2 APIs</h2>
            <p>métricas dos serviços e intensidade de carbono por região</p>
          </article>
        </section>

        <section className="about-proposal" aria-labelledby="proposal-title">
          <div>
            <h2 id="proposal-title">A proposta</h2>
            <p>
              O GreenER nasce para responder uma pergunta simples: quanto o
              nosso software pesa no meio ambiente? A plataforma acompanha as
              aplicações da empresa, estima o consumo de energia e calcula a
              emissão de CO₂e, para que as decisões mais sustentáveis partam de
              dados e não de suposições.
            </p>
          </div>
          <aside className="about-card about-quote">
            <p className="about-eyebrow">NOSSA PROPOSTA</p>
            <h2>
              Monitorando dados,
              <br />
              <span>adaptando</span> negócios.
            </h2>
          </aside>
        </section>

        <section
          className="about-grid"
          aria-label="Monitorar, estimar e decidir"
        >
          {actions.map(([title, text], index) => (
            <article className="about-card" key={title}>
              <span className="about-number">{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <div className="about-middle">
          <div className="about-waves about-waves-enter" aria-hidden="true" />
          <section className="about-section" aria-labelledby="challenge-title">
            <h2 id="challenge-title">O desafio proposto</h2>
            <p className="about-section-copy">
              A Unilaunch propôs transformar dados técnicos de infraestrutura em
              informação ambiental clara: estimar quanto as aplicações consomem
              e emitem, e apresentar isso de forma útil para quem decide.
            </p>
            <div className="about-grid">
              {challenges.map(([icon, title, text]) => (
                <article className="about-card" key={title}>
                  <span className="about-challenge-icon">
                    <AboutIcon kind={icon} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="about-section" aria-labelledby="journey-title">
            <h2 id="journey-title">Do desafio à solução</h2>
            <p className="about-section-copy">
              O caminho que o time percorreu até o GreenER.
            </p>
            <ol className="about-journey">
              {journey.map(([title, text], index) => (
                <li key={title}>
                  <span className="about-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="about-section" aria-labelledby="team-title">
            <h2 id="team-title">Quem faz o GreenER</h2>
            <p className="about-section-copy">
              As pessoas por trás do projeto.
            </p>
            <div className="about-team">
              {team.map((name, index) => (
                <article className="about-card about-person" key={name}>
                  <div className="about-person-icon">
                    <img
                      src={
                        [
                          gustavoPhoto,
                          igorPhoto,
                          marcelloPhoto,
                          patriciaPhoto,
                          vitorPhoto,
                        ][index]
                      }
                      alt={`Foto de ${name}`}
                      width="72"
                      height="72"
                      loading="lazy"
                    />
                  </div>
                  <h3>{name}</h3>
                </article>
              ))}
            </div>
          </section>

          <div className="about-waves about-waves-exit" aria-hidden="true" />
        </div>
        <div className="about-ending">
          <section className="about-card about-cta">
            <h2>Veja o GreenER em ação</h2>
            <p>
              Acompanhe serviços, regiões e emissões no painel de monitoramento.
            </p>
            <Link to="/monitoramento" className="about-button">
              Ir para Monitoramento
            </Link>
          </section>
        </div>
      </main>
      <footer className="about-footer">
        GreenER. Mais tecnologia, menos impacto.
      </footer>
    </div>
  );
}
