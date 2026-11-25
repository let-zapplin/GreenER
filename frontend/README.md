# 🖥️ GreenER — Frontend

Aplicação web do GreenER, responsável por apresentar e organizar os serviços monitorados, seus estados, localização e indicadores ambientais, além de oferecer análises históricas, ranking, comparação, projeções regionais, Workspaces personalizáveis e a interface conversacional da Karma.

← [Voltar para o README principal](../README.md)

> **Referência revisada após o fechamento da Sprint 3 — 25/11/2026.**
> O frontend consome dados reais fornecidos pelo backend. Cálculos de energia e CO₂e permanecem centralizados na API GreenER. Evoluções pós-Sprint 3 são registradas separadamente, sem alterar retroativamente o escopo da entrega final.

---

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Organização do código](#-organização-do-código)
- [Telas](#-telas)
- [Monitoramento](#monitoramento)
- [Workspace](#-workspace)
- [Análises](#análises)
- [Projeções regionais](#-projeções-regionais)
- [Karma — Assistente experimental](#-karma--assistente-experimental)
- [Autenticação](#-autenticação)
- [Atualização automática](#-atualização-automática)
- [Configuração](#-configuração)
- [Como executar](#️-como-executar)
- [Testes e validação](#-testes-e-validação)
- [Documentação relacionada](#-documentação-relacionada)

---

## 🛠 Tecnologias

| Tecnologia | Uso no frontend |
| --- | --- |
| **React 19** | Construção da interface e componentes |
| **TypeScript** | Tipagem estática |
| **Vite** | Servidor de desenvolvimento e build |
| **React Router** | Navegação e rotas da aplicação |
| **Recharts** | Gráficos de histórico ambiental |
| **MapLibre GL** | Renderização do mapa de serviços |
| **OpenFreeMap** | Estilo/cartografia utilizada pelo mapa operacional |
| **MapTiler SDK** | Recursos cartográficos utilizados em partes da experiência visual |
| **Phosphor Icons** | Ícones da interface |
| **Docker** | Execução containerizada do frontend |

As regras de negócio e os cálculos ambientais não são duplicados no frontend. A interface consome as respostas estruturadas da API GreenER.

---

## 📂 Organização do código

O código principal fica em `src/`, separado por responsabilidade:

| Pasta | Responsabilidade |
| --- | --- |
| `pages/` | Telas e composição dos fluxos principais |
| `components/` | Componentes reutilizáveis |
| `hooks/` | Estado e ciclos de consulta da interface |
| `lib/` | Regras puras de interface, incluindo o modelo do painel de Monitoramento |
| `services/` | Comunicação HTTP com o backend |
| `contexts/` | Contextos compartilhados |
| `providers/` | Providers globais da aplicação |
| `types/` | Tipos TypeScript |
| `styles/` | Estilos globais |

Estrutura geral:

```text
frontend/
├── assets/
├── tests/
├── Dockerfile
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── components/
    ├── contexts/
    ├── hooks/
    ├── lib/
    ├── pages/
    ├── providers/
    ├── services/
    ├── styles/
    ├── types/
    ├── App.tsx
    └── main.tsx
```

O fluxo mais comum de dados é:

```text
page
  ↓
component
  ↓
hook / service
  ↓
API GreenER
```

Os hooks concentram estado de carregamento, erro, atualização automática e preservação dos últimos dados válidos.

---

## 🧭 Telas

| Tela | Descrição | Situação no fechamento da Sprint 3 |
| --- | --- | --- |
| **Landing / Login** | Apresentação inicial e autenticação | ✅ Implementada |
| **Home / Karma** | Página inicial autenticada e ponto de entrada para o assistente Karma | ✅ Implementada como protótipo experimental |
| **Sobre / Funcionamento** | Contexto do projeto e funcionamento da solução | ✅ Implementadas |
| **Monitoramento / Workspace** | Visão operacional fixa e acesso às páginas personalizadas do usuário | ✅ Implementada |
| **Análises** | Exploração histórica, ranking, comparação e projeções ambientais | ✅ Implementada |
| **Mapa de serviços** | Visualização geográfica complementar no Monitoramento | ✅ Integrada ao Monitoramento |

> O Monitoramento e a página de Análises possuem responsabilidades diferentes: o primeiro apresenta o **estado atual do ambiente** em um painel de blocos e serve como base do Workspace; Análises continua **separada** e concentra a **exploração temporal e projeções**, que exigem espaço dedicado pelo volume de informações e pela interatividade. Os blocos de comparação, histórico e projeção também podem ser reutilizados nas páginas personalizadas do Workspace.

---

## Monitoramento

A página de Monitoramento apresenta a situação operacional do ambiente monitorado.

Esse conteúdo é organizado como um painel de blocos; o arranjo, as páginas e a edição estão descritos em [Workspace](#-workspace).

Ela utiliza principalmente:

```text
GET /api/servicos
GET /api/dashboard
```

e cruza as informações necessárias para apresentar:

- serviços monitorados;
- localização;
- estado do catálogo;
- estado da última coleta;
- energia estimada;
- emissão estimada de CO₂e;
- contadores do ambiente;
- horário da última atualização;
- visualização geográfica com clusters GeoJSON do MapLibre;
- alternância entre mapa e consumo energético estimado por região nas últimas 24 horas.

O mapa atualiza sua fonte GeoJSON quando os serviços são atualizados, colore os
pontos conforme o estado operacional e mantém a seleção sincronizada com o HUD.
Serviços sem coordenadas continuam disponíveis na lista e no HUD, mas não são
incluídos no mapa nem no agrupamento geográfico.

### Estados apresentados

O frontend diferencia estados provenientes do backend:

- `active`;
- `removed`;
- `no_metrics`;
- `unavailable`;
- `error`;

e destaques temporários derivados pela própria interface:

- `new`;
- `returned`.

`no_metrics` não é tratado como indisponibilidade: o serviço continua presente no catálogo, mas a última tentativa não forneceu métricas utilizáveis.

### Seleção de serviços

Lista, mapa e detalhes compartilham a seleção do serviço.

Ao selecionar um serviço:

- o card correspondente é destacado;
- o mapa pode focar sua localização;
- o painel de detalhes apresenta suas informações;
- ações relacionadas podem direcionar o usuário para a página de Análises.

Quando vários serviços compartilham coordenadas, o mapa pode agrupá-los e permitir a escolha individual.

### Visão geográfica

A visualização geográfica utiliza **MapLibre GL** com estilo do **OpenFreeMap**.

O mapa recebe latitude e longitude existentes no catálogo de serviços. Serviços sem coordenadas continuam acessíveis pela lista e pelas demais visualizações.

Esse comportamento mantém o mapa como recurso complementar, sem transformar a localização geográfica em requisito para visualizar um serviço.

A US13 foi antecipada da Sprint 3 para a Sprint 2 e consolidada durante a Sprint 3. O mapa está integrado ao Monitoramento e utiliza MapLibre GL com OpenFreeMap; também permite selecionar serviços agrupados e mantém os serviços sem coordenadas acessíveis nas demais visualizações.

---

## 🧩 Workspace

O workspace é o painel de blocos que compõe a página `/monitoramento`. Em vez de uma tela única e fixa, o usuário vê **páginas** organizadas em uma **grade**, cada uma preenchida por **blocos** (widgets) que podem ser movidos, redimensionados, minimizados e removidos.

| Arquivo | Responsabilidade |
| --- | --- |
| `src/lib/monitoringBoard.ts` | modelo puro do painel: catálogo de blocos, grade, layouts, colisão, persistência |
| `src/hooks/useMonitoringBoard.ts` | estado do painel e gravação a cada alteração |
| `src/components/MonitoringBoard.tsx` / `.css` | barra de páginas, paleta de blocos, arrastar e redimensionar |
| `src/pages/Monitoring.tsx` | decide quais dados alimentam cada bloco |
| `src/components/AnalysisBoardWidgets.tsx` | cartões de ranking, histórico, comparação e projeção reaproveitados do Análises |

As regras do painel não dependem de DOM nem de biblioteca de grid de terceiros: toda a geometria é calculada em `monitoringBoard.ts` e testada em `frontend/tests/`.

### Páginas

| Página | Comportamento |
| --- | --- |
| **Monitoramento** (fixa) | `id` `page-monitoramento`, sempre a primeira. O arranjo é do produto, não do usuário: a barra mostra o selo **Página fixa** e desativa edição, renomeação e exclusão. |
| **Página criada pelo usuário** | editável por completo. `newPage()` gera `Página N`, começando em `quantidade + 1` e pulando nomes já em uso, e a página nasce vazia. |

A página fixa usa o arranjo oficial abaixo, com 12 colunas:

| Bloco | Posição | Tamanho |
| --- | --- | --- |
| Mapa de serviços | `(0, 0)` | `8 × 5` |
| Energia por região | `(8, 0)` | `4 × 5` |
| Serviços monitorados | `(0, 5)` | `12 × 2` |
| Resumo ambiental | `(0, 7)` | `12 × 4` |

Nas páginas fixas a grade recebe `.is-fixed.is-monitoramento` e cada bloco `.is-flow`: o arranjo é resolvido por CSS, sem posição absoluta, o que mantém o mapa e o HUD sincronizados com o restante da tela. Nas páginas editáveis cada bloco recebe posição absoluta a partir da célula da grade.

### Blocos disponíveis

O catálogo em `MONITORING_WIDGETS` define o tamanho inicial e o mínimo aceito de cada bloco:

| Tipo | Categoria | Rótulo | Padrão | Mínimo |
| --- | --- | --- | --- | --- |
| `map` | visualização | Mapa de serviços | `8 × 5` | `4 × 3` |
| `region` | visualização | Energia por região | `4 × 5` | `3 × 3` |
| `services` | indicador | Serviços monitorados | `12 × 2` | `4 × 2` |
| `summary` | indicador | Resumo ambiental | `4 × 3` | `3 × 2` |
| `ranking` | indicador | Ranking de impacto | `4 × 6` | `3 × 4` |
| `history` | visualização | Histórico do serviço | `6 × 5` | `4 × 3` |
| `comparison` | visualização | Comparação de serviços | `6 × 5` | `4 × 3` |
| `projection` | visualização | Projeção de localização | `6 × 5` | `4 × 3` |

Os blocos `ranking`, `history`, `comparison` e `projection` são os conteúdos da página de Análises reaproveitados como cartões (`AnalysisBoardWidgets`); a página `/analises` continua existindo separadamente, com espaço dedicado ao volume de informação.

### Grade e largura da janela

```text
GRID_COLS   = 12 colunas
GRID_GAP    = 12 px entre blocos
MIN_CELL_PX = 56 px mínimos por célula
```

`columnsFor(largura)` escolhe a malha a partir do espaçamento disponível:

```text
célula ≥ 56 px com 12 colunas → 12
célula ≥ 56 px com 6 colunas  → 6
caso contrário                → 3
```

Em 6 ou 3 colunas o bloco pode ter um **arranjo próprio**, guardado em `layouts`. Reorganizar uma janela estreita não altera o layout da janela larga; enquanto uma largura não tiver arranjo próprio, ela mostra o de 12 colunas refluído (`reflow`). A barra de edição sinaliza isso com o selo **Arranjo da janela estreita**.

`fitRect` limita o bloco ao tamanho mínimo e à largura da grade, `overlaps` detecta colisões, `placeWidget` resolve o destino do arrasto e `freeSpot` encontra a primeira vaga livre ao adicionar um bloco. Durante a edição o painel reserva `EDIT_SPARE_ROWS` (2) linhas extras ao final da grade para facilitar o arrasto.

### Edição

- **Personalizar layout** entra no modo de edição; **Esc** conclui e solta qualquer arrasto em andamento.
- Um bloco pode ser **arrastado da paleta** para o painel ou adicionado com um clique no item da paleta.
- Mover é feito pela barra do bloco; redimensionar, por oito alças (`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`), com as bordas opostas paradas.
- **Teclado**, com a barra do bloco em foco: setas movem uma célula por vez; `Shift` + setas redimensionam pela alça inferior direita.
- **Minimizar** / **Expandir**, na barra do bloco: minimizado (`collapsed`) sobra só a barra, e a altura anterior fica guardada em `expandedH` para ser devolvida ao expandir.
- **Restaurar página** volta ao arranjo padrão e **Excluir página** remove a página editável; ambas exigem um segundo clique de confirmação. **Renomear** aceita `Enter` para confirmar e `Esc` para cancelar.

### Persistência

O painel inteiro é salvo no navegador sob a chave:

```text
greener.monitoring.board.v1
```

- A gravação acontece em `useEffect` a cada mudança de estado, sem botão de salvar.
- Na leitura, `parseBoard` descarta blocos com tipo desconhecido ou geometria inválida em vez de quebrar a tela, e `normalizeBoard` recoloca a página fixa na frente com o arranjo oficial — mesmo que uma versão adulterada dela tenha sido gravada.
- Páginas fixas que saíram do produto são descartadas na leitura (`RETIRED_FIXED_PAGES`, hoje com `page-analise`), e não reaparecem como páginas do usuário.
- `localStorage` indisponível ou corrompido não derruba a página: o painel cai no arranjo padrão e vale apenas para a sessão atual.

### Rolagem e legibilidade

- Um bloco só rola o próprio conteúdo **depois de clicado ou focado** (`.is-scroll-active`). Antes disso, a roda do mouse continua rolando a página, sem captura de `wheel` em JavaScript.
- O piso tipográfico da tela é **12 px**; ajustes de fonte de eixo de gráfico ficam nos componentes `.tsx`, não apenas no CSS.
- O resumo ambiental é renderizado uma única vez, pelo bloco `summary` — o mapa não carrega mais uma cópia acoplada do dock.

---

## Análises

A página de Análises centraliza a exploração temporal, comparativa e projetiva dos dados ambientais do GreenER.

Ela utiliza principalmente:

```text
GET /api/indicadores
GET /api/indicadores/:serviceId/historico
GET /api/relatorios/analise-individual/:serviceId
GET /api/relatorios/comparacao
GET /api/projecoes/regioes
POST /api/projecoes/localizacao
POST /api/projecoes/redistribuicao
```

A interface está organizada em três modos principais:

### Explorar

Permite investigar um serviço e o comportamento geral do ambiente no período selecionado.

Principais recursos:

- seleção de serviço;
- filtros de `1h`, `6h`, `24h` e `7d`;
- gráfico temporal de energia estimada;
- tooltip com valores da amostra;
- tratamento de lacunas;
- estados de carregamento e erro;
- estado de ausência de histórico;
- zoom por seleção de intervalo;
- restauração da janela temporal;
- ranking de impacto por energia ou CO₂e;
- identificação de serviços removidos com dados históricos como **Removido** no ranking;
- sinalização de dados parciais.
- exportação da análise ambiental do serviço selecionado em PDF, respeitando a janela temporal atual.

### Comparar

Permite selecionar múltiplos serviços e analisá-los sob a mesma janela temporal.

Principais recursos:

- seleção de dois a oito serviços;
- comparação usando exatamente o mesmo período;
- troca entre métricas de energia, CO₂e e recursos computacionais suportados;
- visualização da evolução temporal;
- comparação consolidada do período;
- preservação dos históricos válidos quando uma consulta individual falha;
- identificação dos serviços cujo histórico não pôde ser carregado;
- sinalização de comparação parcial sem transformar ausência de dados em zero.
- exportação da comparação em PDF usando os serviços, a métrica e o período atualmente selecionados.

### Projetar

Permite usar os dados observados para construir cenários de apoio à decisão.

O modo possui duas visualizações:

- **Projetar localização** — mantém o consumo energético observado e estima como o CO₂e mudaria em localidades com diferentes intensidades de carbono;
- **Redistribuir serviços** — simula cenários de distribuição dos serviços entre regiões e apresenta alternativas com menor emissão estimada.

As projeções são comparações de cenário. O frontend não executa migração de infraestrutura e não apresenta os valores simulados como medições reais.

O gráfico utiliza **Recharts**.

Amostras sem energia calculável permanecem como lacunas. O frontend não converte ausência de dado em consumo zero.

A seleção também pode ser recebida pela URL:

```text
/analises?serviceId=<id>
```

permitindo abrir Análises já focada em um serviço escolhido no Monitoramento.

---

## 🌍 Projeções regionais

As projeções ambientais fazem parte da página de Análises e foram consolidadas na Sprint 3.

O frontend permite:

- selecionar um serviço monitorado;
- escolher uma ou mais regiões disponíveis;
- visualizar intensidade de carbono e informações regionais retornadas pelo backend;
- comparar o cenário atual com localidades alternativas;
- manter o consumo energético constante entre os cenários;
- visualizar diferenças estimadas de CO₂e;
- consultar o cenário também em mapa;
- simular redistribuição de serviços entre regiões.

Os cálculos das projeções são realizados pelo backend. O frontend apenas envia as escolhas do usuário e apresenta os resultados estruturados da API.

As projeções constituem **apoio à decisão** e não representam uma ação automática sobre a infraestrutura monitorada.

### Exportação de relatórios — TEC40

A partir da TEC40, a página de Análises permite registrar os resultados em documentos PDF.

No modo **Explorar**, o relatório representa o serviço atualmente selecionado e apresenta o resumo ambiental, recursos computacionais, evolução temporal e cobertura dos dados.

No modo **Comparar**, o relatório utiliza de dois a oito serviços selecionados, a métrica atual e o mesmo período da interface. O documento apresenta resumo comparativo, ranking e evolução temporal.

A geração ocorre no backend. O frontend apenas encaminha o contexto selecionado pelo usuário e realiza o download do arquivo retornado.

Falhas parciais na comparação podem resultar em um relatório ainda utilizável quando pelo menos dois serviços permanecem disponíveis. O documento sinaliza essa condição em vez de assumir valores ausentes como zero.

A exportação específica das visualizações de **Projetar** não faz parte da primeira versão da TEC40.

---

## 🦎 Karma — Assistente experimental

A Home autenticada funciona também como ponto de entrada para a **Karma**, protótipo de assistente inteligente desenvolvido na Sprint 3.

A experiência permite realizar perguntas em linguagem natural sobre informações e recursos disponíveis no GreenER.

No frontend, a Karma oferece:

- entrada conversacional pela Home;
- perspectivas iniciais de **Impacto ambiental**, **Serviços** e **Evolução**;
- envio de perguntas ao endpoint autenticado `POST /api/chat`;
- apresentação das respostas retornadas pelo backend;
- continuidade contextual dentro do escopo implementado;
- estados visuais de processamento;
- feedback de indisponibilidade ou falha quando necessário.

A interface utiliza o componente `AssistantChat` e os estados visuais da Home para conduzir a transição entre a apresentação inicial e a conversa.

Os cálculos ambientais e os valores usados nas respostas **não são produzidos pelo frontend nem delegados ao modelo de linguagem**. O frontend apresenta os resultados fornecidos pelas regras e serviços do backend.

A Karma é classificada nesta entrega como **protótipo experimental**. Ela complementa, mas não substitui, Monitoramento, Análises ou as demais visualizações determinísticas do GreenER.

Arquitetura, limitações e roadmap de evolução:

[`docs/assistente-ia.md`](../docs/assistente-ia.md)

---

## 🔐 Autenticação

O frontend possui fluxo de autenticação integrado ao backend.

Principais elementos:

- `AuthProvider` para compartilhar a sessão;
- `useAuth` para consumir o contexto;
- `useAuthForm` para o formulário de login;
- armazenamento/uso do token nas consultas autenticadas;
- proteção das rotas internas no frontend.

Principais rotas autenticadas da interface:

```text
/home
/monitoramento
/analises
```

A proteção do frontend melhora a navegação, mas **não substitui a autorização do backend**.

O backend continua responsável por validar JWT e permissões em cada endpoint protegido.

---

## 🔄 Atualização automática

Monitoramento e dados consolidados são atualizados periodicamente sem exigir `F5`.

Na configuração validada para a entrega final da Sprint 3:

```text
intervalo principal do frontend: 60 segundos
timeout das consultas: 15 segundos
```

O próximo ciclo é agendado após a conclusão da requisição anterior, reduzindo o risco de sobreposição.

Fluxo:

```text
consulta
  ↓
sucesso?
 ├─ sim → atualiza dados + horário da última atualização
 └─ não → preserva últimos dados válidos + informa falha
  ↓
agenda próximo ciclo
```

Esse comportamento permite que uma indisponibilidade temporária do backend não esvazie imediatamente a tela.

A atualização automática permaneceu validada no fechamento da Sprint 3, preservando os últimos dados válidos quando ocorre indisponibilidade temporária do backend.

---

## 🔐 Configuração

O frontend se comunica com o backend por uma URL configurável.

Use o arquivo [`.env.example`](../.env.example) da raiz como referência.

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL pública do backend. Em desenvolvimento local: `http://localhost:3000` |
| `VITE_MAPTILER_API_KEY` | Chave pública opcional para recursos que utilizem MapTiler SDK |

O mapa operacional baseado em MapLibre/OpenFreeMap não deve depender de uma chave secreta no frontend.

> Variáveis `VITE_*` são incorporadas ao bundle do navegador e devem conter apenas valores públicos.

---

## ▶️ Como executar

### Com Docker — recomendado

Na raiz do repositório:

```bash
docker compose up --build
```

Acesse:

```text
http://localhost:5173
```

O frontend utiliza o backend iniciado pelo mesmo Compose.

Para executar em segundo plano:

```bash
docker compose up -d
```

### Localmente

Requisitos:

- Node.js 24 ou superior;
- npm;
- backend disponível para os fluxos que consultam dados reais.

```bash
cd frontend
npm install
npm run dev
```

A aplicação fica disponível em:

```text
http://localhost:5173
```

Principais caminhos:

```text
/               → landing/login
/home           → home autenticada e entrada da Karma
/monitoramento  → painel de blocos (workspace) do estado operacional
/analises       → histórico, ranking, comparação e projeções
```

---

## 🧪 Testes e validação

Comandos disponíveis:

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run typecheck` | Executa `tsc --noEmit` |
| `npm test` | Executa os testes automatizados do frontend |
| `npm run build` | Executa typecheck e gera o build em `dist/` |
| `npm run preview` | Serve localmente o build gerado |

### Evidência do fechamento da Sprint 3
O painel do workspace é coberto por testes sem DOM (`node --test`), que exercitam o modelo puro de `src/lib/monitoringBoard.ts` com um `localStorage` falso:

- `tests/monitoringBoard.test.ts` — grade por largura, `fitRect`, colisão, `reflow`, arrasto, redimensionamento, minimizar e leitura tolerante do armazenamento;
- `tests/workspacePages.test.ts` — páginas fixas, `normalizeBoard`, criação e numeração de página, persistência e descarte das páginas retiradas;
- `tests/workspaceWidgets.test.ts` — catálogo de blocos, rótulos e mínimos, identificação de tipo, geração de `id` e reconhecimento do arranjo padrão.

### Consolidação final da Sprint 3

Na varredura atualizada em 23/11/2026:

- **101 testes aprovados** no frontend;
- `npm run typecheck` concluído sem erros;
- build de produção concluído com sucesso;
- 5094 módulos transformados;
- ranking, comparação, filtros, mapa, projeções, Workspace e responsividade identificados como recursos integrados;
- o build apresentou avisos não bloqueantes de chunks acima de 500 kB, relacionado ao RNF03;
- a correção para falha HTTP parcial na comparação está integrada e preserva os históricos válidos; não foi localizada uma captura manual controlada reproduzindo especificamente esse cenário.

As evidências detalhadas estão em:

[`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md)

[`docs/testes/consolidacao_testes_sprint3.md`](../docs/testes/consolidacao_testes_sprint3.md)

---

## 📚 Documentação relacionada

- [`README.md`](../README.md) — visão geral do GreenER;
- [`backend/README.md`](../backend/README.md) — backend e integrações;
- [`docs/api.md`](../docs/api.md) — endpoints consumidos pelo frontend;
- [`docs/arquitetura.md`](../docs/arquitetura.md) — arquitetura e fluxo de dados;
- [`docs/calculos.md`](../docs/calculos.md) — fórmulas de energia e CO₂e;
- [`docs/assistente-ia.md`](../docs/assistente-ia.md) — arquitetura, limitações e roadmap da Karma;
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — registro da Sprint 2;
- [`docs/sprints/sprint-3.md`](../docs/sprints/sprint-3.md) — registro da Sprint 3.

---

## Observações finais

A implementação principal da Sprint 3 está integrada no frontend, incluindo ranking, comparação, projeções regionais, Workspace adaptativo e a interface experimental da Karma.

Permanecem como oportunidades de evolução não bloqueantes:

- otimização adicional dos chunks de produção acima de 500 kB;
- obtenção de uma captura manual controlada específica para o cenário de falha HTTP parcial na comparação, cuja correção já está registrada;
- continuidade dos refinamentos visuais e de acessibilidade conforme evolução do produto;
- evolução da Karma conforme o roadmap registrado em `docs/assistente-ia.md`.

A interface sinaliza dados parciais, preserva dados válidos diante de falhas isoladas e não transforma lacunas em valores calculados.
