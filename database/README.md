# 🗄️ GreenER: Banco de Dados

Banco de dados relacional do GreenER, responsável por armazenar serviços monitorados, localizações, tentativas de coleta, métricas e os dados utilizados pelas funcionalidades de monitoramento e análise ambiental.

[← Voltar para o README principal](../README.md)

---

## 📋 Índice

- [🛠 Tecnologias](#-tecnologias)
- [📂 Arquivos](#-arquivos)
- [🧱 Modelo de Dados](#-modelo-de-dados)
- [📊 Histórico de Coletas](#-histórico-de-coletas)
- [🔄 Evolução do Schema](#-evolução-do-schema)
- [▶️ Como Aplicar os Scripts](#️-como-aplicar-os-scripts)
- [🔎 Onde Ficam as Consultas da Aplicação](#-onde-ficam-as-consultas-da-aplicação)
- [📚 Documentação Relacionada](#-documentação-relacionada)

---

## 🛠 Tecnologias

- PostgreSQL 17
- SQL explícito para DDL e DML
- Docker e Docker Compose
- Volume persistente para preservação dos dados após reinicialização dos containers

---

## 📂 Arquivos

| Arquivo / Diretório | Conteúdo |
| --- | --- |
| [`schema.sql`](schema.sql) | Estado completo atual do banco: tabelas, chaves, relacionamentos, restrições e índices |
| [`migrations/`](migrations/) | Alterações incrementais utilizadas para atualizar bancos já existentes |
| [`migrations/001_add_collection.sql`](migrations/001_add_collection.sql) | Introduz a entidade `collection` e migra o relacionamento entre serviços e métricas |
| [`migrations/002_refactor_location.sql`](migrations/002_refactor_location.sql) | Ajusta a unicidade das localizações e adiciona índice para snapshots de intensidade |
| [`migrations/003_add_collection_interval_seconds.sql`](migrations/003_add_collection_interval_seconds.sql) | Persiste a duração real da amostra em `metrics`; mantém o campo nulo para registros existentes |

O `schema.sql` deve representar sempre a estrutura completa esperada para um banco criado do zero.

As migrations representam a evolução entre versões do modelo sem exigir a remoção dos dados já persistidos.

---

## 🧱 Modelo de Dados

> Esta seção deve permanecer sincronizada com o conteúdo de [`schema.sql`](schema.sql).

| Tabela | Descrição |
| --- | --- |
| `location` | Localizações associadas aos serviços, contendo código da região, país, região, cidade quando disponível, latitude e longitude. |
| `users` | Usuários do sistema, contendo nome, e-mail, hashes utilizados pela autenticação e indicação administrativa. |
| `service` | Serviços monitorados, associados a uma localização e contendo informações como identificador externo, nome, estado atual e instante da última identificação. |
| `collection` | Cada tentativa de coleta realizada para um serviço, incluindo estado, instante da tentativa e informações de falha quando aplicáveis. |
| `metrics` | Conjuntos de métricas válidos obtidos em uma coleta, incluindo CPU, memória, disco, rede, duração real da amostra em segundos e timestamp da métrica. A duração é nula em registros anteriores à migration 003. |
| `carbon_intensity` | Histórico de intensidade de carbono e participação de energia renovável associado a uma localização. |
| `favorites` | Associação entre usuários e serviços favoritados. |

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

Além disso:

```text
users
   │
   └────< favorites >──── service
```

---

## 📊 Histórico de Coletas

A partir da Sprint 2, o GreenER separa o **evento de coleta** dos **dados de métricas obtidos**.

Anteriormente, a tabela `metrics` estava relacionada diretamente ao serviço:

```text
service → metrics
```

O modelo passou a utilizar:

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

Essa separação permite registrar uma tentativa mesmo quando nenhuma métrica válida é retornada.

### `collection`

A tabela `collection` representa cada tentativa de consultar as métricas de um serviço.

Cada registro contém:

- serviço consultado;
- estado da tentativa;
- instante em que a tentativa ocorreu;
- motivo da falha, quando aplicável;
- status HTTP, quando houver resposta HTTP.

Os estados atualmente suportados são:

| Estado | Significado |
| --- | --- |
| `success` | A consulta retornou métricas válidas |
| `no_metrics` | O serviço está disponível, mas não forneceu métricas válidas |
| `unavailable` | Não foi possível consultar o serviço |
| `error` | Ocorreu erro durante o processamento da coleta |

Exemplo:

```text
Billing API
   │
   ├── collection #1 → success
   ├── collection #2 → success
   ├── collection #3 → no_metrics
   └── collection #4 → unavailable
```

Isso permite preservar o histórico mesmo quando uma tentativa não gera dados suficientes para criar um registro em `metrics`.

### `metrics`

A tabela `metrics` armazena apenas conjuntos de métricas válidos.

Cada registro referencia a coleta que o originou através de:

```text
collection_id_collection
```

Assim, o serviço correspondente pode ser obtido pelo relacionamento:

```text
metrics → collection → service
```

A referência direta de `metrics` para `service` foi removida para evitar redundância.

A restrição `UNIQUE` aplicada a `collection_id_collection` garante que uma tentativa possua, no máximo, um conjunto de métricas.

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

### Integridade das coletas

O banco utiliza restrições para impedir estados inconsistentes.

Entre as regras atuais:

- `collection.status` aceita somente `success`, `no_metrics`, `unavailable` e `error`;
- `http_status`, quando informado, deve estar entre `100` e `599`;
- uma coleta com estado `success` não pode possuir `failure_reason`;
- toda coleta deve estar associada a um serviço existente;
- toda métrica deve estar associada a uma coleta existente;
- uma coleta pode possuir no máximo um conjunto de métricas.

Também existe o índice:

```text
idx_collection_service_attempted
```

sobre:

```text
(service_id_service, attempted_at DESC)
```

para favorecer consultas históricas por serviço ordenadas pelas tentativas mais recentes.

---

## 🌱 Dados ambientais

A tabela `carbon_intensity` mantém registros históricos de intensidade de carbono associados a uma localização.

Ela armazena:

- intensidade de carbono em `gCO₂e/kWh`;
- percentual de energia renovável;
- instante de registro;
- localização correspondente.

Os resultados calculados de consumo energético e emissão de CO₂e **não são persistidos na entidade `collection` nesta etapa**.

A estratégia definitiva de cálculo e associação temporal entre coleta, métricas e intensidade de carbono será definida na implementação específica do cálculo ambiental.

---

## 🔄 Evolução do Schema

O arquivo:

```text
database/schema.sql
```

representa o estado completo atual do banco e deve permitir a criação da estrutura em um PostgreSQL vazio.

Para bancos já existentes, as alterações incrementais ficam em:

```text
database/migrations/
```

### Migration 001 — entidade de coleta

A migration:

```text
001_add_collection.sql
```

realiza a transição:

```text
service → metrics
```

para:

```text
service → collection → metrics
```

sem exigir a remoção do volume PostgreSQL.

Durante a migration:

1. a tabela `collection` é criada;
2. métricas antigas, caso existam, recebem uma coleta retroativa com estado `success`;
3. `metrics` passa a referenciar `collection`;
4. a FK antiga entre `metrics` e `service` é removida;
5. a coluna temporária utilizada na associação dos registros antigos é removida.

Para registros anteriores à migration:

```text
collection.attempted_at = metrics.recorded_at
```

é utilizado como referência temporal disponível para reconstruir a relação histórica.

A coluna:

```text
legacy_metrics_id
```

existe somente durante a execução da migration e é removida antes do `COMMIT`.

A migration utiliza uma transação:

```text
BEGIN
   ↓
alterações
   ↓
COMMIT
```

evitando deixar o banco parcialmente atualizado caso alguma etapa falhe.

### Aplicando a migration

A migration deve ser utilizada somente em bancos que ainda possuam o modelo anterior.

Com o PostgreSQL em execução:

```bash
docker compose cp database/migrations/001_add_collection.sql postgres:/tmp/001_add_collection.sql
```

Em seguida:

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/001_add_collection.sql'
```

> A migration deve ser aplicada apenas uma vez em cada banco que ainda utilize o relacionamento direto `service → metrics`.

---

## ▶️ Como Aplicar os Scripts

Existem dois cenários diferentes.

### Banco novo

Para um banco vazio, o [`schema.sql`](schema.sql) contém toda a estrutura necessária.

No ambiente Docker do projeto, o arquivo é utilizado durante a inicialização de um volume PostgreSQL novo.

Para executar manualmente em um banco vazio, copie o script para o container:

```bash
docker compose cp database/schema.sql postgres:/tmp/schema.sql
```

Depois execute:

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/schema.sql'
```

### Banco existente

Não remova o volume apenas para aplicar uma evolução do modelo.

Utilize a migration correspondente em:

```text
database/migrations/
```

Por exemplo:

```bash
docker compose cp database/migrations/001_add_collection.sql postgres:/tmp/001_add_collection.sql
```

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/001_add_collection.sql'
```

Em bancos que já possuem a estrutura de `collection` e `metrics`, aplique a migration da duração real da amostra:

```bash
docker compose cp database/migrations/003_add_collection_interval_seconds.sql postgres:/tmp/003_add_collection_interval_seconds.sql
```

```bash
docker compose exec postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/003_add_collection_interval_seconds.sql'
```

Essa migration adiciona uma coluna nullable: os registros anteriores permanecem sem duração conhecida e os indicadores os tratam como lacunas. Aplique cada migration somente uma vez e na ordem necessária para o estado atual do banco.

### Persistência

Encerrar os containers normalmente:

```bash
docker compose down
```

não remove o volume do PostgreSQL.

Portanto, os registros continuam disponíveis após:

```bash
docker compose up
```

O comando:

```bash
docker compose down -v
```

remove também os volumes e, consequentemente, os dados persistidos.

> Não utilize `docker compose down -v` quando o objetivo for testar persistência ou preservar dados existentes.

---

## ✅ Validações da estrutura de coletas

Durante a implementação da TEC02 foram validados:

- criação do `schema.sql` em PostgreSQL vazio;
- criação da tabela `collection`;
- relacionamento entre `service` e `collection`;
- relacionamento entre `collection` e `metrics`;
- chaves primárias e estrangeiras;
- restrições `CHECK`;
- restrição `UNIQUE` entre coleta e métricas;
- índice utilizado pelo histórico;
- inserção de coleta `success`;
- inserção de coleta `no_metrics`;
- inserção de coleta `unavailable`;
- rejeição de estados inválidos;
- rejeição de `success` combinado com `failure_reason`;
- aplicação da migration em banco existente;
- preservação da estrutura e dos registros após reinicialização do PostgreSQL;
- inicialização do backend após a evolução do schema;
- execução da suíte automatizada existente com 20 de 20 testes aprovados.

---

## 🔎 Onde Ficam as Consultas da Aplicação

As operações de inserção, consulta, atualização e exclusão utilizadas pela aplicação devem permanecer nos **repositories** do backend.

A organização segue o padrão:

```text
backend/src/modules/<modulo>/<modulo>.repository.ts
```

Os repositories utilizam SQL explícito e parâmetros separados dos valores recebidos pela aplicação, sem concatenação direta de dados no texto SQL.

O módulo de coletas já possui sua estrutura reservada em:

```text
backend/src/modules/coletas/
```

A implementação efetiva das operações de coleta e persistência será realizada nas tarefas específicas da Sprint 2.

Veja também a organização do backend em [`backend/README.md`](../backend/README.md).

---

## 📚 Documentação Relacionada

- [`backend/README.md`](../backend/README.md) — organização do backend e conexão com o PostgreSQL
- [`docs/arquitetura.md`](../docs/arquitetura.md) — arquitetura e fluxo dos dados entre as partes da aplicação
- [`docs/calculos.md`](../docs/calculos.md) — fórmulas, unidades e premissas para energia e CO₂e
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — planejamento, decisões e evidências da Sprint 2