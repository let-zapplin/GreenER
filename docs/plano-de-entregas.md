# 📦 Plano de Entregas — GreenER

> **Projeto:** GreenER — Monitoramento de Consumo Energético e Emissões de CO₂e  
> **Período:** 28/09 a 23/11/2026 · **Modelo:** desenvolvimento incremental em 3 sprints  
> **Equipe:** Let:zApplin · **Parceiro:** Unilaunch · **Instituição:** FATEC Jacareí
>
> [← README](../README.md) · [Product Backlog](product-backlog.md) · [Arquitetura](arquitetura.md) · [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2)

---

## 01. Objetivo e estratégia de entrega

O GreenER será desenvolvido em **três incrementos funcionais**, evoluindo de uma base integrada de monitoramento para a coleta e análise de indicadores ambientais e, por fim, para ferramentas de comparação e apoio à decisão.

Cada sprint deve produzir um resultado verificável. As entregas abaixo representam **escopo planejado e critérios de aceite**, não substituindo o registro da execução nas páginas de cada sprint.

```mermaid
flowchart LR
    S1["Sprint 1<br/>Fundação e serviços"] --> S2["Sprint 2<br/>Métricas e indicadores"] --> S3["Sprint 3<br/>Análise e comparação"]
```

## 02. Cronograma e marcos

| Sprint | Período | Objetivo | Marco de entrega | Situação documental |
|---|---|---|---|---|
| [**1 — Fundação**](sprints/sprint-1.md) | 28/09–19/10/2026 | Disponibilizar o ambiente e o primeiro fluxo ponta a ponta | Serviços descobertos, persistidos e exibidos no React | Registro da sprint aponta tarefas concluídas; consultar evidências |
| [**2 — Indicadores**](sprints/sprint-2.md) | 20/10–09/11/2026 | Capturar métricas e estimar energia e CO₂e | Dashboard operacional com dados históricos | Planejada |
| [**3 — Análises**](sprints/sprint-3.md) | 10/11–23/11/2026 | Comparar serviços e visualizar diferenças por região e período | Mapa, ranking, comparação e validação final | Planejada |

> **Nota de acompanhamento:** o status real das tarefas deve ser consultado no [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2). A situação documental informa a disponibilidade do registro, não substitui a validação técnica.

---

## 03. Escopo e aceite por sprint

### Sprint 1 — Fundação e primeiro incremento funcional

**Resultado esperado:** uma aplicação integrada capaz de descobrir serviços na API fornecida, persistir essas informações no PostgreSQL e apresentá-las no frontend, acompanhada da estrutura inicial, protótipos e testes.

| Entrega | Critério de aceite verificável | Frente / responsáveis registrados | Evidências e referência |
|---|---|---|---|
| Ambiente e estrutura do projeto | Frontend, backend e PostgreSQL inicializam pelo Docker Compose; estrutura e configuração básica documentadas | Infraestrutura: Vitor e Gustavo; base backend: Igor; base frontend: Igor e Patricia | [`compose.yaml`](../compose.yaml), READMEs e [registro da Sprint 1](sprints/sprint-1.md) |
| Modelagem, diagramas e prototipação | Modelo inicial do banco, diagramas e protótipos disponíveis para consulta | Banco: Patricia, Gustavo e Marcelo; diagramas: Marcelo e Vitor; protótipos: Vitor, Igor e Patricia | [Registro da Sprint 1](sprints/sprint-1.md) |
| Descoberta e sincronização de serviços | Backend consulta `/services`, interpreta os dados, persiste serviços sem duplicações indevidas e oferece consulta por API interna | Marcelo e Gustavo | [API](api.md), [manual de validação](testes/manualdevalidacao.md) e [Sprint 1](sprints/sprint-1.md) |
| Primeira listagem no React | Serviços podem ser consultados no frontend, incluindo tratamento de carregamento, ausência de dados e falhas | Igor, Vitor e Patricia | [Sprint 1](sprints/sprint-1.md) e [manual de validação](testes/manualdevalidacao.md) |
| Autenticação inicial | Cadastro e login disponíveis no backend; aplicação das proteções de rota deve ser verificada separadamente | Gustavo | [API](api.md) e [Sprint 1](sprints/sprint-1.md) |
| Testes e documentação | Teste automatizado inicial e roteiro de validação do fluxo integrados ao repositório | Testes: Patricia; documentação: equipe toda | [Manual de testes unitários](testes/manual_teste_unitario.md), [manual de validação](testes/manualdevalidacao.md) e [Sprint 1](sprints/sprint-1.md) |

**Demonstração:** [vídeo do incremento funcional da Sprint 1](https://youtu.be/pGdiciJxTPw).  
**Histórico e retrospectiva:** [documentação da Sprint 1](sprints/sprint-1.md).

> Os responsáveis acima foram extraídos das atribuições registradas no backlog da Sprint 1. São responsáveis **por atividades/frentes**, não necessariamente responsáveis exclusivos pelo aceite de toda a entrega.

### Sprint 2 — Coleta de métricas e indicadores ambientais

**Resultado esperado:** sair do cadastro dos serviços e passar a medir seu comportamento ao longo do tempo, produzindo estimativas rastreáveis de consumo energético e emissões de CO₂e.

| Entrega planejada | Critério de aceite proposto | Frente responsável | Evidência prevista |
|---|---|---|---|
| Coleta de métricas por serviço | Consultar métricas de serviços identificados e registrar data/hora da coleta; falhas são tratadas sem interromper toda a operação | Backend / Integrações — **a definir na planning** | Respostas de API e testes de integração |
| Coleta recorrente e histórico | Novas coletas ficam disponíveis em ordem temporal, sem sobrescrever o histórico de medições anteriores | Backend / Banco — **a definir** | Consultas ao PostgreSQL e teste com múltiplas coletas |
| Estimativa de energia e CO₂e | Cálculos usam fórmulas, unidades, premissas e fator de intensidade de carbono documentados; resultados são verificáveis por testes | Backend / Cálculos — **a definir** | [`calculos.md`](calculos.md) e testes automatizados |
| Indicadores consolidados | API oferece totais agregados e informações necessárias à identificação de serviços ativos/indisponíveis | Backend / API — **a definir** | [`api.md`](api.md), exemplos de resposta e testes |
| Dashboard e evolução histórica | Frontend apresenta indicadores e evolução temporal; informa loading, erro e ausência de dados | Frontend — **a definir** | Capturas ou vídeo e validação da interface |
| Atualização automática e robustez | Atualização periódica implementada conforme intervalo definido pela equipe; timeout e indisponibilidade tratados | Integração frontend/backend — **a definir** | Teste funcional e cenários de falha |

**Dependências:** serviços identificados e integração com PostgreSQL concluídos na Sprint 1; disponibilidade das APIs de métricas e intensidade de carbono.  
**Registro de execução:** [Sprint 2](sprints/sprint-2.md), a preencher conforme as entregas forem verificadas.

### Sprint 3 — Análise, comparação e consolidação

**Resultado esperado:** permitir explorar e comparar os impactos dos serviços com base em métricas históricas e localização, concluindo a aplicação com validações de qualidade.

| Entrega planejada | Critério de aceite proposto | Frente responsável | Evidência prevista |
|---|---|---|---|
| Localização e mapa | Serviços com localização válida podem ser visualizados geograficamente; coordenadas ausentes são tratadas | Backend + Frontend — **a definir na planning** | Capturas do mapa e teste dos dados de localização |
| Ranking por consumo e emissões | Serviços são ordenados segundo métrica e período selecionados, usando dados comparáveis | Backend + Frontend — **a definir** | Testes do ranking e captura da interface |
| Comparação entre serviços | Usuário seleciona serviços e compara métricas no mesmo recorte temporal | Backend + Frontend — **a definir** | Cenário de uso validado e demonstração |
| Filtros e navegação | Períodos e seleções podem ser alterados sem resultados inconsistentes; estados vazios são comunicados | Frontend — **a definir** | Testes funcionais e capturas |
| Consolidação de qualidade e segurança | Revisão de responsividade, desempenho, tratamento de falhas e proteção dos recursos aplicáveis | Equipe — **a definir** | Resultado dos testes e checklist de validação final |
| Documentação e demonstração final | Artefatos atualizados, fluxo ponta a ponta validado e demonstração final disponível | Toda a equipe | [`arquitetura.md`](arquitetura.md), [`api.md`](api.md), [Sprint 3](sprints/sprint-3.md) e vídeo final |

**Dependências:** métricas persistidas, histórico temporal e indicadores calculados na Sprint 2.  
**Registro de execução:** [Sprint 3](sprints/sprint-3.md), a preencher conforme as entregas forem verificadas.

---

## 04. Governança e responsáveis

A responsabilidade pelas **tarefas individuais** é definida no [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2). Este plano registra os responsáveis **por entregas/frentes** quando houver confirmação documental. Para as Sprints 2 e 3, a distribuição de pessoas será estabelecida na planning, evitando antecipar atribuições ainda não acordadas.

| Papel | Integrante | Responsabilidade no processo |
|---|---|---|
| Scrum Master | Vitor Hirch | Facilitar acompanhamento, remover impedimentos junto à equipe e apoiar cerimônias e organização |
| Product Owner | Gustavo Koiti | Apoiar priorização e alinhamento do escopo e dos critérios de valor/aceite |
| Desenvolvimento | Igor Souza, Marcello Campbell e Patricia R. Maidana | Desenvolvimento, testes, documentação e validação conforme distribuição de atividades |
| Equipe de desenvolvimento | Todos os integrantes | Colaborar na integração, revisão e entrega do incremento |

> Os papéis acima seguem o README. As atribuições técnicas variam conforme as tasks de cada sprint e não ficam restritas a uma única especialidade.

## 05. Evidências e rastreabilidade

Cada marco deve possuir evidências acessíveis. Para evitar duplicação, este plano funciona como **índice das evidências**, e os registros detalhados permanecem nos locais de origem.

| O que comprovar | Fonte principal | Quando atualizar |
|---|---|---|
| Planejamento, andamento e responsáveis por tarefa | [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2) | Durante a sprint |
| Resultado, decisões, retrospectiva e demonstração | [Sprint 1](sprints/sprint-1.md) · [Sprint 2](sprints/sprint-2.md) · [Sprint 3](sprints/sprint-3.md) | Na review e no fechamento |
| Requisitos e escopo funcional | [Product Backlog](product-backlog.md) | Quando houver refinamento aprovado |
| Endpoints e contratos disponíveis | [API](api.md) | Ao integrar novos endpoints |
| Componentes, fluxos e decisões técnicas | [Arquitetura](arquitetura.md) | Quando a arquitetura mudar |
| Fórmulas, variáveis e premissas | [Cálculos](calculos.md) | Antes de validar indicadores ambientais |
| Testes automatizados e validação funcional | [Manual de testes unitários](testes/manual_teste_unitario.md) · [Manual de validação](testes/manualdevalidacao.md) | Ao validar cada incremento |

**Regra de rastreabilidade:** para cada entrega, deve ser possível seguir o caminho **requisito → tarefa/PR → teste/validação → evidência na sprint**. Os links específicos de PRs e testes podem ficar exclusivamente no registro da sprint correspondente.

## 06. Dependências e riscos

| Dependência / risco | Impacto possível | Estratégia prevista |
|---|---|---|
| API de métricas ou API de carbono indisponível | Interrupção de coleta ou ausência de cálculo | Timeout, tratamento de erros, identificação de dados ausentes e testes com respostas simuladas |
| Integração entre backend, banco e frontend | Entrega parcial sem fluxo demonstrável | Validar ponta a ponta em cada incremento |
| Acúmulo de conhecimento em frentes isoladas | Retrabalho ou dificuldade em integrações | Revisões cruzadas, descrições de PRs e compartilhamento técnico |
| Compromissos externos da equipe | Oscilação no ritmo de execução | Sinalizar impedimentos e ajustar distribuição das tarefas na planning |
| Mudança de escopo ou cálculo ambiental | Inconsistência nos indicadores | Manter requisitos e premissas documentados, com validação antes da integração |

As estratégias são **ações de prevenção propostas**, não garantias de que todos os mecanismos já estejam implementados.

## 07. Critérios de conclusão

Uma entrega é considerada **pronta para aceite** quando, conforme aplicável:

- [ ] A funcionalidade atende aos critérios de aceite acordados.
- [ ] O código está integrado na branch prevista, com revisão realizada.
- [ ] Os testes pertinentes foram executados e seus resultados são verificáveis.
- [ ] O fluxo integrado foi validado, quando envolver múltiplas partes do sistema.
- [ ] Estados de erro e indisponibilidade relevantes foram considerados.
- [ ] As documentações afetadas foram atualizadas.
- [ ] Há evidência acessível (teste, PR, captura, vídeo ou registro de validação).
- [ ] A entrega foi apresentada ou validada no fechamento da sprint.

> Esta é a **definição de pronto proposta para o projeto**. Sua aplicação deve ser proporcional ao tipo de tarefa e validada pela equipe.


## 08. Controle de mudanças

Se surgir uma alteração relevante em prazo, escopo ou critério de aceite:

1. Registrar e discutir a mudança na planning ou no refinamento do backlog.
2. Atualizar o [Product Backlog](product-backlog.md) e as tarefas do [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2).
3. Atualizar **este plano apenas se mudar o marco, a entrega ou a dependência**.
4. Registrar no documento da sprint o resultado efetivo e eventuais desvios.

Assim, o plano permanece enxuto e confiável, enquanto cada sprint preserva o histórico detalhado do desenvolvimento.
