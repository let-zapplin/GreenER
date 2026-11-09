# 🗄️ GreenER — Banco de Dados

Banco de dados relacional do GreenER, responsável por armazenar usuários, serviços monitorados, localizações, tentativas de coleta, métricas e snapshots de intensidade de carbono utilizados pelo Monitoramento e pelas Análises.

[← Voltar para o README principal](../README.md)

> **Referência atualizada no fechamento da Sprint 2 — 09/11/2026.**  
> O projeto utiliza PostgreSQL com **DDL e DML explícitos**, sem ORM.

---

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Arquivos](#-arquivos)
- [Modelo de dados](#-modelo-de-dados)
- [Histórico de coletas](#-histórico-de-coletas)
- [Dados ambientais](#-dados-ambientais)
- [Evolução do schema](#-evolução-do-schema)
- [Ordem das migrations](#-ordem-das-migrations)
- [Como aplicar os scripts](#️-como-aplicar-os-scripts)
- [Persistência do volume](#-persistência-do-volume)
- [Onde ficam as consultas DML](#-onde-ficam-as-consultas-dml)
- [Validações da Sprint 2](#-validações-da-sprint-2)
- [Documentação relacionada](#-documentação-relacionada)

---

## 🛠 Tecnologias

- PostgreSQL 17;
- SQL explícito para DDL e DML;
- biblioteca `pg` no backend Node.js;
- Docker e Docker Compose;
- volume persistente para preservar dados após reinicialização dos containers.

---

## 📂 Arquivos

| Arquivo / diretório | Conteúdo |
| --- | --- |
| [`schema.sql`](schema.sql) | Estado completo atual do banco para criação de um banco novo |
| [`migrations/`](migrations/) | Evoluções incrementais para bancos existentes |
| [`migrations/001_add_collection.sql`](migrations/001_add_collection.sql) | Introduz `collection` e migra a relação histórica entre serviços e métricas |
| [`migrations/002_refactor_location.sql`](migrations/002_refactor_location.sql) | Ajusta a unicidade de localização e cria índice para histórico de intensidade de carbono |
| [`migrations/003_add_collection_interval_seconds.sql`](migrations/003_add_collection_interval_seconds.sql) | Adiciona a duração real da amostra em `metrics` |

O `schema.sql` representa a **estrutura final esperada para um banco criado do zero**.

As migrations existem para atualizar bancos que já possuíam versões anteriores do schema. Portanto:

```text
banco novo → schema.sql
banco existente → migrations necessárias, na ordem
```

Não é necessário aplicar as migrations `001`, `002` e `003` após criar um banco novo com o `schema.sql` atual, porque essas alterações já estão incorporadas ao schema completo.

---

## 🧱 Modelo de dados

| Tabela | Responsabilidade |
| --- | --- |
| `location` | Região, país, cidade e coordenadas utilizadas pelos serviços e fatores ambientais |
| `users` | Usuários, hashes de autenticação e indicação administrativa |
| `service` | Serviços descobertos no catálogo externo e seu estado atual |
| `collection` | Cada tentativa de coleta feita para um serviço |
| `metrics` | Métricas válidas obtidas em uma coleta bem-sucedida |
| `carbon_intensity` | Histórico de intensidade de carbono e participação renovável |
| `favorites` | Associação entre usuários e serviços favoritados |

### Relacionamentos principais

```text
location
   │
   ├────< service
   │         │
   │         │ 1:N
   │         ▼
   │     collection
   │         │
   │         │ 1:0..1
   │         ▼
   │       metrics
   │
   └────< carbon_intensity
```

Também existe:

```text
users
   │
   └────< favorites >──── service
```

### Localização

A tabela `location` utiliza:

```text
UNIQUE NULLS NOT DISTINCT (region_code, city)
```

Isso permite tratar corretamente localizações regionais em que `city` é `NULL`, evitando múltiplas linhas equivalentes para a mesma região.

Latitude e longitude são opcionais, porque um serviço pode continuar monitorável mesmo quando a origem externa não fornece coordenadas.

---

## 📊 Histórico de coletas

A Sprint 2 separou o **evento de coleta** dos **dados válidos obtidos na coleta**.

O modelo anterior:

```text
service → metrics
```

foi evoluído para:

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

Essa separação é importante porque uma tentativa deve continuar registrada mesmo quando não existe uma amostra válida de métricas.

### `collection`

Cada linha representa uma tentativa de coleta.

Campos centrais:

```text
id_collection
service_id_service
status
failure_reason
http_status
attempted_at
```

Estados aceitos:

| Estado | Significado |
| --- | --- |
| `success` | A Metrics API retornou métricas válidas |
| `no_metrics` | O serviço permanece no catálogo, mas a tentativa não forneceu métricas válidas |
| `unavailable` | Não foi possível obter as métricas por indisponibilidade, timeout ou conexão |
| `error` | Ocorreu erro inesperado de resposta, processamento ou persistência |

Exemplo:

```text
Billing API
   │
   ├── collection #1 → success
   ├── collection #2 → success
   ├── collection #3 → no_metrics
   └── collection #4 → unavailable
```

### `metrics`

A tabela `metrics` armazena apenas amostras válidas.

Ela referencia a coleta por:

```text
collection_id_collection
```

Portanto:

```text
metrics → collection → service
```

A restrição `UNIQUE` nessa chave estrangeira garante que uma coleta tenha no máximo um registro em `metrics`.

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

### Duração real da amostra

A coluna:

```text
collection_interval_seconds
```

registra a duração real da amostra utilizada no cálculo energético.

Ela pode ser `NULL` em registros históricos criados antes da Migration 003. Nesses casos, os indicadores tratam a amostra como lacuna, em vez de assumir um intervalo artificial.

### Integridade

O schema impõe restrições como:

- `collection.status` limitado aos estados suportados;
- `http_status`, quando presente, entre `100` e `599`;
- coleta `success` sem `failure_reason`;
- associação obrigatória de `collection` a `service`;
- associação obrigatória de `metrics` a uma `collection`;
- no máximo uma métrica por coleta;
- `collection_interval_seconds` nulo ou finito e maior que zero.

Também existe o índice:

```text
idx_collection_service_attempted
```

sobre:

```text
(service_id_service, attempted_at DESC)
```

para favorecer consultas históricas por serviço.

---

## 🌱 Dados ambientais

A tabela `carbon_intensity` mantém snapshots regionais de:

- intensidade de carbono em `gCO₂e/kWh`;
- participação de energia renovável;
- instante em que o valor foi registrado;
- localização associada.

Existe um índice específico para consultas temporais:

```text
idx_carbon_intensity_location_registered
```

sobre:

```text
(
  location_id_location,
  registered_at DESC,
  id_carbon_intensity DESC
)
```

Esse índice auxilia a seleção do snapshot ambiental mais recente e elegível para uma tentativa de coleta.

Os valores calculados de energia e CO₂e **não são persistidos diretamente em `collection`**.

Eles são calculados sob demanda a partir de:

```text
collection
  +
metrics
  +
location / region_code
  +
carbon_intensity
  ↓
energia + CO₂e
```

A associação temporal respeita o instante da coleta e a idade máxima configurada para o fator ambiental.

As fórmulas e premissas estão em [`docs/calculos.md`](../docs/calculos.md).

---

## 🔄 Evolução do schema

O arquivo:

```text
database/schema.sql
```

representa o estado completo atual do banco.

Para bancos existentes:

```text
database/migrations/
```

contém as alterações incrementais.

### Migration 001 — `001_add_collection.sql`

Introduz a entidade `collection` e transforma:

```text
service → metrics
```

em:

```text
service → collection → metrics
```

Durante a migração:

1. `collection` é criada;
2. métricas antigas recebem uma coleta retroativa `success`;
3. `metrics` passa a referenciar a coleta;
4. a relação direta anterior entre `metrics` e `service` é removida;
5. a coluna temporária `legacy_metrics_id` é descartada;
6. tudo ocorre em transação.

Para métricas existentes:

```text
collection.attempted_at = metrics.recorded_at
```

é usado como referência temporal disponível.

### Migration 002 — `002_refactor_location.sql`

Ajusta a estrutura de localização para:

```text
UNIQUE NULLS NOT DISTINCT (region_code, city)
```

Esse comportamento evita duplicação de localizações regionais com `city = NULL`.

Também cria:

```text
idx_carbon_intensity_location_registered
```

para otimizar consultas temporais dos snapshots de carbono.

A migration também é transacional.

### Migration 003 — `003_add_collection_interval_seconds.sql`

Adiciona:

```text
metrics.collection_interval_seconds
```

como `DOUBLE PRECISION`.

Também cria uma restrição para aceitar apenas:

```text
NULL
ou
valor > 0 e finito
```

A coluna é nullable propositalmente: amostras anteriores permanecem sem uma duração inventada.

---

## 🔢 Ordem das migrations

Para um banco antigo que ainda não recebeu nenhuma dessas evoluções:

```text
001_add_collection.sql
        ↓
002_refactor_location.sql
        ↓
003_add_collection_interval_seconds.sql
```

Aplique apenas as migrations que ainda não foram executadas naquele banco.

### Importante

- **Banco novo:** execute apenas o `schema.sql` atual.
- **Banco existente:** aplique as migrations faltantes na sequência.
- Não aplique a mesma migration mais de uma vez sem verificar se ela foi criada para ser idempotente.
- Não use `docker compose down -v` como método de atualização do schema, pois isso apaga os dados.

---

## ▶️ Como aplicar os scripts

### Banco novo

Suba o ambiente normalmente:

```bash
docker compose up -d
```

Ao inicializar um volume PostgreSQL novo, o `schema.sql` atual fornece a estrutura completa esperada.

Para aplicar o schema manualmente:

```bash
docker compose cp database/schema.sql postgres:/tmp/schema.sql
```

Depois:

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/schema.sql'
```

### Banco existente — Migration 001

```bash
docker compose cp database/migrations/001_add_collection.sql postgres:/tmp/001_add_collection.sql
```

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/001_add_collection.sql'
```

### Banco existente — Migration 002

```bash
docker compose cp database/migrations/002_refactor_location.sql postgres:/tmp/002_refactor_location.sql
```

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/002_refactor_location.sql'
```

### Banco existente — Migration 003

```bash
docker compose cp database/migrations/003_add_collection_interval_seconds.sql postgres:/tmp/003_add_collection_interval_seconds.sql
```

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/003_add_collection_interval_seconds.sql'
```

O uso de:

```text
-v ON_ERROR_STOP=1
```

faz o `psql` interromper a execução quando encontra erro, evitando que falhas sejam ignoradas durante a atualização.

---

## 💾 Persistência do volume

Encerrar os containers com:

```bash
docker compose down
```

não remove os dados do PostgreSQL.

Depois:

```bash
docker compose up -d
```

o volume é reutilizado.

Já:

```bash
docker compose down -v
```

remove também o volume e, consequentemente, os registros persistidos.

> Não use `docker compose down -v` quando o objetivo for verificar persistência ou preservar o banco.

No Compose do GreenER:

```text
host:      localhost:5433
container: postgres:5432
```

O backend se conecta internamente pela rede Docker utilizando o nome do serviço `postgres`.

---

## 🔎 Onde ficam as consultas DML

O GreenER não utiliza ORM.

As operações `SELECT`, `INSERT`, `UPDATE` e demais consultas da aplicação ficam nos **repositories do backend**.

Padrão:

```text
backend/src/modules/<modulo>/<modulo>.repository.ts
```

Principais repositories relacionados ao banco:

| Arquivo | Responsabilidade |
| --- | --- |
| `backend/src/modules/auth/auth.repository.ts` | usuários, autenticação e consulta de permissão administrativa |
| `backend/src/modules/localidades/localidades.repository.ts` | criação, atualização e consulta de localizações |
| `backend/src/modules/servicos/servicos.repository.ts` | catálogo de serviços e última tentativa de coleta |
| `backend/src/modules/coletas/coletas.repository.ts` | persistência transacional das coletas/métricas e histórico bruto |
| `backend/src/modules/intensidades/intensidades.repository.ts` | snapshots e seleção temporal da intensidade de carbono |
| `backend/src/modules/indicadores/indicadores.repository.ts` | consulta histórica por período e associação temporal do fator ambiental |
| `backend/src/modules/dashboard/dashboard.repository.ts` | consolidação dos estados atuais dos serviços |

### SQL parametrizado

Os valores são enviados separadamente da consulta.

Exemplo conceitual:

```ts
pool.query(
  "SELECT * FROM service WHERE id = $1",
  [externalId],
);
```

O projeto evita concatenar diretamente os dados recebidos no texto SQL.

### Transação da coleta

A persistência de uma coleta `success` usa uma transação:

```text
BEGIN
  ↓
INSERT collection
  ↓
INSERT metrics
  ↓
COMMIT
```

Se a inserção da métrica falhar:

```text
ROLLBACK
```

evita deixar uma coleta `success` sem a respectiva amostra.

Nos estados `no_metrics`, `unavailable` e `error`, somente a tentativa em `collection` é persistida.

---

## ✅ Validações da Sprint 2

### Integração PostgreSQL

A suíte específica com PostgreSQL real foi executada por Docker:

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
```

Resultado:

```text
7/7 testes de integração aprovados
backend-test exit code 0
```

Entre os cenários testados houve também violação proposital de constraint para validar rollback e integridade transacional.

### Persistência após reinicialização

Antes da reinicialização, foram identificados:

```text
collection:
id_collection = 4642
service_id_service = 1
status = success
```

e:

```text
metrics:
id_metrics = 4587
collection_id_collection = 4642
```

Depois de:

```bash
docker compose down
docker compose up -d
```

sem `-v`, a métrica `4587` continuou associada à coleta `4642`.

Isso confirma a persistência pelo volume PostgreSQL.

### Coleta periódica

Sem disparar uma coleta manual, a quantidade registrada evoluiu de:

```text
4687 coletas
```

para:

```text
4735 coletas
```

confirmando que o job periódico continuou persistindo novas tentativas.

### Estados históricos

Na validação final foram encontrados no banco:

```text
no_metrics   13
success      4695
unavailable  43
```

Isso confirma que o histórico preserva estados distintos e não registra toda tentativa como sucesso.

### Testes automatizados do projeto

No fechamento da Sprint 2:

- 156 testes aprovados na suíte comum do backend;
- 7 testes de integração PostgreSQL aprovados separadamente;
- 26 testes do frontend aprovados;
- **189 testes automatizados únicos validados** no projeto.

Os comandos e evidências completas estão em:

[`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md)

---

## 📚 Documentação relacionada

- [`backend/README.md`](../backend/README.md) — backend, variáveis e integrações;
- [`docs/arquitetura.md`](../docs/arquitetura.md) — fluxo de dados e responsabilidades;
- [`docs/calculos.md`](../docs/calculos.md) — fórmulas, unidades e premissas ambientais;
- [`docs/api.md`](../docs/api.md) — endpoints e contratos HTTP;
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — planejamento e evidências da Sprint 2;
- [`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md) — evidências de validação ponta a ponta.
