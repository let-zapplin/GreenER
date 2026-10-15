import { useState } from "react";
import { Link } from "react-router-dom";
import "./HowItWorks.css";

const steps = [
  { name: "Cadastro", caption: "Você informa", title: "Você cadastra o serviço", text: "Informe o nome, o caminho de métricas e a região onde ele roda. É isso que permite ao GreenER saber onde coletar e qual energia considerar." },
  { name: "Coleta", caption: "A cada intervalo", title: "Coletamos as métricas", text: "O GreenER consulta as métricas de CPU, memória e disco dos serviços em intervalos regulares. Esses dados são a base para estimar o consumo de energia." },
  { name: "Carbono", caption: "Por região", title: "Consultamos o carbono da região", text: "A intensidade de carbono indica quanto CO₂e é emitido por kWh de energia na região do serviço. A origem da eletricidade faz diferença no impacto ambiental." },
  { name: "Cálculo", caption: "Automático", title: "Transformamos consumo em impacto", text: "Multiplicamos a energia estimada pela intensidade de carbono da região. Assim, o consumo em kWh se transforma em uma estimativa de emissão de CO₂e." },
  { name: "Resultado", caption: "No painel", title: "Você acompanha os resultados", text: "O painel reúne os serviços, suas regiões e estimativas de energia e emissões. Compare os resultados ao longo do tempo para identificar oportunidades de redução." },
];
const faqs = [
  ["Os valores são medidos ou estimados?", "Estimados. Partimos do uso de CPU, memória e disco do serviço e aplicamos um fator de energia por métrica."],
  ["Por que a região importa?", "A geração de eletricidade varia por região. A mesma quantidade de energia pode produzir emissões diferentes conforme a intensidade de carbono local."],
  ["Com que frequência os dados atualizam?", "A coleta acontece em intervalos configurados no monitoramento. A lista de serviços é consultada automaticamente a cada 1 segundo, aguardando a conclusão de consultas em andamento."],
  ["O que significa “sem métricas”?", "Significa que não há dados de métricas disponíveis para o serviço naquele momento. Sem eles, não é possível calcular uma nova estimativa de consumo e emissões."],
];
const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function CalculatorInput({ id, label, value, onChange, step }: { id: string; label: string; value: string; onChange: (value: string) => void; step: number }) {
  function adjust(direction: number) {
    const current = Number(value);
    onChange(String(Math.max(0, Math.round(((Number.isFinite(current) ? current : 0) + direction * step) * 10) / 10)));
  }
  return <div className="how-number-field">
    <input id={id} type="number" min="0" step={step} value={value} onChange={event => onChange(event.target.value)} />
    <div className="how-number-controls">
      <button type="button" aria-label={`Aumentar ${label}`} onClick={() => adjust(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4"/></svg></button>
      <button type="button" aria-label={`Diminuir ${label}`} disabled={value.trim() !== "" && Number(value) <= 0} onClick={() => adjust(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
    </div>
  </div>;
}

export function HowItWorks() {
  const [selected, setSelected] = useState(0);
  const [energy, setEnergy] = useState("1248.6");
  const [carbon, setCarbon] = useState("437");
  const energyValue = energy.trim() === "" ? NaN : Number(energy);
  const carbonValue = carbon.trim() === "" ? NaN : Number(carbon);
  const valid = Number.isFinite(energyValue) && energyValue >= 0 && Number.isFinite(carbonValue) && carbonValue >= 0;

  return <div className="how-screen"><div className="how-background" aria-hidden="true"><span/><span/><span/></div>
    <main className="how-page">
      <section className="how-hero" aria-labelledby="how-title"><h1 id="how-title">Do consumo ao impacto, em cinco passos.</h1><p>O GreenER lê as métricas dos seus serviços, descobre quanto carbono a energia daquela região emite e transforma isso em números que você pode acompanhar e reduzir.</p></section>

      <section className="how-panel how-flow" aria-labelledby="flow-title"><h2 id="flow-title">Como a informação chega até você</h2><p>Selecione uma etapa para ver o que acontece nela.</p>
        <ol className="how-steps">{steps.map((step, index) => <li key={step.name}><button type="button" aria-pressed={selected === index} aria-controls="how-step-content" onClick={() => setSelected(index)}><span className="how-step-number">{index + 1}</span><strong>{step.name}</strong><small>{step.caption}</small></button></li>)}</ol>
        <div className="how-step-content" id="how-step-content" aria-live="polite" aria-atomic="true"><div key={selected} className="how-step-copy"><h3>{steps[selected].title}</h3><p>{steps[selected].text}</p></div></div>
      </section>

      <div className="how-columns">
        <section className="how-panel" aria-labelledby="calculation-title"><h2 id="calculation-title">Como calculamos a emissão</h2><p>Emissão de CO₂e = energia estimada (kWh) × intensidade de carbono da região (gCO₂e/kWh).</p>
          <div className="how-calculator"><label htmlFor="how-energy">Energia estimada (kWh)</label><CalculatorInput id="how-energy" label="energia estimada" value={energy} onChange={setEnergy} step={0.1} />
            <label htmlFor="how-carbon">Intensidade de carbono (gCO₂e/kWh)</label><CalculatorInput id="how-carbon" label="intensidade de carbono" value={carbon} onChange={setCarbon} step={1} />
            <div className="how-result" aria-live="polite" aria-atomic="true">{valid ? <><strong>{format.format(energyValue * carbonValue / 1000)}</strong> kg CO₂e</> : <span>Informe valores iguais ou maiores que zero.</span>}<p>Altere os valores para ver como a região muda o resultado.</p></div>
          </div>
        </section>
        <section className="how-panel" aria-labelledby="faq-title"><h2 id="faq-title">Perguntas Frequentes</h2><p>O que costuma gerar dúvida.</p><div className="how-faq">{faqs.map(([question, answer], index) => <details key={question} open={index === 0 ? true : undefined}><summary>{question}<span aria-hidden="true" className="how-faq-symbol"/></summary><p>{answer}</p></details>)}</div></section>
      </div>

      <section className="how-panel how-cta"><div><h2>Pronto para ver seus serviços?</h2><p>Cadastre um serviço e acompanhe a primeira coleta em minutos.</p></div><Link to="/monitoramento" className="how-button">Ir para Monitoramento</Link></section>
    </main><footer className="how-footer">GreenER. Mais tecnologia, menos impacto.</footer>
  </div>;
}
