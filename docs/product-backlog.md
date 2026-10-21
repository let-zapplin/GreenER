# Product Backlog - GreenER

← [Voltar ao índice da documentação](../README.md)

> Artefato mantido pelo **Product Owner** e refinado no início de cada Sprint.  
> Atualização após a **Sprint Review 1 (19/10/2026)** e planejamento das Sprints 2 e 3.

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
| ✅ Concluído | Implementado e verificado na versão atual |
| 🔄 Parcial | Parte relevante existe, mas ainda falta critério obrigatório |
| ⏳ Planejado | Selecionado para Sprint em execução ou futura |
| 🔁 Contínuo | Requisito evolutivo verificado em todas as Sprints |

---

## 2. Histórias de Usuário e Technical Stories

| ID | Como... | Quero... | Para... | Req. | Prioridade | Sprint | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US01 | usuário da plataforma | que o sistema identifique automaticamente os serviços disponíveis | acompanhar os serviços sem cadastro manual | RF01 | 🔴 Alta | S1 | ✅ Concluído |
| US02 | usuário da plataforma | que o sistema reconheça inclusão, remoção, indisponibilidade e retorno de serviços | manter o ambiente monitorado coerente com a fonte externa | RF02 | 🔴 Alta | S1 | ✅ Concluído |
| US03 | usuário da plataforma | que as métricas de cada serviço sejam coletadas periodicamente | acompanhar seu comportamento ao longo do tempo | RF03 | 🔴 Alta | S2 | ⏳ Planejado |
| US04 | usuário da plataforma | que cada nova coleta considere a variação das métricas | representar corretamente as mudanças do ambiente | RF04 | 🔴 Alta | S2 | ⏳ Planejado |
| US05 | usuário da plataforma | ser informado quando um serviço não responder ou estiver indisponível | saber quando seu monitoramento está comprometido | RF05 | 🔴 Alta | S2 | 🔄 Parcial - catálogo já tratado; coleta individual pendente |
| US06 | usuário da plataforma | saber quando um serviço continua ativo mas não fornece métricas | diferenciar ausência de dados de indisponibilidade | RF06 | 🔴 Alta | S2 | ⏳ Planejado |
| US07 | usuário da plataforma | visualizar energia e CO₂e de cada serviço | compreender seu impacto ambiental individual | RF07 | 🔴 Alta | S2 | ⏳ Planejado |
| US08 | usuário da plataforma | visualizar indicadores consolidados | compreender rapidamente o estado geral do ambiente | RF08 | 🔴 Alta | S2 | ⏳ Planejado |
| US09 | usuário da plataforma | visualizar um dashboard operacional | acompanhar serviços, métricas e impacto em um único lugar | RF09 | 🔴 Alta | S2 | 🔄 Parcial - monitoramento existe; indicadores ambientais pendentes |
| US10 | usuário da plataforma | que o dashboard seja atualizado automaticamente | acompanhar o ambiente sem recarregar a página | RF11, RNF02 | 🔴 Alta | S2 | 🔄 Parcial - atualização existe; intervalo/última coleta devem ser consolidados |
| US11 | usuário da plataforma | consultar o histórico das coletas | analisar evolução de métricas e impacto ao longo do tempo | RF10 | 🔴 Alta | S2 | ⏳ Planejado |
| US12 | usuário da plataforma | visualizar onde cada serviço está hospedado | relacionar localização e indicadores | RF12 | 🟡 Média | S3 | 🔄 Parcial - localização já persistida/exibida em partes da interface |
| US13 | usuário da plataforma | visualizar geograficamente serviços com coordenadas | entender sua distribuição espacial | RF13 | 🟡 Média | S3 | ⏳ Planejado - globo conceitual não atende ao requisito funcional |
| US14 | usuário da plataforma | ordenar serviços pelo impacto ambiental | identificar maiores e menores impactos no período | RF14 | 🔴 Alta | S3 | ⏳ Planejado |
| US15 | usuário da plataforma | comparar dois ou mais serviços | compreender diferenças de métricas e impacto no mesmo período | RF15 | 🔴 Alta | S3 | ⏳ Planejado |
| US16 | usuário autorizado | me autenticar para acessar recursos protegidos | impedir acesso não autorizado | RP06 | 🔴 Alta | S2 | 🔄 Parcial - login/JWT existem; validação backend pendente |
| TS01 | usuário | utilizar a plataforma em diferentes tamanhos de tela | acompanhar dados em desktop e mobile | RNF01 | 🔴 Alta | S1-S3 | 🔁 Contínuo |
| TS02 | usuário | que uma falha isolada não derrube o GreenER | continuar acompanhando os demais serviços | RNF04 | 🔴 Alta | S2-S3 | 🔄 Parcial - base de tratamento existe; ampliar para coletas/APIs |
| TS03 | usuário | que a interface responda em tempo adequado | acompanhar continuamente o ambiente | RNF03 | 🟡 Média | S3 | ⏳ Planejado |
| TS04 | equipe técnica | encontrar documentação coerente e reproduzível | executar, compreender e manter o projeto | RNF05 | 🔴 Alta | S1-S3 | 🔁 Contínuo - revisar banco, cálculos e docs a cada Sprint |

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
- [x] atualizar o estado para indisponível;
- [x] reconhecer retorno e atualizar o estado novamente.

**RF:** RF02

#### US03 - Coletar métricas dos serviços
- [ ] consultar `/metrics/{id_servico}` de forma real;
- [ ] executar a consulta para cada serviço disponível;
- [ ] persistir o resultado associado ao serviço;
- [ ] executar a coleta periodicamente.

**RF:** RF03

#### US04 - Trabalhar com métricas variáveis
- [ ] não assumir valores estáticos entre coletas;
- [ ] persistir novas amostras sem sobrescrever o histórico;
- [ ] processar normalmente valores diferentes entre requisições;
- [ ] refletir novas coletas nas respostas e visualizações.

**RF:** RF04

---

### Épico 2 - Disponibilidade e qualidade da coleta

#### US05 - Identificar serviço indisponível
- [x] reconhecer indisponibilidade quando um serviço deixa o catálogo;
- [ ] identificar falha/timeout durante a coleta individual;
- [ ] sinalizar a indisponibilidade de forma coerente no frontend;
- [ ] garantir que a falha de um serviço não interrompa os demais.

**RF:** RF05 | **Relacionado:** RNF04

#### US06 - Identificar ausência de métricas
- [ ] reconhecer que o serviço continua presente em `/services`;
- [ ] detectar ausência/falha específica no retorno de métricas;
- [ ] diferenciar `no_metrics` de indisponibilidade do serviço;
- [ ] apresentar sinalização própria ao usuário.

**RF:** RF06

---

### Épico 3 - Impacto ambiental

#### US07 - Calcular impacto individual
- [ ] calcular consumo energético estimado por serviço;
- [ ] consultar/associar intensidade de carbono adequada à região;
- [ ] calcular emissão estimada de CO₂e;
- [ ] persistir dados necessários para manter consistência histórica;
- [ ] documentar fórmula, unidades, fatores e exemplo em `docs/calculos.md`;
- [ ] validar o cálculo com testes automatizados.

**RF:** RF07

#### US08 - Visualizar indicadores gerais
- [ ] consumo energético total;
- [ ] emissão total;
- [ ] quantidade de serviços ativos;
- [ ] quantidade de serviços indisponíveis;
- [ ] dados provenientes do backend, sem valores fixos no frontend.

**RF:** RF08

---

### Épico 4 - Dashboard e atualização contínua

#### US09 - Dashboard operacional
Para cada serviço, apresentar:
- [x] estado de monitoramento;
- [x] localização disponível;
- [ ] métricas reais da última coleta;
- [ ] consumo energético estimado;
- [ ] emissão estimada de CO₂e.

**RF:** RF09

#### US10 - Atualização automática
- [x] atualizar a interface sem reload manual;
- [ ] definir e documentar intervalo de sincronização do catálogo;
- [ ] definir e documentar intervalo de coleta de métricas;
- [ ] definir intervalo de atualização do frontend coerente com o backend;
- [ ] informar data/hora da última atualização/coleta relevante ao usuário.

**RF:** RF11 | **RNF:** RNF02

---

### Épico 5 - Histórico e análise temporal

#### US11 - Histórico de coletas
- [ ] possuir entidade/estrutura que represente uma coleta individual;
- [ ] associar cada coleta ao serviço;
- [ ] registrar data/hora e estado da tentativa;
- [ ] preservar amostras anteriores;
- [ ] consultar histórico por serviço e período;
- [ ] preservar registros após reinicialização dos containers sem remoção do volume.

**RF:** RF10

---

### Épico 6 - Distribuição geográfica

#### US12 - Localização do serviço
- [x] persistir país e região recebidos da API;
- [x] persistir/exibir cidade quando disponível;
- [ ] garantir contratos TypeScript compatíveis com campos opcionais/nulos;
- [ ] consolidar a localização nas visualizações finais.

**RF:** RF12

#### US13 - Mapa dos serviços
- [ ] usar latitude/longitude reais dos serviços;
- [ ] apresentar os serviços com coordenadas no mapa;
- [ ] manter serviços sem coordenadas disponíveis nas demais visualizações;
- [ ] integrar o mapa ao fluxo analítico sem torná-lo o foco exclusivo do dashboard.

**RF:** RF13

> A Review da Sprint 1 reforçou que o mapa deve ganhar maior evidência e utilidade funcional, sem perder o foco principal do produto.

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
- [ ] validar JWT no backend antes de acessar recursos protegidos;
- [ ] responder com status HTTP coerente para token ausente/inválido/expirado;
- [ ] garantir que proteção do frontend não seja o único controle de acesso.

**RP:** RP06

---

## 4. Technical Stories / Requisitos Não Funcionais

### TS01 - Responsividade
- [x] interface base responsiva;
- [x] navegação utilizável em diferentes larguras;
- [ ] revisar dashboard, gráficos, ranking, comparação e mapa em mobile na Sprint 3.

**RNF:** RNF01

### TS02 - Tolerância a falhas
- [x] falha de sincronização do catálogo não encerra o backend;
- [ ] falha de um serviço não interrompe a coleta dos demais;
- [ ] falha da Metrics API é tratada adequadamente;
- [ ] falha da Carbon API é tratada adequadamente;
- [ ] problema relevante é apresentado ao usuário sem dados falsamente válidos.

**RNF:** RNF04

### TS03 - Desempenho
- [ ] revisar intervalos de polling/sincronização/coleta;
- [ ] analisar consultas históricas e agregações;
- [ ] corrigir gargalos que prejudiquem acompanhamento contínuo.

**RNF:** RNF03

### TS04 - Documentação técnica
- [x] instruções básicas de execução;
- [x] documentação de arquitetura inicial;
- [x] documentação dos endpoints existentes;
- [ ] atualizar modelo de dados após revisão das coletas;
- [ ] preencher e validar `docs/calculos.md`;
- [ ] manter README, plano de entregas e registro de Sprint coerentes com cada versão;
- [ ] manter instruções de APIs auxiliares e validação atualizadas.

**RNF:** RNF05

---

## 5. Direcionamentos incorporados da Sprint Review 1

- manter a identidade visual limpa e o conceito adaptativo do camaleão;
- evoluir a adaptação de puramente visual para funcional, permitindo abrir/minimizar e priorizar informações;
- revisar banco, coletas e persistência antes de avançar no dashboard analítico;
- tratar histórico como base para gráficos, ranking e comparação;
- tornar o mapa funcional e conectado aos serviços reais;
- priorizar gráficos simples, legíveis e visualmente relevantes;
- construir ranking e comparação com utilidade clara e período explícito;
- melhorar comentários em regras/decisões não óbvias do código e a comunicação técnica entre integrantes.

---

## 6. Histórico de alterações

| Data | Alteração | Responsável |
| --- | --- | --- |
| 29/09/2026 | Criação inicial do Product Backlog | Gustavo (Product Owner) |
| 18/10/2026 | Refinamento para fechamento da Sprint 1 | Gustavo (Product Owner) |
| 20/10/2026 | Revisão pós-Review: correção de status, realocação de US05/US06/US16 e alinhamento das Sprints 2 e 3 | Equipe GreenER |

---

<div align="center">
  <a href="../README.md">← Voltar ao Índice</a>
</div>
