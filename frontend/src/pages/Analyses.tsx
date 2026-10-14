import { Link } from "react-router-dom";
import "./Analyses.css";

export function Analyses() {
  return (
    <div className="analyses-screen">
    <main className="analyses-page">
      <section className="analyses-coming-soon" aria-labelledby="analyses-title">
        <span className="analyses-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5v22h22M11 21v-6M17 21V9M23 21v-10" />
          </svg>
        </span>
        <p className="analyses-eyebrow">COMING SOON</p>
        <h1 id="analyses-title">Análises <span>em breve.</span></h1>
        <p className="analyses-description">
          Estamos preparando uma nova forma de acompanhar o consumo de energia
          e as emissões dos seus serviços. Enquanto isso, explore seu ambiente no monitoramento.
        </p>
        <Link to="/monitoramento" className="analyses-link">
          Ir para Monitoramento <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
    <div className="analyses-waves" aria-hidden="true" />
    </div>
  );
}
