# Documentação da API — GreenER

> **Referência técnica | Base entregue na Sprint 1 / início da Sprint 2**  
> Esta documentação separa endpoints **já implementados** de endpoints **planejados**. Exemplos de dados são ilustrativos e não substituem a validação da versão em execução.

## 01. Visão geral

O backend do **GreenER** utiliza **Node.js, Express e TypeScript** para fornecer uma API REST que conecta a interface React, o banco de dados PostgreSQL e serviços externos de monitoramento.

**URL base (desenvolvimento local):** `http://localhost:3000`  
**Formato principal:** JSON (`Content-Type: application/json`)  
**Infraestrutura local:** Docker Compose

```mermaid
flowchart LR
    A[Frontend React] <-->|HTTP / JSON| B[API GreenER - Express]
    B <-->|SQL| C[(PostgreSQL)]
    B -->|HTTP GET /services| D[Metrics API externa]
```

> A integração da Carbon API fornece descoberta e sincronização de snapshots regionais. Os cálculos ambientais continuam fora deste escopo.

### Endpoints disponíveis

| Método | Endpoint | Função | Referência |
|---|---|---|---|
| `GET` | `/health` | Consultar o estado básico do backend | Infraestrutura |
| `POST` | `/auth/register` | Cadastrar usuário | Autenticação |
| `POST` | `/auth/login` | Autenticar usuário e receber token JWT | Autenticação |
| `GET` | `/auth/me` | Validar token e obter dados do usuário logado (Rota Protegida) | TEC29 |
| `GET` | `/api/servicos/discover` | Buscar serviços diretamente na API externa | US01 |
| `POST` | `/api/servicos/sync` | Sincronizar serviços externos com o banco | US02 |
| `GET` | `/api/servicos` | Listar serviços persistidos no banco | RF01 / RF02 / apoio ao monitoramento |
| `GET` | `/api/intensidades/discover` | Consultar catálogo regional da Carbon API | Intensidades |
| `POST` | `/api/intensidades/sync` | Registrar snapshots regionais | Intensidades |
| `GET` | `/api/intensidades` | Listar snapshots regionais registrados | Intensidades |

**Situação de acesso:** O backend agora conta com um **middleware de autenticação JWT** (implementado na TEC29).
O token gerado no login deve ser enviado no header `Authorization: Bearer <token>` para acessar rotas protegidas, incluindo `/auth/me` e todas as rotas de intensidades. O backend retorna `401 Unauthorized` caso ele esteja ausente, inválido ou expirado.

---

## 02. Saúde do servidor

### `GET /health`

Verifica se o servidor Express está respondendo. Também é utilizado pelo *healthcheck* do container backend no Docker Compose.

**Corpo da requisição:** nenhum.  
**Resposta de sucesso:** `200 OK`.

```json
{
  "status": "ok",
  "message": "GreenER backend funcionando"
}
```

**Exemplo de teste:**

```bash
curl http://localhost:3000/health
```

> Esta rota indica que o processo HTTP está respondendo, mas não verifica individualmente a conexão com o banco nem a disponibilidade das APIs externas.

---

## 03. Autenticação

### `POST /auth/register`

Cadastra um usuário no PostgreSQL. A senha é processada pelo utilitário de hash do projeto antes de ser persistida.

**Cabeçalho:** `Content-Type: application/json`  
**Corpo esperado:**

```json
{
  "name": "Usuário Exemplo",
  "email": "exemplo@dominio.com",
  "password": "senha-de-exemplo"
}
```

| Campo | Tipo esperado | Descrição |
|---|---|---|
| `name` | `string` | Nome do usuário |
| `email` | `string` | E-mail utilizado no cadastro |
| `password` | `string` | Senha para autenticação |

**Sucesso:** `201 Created`.

```json
{
  "id": 1,
  "email": "exemplo@dominio.com"
}
```

**Falha tratada pelo controller:** `400 Bad Request`.

```json
{
  "error": "Email já cadastrado"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Usuário Exemplo","email":"exemplo@dominio.com","password":"senha-de-exemplo"}'
```

> **Validação:** os campos são lidos diretamente de `req.body`; a versão analisada ainda não possui validação estruturada de formato, obrigatoriedade ou tamanho no controller. Não interpretar a tabela de tipos como garantia de validação em tempo de execução.

### `POST /auth/login`

Autentica um usuário existente e, em caso de sucesso, retorna um **JWT (JSON Web Token)** e informações públicas do usuário.

**Corpo esperado:**

```json
{
  "email": "exemplo@dominio.com",
  "password": "senha-de-exemplo"
}
```

**Sucesso:** `200 OK`.

```json
{
  "token": "<token-jwt-gerado-pelo-servidor>",
  "user": {
    "id": "1",
    "name": "Usuário Exemplo",
    "email": "exemplo@dominio.com"
  }
}
```

**Credenciais inválidas (fluxo previsto):** `401 Unauthorized`.

```json
{
  "error": "Credenciais inválidas"
}
```

**Exemplo:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"exemplo@dominio.com","password":"senha-de-exemplo"}'
```

**Ponto de atenção conhecido:** a função `UserRepository.findUser()` não verifica se `result.rows[0]` é `undefined` antes de acessar suas propriedades. Portanto, na versão analisada, um e-mail inexistente pode produzir um erro diferente de `Credenciais inválidas`, embora o controller ainda retorne HTTP `401` com uma mensagem de erro. Esse caso precisa de correção e teste.

**Sobre JWT:** o token é assinado com `JWT_SECRET`, com expiração controlada por `JWT_EXPIRES_IN`. O projeto contém utilitário para verificar JWT, mas **não aplica** essa verificação às rotas registradas em `app.ts` na versão analisada.

---

## 04. Serviços monitorados

### `GET /api/servicos/discover` — US01

Consulta **diretamente** o endpoint `/services` da Metrics API externa e devolve os serviços identificados. **Esta operação não salva os dados no banco.**

**Parâmetros:** nenhum.  
**Sucesso:** `200 OK`.

**Exemplo ilustrativo:**

```json
{
  "message": "1 serviços encontrados",
  "services": [
    {
      "id": "service-example",
      "name": "Serviço Exemplo",
      "location": {
        "region_code": "BR-SP",
        "country": "Brazil",
        "region": "São Paulo",
        "city": "São Paulo",
        "latitude": -23.55,
        "longitude": -46.63
      },
      "metrics_path": "/metrics/service-example"
    }
  ]
}
```

**Falha na consulta externa:** `502 Bad Gateway`.

```json
{
  "error": "Falha ao consultar a API de métricas",
  "code": "EXTERNAL_API_ERROR"
}
```

**Exemplo:**

```bash
curl http://localhost:3000/api/servicos/discover
```

**Origem no código:** `servicos.routes.ts` → `ServicosController.discover()` → `ServicosService.discoverServices()` → `GET {METRICS_API_URL}/services`.

### `POST /api/servicos/sync` — US02

Realiza a sincronização entre a lista de serviços externa e o PostgreSQL. Para cada serviço, verifica a localização, cria ou atualiza seu cadastro e marca como removidos os serviços persistidos que não constem mais da resposta externa.

**Corpo da requisição:** nenhum.  
**Sucesso:** `200 OK`.

```json
{
  "message": "Serviços sincronizados com sucesso",
  "created": 2,
  "updated": 5,
  "removed": 0
}
```

| Campo | Descrição |
|---|---|
| `created` | Quantidade de serviços criados nesta sincronização |
| `updated` | Quantidade de serviços já existentes que foram atualizados |
| `removed` | Quantidade de registros alterados para status `removed` |

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/servicos/sync
```

**Falha de acesso à API externa:** `502 Bad Gateway`, com código `EXTERNAL_API_ERROR`. Erros inesperados, inclusive possíveis falhas do banco, passam pelo middleware global e normalmente resultam em `500 Internal Server Error`.

**Fluxo simplificado:**

```mermaid
flowchart TD
  A[POST /api/servicos/sync] --> B[Consultar Metrics API /services]
  B --> C[Verificar ou criar localização]
  C --> D{Serviço já existe?}
  D -->|Não| E[Inserir serviço]
  D -->|Sim| F[Atualizar serviço]
  E --> G[Marcar ausentes como removed]
  F --> G
  G --> H[Retornar created, updated, removed]
```

> **Execução automática:** além dos endpoints manuais, `server.ts` inicia dois jobs independentes quando o backend sobe: `startServiceSync()` (sincronização do catálogo, a cada `SERVICE_SYNC_INTERVAL_MS`) e `startMetricsCollection()` (coleta de métricas, a cada `COLLECTION_INTERVAL_MS`). Cada ciclo só é reagendado depois que o anterior termina. Detalhes na seção 05.

### `GET /api/servicos` — listagem persistida

Lista os serviços armazenados no PostgreSQL, com localização e status. Não consulta a API externa durante esta chamada.

**Parâmetros:** nenhum.  
**Sucesso:** `200 OK`.

**Exemplo ilustrativo:**

```json
{
  "message": "1 serviços encontrados",
  "services": [
    {
      "id_service": 1,
      "external_id": "service-example",
      "name": "Serviço Exemplo",
      "status": "active",
      "last_seen_at": "2026-10-18T14:00:00.000Z",
      "region_code": "BR-SP",
      "country": "Brazil",
      "region": "São Paulo",
      "city": "São Paulo",
      "latitude": -23.55,
      "longitude": -46.63
    }
  ]
}
```

**Exemplo:**

```bash
curl http://localhost:3000/api/servicos
```

**Observação:** `latitude` e `longitude` são colunas numéricas no banco; dependendo do parser do PostgreSQL e do tipo SQL adotado, podem chegar serializadas como strings. O exemplo mostra valores numéricos para facilitar a leitura, mas o contrato precisa ser validado em execução.

---

### Intensidades de carbono

As três rotas exigem `Authorization: Bearer <token>`. A descoberta consulta `GET {CARBON_API_URL}/regions`, valida o envelope `{ regions, total }` e converte os campos externos para o modelo interno. A API externa não fornece histórico nem vigência; `registered_at` registra quando o backend observou os valores.

#### `GET /api/intensidades/discover`

Consulta o catálogo sem persistir. A coleção da resposta usa a chave `intensities` e os campos internos `regionCode`, `carbonIntensity` e `renewableShare`.

#### `POST /api/intensidades/sync`

Insere um snapshot por região em cada sincronização, sem substituir registros anteriores.

```json
{
  "message": "Intensidades sincronizadas com sucesso",
  "snapshotsInserted": 5
}
```

#### `GET /api/intensidades`

Lista os snapshots persistidos, incluindo `region_code` e `registered_at`. Os fatores são associados ao código regional e não a uma cidade arbitrária.

`CARBON_INTENSITY_MAX_AGE_MS` configura a idade máxima em milissegundos para a seleção temporal usada pelos cálculos. A variável não tem valor padrão definido: sem configuração, a busca de fator utilizável retorna ausência, em vez de selecionar silenciosamente um snapshot antigo.

Falhas HTTP, conexão, timeout ou formato inválido da Carbon API resultam em `502 Bad Gateway`. Rotas chamadas sem JWT válido resultam em `401 Unauthorized`.

## 05. Coleta de métricas — US03 / US04

A coleta consulta `GET {METRICS_API_URL}/metrics/{id_servico}` para cada serviço com status `active` e registra uma tentativa por serviço na tabela `collection`. Quando há dados válidos, a amostra também é gravada em `metrics`.

### `POST /api/metricas/collect` — disparo manual (administrador)

**Autenticação:** JWT válido e usuário administrador (`users.admin = TRUE`). O status administrativo é consultado no banco em cada chamada; usuários registrados recebem `admin = FALSE` por padrão.  
**Corpo da requisição:** nenhum.  
**Sucesso:** `200 OK`.

```json
{
  "message": "Coleta de métricas finalizada com falhas parciais",
  "skipped": false,
  "totalServices": 12,
  "successCount": 10,
  "noMetricsCount": 1,
  "errorCount": 1,
  "failures": [
    {
      "service": "Serviço Exemplo",
      "reason": "A consulta à API de métricas excedeu o tempo limite."
    }
  ]
}
```

| Campo | Descrição |
|---|---|
| `skipped` | `true` quando já havia um ciclo em andamento e nenhuma coleta nova foi iniciada |
| `totalServices` | Serviços ativos consultados neste ciclo |
| `successCount` | Coletas com métricas válidas persistidas |
| `noMetricsCount` | Serviços ativos que não retornaram métricas |
| `errorCount` | Falhas de consulta externa ou de persistência |
| `failures` | Lista com `service` e `reason` para cada erro |

**Execuções concorrentes:** o job periódico e a rota manual compartilham uma guarda de execução. Se uma coleta já estiver em andamento, a nova chamada retorna `skipped: true`, contadores zerados, `failures: []` e a mensagem `"Coleta anterior ainda em execução; nenhuma nova coleta iniciada"`.

**Acesso negado:** `401 Unauthorized` para token inválido/ausente ou usuário não encontrado; `403 Forbidden` para usuário autenticado que não é administrador.

**Exemplo:**

```bash
curl -X POST http://localhost:3000/api/metricas/collect \
  -H "Authorization: Bearer <token-de-administrador>"
```

**Estados persistidos:** `success` (coleta + métricas), `no_metrics` (serviço disponível sem métricas) e `error` (falha na consulta ou no processamento). Cada execução insere novos registros; amostras anteriores não são atualizadas nem removidas, mesmo quando os valores variam entre coletas.

### Coleta automática

`startMetricsCollection()` em `backend/src/jobs/metrics-collection.job.ts` executa um ciclo assim que o backend inicia e reagenda o próximo com `setTimeout` somente após o término do ciclo atual. Falhas são registradas no log e não encerram o ciclo automático.

| Variável | Padrão | Função |
|---|---:|---|
| `COLLECTION_INTERVAL_MS` | `60000` | Intervalo entre ciclos de coleta de métricas |
| `SERVICE_SYNC_INTERVAL_MS` | `300000` | Intervalo da sincronização do catálogo de serviços |
| `EXTERNAL_API_TIMEOUT_MS` | `10000` | Timeout de cada requisição às APIs externas |

Os intervalos devem ser inteiros positivos; valores inválidos interrompem a inicialização do backend com mensagem explícita.

---

## 06. Erros e códigos HTTP

Os endpoints de serviços e intensidades encaminham exceções ao middleware global. Os endpoints de autenticação tratam exceções dentro de seus próprios controllers.

| Código | Significado | Exemplos no projeto |
|---|---|---|
| `200 OK` | Operação realizada | Health, login, descoberta, sincronização, listagem e coleta (pode indicar falhas parciais no corpo) |
| `201 Created` | Registro criado | Cadastro de usuário |
| `400 Bad Request` | Falha tratada no cadastro | E-mail já cadastrado e outros erros capturados pelo controller |
| `401 Unauthorized` | Falha de autenticação | Credenciais inválidas ou token ausente, inválido ou associado a usuário inexistente |
| `403 Forbidden` | Usuário autenticado sem permissão | Usuário não administrador tenta iniciar coleta manual |
| `404 Not Found` | Rota/recurso inexistente | Para URLs não registradas, Express responde com seu comportamento padrão; a classe `NotFoundError` existe, mas não está aplicada aos endpoints descritos |
| `500 Internal Server Error` | Exceção não prevista | Falha inesperada nos módulos de serviços ou intensidades |
| `502 Bad Gateway` | Falha de integração externa | Erro consultando a Metrics API ou a Carbon API |

**Exemplo do formato de erro global:**

```json
{
  "error": "Erro interno do servidor",
  "code": "INTERNAL_ERROR"
}
```

> As respostas de autenticação usam `{ "error": "..." }` e não incluem o campo `code` implementado no middleware global. A unificação do contrato de erros pode ser considerada em uma evolução futura.

---

## 07. Como testar localmente

1. Configure o `.env` conforme o `.env.example`, sem publicar senhas ou segredos.
2. Inicie a infraestrutura no diretório raiz:

   ```bash
   docker compose up --build -d
   ```

3. Verifique o estado dos containers:

   ```bash
   docker compose ps
   ```

4. Teste a API em `http://localhost:3000/health`.
5. Teste a descoberta de serviços, a sincronização e a listagem, nesta ordem, para comparar os dados da origem externa com os registros persistidos.
6. Com um token de administrador, dispare uma coleta manual e confira os contadores retornados:

   ```bash
   curl -X POST http://localhost:3000/api/metricas/collect \
     -H "Authorization: Bearer <token-de-administrador>"
   ```

   A coleta automática também roda ao iniciar o backend e a cada `COLLECTION_INTERVAL_MS`; os logs do container mostram cada ciclo.
7. Para consultar logs:

   ```bash
   docker compose logs --tail=50 backend
   ```

**Portas locais do Compose:** frontend `5173`, backend `3000` e PostgreSQL `5433` (conectado à porta `5432` dentro do container).

> O comportamento final depende de PostgreSQL disponível, esquema aplicado e URLs/credenciais adequadas para os serviços externos.

---

## 08. Endpoints planejados para a Sprint 2

Os recursos abaixo fazem parte do planejamento, mas **não devem ser considerados endpoints ativos até aparecerem no código, testes e documentação de resposta**:

- histórico de coletas por serviço/período;
- dados consolidados do dashboard;
- cálculos de energia e CO₂e;
- indicadores ambientais.

Ao implementar um endpoint novo, registrar nesta documentação: método, URL, parâmetros, autenticação, resposta de sucesso, erros esperados e exemplo de verificação.

## 09. Integrações e funcionalidades futuras

A Metrics API externa fornece a rota `/services`, utilizada na descoberta e sincronização, e a rota `/metrics/{id_servico}`, consumida pela coleta manual (restrita a administradores) e pelo job periódico. Ainda não existe endpoint interno para consultar o histórico de coletas por serviço ou período.

| Recurso | Situação na versão analisada |
|---|---|
| Descoberta e sincronização de serviços | Implementadas |
| Cadastro e login com emissão de JWT | Implementados, com ressalvas descritas acima |
| Proteção de endpoints por JWT | Aplicada seletivamente; coleta manual restrita a administradores |
| Coleta de métricas | Implementada (manual com administrador e automática); histórico planejado |
| Cálculo de consumo energético e CO₂e | Planejado |
| Descoberta e snapshots da Carbon Intensity API | Implementados nas rotas de intensidades |
| Endpoints de indicadores consolidados | Planejados; arquivos de módulo ainda vazios |
| Ranking, comparações e filtros por período | Evolução prevista nas próximas sprints |

**Importante:** nomes e caminhos de endpoints futuros somente devem entrar na tabela oficial quando forem definidos pela equipe e registrados no código. Isso evita que o frontend dependa de rotas ainda inexistentes.

---

## 10. Onde encontrar os endpoints no projeto

```text
backend/src/
├── app.ts                         # Registra prefixos e middlewares
├── server.ts                      # Inicializa o servidor e os jobs periódicos
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts         # POST /auth/register e /auth/login
│   │   ├── auth.controller.ts     # Entrada e saída HTTP
│   │   ├── auth.service.ts        # Regras de autenticação
│   │   └── auth.repository.ts     # Consultas SQL de usuários
│   ├── servicos/
│   │   ├── servicos.routes.ts     # GET /discover, POST /sync, GET /
│   │   ├── servicos.controller.ts # Entrada e saída HTTP
│   │   ├── servicos.service.ts    # Descoberta e sincronização
│   │   └── servicos.repository.ts # Consultas SQL de serviços
│   └── intensidades/
│       ├── intensidades.routes.ts     # GET /discover, POST /sync, GET /
│       ├── intensidades.controller.ts # Contrato HTTP das intensidades
│       ├── intensidades.service.ts    # Mapeamento e snapshots regionais
│       └── intensidades.repository.ts # Histórico e seleção temporal
├── integrations/
│   └── carbon-api.ts              # Consulta e validação da Carbon API
├── jobs/
│   ├── service-sync.job.ts        # Sincronização periódica do catálogo
│   └── metrics-collection.job.ts  # Coleta periódica de métricas
└── shared/
    ├── middlewares/error.middleware.ts
    └── errors/AppError.ts
```

**Como ler o fluxo:** uma **rota** define o endereço HTTP; o **controller** recebe a requisição e formata a resposta; o **service** implementa as regras de negócio; o **repository** acessa o PostgreSQL.

---

## 11. Manutenção desta documentação

Sempre que um endpoint for criado ou alterado, atualizar:

- Método e URL;
- Campos de entrada e formato da resposta;
- Códigos de status e tratamento de erro;
- Requisitos de autenticação;
- Exemplo de teste;
- Estado de implementação e vínculo com a user story correspondente.

**Código-fonte de referência:** snapshot do repositório enviado para revisão em 18/10/2026. A versão publicada na branch `develop` deve ser conferida novamente antes de considerar este documento um contrato definitivo.
