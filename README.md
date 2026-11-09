# 🌱 GreenER — Monitoramento de Consumo Energético e Emissões de CO₂e

Projeto de **Aprendizagem Baseada em Projetos (ABP)** do 2º semestre de 2026 do curso de **Desenvolvimento de Software Multiplataforma (DSM)** da **FATEC Jacareí**, desenvolvido em parceria com a **Unilaunch**.

O GreenER monitora serviços de uma infraestrutura digital, preserva seu histórico operacional e transforma métricas de **CPU, memória, disco e rede** em estimativas de **consumo de energia** e **emissão de CO₂e**, permitindo acompanhar o ambiente atual e analisar sua evolução ao longo do tempo.

---

## 🔗 Acesso rápido

| Sprint | Registro | Demonstração |
| --- | --- | --- |
| **Sprint 1** | [`docs/sprints/sprint-1.md`](docs/sprints/sprint-1.md) | [Vídeo do incremento](https://youtu.be/pGdiciJxTPw) |
| **Sprint 2** | [`docs/sprints/sprint-2.md`](docs/sprints/sprint-2.md) |  [Vídeo do incremento](https://youtu.be/qW38NnthF8Q) |
| **Sprint 3** | [`docs/sprints/sprint-3.md`](docs/sprints/sprint-3.md) | A definir após a entrega |

> A Sprint 2 possui incremento tecnicamente validado em 09/11/2026. O fechamento oficial permanece condicionado ao registro da Sprint Review.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Monitoramento e Análises](#-monitoramento-e-análises)
- [Tecnologias](#-tecnologias)
- [Como Funciona](#-como-funciona)
- [Organização do Repositório](#-organização-do-repositório)
- [Como Executar](#️-como-executar)
- [Como Testar e Validar](#-como-testar-e-validar)
- [Documentação](#-documentação)
- [Sprints](#-sprints)
- [Equipe](#-equipe)

---

## 📌 Sobre o Projeto

Empresas já monitoram CPU, memória, armazenamento, rede e disponibilidade de suas aplicações. Essas métricas, porém, normalmente são utilizadas para desempenho e operação, não para compreender seu **impacto ambiental**.

O GreenER busca preencher essa lacuna.

A partir das métricas coletadas e da intensidade de carbono da região onde cada serviço opera, o sistema estima:

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

Os resultados são apresentados por serviço e para o ambiente monitorado como um todo.

### APIs auxiliares

O projeto consome dois serviços fornecidos pela Unilaunch:

| API | Uso no GreenER | Documentação |
| --- | --- | --- |
| **Agregador de Métricas** | Descoberta dos serviços e coleta periódica de métricas | [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs) |
| **Serviço de Intensidade de Carbono** | Fatores regionais usados no cálculo de CO₂e | [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs) |

O ambiente monitorado é dinâmico: serviços podem surgir, desaparecer, tornar-se indisponíveis ou deixar de fornecer métricas.

---

## ✨ Funcionalidades

> Esta lista representa funcionalidades implementadas e verificadas até o fechamento técnico da Sprint 2.

- ✅ descoberta e sincronização automática dos serviços;
- ✅ coleta periódica de CPU, memória, disco e rede;
- ✅ histórico persistente das tentativas de coleta;
- ✅ diferenciação entre `success`, `no_metrics`, `unavailable` e `error`;
- ✅ identificação de serviços removidos do catálogo;
- ✅ integração com intensidade de carbono por região;
- ✅ estimativa de energia por serviço;
- ✅ estimativa de emissão de CO₂e por serviço;
- ✅ indicadores ambientais consolidados por período;
- ✅ dashboard operacional com atualização automática;
- ✅ histórico ambiental por serviço em Análises;
- ✅ autenticação JWT;
- ✅ autorização administrativa para coleta manual;
- ✅ persistência PostgreSQL após reinicialização dos containers;
- 🔄 visualização geográfica dos serviços reais — funcionalidade antecipada da Sprint 3 e em revisão no fechamento da Sprint 2;
- 🔄 reformulação visual do Monitoramento — TEC37 em revisão.

Para a Sprint 3 permanecem principalmente ranking, comparação entre serviços, filtros analíticos, consolidação do mapa, refinamentos de responsividade e otimizações finais.

---

## 🖥️ Monitoramento e Análises

O frontend separa duas responsabilidades principais.

### Monitoramento

A página **Monitoramento** apresenta a situação operacional atual:

- serviços monitorados;
- status e última coleta;
- consumo estimado;
- emissão estimada;
- indicadores consolidados;
- localização;
- atualização automática;
- visualização geográfica.

### Análises

A página **Análises** concentra exploração temporal:

- seleção de serviço;
- seleção de período;
- histórico de energia;
- gráfico temporal;
- identificação de lacunas;
- navegação a partir do Monitoramento.

Essa separação evita sobrecarregar o dashboard operacional com recursos de análise aprofundada.

---

## 🛠 Tecnologias

### Frontend

- React 19;
- TypeScript;
- Vite;
- React Router;
- Recharts;
- MapLibre GL;
- OpenFreeMap;
- MapTiler SDK;
- Phosphor Icons.

### Backend

- Node.js;
- Express;
- TypeScript;
- JWT;
- biblioteca `pg`.

### Dados e infraestrutura

- PostgreSQL 17;
- Docker;
- Docker Compose;
- SQL explícito e parametrizado;
- Git e GitHub.

Os detalhes estão nos READMEs específicos:

- [`frontend/README.md`](frontend/README.md)
- [`backend/README.md`](backend/README.md)
- [`database/README.md`](database/README.md)

---

## 🚀 Como Funciona

O fluxo principal validado na Sprint 2 é:

```text
Metrics Aggregator /services
        ↓
sincronização do catálogo
        ↓
Metrics Aggregator /metrics/{id}
        ↓
coleta periódica
        ↓
PostgreSQL
service → collection → metrics
        ↓
Carbon Intensity API
        ↓
snapshots regionais
        ↓
cálculo de energia + CO₂e
        ↓
indicadores / dashboard / histórico
        ↓
Monitoramento + Análises
```

### 1. Descoberta

O backend consulta o Agregador de Métricas e sincroniza o catálogo de serviços.

### 2. Coleta

Cada serviço ativo é consultado periodicamente.

Uma tentativa sempre pode ser preservada em `collection`, mesmo quando nenhuma métrica válida existe.

### 3. Persistência

O PostgreSQL armazena:

- serviços;
- localizações;
- tentativas de coleta;
- métricas válidas;
- snapshots de intensidade de carbono;
- usuários.

Os valores de energia e CO₂e **não precisam ser persistidos diretamente**: são calculados a partir dos dados históricos quando os indicadores são consultados.

### 4. Cálculo ambiental

O backend transforma as métricas em estimativas ambientais utilizando o modelo documentado em:

[`docs/calculos.md`](docs/calculos.md)

### 5. Apresentação

O frontend consome os resultados reais da API GreenER.

O Monitoramento apresenta o ambiente operacional e Análises apresenta o histórico.

O fluxo completo está documentado em:

[`docs/arquitetura.md`](docs/arquitetura.md)

---

## 📂 Organização do Repositório

| Pasta / Arquivo | Conteúdo |
| --- | --- |
| [`frontend/`](frontend/README.md) | Aplicação React, Monitoramento, Análises, mapa e gráficos |
| [`backend/`](backend/README.md) | API REST, autenticação, regras de negócio, jobs e integrações |
| [`database/`](database/README.md) | Schema, migrations e documentação SQL |
| [`docs/`](docs/) | Planejamento, arquitetura, cálculos, API, testes e registros das sprints |
| [`compose.yaml`](compose.yaml) | Execução integrada com Docker Compose |
| [`compose.test.yaml`](compose.test.yaml) | Ambiente para testes de integração PostgreSQL |
| [`.env.example`](.env.example) | Modelo das variáveis de ambiente |

---

## ▶️ Como Executar

### 1. Clone o repositório

```bash
git clone https://github.com/LetzApplin/GreenER.git
cd GreenER
```

### 2. Crie o arquivo de ambiente

A partir do modelo:

```bash
cp .env.example .env
```

No PowerShell, também é possível utilizar:

```powershell
Copy-Item .env.example .env
```

Revise as variáveis antes de iniciar a aplicação.

### 3. Suba o ambiente

```bash
docker compose up --build
```

São iniciados:

- PostgreSQL;
- backend;
- frontend.

### 4. Acesse

```text
Frontend:     http://localhost:5173
Backend:      http://localhost:3000
Healthcheck:  http://localhost:3000/health
PostgreSQL:   localhost:5433
```

Dentro da rede Docker:

```text
postgres:5432
```

A porta `5433` é utilizada apenas pelo host.

### 5. Executar em segundo plano

```bash
docker compose up -d
```

### 6. Conferir containers

```bash
docker compose ps
```

### 7. Encerrar

```bash
docker compose down
```

Os dados do PostgreSQL permanecem no volume.

Para remover também os dados:

```bash
docker compose down -v
```

> ⚠️ `docker compose down -v` remove o volume PostgreSQL. Não utilize esse comando quando precisar preservar o histórico ou validar persistência.

---

## 🔄 Desenvolvimento e Hot Reload

Alterações em arquivos como:

```text
.ts
.tsx
.css
```

são refletidas pelo ambiente de desenvolvimento sem reconstrução completa da imagem.

Mudanças em:

```text
package.json
package-lock.json
Dockerfile
```

podem exigir:

```bash
docker compose up --build
```

---

## ✅ Como Testar e Validar

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

### Resultado do fechamento técnico da Sprint 2

Em 09/11/2026 foram validados:

- **156 testes aprovados** na suíte comum do backend;
- **7/7 testes de integração PostgreSQL** aprovados separadamente;
- **26/26 testes do frontend** aprovados;
- **189 testes automatizados únicos**;
- typecheck do backend sem erros;
- typecheck do frontend sem erros;
- build de produção do frontend concluído com sucesso;
- persistência do banco após restart;
- coleta periódica automática;
- atualização automática do frontend;
- autenticação JWT;
- autorização `401 / 403 / 200`;
- estados `no_metrics` e `unavailable`;
- consistência entre dashboard e indicadores;
- histórico ambiental por serviço.

As evidências completas estão em:

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

Materiais do desafio:

- [Documentação do projeto — Unilaunch](https://docs.unilaunch.org/share/x29w8jgwdb/p/greener-abp-2-semestre-b7FiqU6UC1)
- [Documentos escritos da ABP](https://docs.google.com/document/d/1X6rmJBm1bTjtur5AG_jwcQY1v6v7jn2c4BwI4HIcfgg/edit?usp=sharing)

---

## 🗓 Sprints

O GreenER é desenvolvido em três sprints.

| Sprint | Período | Principais entregas | Situação |
| --- | --- | --- | --- |
| [**Sprint 1**](docs/sprints/sprint-1.md) | 28/09–19/10/2026 | Fundação do projeto, protótipos, modelagem, Docker, descoberta e sincronização de serviços | ✅ Finalizada |
| [**Sprint 2**](docs/sprints/sprint-2.md) | 20/10–09/11/2026 | Coleta periódica, histórico, Carbon API, energia/CO₂e, indicadores, dashboard, auto-refresh e histórico visual | 🟡 Incremento tecnicamente validado; Sprint Review pendente |
| [**Sprint 3**](docs/sprints/sprint-3.md) | 10/11–23/11/2026 | Consolidação do mapa, ranking, comparação, filtros, refinamentos e validação final | ⏳ Planejada |

A visualização geográfica começou antecipadamente no fim da Sprint 2 e será consolidada na Sprint 3.

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
