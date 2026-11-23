<div align="center">

# 🌱 GreenER

### Monitoramento de consumo energético e emissões de CO₂e em serviços digitais

**ABP · DSM · FATEC Jacareí · 2º semestre de 2026**

[![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)](frontend/README.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend%20%2B%20Backend-3178C6?logo=typescript&logoColor=white)](docs/arquitetura.md)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=node.js&logoColor=white)](backend/README.md)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](database/README.md)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](compose.yaml)

**Projeto desenvolvido pela equipe Let:zApplin em parceria com a Unilaunch.**

</div>

---

## 🌍 O projeto

Empresas já monitoram CPU, memória, armazenamento, rede e disponibilidade de suas aplicações. O GreenER amplia esse olhar: utiliza essas métricas para estimar o **consumo de energia** e a **emissão de CO₂e** dos serviços, preservando o histórico operacional e permitindo analisar a evolução do ambiente ao longo do tempo.

```text
métricas computacionais
        ↓
potência estimada
        ↓
energia estimada
        ↓
intensidade de carbono regional
        ↓
emissão estimada de CO₂e
```

> O GreenER trabalha com **estimativas ambientais**, não com medições físicas diretas de energia.

---

## ⚡ Acesso rápido

| Quero acessar... | Link |
| --- | --- |
| 🖥️ **Frontend** | [`frontend/README.md`](frontend/README.md) |
| ⚙️ **Backend / API** | [`backend/README.md`](backend/README.md) · [`docs/api.md`](docs/api.md) |
| 🗄️ **Banco de dados** | [`database/README.md`](database/README.md) |
| 🧩 **Arquitetura** | [`docs/arquitetura.md`](docs/arquitetura.md) |
| 🤖 **Assistente Karma (Ollama)** | [`docs/assistente-ia.md`](docs/assistente-ia.md) |
| 🌱 **Cálculos ambientais** | [`docs/calculos.md`](docs/calculos.md) |
| 📦 **Plano de entregas** | [`docs/plano-de-entregas.md`](docs/plano-de-entregas.md) |
| ✅ **Validação técnica** | [`docs/testes/manualdevalidacao.md`](docs/testes/manualdevalidacao.md) |

### Sprints

| Sprint | Período | Registro | Demonstração | Situação |
| --- | --- | --- | --- | --- |
| **Sprint 1** | 28/09–19/10/2026 | [`sprint-1.md`](docs/sprints/sprint-1.md) | [▶ Vídeo](https://youtu.be/pGdiciJxTPw) | ✅ Finalizada |
| **Sprint 2** | 20/10–09/11/2026 | [`sprint-2.md`](docs/sprints/sprint-2.md) | [▶ Vídeo](https://youtu.be/qW38NnthF8Q) | ✅ Finalizada |
| **Sprint 3** | 10/11–23/11/2026 | [`sprint-3.md`](docs/sprints/sprint-3.md) | Demonstração final do MVP | ✅ Concluída |

> A visualização geográfica foi antecipada da Sprint 3 e integrada ao Monitoramento. Ranking, comparação e refinamentos finais de análise foram concluídos na Sprint 3.

---

## ✨ O que o GreenER já faz

<table>
<tr>
<td width="50%" valign="top">

### 🔎 Monitoramento

- descoberta e sincronização automática dos serviços;
- coleta periódica de CPU, memória, disco e rede;
- identificação de serviços removidos;
- estados `success`, `no_metrics`, `unavailable` e `error`;
- indicadores ambientais consolidados;
- atualização automática;
- localização e visualização geográfica.

</td>
<td width="50%" valign="top">

### 📈 Análises

- seleção de serviço;
- seleção de período;
- histórico de energia;
- gráfico temporal;
- identificação de lacunas;
- navegação a partir do Monitoramento;
- ranking por energia ou CO₂e no período selecionado;
- comparação de dois ou mais serviços no mesmo período;
- sinalização de dados parciais e identificação de serviços removidos com histórico no período como “Removido” no ranking.

</td>
</tr>
</table>

Também estão implementados:

- ✅ ranking de impacto por energia ou CO₂e;
- ✅ comparação de dois ou mais serviços no mesmo período;
- ✅ filtros temporais e histórico ambiental por serviço;
- ✅ projeções de localização e redistribuição de serviços;
- ✅ visualização geográfica com MapLibre;
- ✅ integração com intensidade de carbono por região;
- ✅ estimativa de energia por serviço;
- ✅ estimativa de emissão de CO₂e por serviço;
- ✅ autenticação JWT;
- ✅ autorização administrativa para coleta manual;
- ✅ Assistente Karma com Ollama local, respostas determinísticas e fallback para
  modo regras;
- ✅ persistência PostgreSQL após reinicialização dos containers;
- ✅ visualização geográfica — US13 antecipada e integrada ao Monitoramento;
- ✅ responsividade e experiência móvel dos principais fluxos;
- ✅ cache em memória e fallback do Assistente Karma.

### Arquitetura de desempenho — TEC26

`Home`, `Monitoring` e `Analyses` usam lazy loading para reduzir o JavaScript da
entrada inicial. Os hooks `useMonitoring`, `useDashboardSummary`,
`useServiceIndicators` e `useServiceIndicatorHistory` verificam a visibilidade da
aba por meio de `document.hidden` e suspendem suas requisições enquanto a página
permanece em segundo plano. Ao retornar à aba, o próximo ciclo de atualização
retoma o polling sem acumular chamadas concorrentes.

---

## 🧠 Como funciona

```text
APIs externas
  Metrics Aggregator + Carbon Intensity
        │
        ▼
Backend Node.js / Express / TypeScript
  jobs • regras • cálculos • JWT • Chat/Karma
        │
        ├──────── SQL explícito ────────▶ PostgreSQL 17
        │                                   │
        │◀──────── dados persistidos ───────┘
        │
        ▼
Frontend React / TypeScript / Vite
  Monitoramento • Análises • Ranking • Comparação • Mapa
```

O fluxo completo começa na descoberta de serviços e termina na apresentação das informações no frontend:

1. o backend sincroniza o catálogo por meio da Metrics Aggregator;
2. jobs em background coletam CPU, memória, disco e rede em intervalos configurados;
3. PostgreSQL preserva serviços, tentativas, métricas, localização e usuários;
4. os fatores regionais da Carbon Intensity API alimentam os cálculos ambientais;
5. o backend calcula energia e CO₂e e entrega indicadores consolidados;
6. React apresenta histórico, ranking, comparação, mapa e projeções;
7. o Karma consulta os dados do projeto e usa Ollama local para classificar e redigir respostas, com cache e fallback determinístico.

Toda a solução é executada por Docker Compose. A IA é isolada em um profile opcional: sem o profile `ai`, o backend permanece operacional e o Assistente Karma usa o modo determinístico.

### Etapas principais

**1. Descoberta** — o backend consulta o Agregador de Métricas e sincroniza o catálogo de serviços.

**2. Coleta** — cada serviço ativo é consultado periodicamente. Uma tentativa pode ser preservada em `collection` mesmo quando não existem métricas válidas.

**3. Persistência** — PostgreSQL armazena serviços, localizações, tentativas de coleta, métricas válidas, snapshots de intensidade de carbono e usuários.

**4. Cálculo ambiental** — energia e CO₂e são calculados a partir do histórico conforme o modelo documentado em [`docs/calculos.md`](docs/calculos.md).

**5. Apresentação** — o Monitoramento exibe a situação operacional; Análises concentra a exploração histórica.

---

## 🔌 APIs auxiliares

| API | Uso no GreenER | Documentação |
| --- | --- | --- |
| **Agregador de Métricas** | Descoberta dos serviços e coleta periódica de métricas | [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs) |
| **Serviço de Intensidade de Carbono** | Fatores regionais usados no cálculo de CO₂e | [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs) |

O ambiente monitorado é dinâmico: serviços podem surgir, desaparecer, tornar-se indisponíveis ou deixar de fornecer métricas.

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
| --- | --- |
| **Frontend** | React 19 · TypeScript · Vite · React Router · Recharts · MapLibre GL · OpenFreeMap · MapTiler SDK · Phosphor Icons |
| **Backend** | Node.js · Express · TypeScript · JWT · `pg` |
| **Assistente IA** | Karma · Ollama local · `qwen2.5:3b` |
| **Dados** | PostgreSQL 17 · SQL explícito e parametrizado |
| **Infraestrutura** | Docker · Docker Compose · Git · GitHub |

---

## 📂 Organização do repositório

```text
GreenER/
├── frontend/          # React, Monitoramento, Análises, mapa e gráficos
├── backend/           # API REST, autenticação, regras, jobs e integrações
├── database/          # Schema, migrations e documentação SQL
├── docs/              # Planejamento, arquitetura, cálculos, API e sprints
├── compose.yaml       # Ambiente integrado
├── compose.test.yaml  # Integração PostgreSQL
└── .env.example       # Modelo das variáveis de ambiente
```

| Pasta / arquivo | Referência |
| --- | --- |
| `frontend/` | [`frontend/README.md`](frontend/README.md) |
| `backend/` | [`backend/README.md`](backend/README.md) |
| `database/` | [`database/README.md`](database/README.md) |
| `docs/` | Documentação técnica e registros das sprints |
| `compose.yaml` | Execução integrada com Docker Compose |
| `compose.test.yaml` | Ambiente para testes de integração PostgreSQL |

---

## ▶️ Como executar

### 1. Clone o repositório

```bash
git clone https://github.com/LetzApplin/GreenER.git
cd GreenER
```

### 2. Crie o arquivo de ambiente

Linux/macOS:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Revise as variáveis antes de iniciar a aplicação.

### 3. Suba o ambiente

```bash
docker compose up --build
```

O Compose inicia **PostgreSQL + backend + frontend**.

Para iniciar também o Ollama e o Assistente Karma com IA local:

```bash
docker compose --profile ai up --build
```

Na primeira inicialização com IA, o serviço `ollama-init` baixa o modelo configurado em `OLLAMA_MODEL` e prepara o volume persistente `ollama_data`. A inicialização pode levar alguns minutos.

### ⚙️ Variáveis importantes

| Variável | Finalidade | Padrão do `.env.example` |
| --- | --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Credenciais e banco PostgreSQL | `greener` / `greener` / valor a trocar |
| `JWT_SECRET` | Assinatura dos tokens de autenticação | valor a trocar |
| `JWT_EXPIRES_IN` | Validade do JWT, em segundos ou duração | `7d` |
| `METRICS_API_URL` | API de serviços e métricas | `https://metrics.unilaunch.org` |
| `CARBON_API_URL` | API de intensidade de carbono | `https://carbon.unilaunch.org` |
| `COLLECTION_INTERVAL_MS` | Intervalo de coleta de métricas | `60000` |
| `SERVICE_SYNC_INTERVAL_MS` | Intervalo de sincronização dos serviços | `60000` |
| `CARBON_INTENSITY_SYNC_INTERVAL_MS` | Atualização dos fatores regionais | `300000` |
| `OLLAMA_URL` | Endereço do Ollama | `http://localhost:11434` no host |
| `OLLAMA_MODEL` | Modelo usado pelo Karma | `qwen2.5:3b` |
| `OLLAMA_TIMEOUT_MS` | Timeout das operações de IA | `60000` |
| `OLLAMA_NUM_CTX` | Janela de contexto do modelo | `4096` |
| `OLLAMA_ENABLED` | Habilita ou desabilita o Ollama | `true` |

Dentro do Compose, o backend usa `OLLAMA_URL=http://ollama:11434`. A porta `11434` fica disponível no host quando o profile `ai` está ativo.

### 4. Acesse

| Serviço | Endereço |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:3000` |
| Healthcheck | `http://localhost:3000/health` |
| Ollama, com profile `ai` | `http://localhost:11434` |
| PostgreSQL no host | `localhost:5433` |
| PostgreSQL na rede Docker | `postgres:5432` |

### Comandos úteis

```bash
# Segundo plano
docker compose up -d

# Segundo plano com IA/Ollama
docker compose --profile ai up -d

# Conferir containers
docker compose ps

# Encerrar preservando o volume
docker compose down

# Encerrar removendo também os dados
docker compose down -v
```

> ⚠️ `docker compose down -v` remove o volume PostgreSQL. Não use quando precisar preservar o histórico ou validar persistência.

---

## 🔄 Desenvolvimento e hot reload

Alterações em `.ts`, `.tsx` e `.css` são refletidas pelo ambiente de desenvolvimento sem reconstrução completa da imagem.

Mudanças em `package.json`, `package-lock.json` ou `Dockerfile` podem exigir:

```bash
docker compose up --build
```

---

## ✅ Testes e validação

### Frontend

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

### Backend — suíte comum

```bash
cd backend
npm test
npm run typecheck
```

### Integração PostgreSQL

Na raiz do projeto:

```bash
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
```

Ao terminar:

```bash
docker compose -f compose.test.yaml down -v
```

### Resultado do fechamento técnico da Sprint 3

| Validação | Resultado |
| --- | ---: |
| Backend — suíte comum | **300 testes aprovados; 7 ignorados** |
| Integração PostgreSQL | **7/7 aprovados** |
| Frontend | **62 testes aprovados** |
| Typecheck backend | ✅ |
| Typecheck frontend | ✅ |
| Build de produção | ✅ |

Também foram validados: persistência após restart, coleta automática, atualização automática do frontend, autenticação JWT, autorização `401 / 403 / 200`, estados `no_metrics` e `unavailable`, consistência entre dashboard e indicadores, histórico ambiental por serviço, filtros temporais, ranking, comparação, mapa, assistente Karma e cenários de indisponibilidade ou fallback.

Evidências:

- [`docs/testes/manual_teste_unitario.md`](docs/testes/manual_teste_unitario.md)
- [`docs/testes/manualdevalidacao.md`](docs/testes/manualdevalidacao.md)

---

## 📚 Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/plano-de-entregas.md`](docs/plano-de-entregas.md) | Planejamento das sprints, critérios, responsáveis e evidências |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Camadas, responsabilidades e fluxo dos dados |
| [`docs/calculos.md`](docs/calculos.md) | Fórmulas, unidades, fatores, premissas e exemplo de cálculo |
| [`docs/api.md`](docs/api.md) | Endpoints, parâmetros, respostas e autenticação |
| [`database/README.md`](database/README.md) | Schema, migrations, DML e persistência |
| [`frontend/README.md`](frontend/README.md) | Organização das telas e execução do frontend |
| [`backend/README.md`](backend/README.md) | Organização do backend, integrações e configuração |
| [`docs/testes/manualdevalidacao.md`](docs/testes/manualdevalidacao.md) | Validação técnica ponta a ponta |
| [`docs/testes/consolidacao_testes_sprint3.md`](docs/testes/consolidacao_testes_sprint3.md) | Consolidação dos testes e evidências da Sprint 3 |

### Materiais do desafio

- [Documentação do projeto — Unilaunch](https://docs.unilaunch.org/share/x29w8jgwdb/p/greener-abp-2-semestre-b7FiqU6UC1)
- [Documentos escritos da ABP](https://docs.google.com/document/d/1X6rmJBm1bTjtur5AG_jwcQY1v6v7jn2c4BwI4HIcfgg/edit?usp=sharing)

---

## 👥 Equipe

| Nome | Papel | GitHub |
| --- | --- | --- |
| **Vitor Hirch** | Scrum Master | [@vitorhirch](https://github.com/vitorhirch) |
| **Gustavo Koiti** | Product Owner | [@gustavokoitiyoshimura](https://github.com/gustavokoitiyoshimura) |
| **Igor Souza** | Desenvolvedor | [@igorcsouzaa](https://github.com/igorcsouzaa) |
| **Marcello Campbell** | Desenvolvedor | [@mparise28-dev](https://github.com/mparise28-dev) |
| **Patricia R. Maidana** | Desenvolvedora | [@PatyMaidana](https://github.com/PatyMaidana) |

**Instituição:** FATEC Jacareí — Desenvolvimento de Software Multiplataforma (DSM)  
**Parceiro:** Unilaunch
