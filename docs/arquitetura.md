# Arquitetura — GreenER

← [Voltar ao índice da documentação](../README.md)

> Este documento separa a **arquitetura já implementada** da **evolução planejada**. Recursos das Sprints 2 e 3 não devem ser apresentados como concluídos antes de sua integração e validação.

---

## 1. Visão geral

O GreenER utiliza arquitetura web cliente-servidor, com frontend em React + TypeScript, backend em Node.js + Express + TypeScript, persistência PostgreSQL e execução por Docker Compose.

### Estado atual da aplicação

```mermaid
flowchart TD
    U[Usuário] --> F[Frontend React + Vite :5173]
    F -->|HTTP / JSON| B[Backend Express :3000]
    B -->|SQL explícito| P[(PostgreSQL 17)]
    B -->|GET /services e /metrics/:id| M[Metrics Aggregator API]
    B -->|GET /regions| CI[Carbon Intensity API]
```

O backend mantém sincronização do catálogo e coleta periódica de métricas. Também oferece rotas protegidas para consulta e sincronização manual, além de cálculo sob demanda dos indicadores a partir dos dados persistidos:

```text
Metrics Aggregator API ──→ sincronização/coleta ──→ PostgreSQL
Carbon Intensity API ────→ sincronização regional ─→ PostgreSQL
                                                    ↓
                                       GET /api/indicadores?start=...&end=...
```

O endpoint de indicadores calcula energia e CO₂e no backend, mas ainda não significa integração do dashboard/frontend nem validação de ponta a ponta. A energia usa provisoriamente `COLLECTION_INTERVAL_MS` como duração da amostra; `collection_interval_seconds` da Metrics API ainda não é validado e persistido por tentativa.

### Fluxo atual e integrações planejadas

```mermaid
flowchart LR
    M[Metrics Aggregator API] -->|/services| S[Sincronização de serviços]
    M -->|/metrics/:id| C[Coleta periódica e manual]

    S --> DB[(PostgreSQL)]
    C --> DB

    CI[Carbon Intensity API] -->|descoberta/sincronização| DB
    DB --> CALC[Cálculos sob demanda de indicadores]

    CALC --> API[GET /api/indicadores]
    DB --> API

    API --> DASH[Frontend / Dashboard - integração pendente]
    API --> ANA[Mapa / Ranking / Comparação - planejados]
```

O fluxo implementado no backend cobre:

```text
sincronização do catálogo
    ↓
coleta periódica de métricas
    ↓
persistência
    ↓
consulta do histórico
    ↓
cálculo ambiental por período
    ↓
indicadores
```

A integração visual dos indicadores com o frontend, o uso do intervalo individual de cada amostra e recursos analíticos adicionais continuam pendentes.

---

## 2. Responsabilidades por camada

| Camada | Responsabilidade |
| --- | --- |
| **Frontend** | Navegação, autenticação de interface, apresentação dos serviços, estados de consulta e visualizações analíticas. |
| **Routes** | Definir recursos e métodos HTTP e encaminhar chamadas para controllers. |
| **Controllers** | Tratar entrada/saída HTTP, códigos de resposta e delegar regras de negócio. |
| **Services** | Implementar regras de negócio, orquestração de integrações, cálculos e estados. |
| **Repositories** | Concentrar SQL explícito e parametrizado de acesso ao PostgreSQL. |
| **Jobs** | Executar processos recorrentes sem ação manual, incluindo sincronização do catálogo e coleta de métricas. |
| **PostgreSQL** | Persistir usuários, serviços, localizações, estrutura de coletas, métricas e demais dados históricos utilizados pela aplicação. |
| **Metrics Aggregator API** | Fornecer catálogo de serviços e métricas por serviço. |
| **Carbon Intensity API** | Fornecer intensidade de carbono por região para cálculo de CO₂e. |

---

## 3. Organização do backend

O backend segue a separação:

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

Exemplo atual para listagem de serviços:

```text
GET /api/servicos
  ↓
servicos.routes.ts
  ↓
ServicosController.list()
  ↓
ServicosService.listAll()
  ↓
ServicosRepository.listAll()
  ↓
PostgreSQL
```

A coleta manual preserva esse padrão em camadas:

```text
POST /api/metricas/collect
  ↓
coletas.routes.ts
  ↓
ColetasController.collect()
  ↓
ColetasService.collectAllMetrics()
  ├── ServicosService.listAll()
  ├── Metrics API /metrics/{external_id}
  └── ColetasRepository.saveCollection()
        ↓
      PostgreSQL
```

O middleware JWT autentica a requisição e o middleware administrativo consulta `users.admin` no PostgreSQL antes de permitir a coleta manual.

O cálculo de indicadores também segue as camadas do módulo:

```text
GET /api/indicadores?start=<ISO>&end=<ISO>
  ↓
indicadores.routes.ts (JWT)
  ↓
IndicadoresController.list()
  ↓
IndicadoresService.getIndicators()
  ↓
IndicadoresRepository.findCollectionsForPeriod()
  ↓
PostgreSQL: service, location, collection, metrics e carbon_intensity
```

O repository seleciona tentativas no período e associa, quando elegível, o snapshot de carbono mais recente da mesma região, anterior ou igual a `attempted_at` e dentro de `CARBON_INTENSITY_MAX_AGE_MS`. O service calcula energia, emissões, totais, cobertura e lacunas; resultados calculados não são persistidos.

A estrutura atual do módulo de coletas é:

```text
modules/coletas/
├── coletas.routes.ts
├── coletas.controller.ts
├── coletas.service.ts
└── coletas.repository.ts
```

O endpoint manual coleta somente serviços com status `active`. Cada chamada externa tem timeout; uma falha individual é registrada e não interrompe os serviços seguintes. Coletas bem-sucedidas gravam a tentativa e as métricas na mesma transação; resultados sem métricas ou com erro gravam apenas a tentativa.

---

## 4. Sincronização automática de serviços

Ao iniciar, o backend dispara um job de sincronização do catálogo de serviços.

O job consulta `/services`, cria ou atualiza registros e marca como `removed` serviços persistidos que deixaram de aparecer na resposta externa.

```mermaid
flowchart TD
    J[Job de sincronização] --> D[GET /services]
    D --> E{Serviço existe?}

    E -->|Não| I[INSERT]
    E -->|Sim| U[UPDATE + last_seen_at]

    I --> A[Comparar IDs ativos]
    U --> A

    A --> X[Marcar ausentes como removed]
    X --> W[Esperar próximo intervalo]
    W --> J
```

> O intervalo usado por esse job deve ser distinguido do intervalo de **coleta de métricas**. Na Sprint 2, a nomenclatura e a configuração desses intervalos devem permanecer separadas para evitar ambiguidade.

Além da sincronização do catálogo, `server.ts` inicia o job de coleta periódica de métricas. Os ciclos usam configurações independentes: `SERVICE_SYNC_INTERVAL_MS` para o catálogo e `COLLECTION_INTERVAL_MS` para métricas.

---

## 5. Estados dos serviços e das coletas

A arquitetura passa a distinguir dois conceitos diferentes:

```text
estado atual do serviço
≠
resultado de uma tentativa de coleta
```

### Estado atual do serviço

A tabela `service` mantém informações relacionadas ao estado atual conhecido do serviço, utilizando principalmente:

```text
service.status
service.last_seen_at
```

Os estados persistidos atualmente têm foco em:

- `active`;
- `removed`.

Esses dados permitem consultas rápidas sobre a situação atual do catálogo.

### Estados transitórios da interface

O frontend pode representar estados visuais temporários, como:

- `new`;
- `returned`.

Esses estados não substituem o estado persistido no backend.

### Estado da coleta

A partir da TEC02, cada tentativa de coleta pode possuir um dos seguintes estados no banco:

| Estado | Significado |
| --- | --- |
| `success` | A consulta retornou métricas válidas |
| `no_metrics` | O serviço está disponível, mas não forneceu métricas válidas |
| `unavailable` | Não foi possível consultar o serviço |
| `error` | Ocorreu erro durante o processamento da coleta |

Isso permite representar, por exemplo:

```text
serviço: active
última coleta: no_metrics
```

sem confundir ausência de métricas com indisponibilidade durante uma tentativa de coleta.

A causa técnica de uma falha pode ser registrada separadamente em `collection.failure_reason`, enquanto `http_status` pode armazenar o código HTTP quando houver resposta.

#### Classificação das respostas de `/metrics/{id}`

| Resposta externa | Estado persistido |
| --- | --- |
| `200` com métricas válidas | `success` |
| `200` com `metrics` ausente, `null` ou vazio | `no_metrics` |
| `404` (serviço listado, métricas inexistentes) | `no_metrics` |
| `500` (serviço ou exportador de métricas indisponível) | `unavailable` |
| Timeout ou falha de conexão | `unavailable` |
| Outro HTTP inesperado, JSON inválido ou payload incompleto | `error` |

O agregador de métricas documenta `404` como "serviço removido ou métricas inexistentes" e `500` como "serviço indisponível ou exportador de métricas indisponível". Por isso, `no_metrics` representa um serviço que continua no catálogo mas não exporta métricas, enquanto `unavailable` representa a impossibilidade de consultá-lo.

---

## 6. Autenticação

### Implementado

- cadastro de usuário;
- hash de senha;
- login;
- geração de JWT;
- sessão e proteção de navegação no frontend.

### Fluxo atual

O backend valida JWT nas rotas protegidas por meio de `authMiddleware`. A coleta manual também exige autorização administrativa. A integração dos fluxos protegidos com todas as telas do frontend e sua validação ponta a ponta devem ser verificadas separadamente.

O fluxo esperado é:

```text
requisição
  ↓
Authorization: Bearer <token>
  ↓
auth middleware
  ↓
verifyToken()
  ↓
 token válido? ── não → 401
      │
     sim
      ↓
controller
```

O middleware está aplicado, entre outras, às rotas de histórico, intensidades e indicadores.

---

## 7. Persistência e histórico

A revisão da modelagem do banco foi iniciada pela TEC02 antes da implementação da coleta periódica.

O objetivo foi garantir que o modelo consiga preservar o histórico das tentativas de coleta sem criar registros vazios em `metrics`.

### Modelo implementado

O relacionamento anterior:

```text
service
   ↓
metrics
```

foi substituído por:

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

A tabela `collection` representa o **evento de coleta**.

A tabela `metrics` representa os **dados válidos obtidos naquela coleta**.

Essa separação é importante porque uma tentativa pode existir mesmo quando nenhuma métrica válida é retornada.

### Collection

Cada registro em `collection` contém:

```text
id_collection
service_id_service
status
failure_reason
http_status
attempted_at
```

A entidade registra:

- qual serviço foi consultado;
- quando a tentativa ocorreu;
- qual foi o resultado da tentativa;
- qual foi o motivo da falha, quando aplicável;
- qual código HTTP foi retornado, quando aplicável.

Um serviço pode possuir múltiplas coletas:

```text
Billing API
    │
    ├── collection #1 → success
    ├── collection #2 → success
    ├── collection #3 → no_metrics
    └── collection #4 → unavailable
```

Isso preserva eventos que anteriormente não poderiam ser registrados apenas na tabela `metrics`.

### Metrics

A tabela `metrics` armazena somente dados válidos.

Seu relacionamento com o serviço passa a ser indireto:

```text
metrics
   ↓
collection
   ↓
service
```

A referência direta anterior entre `metrics` e `service` foi removida para evitar redundância.

Cada registro de `metrics` possui:

```text
collection_id_collection
```

como chave estrangeira para a coleta correspondente.

A restrição `UNIQUE` aplicada a essa referência garante a cardinalidade:

```text
collection 1 → 0..1 metrics
```

Assim:

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

### Integridade do modelo

O banco utiliza restrições para proteger o domínio.

O campo `collection.status` aceita somente:

```text
success
no_metrics
unavailable
error
```

Também são validados:

- códigos HTTP entre `100` e `599`, quando existentes;
- impossibilidade de uma coleta `success` possuir `failure_reason`;
- associação obrigatória da coleta a um serviço;
- associação obrigatória de uma métrica à coleta que a originou;
- no máximo um conjunto de métricas por coleta.

### Consultas históricas

O índice:

```text
(service_id_service, attempted_at DESC)
```

foi criado para favorecer consultas como:

```text
histórico de determinado serviço
ordenado da coleta mais recente para a mais antiga
```

O endpoint de histórico por serviço já permite consultar tentativas registradas. A estrutura também permite evoluir para consultas agregadas e visões analíticas, como:

- gráficos temporais;
- ranking;
- comparação entre serviços.

### Cálculos ambientais

Os resultados calculados de energia e CO₂e **não são persistidos em `collection` nesta etapa**.

O endpoint `GET /api/indicadores` calcula esses valores sob demanda a partir das tentativas de coleta, métricas e snapshots regionais persistidos. A intensidade é associada pela região do serviço e pelo instante da tentativa: seleciona-se o snapshot mais recente registrado até `attempted_at`, desde que esteja dentro de `CARBON_INTENSITY_MAX_AGE_MS`.

Quando não há dados de métricas válidos, a tentativa é descrita como lacuna e não produz consumo. Quando falta intensidade utilizável, a energia ainda pode ser calculada, mas a emissão correspondente fica indisponível. A resposta apresenta totais e cobertura para sinalizar resultados parciais.

**Limitação conhecida:** a energia usa provisoriamente `COLLECTION_INTERVAL_MS`, o intervalo configurado entre ciclos do job, como duração da amostra. O `collection_interval_seconds` declarado pela Metrics API ainda não é validado no payload de métricas nem persistido por tentativa.

---

## 8. Evolução do schema e migrations

O arquivo:

```text
database/schema.sql
```

representa o estado completo atual do banco e foi validado através da criação de um PostgreSQL vazio.

Para atualizar bancos que já utilizavam o modelo anterior, foi criada:

```text
database/migrations/001_add_collection.sql
```

A migration transforma:

```text
service → metrics
```

em:

```text
service → collection → metrics
```

sem exigir a exclusão do volume PostgreSQL.

Caso existam métricas anteriores à alteração, a migration cria uma coleta de estado `success` para cada registro antigo e utiliza `metrics.recorded_at` como referência temporal disponível durante a conversão.

Uma coluna temporária:

```text
legacy_metrics_id
```

é utilizada somente durante a migration para relacionar registros antigos às novas coletas e é removida antes do `COMMIT`.

A migration é executada dentro de uma transação para evitar que o banco permaneça parcialmente atualizado caso alguma operação falhe.

### Validações realizadas na TEC02

Foram verificados:

- criação do `schema.sql` em PostgreSQL vazio;
- criação da tabela `collection`;
- relacionamento `service → collection`;
- relacionamento `collection → metrics`;
- PKs e FKs;
- restrições `CHECK`;
- restrição `UNIQUE` entre coleta e métricas;
- índice para consultas históricas;
- cenário de coleta `success`;
- cenário `no_metrics`;
- cenário `unavailable`;
- rejeição de estado inválido;
- rejeição de `success` associado a `failure_reason`;
- aplicação da migration no banco existente;
- persistência após reinicialização do PostgreSQL;
- inicialização do backend após alteração do schema;
- execução da suíte automatizada existente com **20 de 20 testes aprovados**.

---

## 9. Integrações externas

### Metrics Aggregator API

É utilizada para descoberta dos serviços através de:

```text
GET /services
```

O fluxo manual de coleta consulta cada serviço ativo individualmente:

```text
GET /metrics/{id_servico}
```

O módulo de integração trata:

- timeout;
- erro HTTP;
- ausência de métricas;
- resposta válida;
- falhas individuais sem interromper a coleta dos demais serviços.

A coleta é disparada periodicamente pelo job iniciado junto ao backend e também pode ser iniciada manualmente por `POST /api/metricas/collect`, protegido por JWT e restrito a usuários administradores. O histórico por serviço está disponível em `GET /api/metricas/historico/:serviceId`, protegido por JWT.

### Carbon Intensity API

Fornece os fatores ambientais regionais. As rotas protegidas de intensidades permitem descobrir, sincronizar snapshots e listar os dados persistidos.

O módulo de indicadores associa cada tentativa ao snapshot da mesma região mais recente até o instante da coleta, limitado por `CARBON_INTENSITY_MAX_AGE_MS`. Sem configuração desse limite, o repository não seleciona um fator utilizável.

---

## 10. Endpoints confirmados na versão atual

| Método | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/health` | Saúde básica do backend |
| `POST` | `/auth/register` | Cadastro de usuário |
| `POST` | `/auth/login` | Login e emissão de JWT |
| `GET` | `/auth/me` | Validar token e retornar usuário autenticado |
| `GET` | `/api/servicos/discover` | Descoberta direta na Metrics API |
| `POST` | `/api/servicos/sync` | Sincronização manual do catálogo |
| `GET` | `/api/servicos` | Listagem persistida de serviços |
| `POST` | `/api/metricas/collect` | Disparo manual de coleta (JWT e administrador) |
| `GET` | `/api/metricas/historico/:serviceId` | Histórico de coletas do serviço (JWT) |
| `GET` | `/api/intensidades/discover` | Descoberta de snapshots da Carbon API (JWT) |
| `POST` | `/api/intensidades/sync` | Persistência de snapshots regionais (JWT) |
| `GET` | `/api/intensidades` | Listagem de snapshots persistidos (JWT) |
| `GET` | `/api/indicadores?start=<ISO>&end=<ISO>` | Indicadores ambientais por período (JWT) |

Os indicadores estão implementados parcialmente no backend. A integração do frontend, a duração real por amostra e a validação de ponta a ponta ainda precisam ser concluídas.

---

## 11. Execução local

O `compose.yaml` executa:

- `postgres` — PostgreSQL 17;
- `backend` — Node.js + TypeScript;
- `frontend` — React + TypeScript.

O volume do PostgreSQL preserva os registros quando os containers são reiniciados com:

```text
docker compose down
docker compose up
```

O comando:

```text
docker compose down -v
```

remove o volume e, portanto, não deve ser utilizado em testes cujo objetivo seja validar persistência.

Alterações incrementais no modelo de um banco já inicializado devem utilizar as migrations disponíveis em:

```text
database/migrations/
```

em vez de depender da recriação do volume.

---

## 12. Decisões arquiteturais da Sprint 2

### Decisões já registradas

- adoção da entidade `collection`;
- separação entre tentativa de coleta e métricas válidas;
- relacionamento `service → collection → metrics`;
- cardinalidade de zero ou um registro de métricas por coleta;
- estados de coleta:
  - `success`;
  - `no_metrics`;
  - `unavailable`;
  - `error`;
- `service.status` e `service.last_seen_at` permanecem responsáveis pelo estado atual conhecido do serviço;
- `collection` preserva o histórico das tentativas;
- falhas não geram registros vazios em `metrics`;
- evolução do schema realizada por migration;
- classificação das respostas de `/metrics/{id}` em `success`, `no_metrics`, `unavailable` e `error`;
- energia e CO₂e são calculados sob demanda e não são persistidos na entidade `collection`;
- jobs de sincronização do catálogo e coleta de métricas iniciados pelo backend;
- consulta de histórico de coletas por serviço protegida por JWT;
- cálculo de indicadores por período protegido por JWT;
- associação temporal da intensidade pelo código regional e instante da tentativa, limitada por `CARBON_INTENSITY_MAX_AGE_MS`;
- `COLLECTION_INTERVAL_MS` permanece separado de `SERVICE_SYNC_INTERVAL_MS`.

### Decisões ainda pendentes

- intervalo de atualização do frontend;
- validar, persistir e usar `collection_interval_seconds` por amostra em vez do intervalo configurado do job;
- confirmar com o fornecedor as unidades e a semântica das métricas de memória, disco e rede;
- integrar o endpoint de indicadores ao dashboard e validar o fluxo completo com o banco e frontend;
- definir e implementar novos indicadores, comparações e rankings;
- definir eventual uso de `renewable_share_percent` sem duplicar o benefício já refletido na intensidade de carbono.

As pendências devem ser documentadas conforme forem implementadas e validadas, evitando apresentar comportamento planejado como funcionalidade concluída.