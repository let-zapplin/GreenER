# 🌱 GreenER: Monitoramento de Consumo Energético e Emissões de CO₂e

Projeto de **Aprendizagem Baseada em Projetos (ABP)** do 2º semestre de 2026 do curso de **Desenvolvimento de Software Multiplataforma (DSM)** da **FATEC Jacareí**, desenvolvido em parceria com a **Unilaunch**.

O GreenER é um sistema que monitora aplicações e serviços de uma infraestrutura digital e estima o **consumo de energia** e a **emissão de CO₂e** associados a eles, exibindo tudo em um dashboard.

---

## 🧭 Navegação

<div align="center">

[_Sobre o Projeto_](#-sobre-o-projeto) •
[_Funcionalidades_](#-funcionalidades) •
[_Tecnologias_](#-tecnologias-utilizadas) •
[_Como Executar_](#️-como-executar-o-ambiente-com-docker) •
[_Documentação_](#-documentação) •
[_Equipe_](#-equipe)

### 🚀 Acompanhe a evolução do GreenER

|                    Sprint 01                    |                  Sprint 02                  |                  Sprint 03                  |
| :---------------------------------------------: | :-----------------------------------------: | :-----------------------------------------: |
|                  ✅ Concluída                   |                ⏳ Planejada                 |                ⏳ Planejada                 |
|   [📄 Documentação](docs/sprints/sprint-1.md)   | [📄 Documentação](docs/sprints/sprint-2.md) | [📄 Documentação](docs/sprints/sprint-3.md) |
| [▶️ Demonstração](https://youtu.be/pGdiciJxTPw) |                  Em breve                   |                  Em breve                   |

</div>

---

## 📌 Sobre o Projeto

Hoje, empresas monitoram CPU, memória e disponibilidade de suas aplicações, mas essas métricas dizem pouco sobre o **impacto ambiental** da infraestrutura digital.

O GreenER busca preencher essa lacuna: a partir das métricas dos serviços monitorados e da intensidade de carbono da região onde eles operam, o sistema estima quanta energia é consumida e quanto CO₂e é emitido, por serviço e para o ambiente como um todo.

O projeto consome duas APIs auxiliares fornecidas pela Unilaunch:

| API                               | Para que serve                                                 | Documentação                                                     |
| --------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Agregador de Métricas             | Descoberta dos serviços e coleta das métricas de cada um       | [metrics.unilaunch.org/docs](https://metrics.unilaunch.org/docs) |
| Serviço de Intensidade de Carbono | Consulta da intensidade de carbono para o cálculo das emissões | [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs)   |

---

## ✨ Funcionalidades

> Esta lista é atualizada a cada sprint. Só marcamos como concluído o que já foi implementado e verificado.

- [ ] Descoberta automática dos serviços disponíveis
- [ ] Coleta periódica das métricas de cada serviço
- [ ] Identificação de serviços indisponíveis
- [ ] Estimativa de consumo de energia por serviço
- [ ] Estimativa de emissão de CO₂e por serviço
- [ ] Indicadores consolidados do ambiente monitorado
- [ ] Dashboard com atualização periódica dos dados
- [ ] Autenticação e área de configuração do monitoramento

<!-- Adicionar/remover itens conforme o time definir o escopo de cada sprint -->

---

## 🛠 Tecnologias Utilizadas

- React com TypeScript (frontend)
- Node.js com TypeScript (backend)
- PostgreSQL (banco de dados relacional)
- Docker e Docker Compose
- Git & GitHub

Os detalhes de cada parte estão nos READMEs indicados na seção [Organização do Repositório](#-organização-do-repositório).

---

## 🚀 Como Funciona

1. O backend consulta o **Agregador de Métricas** para descobrir os serviços e coletar suas métricas
2. O backend consulta o **Serviço de Intensidade de Carbono** para obter os fatores de emissão
3. Os dados coletados e os cálculos de energia e CO₂e são armazenados no **PostgreSQL**
4. O usuário acompanha tudo pelo **dashboard web**

O fluxo completo está descrito em [`docs/arquitetura.md`](docs/arquitetura.md).

---

## 📂 Organização do Repositório

| Pasta / Arquivo                   | O que contém                                                    |
| --------------------------------- | --------------------------------------------------------------- |
| [`frontend/`](frontend/README.md) | Aplicação web (dashboard e telas)                               |
| [`backend/`](backend/README.md)   | API, regras de negócio e integração com as APIs auxiliares      |
| [`database/`](database/README.md) | Scripts SQL do banco de dados                                   |
| [`docs/`](docs/)                  | Planejamento, arquitetura, cálculos, API e registro das sprints |
| [`compose.yaml`](compose.yaml)    | Execução do projeto com Docker                                  |
| [`.env.example`](.env.example)    | Modelo das variáveis de ambiente                                |

---

## ▶️ Como Executar o Ambiente com Docker

O GreenER utiliza Docker Compose para executar os principais serviços da aplicação:

- Frontend em React + TypeScript
- Backend em Node.js + TypeScript + Express
- Banco de dados PostgreSQL

### 1. Clone o repositório

```bash
git clone https://github.com/LetzApplin/GreenER.git
cd GreenER
```

### 2. Crie o arquivo de variáveis de ambiente

Crie o arquivo `.env` a partir do modelo disponível no projeto:

```bash
cp .env.example .env
```

Revise os valores do arquivo `.env` e ajuste-os caso necessário.

### 3. Suba a aplicação com Docker

Na raiz do projeto, execute:

```bash
docker compose up --build
```

Esse comando irá construir e iniciar os containers do:

- PostgreSQL
- Backend
- Frontend

### 4. Acesse os serviços

Após a inicialização dos containers:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Healthcheck do backend: `http://localhost:3000/health`
- PostgreSQL no host: `localhost:5433`

Internamente, o backend acessa o PostgreSQL através de:

```text
postgres:5432
```

A porta `5433` é utilizada apenas para acesso ao banco a partir da máquina host.

### 5. Executar em segundo plano

Para subir os containers sem manter os logs no terminal:

```bash
docker compose up -d
```

### 6. Verificar o status dos containers

```bash
docker compose ps
```

### 7. Encerrar o ambiente

```bash
docker compose down
```

Os dados do PostgreSQL permanecem armazenados no volume Docker após o encerramento dos containers.

Para remover também os volumes:

```bash
docker compose down -v
```

> ⚠️ O comando acima remove os dados persistidos do PostgreSQL.

## 🔄 Hot Reload

O ambiente de desenvolvimento foi configurado para refletir alterações no código automaticamente.

Alterações em arquivos como:

```text
.ts
.tsx
.css
```

não exigem reconstrução das imagens.

Já alterações em arquivos como:

```text
package.json
package-lock.json
Dockerfile
```

podem exigir uma nova construção:

```bash
docker compose up --build
```

<!-- Confirmar comandos e portas de acesso quando o Docker estiver pronto -->

Para instruções específicas de cada parte, consulte os READMEs do [frontend](frontend/README.md), do [backend](backend/README.md) e do [banco de dados](database/README.md).

---

## ✅ Como testar e validar

Para fazer testes unitários

- [`docs/testes/manual_teste_unitario.md`](docs/testes/manual_teste_unitario.md) - Manual com instruções para testes unitários

- [`docs/testes/manualdevalidacao.md`](docs/testes/manualdevalidacao.md) - Manual de validação de fluxo de Metrics API ao React

---

## 📚 Documentação

| Documento                                                | Conteúdo                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| [`docs/plano-de-entregas.md`](docs/plano-de-entregas.md) | Planejamento das três sprints, entregas, responsáveis e evidências |
| [`docs/arquitetura.md`](docs/arquitetura.md)             | Partes da aplicação e fluxo dos dados                              |
| [`docs/calculos.md`](docs/calculos.md)                   | Fórmulas e premissas do cálculo de energia e CO₂e                  |
| [`docs/api.md`](docs/api.md)                             | Endpoints da API do projeto                                        |

Materiais do desafio:

- [Documentação do projeto (Unilaunch)](https://docs.unilaunch.org/share/x29w8jgwdb/p/greener-abp-2-semestre-b7FiqU6UC1)
- [Documentos escritos da ABP (Google Docs)](https://docs.google.com/document/d/1X6rmJBm1bTjtur5AG_jwcQY1v6v7jn2c4BwI4HIcfgg/edit?usp=sharing)

---

## 🗓 Sprints

O projeto é desenvolvido em três sprints. O registro de cada uma (objetivo, itens concluídos e pendentes, decisões da Sprint Review) fica em `docs/sprints/`.

| Sprint                                     | Período            | Principais Entregas                                                                         | Status        |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------- | ------------- |
| [**Sprint 1**](./docs/sprints/sprint-1.md) | 28/09 — 19/10/2026 | Prototipação · Diagramas UML · Modelagem BD · Conexão API e BD · Teste unitário e validação | ✔️ Finalizada |
| [**Sprint 2**](./docs/sprints/sprint-2.md) | 20/10 — 09/11/2026 | A ser definido                                                                              | ⏳            |
| [**Sprint 3**](./docs/sprints/sprint-3.md) | 10/11 — 23/11/2026 | A ser definido                                                                              | ⏳            |

---

## 👥 Equipe

| Nome                | Papel         | GitHub                                                             |
| ------------------- | ------------- | ------------------------------------------------------------------ |
| Vitor Hirch         | Scrum Master  | [@vitorhirch](https://github.com/vitorhirch)                       |
| Gustavo Koiti       | Product Owner | [@gustavokoitiyoshimura](https://github.com/gustavokoitiyoshimura) |
| Igor Souza          | Desenvolvedor | [@igorcsouzaa](https://github.com/igorcsouzaa)                     |
| Marcello Campbell   | Desenvolvedor | [@mparise28-dev](https://github.com/mparise28-dev)                 |
| Patricia R. Maidana | Desenvolvedor | [@PatyMaidana](https://github.com/PatyMaidana)                     |

**Instituição:** FATEC Jacareí, curso de Desenvolvimento de Software Multiplataforma (DSM)
**Parceiro:** Unilaunch
