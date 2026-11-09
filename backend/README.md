# ⚙️ GreenER — Backend

API do GreenER, responsável por integrar os serviços auxiliares da Unilaunch, coletar e persistir métricas, calcular estimativas ambientais, fornecer histórico e indicadores ao frontend e aplicar autenticação/autorização.

[← Voltar para o README principal](../README.md)

> **Referência atualizada no fechamento da Sprint 2 — 09/11/2026.**  
> O backend concentra as regras de negócio, cálculos ambientais, jobs periódicos, persistência e contratos HTTP do GreenER.

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
    │   ├── coletas/
    │   ├── dashboard/
    │   ├── indicadores/
    │   ├── intensidades/
    │   ├── localidades/
    │   └── servicos/
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

O ciclo funcional consolidado na Sprint 2 é:

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
Frontend
```

O backend não depende de dados simulados no frontend para os indicadores principais.

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
```

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
| `JWT_EXPIRES_IN` | Validade do token. O modelo atual utiliza `3600` segundos. |

### APIs externas

| Variável | Obrigatória | Valor no `.env.example` |
| --- | --- | --- |
| `METRICS_API_URL` | Sim | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | Sim | `https://carbon.unilaunch.org` |

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

Resultado do fechamento da Sprint 2:

```text
Test Files: 26 passed | 1 skipped
Tests:      156 passed | 7 skipped
```

Os 7 testes ignorados nessa execução pertencem à integração PostgreSQL e são executados separadamente.

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
- histórico ambiental por serviço.

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
| `GET` | `/api/servicos` | Serviços persistidos |
| `POST` | `/api/servicos/sync` | Sincronização manual |
| `POST` | `/api/metricas/collect` | Coleta manual administrativa |
| `GET` | `/api/metricas/historico/:serviceId` | Histórico bruto |
| `GET` | `/api/intensidades` | Snapshots ambientais |
| `GET` | `/api/indicadores` | Indicadores ambientais |
| `GET` | `/api/indicadores/:serviceId/historico` | Histórico ambiental |
| `GET` | `/api/dashboard` | Resumo operacional |

---

## 📚 Documentação Relacionada

- [`docs/api.md`](../docs/api.md) — endpoints, respostas e autenticação;
- [`docs/arquitetura.md`](../docs/arquitetura.md) — fluxo e responsabilidades;
- [`docs/calculos.md`](../docs/calculos.md) — modelo de energia e CO₂e;
- [`database/README.md`](../database/README.md) — schema, migrations e DML;
- [`frontend/README.md`](../frontend/README.md) — frontend;
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — registro da Sprint 2;
- [`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md) — validação técnica.
