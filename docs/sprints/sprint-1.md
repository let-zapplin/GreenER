# 📌 Sprint 1 — GreenER

> **Período:**28/09 — 19/10/2026 · **Status:** ✔️ Finalizada
>
> Voltar para o [README](../../README.md).

---
## Objetivo da sprint
Entregar a fundação técnica e um primeiro incremento funcional capaz de descobrir serviços em uma API externa, sincronizá-los com o PostgreSQL e apresentá-los na interface React.

## Incremento funcional
```mermaid
flowchart LR
 A[Metrics Aggregator /services] --> B[Backend: descoberta]
 B --> C[Sincronização]
 C --> D[(PostgreSQL)]
 D --> E[API interna /api/servicos]
 E --> F[Frontend: listagem e estados]
```

## Entregas registradas
- **Estrutura e infraestrutura:** repositório, padrões, Docker Compose, PostgreSQL, backend Node/TypeScript e frontend React/TypeScript.
- **Análise e design:** protótipos, modelo de dados, casos de uso e diagramas de arquitetura/fluxo.
- **Integração:** descoberta de serviços, sincronização sem duplicação e listagem por API interna.
- **Interface:** listagem de serviços, navegação, responsividade inicial e estados de carregamento, vazio e erro.
- **Segurança inicial:** rotas de registro e login; conferir proteção de recursos específicos.
- **Qualidade:** testes unitários e evidência de validação ponta a ponta.

## Evidências e artefatos
- Backlog completo e responsáveis: manter a tabela original da sprint abaixo deste resumo, sem eliminar rastreabilidade.
- [Modelo de banco](../../database/README.md)
- [Manual de testes unitários](../testes/manual_teste_unitario.md)
- [Manual de validação](../testes/manualdevalidacao.md)
- [Plano de entregas](../plano-de-entregas.md)
- [Arquitetura](../arquitetura.md)
- [Burndown](burning_down_sp1.jpeg)
- [Vídeo de demonstração](https://youtu.be/pGdiciJxTPw)

## Sprint Backlog

[![Projects](https://img.shields.io/badge/Projects-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/orgs/let-zapplin/projects/2)

| Tarefa | Dificuldade | Responsável | Requisitos | Prioridade | Área | Objetivo / Entrega esperada | Concluída |
| -------- | :---------: | :------------ | :----------: | :----------: | :---- | :--------------------------- | :---------: |
| Estruturar repositório e padrões do projeto | 3 | Vitor, Igor, Gustavo | `RNF05` `RP07` | Alta | Geral | Organizar pastas, padrões de commit, branches, .env.example e README inicial para que toda a equipe consiga trabalhar no projeto | ✔️ |
| Modelagem inicial do banco de dados | 5 | Patricia, Gustavo | `RF10` `RP03` | Alta | Backend / DB | Definir entidades, atributos e relacionamentos necessários ao MVP e produzir o modelo de dados inicial | ✔️ |
| Diagrama de casos de uso | 2 | Marcelo | `RNF05` | Alta | Geral | Representar de forma clara os atores e principais funcionalidades do sistema | ✔️ |
| Diagramas de fluxo e arquitetura inicial | 2 | Vitor | `RNF05` | Média | Geral | Representar o fluxo do usuário, fluxo de dados, frontend, backend, banco e APIs externas | ✔️ |
| Configurar ambiente Docker | 5 | Vitor, Gustavo | `RP04` | Média | Infra | Permitir que frontend, backend e PostgreSQL sejam executados através do Docker | ✔️ |
| Criar estrutura inicial do PostgreSQL | 8 | Gustavo, Patricia e Marcelo | `RP03` | Alta | Backend / DB | Implementar no PostgreSQL o modelo de banco definido pela equipe e configurar sua conexão com o backend | ✔️ |
| Criar estrutura base do backend Node + TypeScript | 5 | Igor | `RP02` | Alta | Backend | Preparar projeto com estrutura inicial de módulos, controllers, services e repositories | ✔️ |
| Criar estrutura base do frontend React + TypeScript | 5 | Igor, Patricia | `RP01` | Alta | Frontend | Preparar projeto React, navegação, estrutura de páginas e componentes base | ✔️ |
| Prototipação inicial do frontend | 8 | Vitor, Igor, Patricia | `RNF01` `RF09` | Alta | Frontend / UX | Criar protótipo inicial das principais telas e validar navegação, hierarquia das informações e estrutura visual antes da implementação definitiva | ✔️ |
| Descobrir serviços pela Metrics Aggregator API | 8 | Marcelo, Gustavo | `RF01` | Alta | Backend | Consultar /services, interpretar o retorno e identificar automaticamente os serviços disponíveis | ✔️ |
| Acompanhar mudanças nos serviços | 5 | Marcelo, Gustavo | `RF01` `RF02` | Média | Backend / DB | Salvar os serviços no PostgreSQL, evitar duplicação e atualizar os dados quando necessário | ✔️ |
| Disponibilizar serviços pela API do GreenER | 5 | marcelo, gustavo | `RF01` `RP02` | Média | Backend | Criar endpoint interno para que o frontend consulte os serviços armazenados pelo sistema | ✔️ |
| Implementar autenticação da área de configuração | 5 | Gustavo | `RP06` | Média | Backend / Frontend | Autenticar usuários pelo backend utilizando JWT e impedir acesso não autorizado aos recursos protegidos | ✔️ |
| Exibir primeira listagem de serviços no frontend | 5 | Igor, Vitor | `RF09` | Média | Frontend | Criar uma tela que apresente os serviços com nome, status e localização | ✔️ |
| Tratar estados da consulta de serviços (loading, erro e ausência de serviços) | 3 | Patricia, Igor, Vitor | `RNF01` `RNF04` | Baixa | Frontend | Informar corretamente carregamento, ausência de serviços e erro na consulta | ✔️ |
| Criar interface inicial responsiva | 3 | Igor | `RNF01` | Média | Frontend / UI | Garantir que a primeira versão da interface funcione adequadamente em desktop e mobile | ✔️ |
| Documentação técnica da Sprint 1 | 2 | TODOS | `RNF05` | Alta | Geral | Documentar execução, arquitetura, modelo de dados, endpoints e configuração das APIs utilizadas | ✔️ |
| Configurar testes automatizados iniciais (unitario) | 8 | Patricia | `Qualidade` | Baixa | Backend / Frontend | Configurar a ferramenta de testes do projeto e criar pelo menos um teste automatizado para validar um fluxo crítico da Sprint 1 | ✔️ |
| Validar integração ponta a ponta | 5 | Patricia | `RF01` `RP01–RP04` | Média | Geral | Validar o fluxo Metrics API → Backend → PostgreSQL → API GreenER → React | ✔️ |
---
## 📁 Documentações

[Ata Sprint 1](https://docs.google.com/document/d/1X6rmJBm1bTjtur5AG_jwcQY1v6v7jn2c4BwI4HIcfgg/edit?tab=t.0)

[Sprint Retrospective](https://docs.google.com/document/d/1X6rmJBm1bTjtur5AG_jwcQY1v6v7jn2c4BwI4HIcfgg/edit?tab=t.xxxrd1bjaza0)

---
## 📉 Burndown

![Burndown Sprint 1](burning_down_sp1.jpeg)

---

## 🎬 Demonstração

[![Assistir vídeo da Sprint 1](https://img.youtube.com/vi/pGdiciJxTPw/hqdefault.jpg)](https://youtu.be/pGdiciJxTPw)

## Critérios de aceite e validação
| Critério | Evidência a conferir |
|---|---|
| Serviços retornam da API externa | Resultado de `/api/servicos/discover` |
| Serviços persistem no banco | Resultado da sincronização e consulta SQL |
| Frontend apresenta serviços | Tela integrada com `/api/servicos` |
| Erros são tratados | Testes e cenários de falha |
| Ambiente sobe de forma reproduzível | `docker compose up --build` e healthchecks |

## Retrospectiva e pendências
Inserir decisões da Sprint Review, dificuldades encontradas, ações de melhoria e responsáveis. 

## Próximos passos
Implementar coletas periódicas, histórico, cálculo de energia e CO₂e e dashboard da Sprint 2.
