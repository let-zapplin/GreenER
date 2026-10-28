# Sprint Backlog 2 - GreenER

← [Voltar ao índice da documentação](../../README.md)

> **Período:** 20/10/2026 a 09/11/2026  
> **Objetivo da Sprint:** construir e validar o ciclo de coleta histórica do GreenER, desde a obtenção periódica das métricas até sua persistência, cálculo ambiental e apresentação dos primeiros indicadores, revisando a modelagem de dados para garantir histórico e rastreabilidade.

---

## 1. Diretrizes de planejamento

A Sprint 2 concentra o núcleo funcional do produto:

```text
coleta → persistência → histórico → cálculo ambiental → indicadores → dashboard
```

A distribuição foi revisada a partir do desempenho e das frentes assumidas na Sprint 1, buscando manter **carga principal próxima entre todos os integrantes**, continuidade de conhecimento e participação relevante em código, testes, documentação, integração ou revisão.

> **Story Points (SP)** representam esforço, incerteza e complexidade relativa; não representam horas nem produtividade individual.

### Prioridade

| Prioridade | Significado |
| --- | --- |
| **P0** | Bloqueia outras entregas ou é essencial para o objetivo da Sprint |
| **P1** | Entrega central da Sprint, necessária para compor o incremento funcional |
| **P2** | Importante, mas pode ter escopo reduzido caso haja risco ao objetivo principal |

### Fluxo de trabalho

```text
Backlog → Ready → In progress → In review → Done
```

Uma tarefa só entra em **Ready** quando suas dependências e critérios de aceite estiverem claros.

Uma tarefa só entra em **In progress** quando o responsável iniciar efetivamente seu desenvolvimento.

A tarefa entra em **In review** quando possuir Pull Request aberto e passa para **Done** somente após atender à Definition of Done da Sprint.

---

## 2. Sprint Backlog

| Ordem | ID | Tipo | Item | Requisitos | Rubrica relacionada | Área | Prioridade | SP | Responsável | Apoio / revisão | Dependências | Status | Entrega esperada |
| ---: | --- | --- | --- | --- | --- | --- | :---: | ---: | --- | --- | --- | --- | --- |
| 1 | TEC02 | Técnico | Revisar a estrutura base do banco e criar a entidade de coleta | RF03, RF10, RP03 | BD01, BD03 | Backend / DB | **P0** | **5** | **Vitor** | Gustavo + Patricia | - | 🔵 Em revisão | Modelo capaz de registrar tentativas de coleta, histórico e estados sem sobrescrever registros anteriores. |
| 2 | TEC29 | Técnico | Completar autenticação JWT e proteção das rotas configuráveis | RP06 | DW06, TP03 | Backend / Frontend | **P0** | **3** | **Marcello** | Vitor | - | ⬜ A fazer | Backend validando JWT em recursos protegidos, rejeitando acesso não autenticado e mantendo tratamento seguro de senha e segredo. |
| 3 | US03 | User Story | Coletar métricas de todos os serviços disponíveis | RF03 | DW02, DW03, TP02, TP03 | Backend | **P0** | **5** | **Marcello** | Igor | TEC02 | ⬜ A fazer | Consulta real a `/metrics/{id_servico}` para cada serviço identificado, com respostas tipadas e tratamento de falhas. |
| 4 | US04 | User Story | Implementar coleta periódica e tratamento da variação das métricas | RF03, RF04 | DW02, TP02, TP03 | Backend | **P0** | **5** | **Igor** | Marcello | US03 | ⬜ A fazer | Novas coletas executadas em intervalo definido, preservando cada amostra e aceitando valores variáveis entre requisições. |
| 5 | TEC17 | Técnico | Consolidar a orquestração automática de descoberta e coleta | RF02, RF03 | DW02, DW03, TP03 | Backend | **P0** | **3** | **Igor** | Vitor | US03, US04 | ⬜ A fazer | Processo automático executando descoberta e coleta sem ação manual e sem sobrepor execuções anteriores. |
| 6 | US05 | User Story | Detectar indisponibilidade durante a coleta individual | RF05, RNF04 | DW02, TP03 | Backend / Frontend | **P0** | **3** | **Igor** | Patricia | US03, US04 | ⬜ A fazer | Falha ou timeout de um serviço identificado e apresentado sem interromper o monitoramento dos demais. |
| 7 | US06 | User Story | Detectar serviço ativo sem métricas | RF06 | DW02, TP02, TP03 | Backend / Frontend | **P0** | **5** | **Igor** | Patricia + Marcello | US03, US04 | ⬜ A fazer | Diferenciação clara entre coleta `unavailable` e serviço presente em `/services` que não exporta métricas. |
| 8 | TEC18 | Técnico | Integrar Carbon Intensity API | RF07 | DW02, TP02, TP03 | Backend | **P1** | **5** | **Gustavo** | Igor | TEC02 | ⬜ A fazer | Consulta do fator de intensidade de carbono por região, com tipagem, timeout e tratamento de erro. |
| 9 | US07 | User Story | Calcular impacto ambiental individual dos serviços | RF07 | DW03, TP01, TP02, TP03 | Backend | **P1** | **8** | **Gustavo** | Marcello | US03, TEC18 | ⬜ A fazer | Energia e CO₂e calculados a partir das métricas e do fator de carbono; fórmula, unidades e premissas documentadas e testadas. |
| 10 | US11 | User Story | Persistir e consultar histórico de coletas | RF10 | BD02, BD03, DW03 | Backend / DB / Frontend | **P1** | **5** | **Patricia** | Vitor + Marcello | TEC02, US03 | ⬜ A fazer | Histórico associado ao serviço, consultável por período e preservado após reinicialização dos containers. |
| 11 | TEC19 | Técnico | Criar endpoint de dados consolidados do dashboard | RF08, RF09 | DW03, BD02 | Backend | **P1** | **5** | **Marcello** | Gustavo | US07, US11 | ⬜ A fazer | Endpoint entrega indicadores gerais reais para cards e visualizações, com resposta JSON documentada. |
| 12 | US08 | User Story | Visualizar indicadores gerais | RF08 | DW04, DW05 | Backend / Frontend | **P1** | **3** | **Marcello** | Patricia | TEC19 | ⬜ A fazer | Consumo total, emissão total e quantidade de serviços ativos/indisponíveis exibidos com dados reais. |
| 13 | TEC22 | Frontend / UI | Implementar visualizações iniciais do dashboard | RF08, RF09 | DW04, DW05 | Frontend | **P1** | **5** | **Patricia** | Vitor | TEC19 | ⬜ A fazer | Cards e componentes reutilizáveis para indicadores, estado e impacto dos serviços. |
| 14 | US09 | User Story | Consolidar dashboard operacional | RF09 | DW04, DW05 | Frontend | **P1** | **3** | **Vitor** | Patricia | US07, US08, TEC22 | ⬜ A fazer | Dashboard apresenta status, localização, métricas, energia e CO₂e com leitura clara. |
| 15 | US10 | User Story | Atualizar dashboard automaticamente | RF11, RNF02 | DW05 | Frontend / Backend | **P1** | **3** | **Vitor** | Igor | TEC17, US09 | ⬜ A fazer | Atualização sem reload, intervalo definido/documentado e data/hora da última atualização visível. |
| 16 | TEC23 | Frontend / UI | Implementar gráfico inicial de histórico | RF10 | DW04, DW05 | Frontend | **P1** | **3** | **Vitor** | Patricia | US11, US07 | ⬜ A fazer | Um gráfico temporal real e legível de energia ou CO₂e de um serviço. |
| 17 | TEC20 | Técnico | Ampliar testes automatizados | Qualidade | TP03, ES07 | Backend / Frontend | **P1** | **5** | **Patricia** | Todos | Durante toda a Sprint | ⬜ A fazer | Cobertura de coleta, cálculos, estados, persistência, JWT e endpoints críticos. Cada responsável testa sua própria entrega. |
| 18 | TEC21 | Técnico | Atualizar documentação técnica da Sprint 2 | RNF05 | ES06, ES08 | Geral | **P1** | **3** | **Gustavo** | Vitor + todos | Durante toda a Sprint | ⬜ A fazer | README, arquitetura, API, banco, cálculos, plano de entregas e registro da Sprint coerentes com a versão entregue. |

**Total planejado:** 77 SP

---

## 3. Distribuição de capacidade

A carga principal foi mantida em uma faixa estreita, tomando a Sprint 1 como referência para continuidade das frentes e autonomia demonstrada por cada integrante.

| Integrante | SP principais | Foco da Sprint 2 |
| --- | ---: | --- |
| **Gustavo** | **16** | Carbon API, fundamentação científica, energia/CO₂e e documentação técnica |
| **Marcello** | **16** | Metrics API, JWT, endpoint consolidado e indicadores |
| **Igor** | **16** | coleta periódica, orquestração, indisponibilidade e `no_metrics` |
| **Patricia** | **15** | histórico, visualizações do dashboard e coordenação de testes |
| **Vitor** | **14** | banco/coletas, dashboard, atualização automática e gráfico histórico |

> Os SP acima consideram apenas responsabilidade principal. Apoio, revisão cruzada, documentação conjunta e testes da própria entrega também compõem a participação da Sprint.

---

## 4. Sequência recomendada

### 20/10 a 22/10 — Fundação

- TEC02 — revisar banco, persistência e entidade de coleta.
- TEC29 — concluir proteção JWT no backend.
- Definir contratos necessários à coleta de métricas.

### 23/10 a 27/10 — Coleta e estados

- US03 → US04 → TEC17.
- US05 e US06 sobre a coleta real.
- Validar que uma falha não interrompe o monitoramento dos demais serviços.

### 28/10 a 01/11 — Histórico e impacto ambiental

- TEC18 → US07.
- US11 em paralelo.
- Documentar fórmulas, fatores e unidades utilizados.

### 02/11 a 05/11 — Indicadores e dashboard

- TEC19 → US08 → TEC22 → US09 → US10.

### 06/11 a 07/11 — Histórico visual

- TEC23 utilizando dados reais persistidos.

### 08/11 a 09/11 — Fechamento

- Testes, persistência após restart, regressão e documentação.
- Atualizar README, `docs/plano-de-entregas.md` e `docs/sprints/sprint-2.md`.

---

## 5. Definition of Done da Sprint 2

Uma tarefa só pode ser movida para **Done** quando:

- [ ] critérios de aceite estiverem atendidos;
- [ ] código estiver integrado à `develop`;
- [ ] build/execução via Docker estiver funcionando;
- [ ] testes relacionados estiverem passando;
- [ ] cenários de erro relevantes estiverem tratados;
- [ ] não houver `any` sem justificativa;
- [ ] SQL variável estiver parametrizado, quando aplicável;
- [ ] documentação relacionada estiver atualizada;
- [ ] PR contiver descrição, requisito relacionado e evidência de validação;
- [ ] pelo menos outro integrante tiver revisado a entrega.

---

## 6. Critério de sucesso da Sprint

Ao final da Sprint 2, deve ser possível demonstrar o seguinte fluxo ponta a ponta:

```text
serviço descoberto
    ↓
métricas coletadas periodicamente
    ↓
coleta persistida
    ↓
intensidade de carbono obtida
    ↓
energia/CO₂e calculados
    ↓
histórico consultável
    ↓
indicadores e gráfico exibidos no dashboard
```

A entrega não deve depender de dados simulados no frontend para os indicadores principais.

---

## 7. Decisões e evidências da Sprint

Esta seção registra decisões técnicas e evidências conforme as tarefas avançam.

Uma implementação registrada nesta seção **não significa automaticamente que a task está Done**. O status final continua condicionado à Definition of Done, integração em `develop`, PR e revisão.

### TEC02 — Revisão do banco e entidade de coleta

A modelagem do banco foi revisada para sustentar o ciclo histórico de coleta da Sprint 2 e preparar as próximas funcionalidades de métricas, estados e histórico.

#### Decisão de modelagem

O modelo anterior associava `metrics` diretamente a `service`:

```text
service → metrics
```

Esse modelo permitia armazenar métricas válidas, mas não representava adequadamente tentativas em que:

- o serviço estivesse disponível sem métricas;
- a consulta falhasse;
- o serviço estivesse indisponível;
- ocorresse erro durante o processamento.

Foi criada a entidade `collection`, fazendo com que o relacionamento principal passe a ser:

```text
service
   │
   │ 1:N
   ▼
collection
   │
   │ 1:0..1
   ▼
metrics
```

`collection` representa a **tentativa de coleta**.

`metrics` representa somente os **dados válidos retornados naquela tentativa**.

#### Estados da coleta

Foram definidos inicialmente os seguintes estados:

| Estado | Significado |
| --- | --- |
| `success` | A consulta retornou métricas válidas |
| `no_metrics` | O serviço permaneceu disponível, mas não forneceu métricas válidas |
| `unavailable` | Não foi possível consultar o serviço |
| `error` | Ocorreu erro durante o processamento |

O motivo técnico da falha pode ser armazenado separadamente em `failure_reason`, evitando misturar o estado de domínio com detalhes técnicos como timeout ou erro HTTP.

#### Relação com `metrics`

Cada registro de `metrics` referencia a coleta que o originou através de:

```text
collection_id_collection
```

A referência direta anterior de `metrics` para `service` foi removida.

O serviço correspondente passa a ser obtido por:

```text
metrics → collection → service
```

A restrição `UNIQUE` garante que uma coleta possua no máximo um conjunto de métricas.

Portanto:

```text
success
   ↓
collection + metrics
```

enquanto:

```text
no_metrics
unavailable
error
   ↓
collection sem metrics
```

#### Evolução de bancos existentes

Foi adicionada:

```text
database/migrations/001_add_collection.sql
```

para permitir a evolução de bancos já inicializados sem exigir a remoção do volume PostgreSQL.

Caso existam métricas anteriores à mudança, a migration cria uma coleta retroativa com estado `success` para cada registro e utiliza `metrics.recorded_at` como referência temporal disponível durante a conversão.

A coluna temporária `legacy_metrics_id` é utilizada apenas para relacionar os registros durante a migration e é removida antes do `COMMIT`.

#### Escopo dos cálculos ambientais

A TEC02 não persiste resultados calculados de energia ou CO₂e na entidade `collection`.

A estratégia de cálculo e a associação temporal com os registros de `carbon_intensity` permanecem responsabilidade da implementação do cálculo ambiental, evitando antecipar regras da US07.

#### Validações realizadas

Foram executadas as seguintes verificações:

- criação completa do `schema.sql` em PostgreSQL vazio;
- criação da tabela `collection`;
- validação das PKs e FKs;
- validação das restrições `CHECK`;
- validação da restrição `UNIQUE` entre coleta e métricas;
- validação do índice `(service_id_service, attempted_at DESC)`;
- inserção de coleta `success`;
- inserção de coleta `no_metrics`;
- inserção de coleta `unavailable`;
- rejeição de estado inválido;
- rejeição da combinação `success` com `failure_reason`;
- aplicação da migration no banco existente;
- validação da persistência após reinicialização do PostgreSQL;
- inicialização do backend após a mudança estrutural;
- validação da sincronização existente de serviços;
- execução da suíte automatizada do backend com **20 testes aprovados em 20**.

#### Resultado atual

A estrutura de persistência necessária para as próximas tarefas da Sprint está disponível:

```text
service
   ↓
collection
   ↓
metrics
```

A integração real com `/metrics/{id_servico}` e a criação automática desses registros serão implementadas pelas tarefas seguintes da Sprint.

A TEC02 permanece **em andamento** até a conclusão do fluxo de PR, revisão e integração em `develop`.

### US04 — Coleta periódica e variação das métricas

A coleta passou a ser executada automaticamente, sem depender da rota manual criada na US03.

#### Decisões

- **Job dedicado:** `backend/src/jobs/metrics-collection.job.ts` executa um ciclo assim que o backend inicia e reagenda o próximo com `setTimeout` **somente após o término do ciclo atual**. Isso impede que o mesmo job tenha duas execuções simultâneas.
- **Guarda de execução compartilhada:** `MetricaService.collectAllMetrics()` controla um estado de coleta em andamento no módulo. O job periódico e o `POST /api/metricas/collect` usam a mesma guarda; uma chamada concorrente retorna `skipped: true` sem consultar a API externa novamente.
- **Intervalos independentes:** `COLLECTION_INTERVAL_MS` (padrão `60000`) define a coleta de métricas e `SERVICE_SYNC_INTERVAL_MS` (padrão `300000`) define a sincronização do catálogo. Antes, a única variável existente controlava apenas o catálogo. Ambos são validados como inteiros positivos na inicialização.
- **Variação sem sobrescrita:** cada ciclo chama `/metrics/{id_servico}` novamente e insere uma nova linha em `collection` (e em `metrics` quando o estado é `success`). Não há `UPDATE` sobre amostras anteriores, então valores diferentes entre requisições ficam registrados como coletas sucessivas.
- **Falhas isoladas:** cada serviço é processado em seu próprio `try/catch`. Falha de consulta externa, `no_metrics`, `error` ou erro de persistência contam no resumo e a coleta continua para os demais serviços. O job também captura falhas do ciclo inteiro e mantém o agendamento.
- **Retorno da coleta:** o endpoint e o job recebem um resumo com `skipped`, `services`, `success`, `noMetrics` e `errors`.

#### Evidências

- coleta manual e automática usando o mesmo caso de uso;
- configuração do intervalo em `env.ts`, `.env.example` e `compose.yaml`;
- testes de coletas sucessivas com valores diferentes, sem sobrescrever a amostra anterior;
- teste de falha de persistência sem interromper os demais serviços;
- teste de guarda contra execução concorrente;
- teste do job executando imediatamente, repetindo no intervalo e continuando após falha;
- suíte do backend com **32 testes aprovados em 32** (6 novos) e `npm run typecheck` sem erros.

A US04 permanece **em andamento** até a conclusão do fluxo de PR, revisão e integração em `develop`.