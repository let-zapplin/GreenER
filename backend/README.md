# ⚙️ GreenER: Backend

API do GreenER, responsável por coletar as métricas dos serviços monitorados, calcular as estimativas de consumo de energia e emissão de CO₂e, armazenar os dados e disponibilizá-los ao frontend.

Voltar para o [README principal](../README.md).

---

## 📋 Índice

- 🛠 Tecnologias
- 📂 Organização do Código
- 🔌 Integrações
- 🔐 Variáveis de Ambiente
- ▶️ Como Executar
- 📚 Documentação Relacionada

---

## 🛠 Tecnologias

- Node.js com TypeScript
- `tsx` para execução em desenvolvimento com recarga automática
- API REST
- PostgreSQL, com SQL explícito (sem ORM)
- Autenticação com JWT
- Docker
- Vitest para testes automatizados

---

## 📂 Organização do Código

O backend é organizado em módulos, e cada módulo separa as responsabilidades em camadas:

| Camada           | Responsabilidade                                  |
| ---------------- | ------------------------------------------------- |
| `routes`       | Define os endpoints do recurso                    |
| `controllers`  | Recebe as requisições e devolve as respostas    |
| `services`     | Concentra as regras de negócio                   |
| `repositories` | Acessa o PostgreSQL por meio de SQL parametrizado |

Estrutura geral:

```
backend/
├── Dockerfile
├── package.json
├── README.md
├── tsconfig.json
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
    │   ├── dashboard/
    │   │   ├── dashboard.controller.ts
    │   │   ├── dashboard.repository.ts
    │   │   ├── dashboard.routes.ts
    │   │   └── dashboard.service.ts
    │   ├── auth/
    │   │   ├── auth.controller.ts
    │   │   ├── auth.repository.ts
    │   │   ├── auth.routes.ts
    │   │   └── auth.service.ts
    │   ├── coletas/
    │   │   ├── coletas.repository.ts
    │   │   ├── coletas.controller.ts
    │   │   ├── coletas.routes.ts
    │   │   └── coletas.service.ts
    │   ├── indicadores/
    │   │   ├── indicadores.controller.ts
    │   │   ├── indicadores.repository.ts
    │   │   ├── indicadores.routes.ts
    │   │   └── indicadores.service.ts
    │   ├── intensidades/
    │   │   ├── intensidades.controller.ts
    │   │   ├── intensidades.repository.ts
    │   │   ├── intensidades.routes.ts
    │   │   └── intensidades.service.ts
    │   ├── localidades/
    │   │   └── localidades.repository.ts
    │   └── servicos/
    │       ├── servicos.controller.ts
    │       ├── servicos.repository.ts
    │       ├── servicos.routes.ts
    │       ├── servicos.service.test.ts
    │       └── servicos.service.ts
    └── shared/
        ├── errors/
        │   └── AppError.ts
        ├── middlewares/
        │   ├── admin.middleware.ts
        │   ├── auth.middleware.ts
        │   └── error.middleware.ts
        └── utils/
            ├── jwt-expiration.ts
            ├── jwt.util.ts
            └── password.util.ts
```

O servidor inicia os ciclos automáticos de descoberta e sincronização do catálogo de serviços, coleta de métricas e sincronização de intensidades de carbono. As falhas em um ciclo são registradas e não impedem que o ciclo seguinte seja agendado.

---

## 🔌 Integrações

### APIs auxiliares da Unilaunch

| API                                | Uso no backend                                                   | Documentação                                                  |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Agregador de Métricas             | Descoberta dos serviços e coleta das métricas                  | [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs) |
| Serviço de Intensidade de Carbono | Consulta da intensidade de carbono para o cálculo das emissões | [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)   |

As chamadas a essas APIs ficam na pasta `src/integrations/`, separadas das regras de negócio. Se uma chamada falhar durante um ciclo automático, o erro é registrado e o próximo ciclo é agendado; nas requisições HTTP, os erros seguem pelo middleware de tratamento da API.

### PostgreSQL

A conexão com o banco é configurada em `src/db/connection.ts` e utilizada apenas pelos repositories. O esquema do banco e as instruções para criá-lo estão em [`database/README.md`](../database/README.md).

---

## 🔐 Variáveis de Ambiente

As variáveis ficam no arquivo `.env` na raiz do projeto. Use o [`.env.example`](../.env.example) como modelo e nunca envie o `.env` para o repositório. Os valores padrão abaixo são aplicados quando a variável é omitida; o arquivo de exemplo pode definir valores diferentes.

| Variável | Descrição |
| --- | --- |
| `NODE_ENV` | Ambiente de execução. Padrão: `development`. |
| `PORT` | Porta da API. Padrão: `3000`. |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Dados de conexão com o PostgreSQL. `POSTGRES_PORT` tem padrão `5432`; configure os demais valores conforme o ambiente. |
| `METRICS_API_URL`, `CARBON_API_URL` | URLs das APIs auxiliares de métricas e carbono; ambas são obrigatórias. |
| `EXTERNAL_API_TIMEOUT_MS` | Tempo limite das requisições às APIs externas, em milissegundos. Padrão: `5000`. |
| `JWT_SECRET` | Segredo obrigatório para assinar e verificar tokens JWT. |
| `JWT_EXPIRES_IN` | Validade do token JWT em segundos ou duração, por exemplo `3600`, `15m` ou `1h`. Padrão: `3600` segundos. |
| `COLLECTION_INTERVAL_MS` | Intervalo entre ciclos automáticos de coleta de métricas, em milissegundos. Padrão: `60000`. |
| `SERVICE_SYNC_INTERVAL_MS` | Intervalo entre ciclos automáticos de descoberta e sincronização de serviços, em milissegundos. Padrão: `300000`. |
| `CARBON_INTENSITY_SYNC_INTERVAL_MS` | Intervalo entre ciclos de sincronização das intensidades de carbono, em milissegundos. Padrão: `300000`. |
| `CARBON_INTENSITY_MAX_AGE_MS` | Idade máxima aceita para snapshots de intensidade usados nos cálculos, em milissegundos. Padrão: `900000` (15 minutos). |
| `CORS_ORIGIN` | Origem do frontend permitida pelo CORS. Padrão: `http://localhost:5173`. |

`VITE_API_URL` e `VITE_MAPTILER_API_KEY` são configurações do frontend, não da API; consulte o [README do frontend](../frontend/README.md).

---

## ▶️ Como Executar

### Com Docker (recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

### Localmente

Requisitos: Node.js 24 ou superior, npm e um PostgreSQL disponível com o esquema já aplicado.

```bash
cd backend
npm install
npm run dev
```

| Comando | Função |
| --- | --- |
| `npm run dev` | Executa `src/server.ts` com recarga ao salvar, usando `tsx`. |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos. |
| `npm run build` | Compila os arquivos de `src/` para `dist/`. |
| `npm start` | Executa `dist/server.js` após o build. |
| `npm run test` | Executa os testes automatizados com Vitest. |

---

## 📚 Documentação Relacionada

- [`docs/api.md`](../docs/api.md): endpoints, parâmetros, respostas e autenticação
- [`docs/arquitetura.md`](../docs/arquitetura.md): fluxo dos dados entre APIs auxiliares, backend, banco e frontend
- [`docs/calculos.md`](../docs/calculos.md): fórmulas e premissas do cálculo de energia e CO₂e
- [`database/README.md`](../database/README.md): banco de dados
- [`frontend/README.md`](../frontend/README.md): frontend
- [`docs/testes/manual_teste_unitario.md`](../docs/testes/manual_teste_unitario.md): manual de execução de teste unitário
