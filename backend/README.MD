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
- Teste unitário

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
└── src/
    ├── app.ts
    ├── server.ts
    ├── db/
    │   └── connection.ts
    ├── integrations/
    │   ├── metrics-api.ts
    │   └── carbon-api.ts
    └── modules/
        └── <modulo>/
            ├── <modulo>.routes.ts
            ├── <modulo>.controller.ts
            ├── <modulo>.service.ts
            └── <modulo>.repository.ts
```

<!-- Atualizar esta estrutura conforme os módulos forem criados -->

---

## 🔌 Integrações

### APIs auxiliares da Unilaunch

| API                                | Uso no backend                                                   | Documentação                                                  |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Agregador de Métricas             | Descoberta dos serviços e coleta das métricas                  | [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs) |
| Serviço de Intensidade de Carbono | Consulta da intensidade de carbono para o cálculo das emissões | [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)   |

As chamadas a essas APIs ficam na pasta `src/integrations/`, separadas das regras de negócio. Falhas nas APIs auxiliares são tratadas para que não interrompam o funcionamento do restante da aplicação.

### PostgreSQL

A conexão com o banco é configurada em `src/db/connection.ts` e utilizada apenas pelos repositories. O esquema do banco e as instruções para criá-lo estão em [`database/README.md`](../database/README.md).

---

## 🔐 Variáveis de Ambiente

As variáveis ficam no arquivo `.env` na raiz do projeto. Use o [`.env.example`](../.env.example) como modelo e nunca envie o `.env` para o repositório.

| Variável                                                                                    | Descrição                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| POSTGRES_HOST<br />POSTGRES_PORT<br />POSTGRES_DB<br />POSTGRES_USER<br />POSTGRESS_PASSWORD | Dados de conexão com o PostgreSQL             |
| <br />METRICS_API_URL<br />CARBON_API_URL                                                    | URLs das APIs auxiliares (métricas e carbono) |
| <br />JWT_SECRET<br />JWT_EXPIRES_IN                                                         | Segredo usado na assinatura do JWT             |
| CORS_ORIGIN<br />VITE_API_URL                                                                | Porta da API                                   |

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

| Comando               | Função                                                       |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Executa`src/server.ts` com recarga ao salvar, usando `tsx` |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos                           |
| `npm run build`     | Compila os arquivos de`src/` para `dist/`                  |
| `npm start`         | Executa`dist/server.js` após o build                        |

---

## 📚 Documentação Relacionada

- [`docs/api.md`](../docs/api.md): endpoints, parâmetros, respostas e autenticação
- [`docs/arquitetura.md`](../docs/arquitetura.md): fluxo dos dados entre APIs auxiliares, backend, banco e frontend
- [`docs/calculos.md`](../docs/calculos.md): fórmulas e premissas do cálculo de energia e CO₂e
- [`database/README.md`](../database/README.md): banco de dados
- [`frontend/README.md`](../frontend/README.md): frontend

