# Product Backlog - GreenER

← [Voltar ao índice da documentação](../README.md)

> Artefato mantido pelo **Product Owner** e refinado a cada Sprint.  
> **Atualização de fechamento técnico da Sprint 2 — 09/11/2026.**  
> A Sprint Review 2 ainda não ocorreu; portanto, este documento registra apenas o estado técnico comprovado e as adaptações de escopo já realizadas durante a execução.

---

## 1. Legenda

### Prioridade

| Valor | Significado |
| --- | --- |
| 🔴 **Alta** | Obrigatória para o MVP ou necessária para desbloquear requisitos centrais |
| 🟡 **Média** | Obrigatória/importante, mas depende da base funcional anterior |
| 🟢 **Baixa** | Refinamento ou extensão cujo escopo pode ser reduzido sem impedir o fluxo central |

### Status

| Status | Significado |
| --- | --- |
| ✅ Concluído | Implementado e tecnicamente verificado na versão atual |
| 🔄 Em revisão | Implementação funcional existe, mas ainda depende de revisão/integração final |
| 🔄 Parcial | Parte relevante existe, mas ainda falta critério obrigatório |
| ⏳ Planejado | Selecionado para Sprint futura |
| 🔁 Contínuo | Requisito já possui base implementada, mas deve ser revalidado/evoluído nas Sprints seguintes |

---

## 2. Histórias de Usuário e Technical Stories

| ID | Como... | Quero... | Para... | Req. | Prioridade | Sprint | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US01 | usuário da plataforma | que o sistema identifique automaticamente os serviços disponíveis | acompanhar os serviços sem cadastro manual | RF01 | 🔴 Alta | S1 | ✅ Concluído |
| US02 | usuário da plataforma | que o sistema reconheça inclusão, remoção e retorno de serviços | manter o ambiente monitorado coerente com a fonte externa | RF02 | 🔴 Alta | S1 | ✅ Concluído |
| US03 | usuário da plataforma | que as métricas de cada serviço sejam coletadas periodicamente | acompanhar seu comportamento ao longo do tempo | RF03 | 🔴 Alta | S2 | ✅ Concluído |
| US04 | usuário da plataforma | que cada nova coleta considere a variação das métricas | representar corretamente as mudanças do ambiente | RF04 | 🔴 Alta | S2 | ✅ Concluído |
| US05 | usuário da plataforma | ser informado quando um serviço não responder ou estiver indisponível | saber quando seu monitoramento está comprometido | RF05 | 🔴 Alta | S2 | ✅ Concluído |
| US06 | usuário da plataforma | saber quando um serviço continua ativo mas não fornece métricas | diferenciar ausência de dados de indisponibilidade | RF06 | 🔴 Alta | S2 | ✅ Concluído |
| US07 | usuário da plataforma | visualizar energia e CO₂e de cada serviço | compreender seu impacto ambiental individual | RF07 | 🔴 Alta | S2 | ✅ Concluído |
| US08 | usuário da plataforma | visualizar indicadores consolidados | compreender rapidamente o estado geral do ambiente | RF08 | 🔴 Alta | S2 | ✅ Concluído |
| US09 | usuário da plataforma | visualizar um dashboard operacional | acompanhar serviços, métricas e impacto em um único lugar | RF09 | 🔴 Alta | S2 | ✅ Concluído |
| US10 | usuário da plataforma | que o dashboard seja atualizado automaticamente | acompanhar o ambiente sem recarregar a página | RF11, RNF02 | 🔴 Alta | S2 | ✅ Concluído |
| US11 | usuário da plataforma | consultar o histórico das coletas | analisar evolução de métricas e impacto ao longo do tempo | RF10 | 🔴 Alta | S2 | ✅ Concluído |
| US12 | usuário da plataforma | visualizar onde cada serviço está hospedado | relacionar localização e indicadores | RF12 | 🟡 Média | S2-S3 | 🔄 Parcial — localização real já persistida e utilizada; consolidação final permanece na S3 |
| US13 | usuário da plataforma | visualizar geograficamente serviços com coordenadas | entender sua distribuição espacial | RF13 | 🟡 Média | **S2 → S3** | 🔄 Em revisão — implementação funcional antecipada da S3 para a S2; consolidação final na S3 |
| US14 | usuário da plataforma | ordenar serviços pelo impacto ambiental | identificar maiores e menores impactos no período | RF14 | 🔴 Alta | S3 | ⏳ Planejado |
| US15 | usuário da plataforma | comparar dois ou mais serviços | compreender diferenças de métricas e impacto no mesmo período | RF15 | 🔴 Alta | S3 | ⏳ Planejado |
| US16 | usuário autorizado | me autenticar para acessar recursos protegidos | impedir acesso não autorizado | RP06 | 🔴 Alta | S2 | ✅ Concluído |
| TS01 | usuário | utilizar a plataforma em diferentes tamanhos de tela | acompanhar dados em desktop e mobile | RNF01 | 🔴 Alta | S1-S3 | 🔁 Contínuo — base responsiva e prototipação mobile existem; revisão final na S3 |
| TS02 | usuário | que uma falha isolada não derrube o GreenER | continuar acompanhando os demais serviços | RNF04 | 🔴 Alta | S2-S3 | 🔁 Contínuo — tratamento principal validado na S2; revalidar regressões na S3 |
| TS03 | usuário | que a interface responda em tempo adequado | acompanhar continuamente o ambiente | RNF03 | 🟡 Média | S3 | ⏳ Planejado — build atual possui aviso não bloqueante de chunk >500 kB |
| TS04 | equipe técnica | encontrar documentação coerente e reproduzível | executar, compreender e manter o projeto | RNF05 | 🔴 Alta | S1-S3 | 🔁 Contínuo — documentação atualizada no fechamento da S2 e novamente revisada na S3 |

---

## 3. Critérios de Aceitação

### Épico 1 - Descoberta, monitoramento e coletas

#### US01 - Descobrir serviços disponíveis
- [x] consultar o Agregador de Métricas;
- [x] identificar os serviços retornados;
- [x] reconhecer novos serviços durante a execução.

**RF:** RF01

#### US02 - Acompanhar mudanças no catálogo
- [x] reconhecer novo serviço;
- [x] reconhecer serviço que deixa de aparecer em `/services`;
- [x] atualizar seu estado sem apagar o histórico;
- [x] reconhecer retorno e atualizar o estado novamente.

**RF:** RF02

#### US03 - Coletar métricas dos serviços
- [x] consultar `/metrics/{id_servico}` de forma real;
- [x] executar a consulta para cada serviço ativo;
- [x] persistir o resultado associado ao serviço;
- [x] executar a coleta periodicamente.

**RF:** RF03

#### US04 - Trabalhar com métricas variáveis
- [x] não assumir valores estáticos entre coletas;
- [x] persistir novas amostras sem sobrescrever o histórico;
- [x] processar normalmente valores diferentes entre requisições;
- [x] refletir novas coletas nas respostas e visualizações.

**RF:** RF04

---

### Épico 2 - Disponibilidade e qualidade da coleta

#### US05 - Identificar serviço indisponível
- [x] identificar falha/timeout durante a coleta individual;
- [x] registrar `unavailable` sem criar métricas artificiais;
- [x] sinalizar a indisponibilidade de forma coerente no frontend;
- [x] garantir que a falha de um serviço não interrompa os demais.

**RF:** RF05 | **Relacionado:** RNF04

#### US06 - Identificar ausência de métricas
- [x] reconhecer que o serviço continua presente em `/services`;
- [x] detectar ausência de métricas válidas;
- [x] diferenciar `no_metrics` de `unavailable`;
- [x] apresentar sinalização própria ao usuário.

**RF:** RF06

---

### Épico 3 - Impacto ambiental

#### US07 - Calcular impacto individual
- [x] calcular consumo energético estimado por serviço;
- [x] associar intensidade de carbono adequada à região e ao instante da coleta;
- [x] calcular emissão estimada de CO₂e;
- [x] persistir métricas, duração da amostra e snapshots necessários à consistência histórica;
- [x] documentar fórmula, unidades, fatores e exemplo em `docs/calculos.md`;
- [x] validar o cálculo com testes automatizados e exemplo manual.

**RF:** RF07

#### US08 - Visualizar indicadores gerais
- [x] consumo energético total;
- [x] emissão total;
- [x] quantidade de serviços ativos;
- [x] quantidade de serviços sem métricas;
- [x] quantidade de serviços indisponíveis;
- [x] dados provenientes do backend, sem valores fixos no frontend.

**RF:** RF08

---

### Épico 4 - Dashboard e atualização contínua

#### US09 - Dashboard operacional

Apresentar no Monitoramento:

- [x] estado de monitoramento;
- [x] localização disponível;
- [x] métricas reais;
- [x] consumo energético estimado;
- [x] emissão estimada de CO₂e;
- [x] indicadores consolidados do ambiente.

**RF:** RF09

#### US10 - Atualização automática
- [x] atualizar a interface sem reload manual;
- [x] definir e documentar intervalo de sincronização do catálogo;
- [x] definir e documentar intervalo de coleta de métricas;
- [x] definir atualização do frontend coerente com o backend;
- [x] informar data/hora da última atualização relevante ao usuário;
- [x] preservar os últimos dados válidos diante de falha transitória.

**RF:** RF11 | **RNF:** RNF02

---

### Épico 5 - Histórico e análise temporal

#### US11 - Histórico de coletas
- [x] possuir entidade que represente uma tentativa individual;
- [x] associar cada coleta ao serviço;
- [x] registrar data/hora e estado da tentativa;
- [x] preservar amostras anteriores;
- [x] consultar histórico por serviço e período;
- [x] preservar registros após reinicialização dos containers sem remoção do volume;
- [x] disponibilizar histórico ambiental para visualização em Análises.

**RF:** RF10

---

### Épico 6 - Distribuição geográfica

#### US12 - Localização do serviço
- [x] persistir país e região recebidos da API;
- [x] persistir/exibir cidade quando disponível;
- [x] utilizar latitude/longitude quando disponíveis;
- [x] manter serviços sem coordenadas acessíveis nas demais visualizações;
- [ ] concluir a revisão final de contratos e responsividade na Sprint 3.

**RF:** RF12

#### US13 - Mapa dos serviços
- [x] usar latitude/longitude reais dos serviços;
- [x] apresentar no mapa os serviços com coordenadas;
- [x] manter serviços sem coordenadas disponíveis nas demais visualizações;
- [x] integrar o mapa ao **Monitoramento** como recurso operacional complementar;
- [x] permitir selecionar serviços agrupados quando compartilham coordenadas;
- [ ] concluir revisão/integração e refinamentos finais na Sprint 3.

**RF:** RF13

> **Adaptação de escopo:** a US13 foi originalmente planejada para a Sprint 3, mas sua implementação funcional foi antecipada para a Sprint 2 durante a reformulação do Monitoramento. No fechamento técnico de 09/11/2026, a issue ainda estava em revisão; por isso a história não é registrada como definitivamente concluída.

---

### Épico 7 - Ranking e comparação

#### US14 - Ranking de impacto
- [ ] ordenar por consumo energético estimado;
- [ ] ordenar por emissão estimada de CO₂e;
- [ ] utilizar dados agregados no período selecionado;
- [ ] informar claramente o período considerado.

**RF:** RF14

#### US15 - Comparação entre serviços
- [ ] selecionar dois ou mais serviços;
- [ ] comparar todos usando o mesmo período;
- [ ] apresentar métricas e indicadores ambientais relevantes;
- [ ] manter leitura simples e útil para tomada de decisão.

**RF:** RF15

---

### Épico 8 - Autenticação e acesso protegido

#### US16 - Autenticação JWT
- [x] autenticar credenciais no backend;
- [x] gerar JWT após autenticação válida;
- [x] tratar senha de forma não reversível e segredo via variável de ambiente;
- [x] validar JWT antes de acessar recursos protegidos;
- [x] responder com `401` para token ausente/inválido/expirado;
- [x] aplicar autorização administrativa quando necessária;
- [x] garantir que proteção do frontend não seja o único controle de acesso.

**RP:** RP06

---

## 4. Technical Stories / Requisitos Não Funcionais

### TS01 - Responsividade
- [x] interface base responsiva;
- [x] navegação utilizável em diferentes larguras;
- [x] prototipação mobile realizada na Sprint 2;
- [ ] revisar Monitoramento, Análises, ranking, comparação e mapa no fechamento da Sprint 3.

**RNF:** RNF01

### TS02 - Tolerância a falhas
- [x] falha de sincronização do catálogo não encerra o backend;
- [x] falha de um serviço não interrompe a coleta dos demais;
- [x] falha da Metrics API é tratada;
- [x] falha/ausência de intensidade é representada como lacuna;
- [x] falha transitória no frontend preserva os últimos dados válidos;
- [x] dados incompletos são sinalizados sem inventar valores;
- [ ] executar regressão final desses cenários na Sprint 3.

**RNF:** RNF04

### TS03 - Desempenho
- [ ] revisar intervalos de polling/sincronização/coleta;
- [ ] analisar consultas históricas e agregações;
- [ ] avaliar o aviso de bundle/chunk >500 kB do frontend;
- [ ] corrigir gargalos que prejudiquem acompanhamento contínuo.

**RNF:** RNF03

### TS04 - Documentação técnica
- [x] instruções de execução;
- [x] documentação de arquitetura;
- [x] documentação dos endpoints existentes;
- [x] modelo de dados e migrations atualizados;
- [x] `docs/calculos.md` coerente com o modelo v1;
- [x] README e registro da Sprint 2 atualizados no fechamento técnico;
- [x] manual de validação atualizado;
- [ ] incorporar feedback da Sprint Review 2 quando ela ocorrer;
- [ ] revisar novamente a documentação no fechamento da Sprint 3.

**RNF:** RNF05

---

## 5. Direcionamentos incorporados da Sprint Review 1

- manter a identidade visual limpa e o conceito adaptativo do camaleão;
- evoluir a adaptação de puramente visual para funcional;
- revisar banco, coletas e persistência antes de avançar no dashboard analítico;
- tratar histórico como base para gráficos, ranking e comparação;
- tornar o mapa funcional e conectado aos serviços reais;
- priorizar gráficos simples e legíveis;
- construir ranking e comparação com utilidade clara e período explícito;
- melhorar comentários em regras/decisões não óbvias e a comunicação técnica.

---

## 6. Adaptações registradas durante a Sprint 2

Antes da Sprint Review 2, já ocorreram duas adaptações de escopo verificáveis:

1. **US13 antecipada da Sprint 3 para a Sprint 2**, com implementação funcional do mapa no Monitoramento;
2. **TEC37 incorporada à Sprint 2** para reformular a apresentação dos indicadores do Monitoramento.

Essas alterações não são atribuídas a feedback da Sprint Review 2, que ainda não ocorreu. Elas são registradas como decisões tomadas durante a execução.

---

## 7. Histórico de alterações

| Data | Alteração | Responsável |
| --- | --- | --- |
| 29/09/2026 | Criação inicial do Product Backlog | Gustavo (Product Owner) |
| 18/10/2026 | Refinamento para fechamento da Sprint 1 | Gustavo (Product Owner) |
| 20/10/2026 | Revisão pós-Review 1 e planejamento das Sprints 2 e 3 | Equipe GreenER |
| 09/11/2026 | Atualização dos status após validação técnica da Sprint 2 e registro da antecipação da US13 | Equipe GreenER |

---

<div align="center">
  <a href="../README.md">← Voltar ao Índice</a>
</div>
