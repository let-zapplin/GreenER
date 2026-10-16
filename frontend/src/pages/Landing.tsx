import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownIcon, ArrowRightIcon, ArrowsLeftRightIcon, ChartBarIcon, CheckIcon, CloudIcon, DatabaseIcon, FileTextIcon, LeafIcon, ListIcon, MapPinIcon, PulseIcon, ShieldCheckIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import logo from "../../assets/logo.png";
import { LandingLogin } from "../components/LandingLogin";
import "./Landing.css";

const LandingGlobe = lazy(() => import("../components/LandingGlobe"));
const benefits = ["Monitoramento contínuo", "Consumo energético", "Emissão de CO₂e", "Dados que viram decisões"];
const steps = [
  ["Conecte seus serviços", "Informe o nome, o caminho de métricas e a região de cada aplicação."],
  ["Coletamos e calculamos", "Lemos CPU, memória e disco e estimamos o consumo e o carbono da região."],
  ["Você decide", "Veja rankings, compare períodos e descubra onde reduzir primeiro."],
];
const features = [
  { icon: PulseIcon, title: "Tempo real", text: "Coletas recorrentes para acompanhar o estado de cada serviço." },
  { icon: ChartBarIcon, title: "Comparativos", text: "Compare serviços, regiões e períodos para enxergar o que pesa mais." },
  { icon: SparkleIcon, title: "Oportunidades", text: "Encontre pontos de redução no consumo de cada serviço." },
  { icon: LeafIcon, title: "Energia renovável", text: "Entenda como a matriz elétrica de cada região muda o impacto." },
  { icon: ShieldCheckIcon, title: "Acesso seguro", text: "Login protegido para manter os dados do seu ambiente organizados." },
  { icon: FileTextIcon, title: "Relatórios", text: "Uma visão do histórico de coletas para acompanhar a evolução." },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return <header className="landing-header-wrap"><div className="landing-header">
    <a href="#inicio" className="landing-brand" aria-label="GreenER, início"><img src={logo} width="90" height="60" alt="GreenER"/></a>
    <button className="landing-menu-button" type="button" aria-expanded={open} aria-controls="landing-nav" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>{open ? <XIcon size={24}/> : <ListIcon size={24}/>}</button>
    <nav id="landing-nav" className={open ? "is-open" : ""} aria-label="Navegação principal" onClick={() => setOpen(false)} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".landing-menu-button")?.focus(); } }}>
      <a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><Link to="/sobre">Sobre o projeto</Link><a className="landing-nav-login" href="#acessar">Acessar conta<ArrowRightIcon size={16}/></a>
    </nav>
  </div></header>;
}

export function Landing() {
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !screen.current) return;
    const sections = screen.current.querySelectorAll("main > section, .landing-how, .landing-features, .landing-cta");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.setAttribute("data-reveal", "visible"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    sections.forEach(section => { section.setAttribute("data-reveal", "pending"); observer.observe(section); });
    return () => { observer.disconnect(); sections.forEach(section => section.removeAttribute("data-reveal")); };
  }, []);
  function focusLogin() { document.getElementById("landing-email")?.focus({ preventScroll: true }); }
  return <div ref={screen} className="landing-screen" id="inicio">
    <main>
      <section className="landing-hero landing-container" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <img className="landing-hero-logo" src={logo} alt="GreenER" width="300" height="200" fetchPriority="high"/>
          <h1 id="landing-title">Monitorando dados,<br/><span>adaptando</span> negócios.</h1>
          <p>O <b>GreenER</b> acompanha suas aplicações, estima o consumo de energia e calcula a emissão de CO₂e, para sua empresa decidir com mais sustentabilidade.</p>
          <div className="landing-hero-benefits">{[
            { icon: LeafIcon, title: "Monitoramento contínuo", description: "Coletas automáticas" },
            { icon: CloudIcon, title: "Consumo energético", description: "Estimado em kWh" },
            { icon: PulseIcon, title: "Emissão de CO₂e", description: "Por serviço e região" },
            { icon: ChartBarIcon, title: "Dados e insights", description: "Onde reduzir primeiro" },
          ].map(({icon: Icon,title,description}) => <div className="landing-hero-benefit" key={title}><span className="landing-benefit-icon"><Icon size={25} weight="light"/></span><div><strong>{title}</strong><small>{description}</small></div></div>)}</div>
        </div>
        <LandingLogin/>
      </section>

      <div className="landing-marquee" aria-label={benefits.join(", ")}><div className="landing-marquee-track" aria-hidden="true">{[0,1].map(copy => <div className="landing-marquee-group" key={copy}>{[...benefits, ...benefits].map((benefit,index) => <span key={index}><span className="landing-marquee-dot">{index % 2 ? <CloudIcon size={19}/> : <LeafIcon size={19}/>}</span>{benefit}</span>)}</div>)}</div></div>

      <section className="landing-planet landing-container" id="planeta" aria-labelledby="planet-title">
        <div className="landing-planet-visual"><Suspense fallback={<div className="landing-globe-loading" role="status">Preparando o planeta…</div>}><LandingGlobe/></Suspense></div>
        <div className="landing-planet-copy"><span className="landing-eyebrow">UM MESMO PLANETA. IMPACTOS DIFERENTES.</span><h2 id="planet-title">A mesma energia.<br/>Um impacto diferente.</h2><p>Estimamos a energia consumida a partir das métricas de CPU, memória e disco. Depois, multiplicamos esse consumo pela intensidade de carbono da região onde o serviço roda.</p><div className="landing-calculation"><span>COMO CHEGAMOS AO RESULTADO</span><p><strong>Energia (kWh)</strong> × <strong>Carbono da região (gCO₂e/kWh)</strong> ÷ 1.000</p><strong className="landing-calculation-result">= emissão estimada em kg CO₂e</strong></div><p>Nos exemplos, o consumo é sempre de 100 kWh. O que muda é o fator de carbono da região — e, com ele, a emissão estimada.</p><p className="landing-demo-disclaimer">Demonstração com dados fictícios. Os valores não representam medições reais nem a intensidade de carbono atual dessas regiões. Passe o mouse, toque nos pontos ou escolha uma região para comparar.</p></div>
      </section>

      <div className="landing-light"><div className="landing-wave landing-wave-enter" aria-hidden="true"/>
        <div className="landing-container landing-light-content">
          <section className="landing-how" id="como-funciona" aria-labelledby="landing-how-title"><div className="landing-section-heading"><span className="landing-eyebrow">DO DADO À DECISÃO</span><h2 id="landing-how-title">Como funciona</h2><p>Do cadastro ao primeiro número em poucos minutos.</p></div><ol className="landing-steps">{steps.map(([title,text],index) => <li key={title}><span className="landing-number">{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
          <section className="landing-features" id="recursos" aria-labelledby="landing-features-title"><div className="landing-section-heading"><span className="landing-eyebrow">CADA DADO TEM UM PROPÓSITO</span><h2 id="landing-features-title">Tudo que sua equipe precisa.</h2><p>Do técnico ao gestor, cada pessoa encontra a resposta que procura.</p></div><div className="landing-feature-grid">{features.map(({icon: Icon,title,text}) => <article key={title}><span className="landing-feature-icon"><Icon size={23}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        </div><div className="landing-wave landing-wave-exit" aria-hidden="true"/>
      </div>

      <section className="landing-bottom"><div className="landing-container"><div className="landing-cta"><span className="landing-eyebrow">O PRÓXIMO PASSO É SEU</span><h2>Comece a medir<br/>o que importa.</h2><p>Conheça o impacto ambiental dos seus serviços.<br/>Uma decisão melhor começa com um dado.</p><a className="landing-primary" href="#acessar" onClick={focusLogin}>Começar agora<ArrowRightIcon size={20}/></a><span className="landing-cta-note"><CheckIcon size={15}/> Seu ambiente, visto por uma nova perspectiva.</span></div></div>
      <footer className="landing-footer landing-container"><Link to="/sobre"><img src={logo} alt="GreenER" width="76" height="51"/></Link><p>Mais tecnologia, menos impacto.</p><span>FATEC Jacareí × Unilaunch</span></footer></section>
    </main>
  </div>;
}
