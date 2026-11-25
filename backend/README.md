# ⚙️ GreenER — Backend

API do GreenER, responsável por integrar os serviços auxiliares da Unilaunch, coletar e persistir métricas, calcular estimativas ambientais, fornecer histórico e indicadores ao frontend e aplicar autenticação/autorização.

[← Voltar para o README principal](../README.md)

> **Referência revisada após o fechamento da Sprint 3 — 25/11/2026.**
> O backend concentra as regras de negócio, cálculos ambientais, jobs periódicos, persistência, projeções, segurança e contratos HTTP do GreenER.

---

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Organização do Código](#-organização-do-código)
- [Fluxo Principal](#-fluxo-principal)
- [Jobs Automáticos](#-jobs-automáticos)
- [Integrações Externas](#-integrações-externas)
- [PostgreSQL](#-postgresql)
- [Autenticação e Autorização](#-autenticação-e-autorização)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Executar](#️-como-executar)
- [Testes e Validação](#-testes-e-validação)
- [Documentação Relacionada](#-documentação-relacionada)

---

## 🛠 Tecnologias

- **Node.js 24+**
- **Express 5**
- **TypeScript**
- **tsx** para execução em desenvolvimento
- **PostgreSQL 17**
- biblioteca **pg**
- **JWT** para autenticação
- SQL explícito e parametrizado, sem ORM
- **Vitest** para testes automatizados
- **Supertest** para testes HTTP
- **Docker** e Docker Compose
- **PDFKit** para geração de relatórios PDF no backend

---

## 📂 Organização do Código

O backend utiliza organização modular com separação entre rota HTTP, regras de negócio e persistência.

```text
backend/
├── Dockerfile
├── package.json
├── README.md
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── app.ts
    ├── server.ts
    ├── config/
    │   └── env.ts
    ├── db/
    │   └── connection.ts
    ├── integrations/
    │   ├── carbon-api.ts
    │   └── metrics-api.ts
    ├── jobs/
    │   ├── carbon-intensity-sync.job.ts
    │   ├── metrics-collection.job.ts
    │   └── service-sync.job.ts
    ├── modules/
    │   ├── auth/
    │   ├── chat/
    │   ├── coletas/
    │   ├── dashboard/
    │   ├── indicadores/
    │   ├── intensidades/
    │   ├── localidades/
    │   ├── projecoes/
    │   └── servicos/
    │   ├── relatorios/
    └── shared/
        ├── errors/
        ├── middlewares/
        └── utils/
```

### Camadas

| Camada | Responsabilidade |
| --- | --- |
| `routes` | Define endpoint, método HTTP e middlewares |
| `controllers` | Trata entrada e saída HTTP |
| `services` | Regras de negócio e orquestração |
| `repositories` | SQL explícito e parametrizado |
| `integrations` | Comunicação com APIs externas |
| `jobs` | Processos recorrentes automáticos |
| `middlewares` | JWT, autorização administrativa e erros |
| `config` | Leitura e validação do ambiente |

Fluxo padrão:

```text
route
  ↓
controller
  ↓
service
  ↓
repository
  ↓
PostgreSQL
```

Integrações externas são chamadas pelo domínio quando necessário, sem colocar detalhes HTTP externo diretamente nos controllers.

---

## 🔄 Fluxo Principal

O ciclo base do GreenER é:

```text
Metrics API /services
        ↓
sincronização dos serviços
        ↓
Metrics API /metrics/{id}
        ↓
coleta periódica
        ↓
PostgreSQL
service → collection → metrics
        ↓
Carbon Intensity API
        ↓
snapshots regionais persistidos
        ↓
cálculo de energia + CO₂e
        ↓
indicadores / dashboard / histórico
        ↓
relatórios PDF
        ↓
Monitoramento + Análises
        ↓
dados consolidados para Karma e Projeções
```

O backend não depende de dados simulados no frontend para os indicadores principais.

Na Sprint 3, o backend passou a oferecer dois novos fluxos de alto nível:

- **Projeções e redistribuição:** consultas regionais e modelos de alocação de serviços a partir dos dados consolidados;
- **Assistente Karma:** respostas técnicas e operacionais baseadas no estado do projeto, no contexto ambiental e em indicadores persistidos.

Esses recursos são expostos por rotas autenticadas e respeitam as mesmas regras de validação, erros e persistência usadas pelos módulos anteriores.

---

## ⏱ Jobs Automáticos

Ao iniciar o servidor, o GreenER dispara três ciclos independentes:

```text
startServiceSync()
startMetricsCollection()
startCarbonIntensitySync()
```

Eles são iniciados depois que o Express começa a escutar a porta configurada.

### 1. Sincronização de serviços

Responsável por:

```text
GET {METRICS_API_URL}/services
```

O job:

- descobre os serviços atuais;
- cria novos registros;
- atualiza serviços existentes;
- atualiza `last_seen_at`;
- marca como `removed` serviços que desapareceram do catálogo;
- preserva registros históricos.

Variável:

```text
SERVICE_SYNC_INTERVAL_MS
```

### 2. Coleta de métricas

Responsável por consultar:

```text
GET {METRICS_API_URL}/metrics/{id_servico}
```

para cada serviço ativo.

Cada tentativa gera um registro em:

```text
collection
```

Quando a amostra é válida, também gera:

```text
metrics
```

Estados possíveis:

```text
success
no_metrics
unavailable
error
```

Uma falha individual não interrompe os demais serviços.

Variável:

```text
COLLECTION_INTERVAL_MS
```

### 3. Sincronização de intensidade de carbono

Atualiza periodicamente os snapshots regionais usados pelos cálculos ambientais.

Variável:

```text
CARBON_INTENSITY_SYNC_INTERVAL_MS
```

### Reagendamento

Os jobs são estruturados para reagendar o próximo ciclo após o processamento anterior, evitando empilhamento desnecessário de execuções.

Falhas de um ciclo são tratadas e não impedem o próximo agendamento.

---

## 🔌 Integrações Externas

### Metrics Aggregator API

Cliente:

```text
src/integrations/metrics-api.ts
```

Uso:

```text
GET /services
GET /metrics/{id}
```

Responsabilidades:

- descoberta de serviços;
- coleta de métricas;
- timeout;
- validação/tratamento de resposta;
- isolamento de falhas externas.

### Carbon Intensity API

Cliente:

```text
src/integrations/carbon-api.ts
```

Responsável por consultar os fatores regionais usados no cálculo de CO₂e.

Os snapshots obtidos são persistidos antes de serem utilizados pelas consultas históricas e consolidadas.

### Falhas externas

As chamadas externas usam timeout configurável.

Exemplos de falha:

- timeout;
- conexão recusada;
- status HTTP inválido;
- resposta inesperada.

O backend transforma essas situações em erros controlados ou estados de coleta apropriados, sem derrubar todo o ciclo de monitoramento.

---

## 🚀 Arquitetura de Performance e Resiliência

### Jobs em background

Os ciclos de sincronização e coleta são iniciados após o servidor Express começar a ouvir. Cada job executa de forma independente e reagenda o próximo ciclo somente depois da execução anterior, evitando concorrência acumulada.

Uma falha em um serviço ou integração é isolada no respectivo ciclo. Além disso, os jobs não bloqueiam a inicialização da API HTTP.

### Cache do assistente

O módulo `chat` mantém caches em memória para reduzir consultas repetidas:

- respostas por contexto e pergunta;
- classificações de intenção;
- indicadores e histórico usados pelas respostas;
- requisições concorrentes equivalentes (`single-flight`), evitando chamadas duplicadas ao Ollama.

Os caches usam TTL por tipo de conteúdo e limite máximo de entradas com descarte das entradas mais antigas. Dados ambientais possuem TTL curto; conhecimento geral pode permanecer armazenado por mais tempo. Respostas degradadas têm TTL próprio.

### Assistente Karma com fallback

O assistente utiliza Ollama localmente por HTTP. Antes das operações em segundo plano, o servidor faz aquecimento (`warmup`) do modelo.

O cliente aplica:

- timeout configurável;
- controle do tamanho da janela de contexto;
- possibilidade de desativar a geração por LLM;
- log de latência e resultado (`success`, `timeout` ou `request_error`).

Se o Ollama estiver indisponível, exceder o timeout ou retornar uma resposta inválida, o módulo não derruba a requisição: ele continua no modo determinístico baseado em regras e conhecimento interno do GreenER.

### Cache e fallback de dados

As respostas do chat podem reutilizar indicadores já calculados e conhecimento versionado no backend. Consultas repetidas evitam repetir cálculos e chamadas ao modelo. Na ausência de dados suficientes, o assistente mantém a resposta transparente sobre lacunas como métricas ausentes, intervalo indisponível ou intensidade de carbono não elegível.

---

Após o fechamento da Sprint 3, a **TEC40** adicionou um terceiro fluxo de alto nível:

**Relatórios ambientais:** geração sob demanda de documentos PDF individuais e comparativos, reutilizando os indicadores e históricos já calculados pelo backend. O módulo de relatórios não implementa fórmulas ambientais próprias e não persiste os arquivos gerados.

## 🗄 PostgreSQL

A conexão fica em:

```text
src/db/connection.ts
```

Repositories utilizam o pool PostgreSQL para executar SQL explícito e parametrizado.

Modelo histórico principal:

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

Também são persistidos:

- usuários;
- localizações;
- intensidades de carbono;
- favoritos.

Os valores de energia e CO₂e são calculados a partir dos dados persistidos quando indicadores, dashboard ou histórico são consultados.

Schema, migrations e DML estão documentados em:

[`database/README.md`](../database/README.md)

---

## 🔐 Autenticação e Autorização

O backend aplica autenticação JWT às rotas protegidas.

Fluxo:

```text
Authorization: Bearer <token>
        ↓
auth middleware
        ↓
verifyToken()
        ↓
válido?
 ├─ não → 401 Unauthorized
 └─ sim → controller
```

### Rotas autenticadas

Entre as rotas protegidas estão:

```text
GET /auth/me
POST /api/servicos/sync
GET /api/intensidades/*
GET /api/indicadores
GET /api/indicadores/:serviceId/historico
GET /api/dashboard
POST /api/metricas/collect
POST /api/chat
GET /api/projecoes/regioes
POST /api/projecoes/localizacao
POST /api/projecoes/redistribuicao
GET /api/relatorios/analise-individual/:serviceId
GET /api/relatorios/comparacao
```

O `authMiddleware` exige o cabeçalho `Authorization: Bearer <token>`, verifica a assinatura e a expiração do JWT e adiciona o usuário autenticado ao contexto da requisição. O middleware não aceita outro esquema de autorização.

### Permissão administrativa

A coleta manual:

```text
POST /api/metricas/collect
```

exige:

```text
JWT válido
+
usuário administrador
```

Comportamento validado:

```text
sem token        → 401
usuário comum    → 403
administrador    → 200
```

A autorização é confirmada no backend, não apenas no estado da interface.

Para operações administrativas, o `adminMiddleware` executa após o JWT e consulta o campo `admin` do usuário no banco a cada requisição. Assim, o papel administrativo não é inferido apenas pelo conteúdo do token:

- JWT inválido ou ausente → `401 Unauthorized`;
- usuário válido sem perfil administrador → `403 Forbidden`;
- usuário administrador → operação autorizada.

---

## 🌱 Cálculos Ambientais

O backend calcula energia e CO₂e usando:

```text
métricas persistidas
+
collection_interval_seconds
+
modelo de potência
+
intensidade regional elegível
```

O modelo v1 utiliza:

```text
CPU máxima:       100 W
Memória:          0.375 W/GB
Disco:            0.01 W/GB
Rede:             0.02 W/GB
```

O cálculo considera a duração real da amostra em:

```text
collection_interval_seconds
```

e não utiliza `COLLECTION_INTERVAL_MS` como substituto.

As fórmulas completas e um exemplo real estão em:

[`docs/calculos.md`](../docs/calculos.md)

---

## 🔐 Variáveis de Ambiente

As variáveis são carregadas do `.env` da raiz.

Use:

[`../.env.example`](../.env.example)

como referência.

### Servidor e banco

| Variável | Obrigatória | Fallback do código | Configuração do `.env.example` |
| --- | --- | --- | --- |
| `NODE_ENV` | Não | `development` | `development` |
| `PORT` | Não | `3000` | `3000` |
| `POSTGRES_HOST` | Sim para conexão | — | `postgres` |
| `POSTGRES_PORT` | Conforme configuração de conexão | `5432` | `5432` |
| `POSTGRES_DB` | Sim | — | `greener` |
| `POSTGRES_USER` | Sim | — | `greener` |
| `POSTGRES_PASSWORD` | Sim | — | valor a trocar |
| `CORS_ORIGIN` | Não | `http://localhost:5173` | `http://localhost:5173` |

### Autenticação

| Variável | Descrição |
| --- | --- |
| `JWT_SECRET` | Segredo usado para assinar/verificar JWT. Deve ser alterado no ambiente real. |
| `JWT_EXPIRES_IN` | Validade do token. Aceita segundos ou durações (`15m`, `1h`, `7d`). Fallback do código: `3600` segundos; `.env.example`: `7d`. |

### APIs externas

| Variável | Obrigatória | Valor no `.env.example` |
| --- | --- | --- |
| `METRICS_API_URL` | Sim | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | Sim | `https://carbon.unilaunch.org` |

### Assistente Ollama

| Variável | Obrigatória | Fallback do código | `.env.example` | Uso |
| --- | --- | --- | --- | --- |
| `OLLAMA_URL` | Não | `http://localhost:11434` | `http://localhost:11434` | Endereço do Ollama |
| `OLLAMA_MODEL` | Não | `qwen2.5:3b` | `qwen2.5:3b` | Modelo usado pelo Karma |
| `OLLAMA_TIMEOUT_MS` | Não | `60000` | `60000` | Timeout por operação |
| `OLLAMA_NUM_CTX` | Não | `4096` | `4096` | Janela total de contexto |
| `OLLAMA_ENABLED` | Não | `true` | `true` | Habilita/desabilita geração por LLM |

Quando executado pelo Docker Compose, o backend deve usar o nome do serviço interno, por exemplo `http://ollama:11434`, em vez de `localhost`.

### Intervalos e timeout

Aqui é importante diferenciar **fallback do código** de **valor configurado para a entrega**:

| Variável | Fallback do código | `.env.example` da entrega | Uso |
| --- | ---: | ---: | --- |
| `EXTERNAL_API_TIMEOUT_MS` | `5000` | `10000` | Timeout das APIs externas |
| `COLLECTION_INTERVAL_MS` | `60000` | `60000` | Coleta de métricas |
| `SERVICE_SYNC_INTERVAL_MS` | `300000` | `60000` | Sincronização do catálogo |
| `CARBON_INTENSITY_SYNC_INTERVAL_MS` | `300000` | `300000` | Atualização dos snapshots de carbono |
| `CARBON_INTENSITY_MAX_AGE_MS` | `900000` | `900000` | Idade máxima do snapshot ambiental elegível |

Portanto, no ambiente padrão do repositório usado na entrega:

```text
coleta de métricas       = 60 s
sincronização de serviço = 60 s
intensidade de carbono   = 5 min
timeout externo          = 10 s
```

O backend valida os intervalos como inteiros positivos para evitar ciclos apertados de requisição.

`VITE_API_URL` e `VITE_MAPTILER_API_KEY` pertencem ao frontend e estão documentadas em:

[`frontend/README.md`](../frontend/README.md)

> O arquivo `.env` não deve ser commitado com segredos reais.

---

## ▶️ Como Executar

### Com Docker — recomendado

Na raiz do projeto:

```bash
docker compose up --build
```

Ou em segundo plano:

```bash
docker compose up -d
```

Backend:

```text
http://localhost:3000
```

Healthcheck:

```text
http://localhost:3000/health
```

PostgreSQL dentro da rede Docker:

```text
postgres:5432
```

### Localmente

Requisitos:

- Node.js 24 ou superior;
- npm;
- PostgreSQL disponível;
- schema/migrations aplicados;
- variáveis obrigatórias configuradas.

```bash
cd backend
npm install
npm run dev
```

---

## 🧰 Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Executa `src/server.ts` com `tsx watch` |
| `npm run typecheck` | Executa `tsc --noEmit` |
| `npm run build` | Compila o backend para `dist/` |
| `npm start` | Executa `dist/server.js` |
| `npm test` | Executa a suíte Vitest uma vez |
| `npm run test:watch` | Executa Vitest em modo watch |

O `tsconfig.json` exclui os arquivos `*.test.ts` do build de produção, evitando que testes sejam emitidos para `dist/`.

---

## 🧪 Testes e Validação

### Suíte comum

```bash
cd backend
npm test
```

Resultado do fechamento da Sprint 3:

```text
Suíte completa do backend: 300 testes aprovados
Testes ignorados:            7
```

Os testes ignorados pertencem a cenários específicos da integração PostgreSQL ou à configuração de execução exclusiva da suíte. Eles são executados separadamente no ambiente `compose.test.yaml`.

### Integração PostgreSQL

Na raiz do repositório:

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
```

Resultado validado:

```text
1 arquivo de integração aprovado
7/7 testes aprovados
exit code 0
```

Depois:

```bash
docker compose -f compose.test.yaml down -v
```

### Typecheck

```bash
cd backend
npm run typecheck
```

Resultado:

```text
sem erros
```

### Validação manual

Também foram confirmados:

- `401` sem JWT;
- `200` com JWT válido;
- `403` para coleta manual com usuário comum;
- `200` para coleta manual com administrador;
- coleta com falha parcial sem interrupção do ciclo;
- persistência após restart;
- coleta automática após reinicialização;
- estados `no_metrics` e `unavailable`;
- consistência de indicadores e dashboard;
- histórico ambiental por serviço;
- respostas do chat com JWT válido;
- cache e fallback do assistente diante de indisponibilidade do Ollama;
- consulta de regiões e projeções autenticadas;
- redistribuição de serviços com validação de regras regionais;

As evidências completas estão em:

[`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md)

---

## 🌐 Principais Recursos HTTP

A documentação completa está em:

[`docs/api.md`](../docs/api.md)

Resumo:

| Método | Endpoint | Uso |
| --- | --- | --- |
| `GET` | `/health` | Saúde básica da API |
| `POST` | `/auth/register` | Cadastro |
| `POST` | `/auth/login` | Login |
| `GET` | `/auth/me` | Validar sessão JWT |
| `GET` | `/api/servicos/discover` | Descobrir serviços na API externa |
| `POST` | `/api/servicos/sync` | Sincronização manual autenticada |
| `GET` | `/api/servicos` | Listar serviços persistidos |
| `POST` | `/api/metricas/collect` | Coleta manual administrativa |
| `GET` | `/api/metricas/historico/:serviceId` | Histórico bruto autenticado |
| `GET` | `/api/intensidades/discover` | Descobrir intensidades na API externa |
| `POST` | `/api/intensidades/sync` | Sincronizar intensidades no banco |
| `GET` | `/api/intensidades` | Listar snapshots ambientais |
| `GET` | `/api/indicadores?start=<iso>&end=<iso>` | Indicadores ambientais do período |
| `GET` | `/api/indicadores/:serviceId/historico?start=<iso>&end=<iso>` | Histórico ambiental por serviço |
| `GET` | `/api/dashboard` | Resumo operacional consolidado |
| `POST` | `/api/chat` | Perguntar ao assistente Karma |
| `GET` | `/api/projecoes/regioes` | Consultar regiões disponíveis para projeções |
| `POST` | `/api/projecoes/localizacao` | Projetar alocação por localização |
| `POST` | `/api/projecoes/redistribuicao` | Redistribuir serviços entre regiões |

---

## 📚 Documentação Relacionada

- [`docs/api.md`](../docs/api.md) — endpoints, respostas e autenticação;
- [`docs/arquitetura.md`](../docs/arquitetura.md) — fluxo e responsabilidades;
- [`docs/calculos.md`](../docs/calculos.md) — modelo de energia e CO₂e;
- [`database/README.md`](../database/README.md) — schema, migrations e DML;
- [`frontend/README.md`](../frontend/README.md) — frontend;
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — registro da Sprint 2;
- [`docs/sprints/sprint-3.md`](../docs/sprints/sprint-3.md) — registro da Sprint 3;
- [`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md) — validação técnica.
