# 📦 Plano de Entregas — GreenER
> **Projeto:**_ GreenER — Monitoramento de Consumo Energético e Emissões de CO₂e  
> **Período:**_ 28/09 a 23/11/2026 · _**Modelo:**_ desenvolvimento incremental em 3 sprints  
> **Equipe:**_ Let:zApplin · _**Parceiro:**_ Unilaunch · _**Instituição:**_ FATEC Jacareí
> 
> [← README](../README.md) · [Product Backlog](product-backlog.md) · [Arquitetura](arquitetura.md) · [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2)
---
## 01. Objetivo e estratégia de entrega
O GreenER será desenvolvido em **três incrementos funcionais**, evoluindo de uma base integrada de monitoramento para a coleta e análise de indicadores ambientais e, por fim, para ferramentas de comparação e apoio à decisão.


Cada sprint deve produzir um resultado verificável. As entregas abaixo representam **escopo planejado e critérios de aceite**, não substituindo o registro da execução nas páginas de cada sprint.


```mermaid

flowchart LR

    S1["Sprint 1\<br/>Fundação e serviços"] --> S2["Sprint 2\<br/>Métricas e indicadores"] --> S3["Sprint 3\<br/>Análise e comparação"]

```


## 02. Cronograma e marcos
| Sprint | Período | Objetivo | Marco de entrega | Situação documental |

|---|---|---|---|---|

| [**1 — Fundação**](sprints/sprint-1.md) | 28/09–19/10/2026 | Disponibilizar o ambiente e o primeiro fluxo ponta a ponta | Serviços descobertos, persistidos e exibidos no React | Registro da sprint aponta tarefas concluídas; consultar evidências |

| [**2 — Indicadores**](sprints/sprint-2.md) | 20/10–09/11/2026 | Capturar métricas e estimar energia e CO₂e | Coleta periódica e histórica, indicadores no Monitoramento e histórico visual em Análises | Incremento tecnicamente validado; Sprint Review pendente |

| [**3 — Análises**](sprints/sprint-3.md) | 10/11–23/11/2026 | Comparar serviços e visualizar diferenças por região e período | Mapa, ranking, comparação e validação final | Planejada |


> **Nota de acompanhamento:**_ o status real das tarefas deve ser consultado no [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2). A situação documental informa a disponibilidade do registro, não substitui a validação técnica.
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


_> Os responsáveis acima foram extraídos das atribuições registradas no backlog da Sprint 1. São responsáveis _**por atividades/frentes**_, não necessariamente responsáveis exclusivos pelo aceite de toda a entrega._


### Sprint 2 — Coleta de métricas e indicadores ambientais
**Resultado registrado:** o incremento coleta métricas periodicamente, preserva tentativas e amostras no PostgreSQL, calcula indicadores ambientais, apresenta dados no Monitoramento e disponibiliza histórico visual por serviço em Análises. A validação técnica do incremento e da DoD foi concluída pela equipe em 09/11/2026; o fechamento oficial permanece condicionado à Sprint Review.


| Entrega | Resultado implementado | Responsabilidade registrada | Evidências |

|---|---|---|---|

| Coleta de métricas por serviço | Consulta serviços ativos e registra tentativas, incluindo estados de ausência de métricas, indisponibilidade e erro | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [API](api.md), código e testes descritos no [registro da Sprint 2](sprints/sprint-2.md) |

| Coleta recorrente e histórico | Jobs independentes sincronizam catálogo, coletam métricas e atualizam snapshots de intensidade; amostras e tentativas são preservadas e consultáveis | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [Arquitetura](arquitetura.md), [banco de dados](../database/README.md) e [registro da Sprint 2](sprints/sprint-2.md) |

| Estimativa de energia e CO₂e | Indicadores são calculados a partir de métricas e intensidades persistidas, com fórmulas, unidades, premissas e lacunas documentadas | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [Cálculos](calculos.md), [API](api.md) e testes descritos no [registro da Sprint 2](sprints/sprint-2.md) |

| Indicadores consolidados | API e interface apresentam totais ambientais e estado dos serviços com dados persistidos | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [API](api.md), [Arquitetura](arquitetura.md) e [registro da Sprint 2](sprints/sprint-2.md) |

| Dashboard e evolução histórica | Monitoramento apresenta indicadores por serviço; Análises permite consultar o histórico ambiental por serviço e período | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [Frontend](../frontend/README.md) e [registro da Sprint 2](sprints/sprint-2.md) |

| Atualização automática e robustez | Sincronização, coleta, intensidade de carbono e consultas de interface são atualizadas periodicamente; falhas e dados ausentes têm tratamento próprio | Responsáveis e apoios constam no [backlog da Sprint 2](sprints/sprint-2.md) | [Arquitetura](arquitetura.md), [API](api.md) e [registro da Sprint 2](sprints/sprint-2.md) |


**Dependências atendidas pelo incremento anterior:** descoberta de serviços e integração com PostgreSQL. As integrações externas de métricas e intensidade de carbono estão descritas na [API](api.md).

**Status:** incremento funcional e DoD tecnicamente validados pela equipe em 09/11/2026. As suítes comuns, typechecks, build e os sete testes de integração com PostgreSQL foram verificados. A Sprint Review e o registro do feedback do cliente permanecem pendentes para o fechamento oficial da Sprint. O registro detalhado está na [Sprint 2](sprints/sprint-2.md).

**Demonstração:** [vídeo do incremento funcional da Sprint 2](https://youtu.be/qW38NnthF8Q).  


## Matriz de avaliação e evidências — Sprint 2
A Sprint 2 teve como objetivo evoluir o fluxo iniciado na Sprint 1 para uma aplicação capaz de realizar coleta periódica, preservar histórico, calcular indicadores ambientais e apresentar dados consolidados no frontend.


A situação indicada abaixo considera a versão validada em **09/11/2026**. As evidências funcionais detalhadas estão registradas em [`docs/testes/manualdevalidacao.md`](./testes/manualdevalidacao.md).


| Código | Requisito relacionado | Entrega concreta | Como verificar | Responsáveis | Evidência no GitHub | Situação |

|---|---|---|---|---|---|---|

| **ES01–ES05** | RP07 | Backlog priorizado, critérios de aceite, planejamento e evolução incremental da Sprint 2 | Conferir backlog, issues, PRs e registro da Sprint | Equipe | `docs/sprints/`, backlog da Sprint 2 e histórico de PRs | ✅ Concluído |

| **ES06** | RP07 | Sprint Review, coleta de feedback e adaptação do planejamento | Realizar a Review da Sprint 2, registrar feedback recebido e decisões para a Sprint 3 | Equipe | `docs/sprints/sprint-2.md` | ⏳ Pendente da Sprint Review |

| **ES07** | Qualidade / DoD | Definition of Done aplicada às entregas da Sprint 2 | Executar testes, typechecks, build e validações documentadas | Equipe | `docs/testes/manualdevalidacao.md` | ✅ Concluído |

| **ES08** | RNF05 | Documentação técnica e procedimentos de reprodução/validação | Seguir README e manuais em ambiente Docker | Equipe | `README.md`, `docs/`, READMEs internos | 🔄 Em fechamento |

| **ES09** | RP07 | Participação distribuída da equipe nas entregas da Sprint | Conferir responsáveis, issues, PRs, revisões e contribuições registradas | Equipe | GitHub Projects, histórico de PRs e `docs/sprints/sprint-2.md` | ✅ Concluído |

| **DW01** | RP01, RP02, RP03, RP04 | Aplicação organizada em React + TypeScript, Node + TypeScript, PostgreSQL e Docker | Subir aplicação com `docker compose up -d` e conferir containers | Equipe | `compose.yaml`, `frontend/`, `backend/`, `database/` | ✅ Concluído |

| **DW02** | RF01, RF03, RF05, RF06, RF07 | Integração com Metrics Aggregator e Carbon Intensity API | Executar descoberta/coleta e conferir dados externos processados | Gustavo, Marcello e Igor | `backend/src/integrations/`, módulos de coleta e intensidades | ✅ Concluído |

| **DW03** | RF03, RF07, RF08, RF10 | Backend REST para coleta, histórico, indicadores e dashboard | Consultar endpoints protegidos e comparar respostas | Marcello, Igor, Patricia e Vitor | `backend/src/modules/`, `docs/api.md` | ✅ Concluído |

| **DW04** | RF09, RF10, RF11 | Frontend consumindo dados reais do backend | Abrir Monitoramento e Análises e conferir atualização dos dados | Patricia e Vitor | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/hooks/` | ✅ Concluído |

| **DW05** | RF08, RF09, RF11, RNF02 | Dashboard operacional com indicadores consolidados e atualização automática | Manter a tela aberta e verificar atualização sem `F5` | Vitor e Patricia | hooks de monitoramento/dashboard e `docs/testes/manualdevalidacao.md` | ✅ Concluído |

| **DW06** | RP06 | Autenticação JWT e autorização administrativa no backend | Validar `401` sem token, `403` para usuário comum e `200` para administrador | Marcello | módulo de autenticação, middlewares e manual de validação | ✅ Concluído |

| **DW07** | RP04 | Execução completa via Docker Compose | Executar `docker compose up -d` e conferir backend/PostgreSQL `healthy` e frontend em execução | Equipe | `compose.yaml`, Dockerfiles e manual de validação | ✅ Concluído |

| **BD01** | RP03, RF10 | Modelo relacional para serviços, coletas, métricas, usuários e intensidade de carbono | Criar banco a partir do schema e conferir PKs, FKs, restrições e migrations | Vitor | `database/schema.sql`, `database/migrations/` | ✅ Concluído |

| **BD02** | RP03, RF03, RF10 | Persistência e consultas utilizando SQL explícito e parametrizado, sem ORM | Conferir repositories e parâmetros das queries | Backend | `backend/src/modules/**/**.repository.ts` | ✅ Concluído |

| **BD03** | RF03, RF10 | Histórico persistente de coletas e métricas | Reiniciar containers sem remover volumes e consultar os mesmos IDs novamente | Vitor / Equipe | `docs/testes/manualdevalidacao.md` | ✅ Concluído |

| **BD04** | RF08, RF10 | Consultas para histórico e consolidação por serviço e período | Consultar indicadores e histórico em uma janela conhecida | Backend | repositories de indicadores/dashboard | ✅ Concluído |

| **TP01** | RF07 | Regras de cálculo e domínio organizadas no backend | Conferir serviços/classes responsáveis por energia e CO₂e | Gustavo / Backend | módulo de indicadores e `docs/calculos.md` | ✅ Concluído |

| **TP02** | RP01, RP02 | Tipagem TypeScript no backend e frontend | Executar `npm run typecheck` nos dois projetos | Equipe | código `.ts/.tsx` e manual de validação | ✅ Concluído |

| **TP03** | RF05, RF06, RNF04 | Tratamento de falhas das APIs, banco e autorização sem interromper a aplicação | Verificar estados `no_metrics`, `unavailable`, rollback e respostas de erro | Igor / Backend | testes automatizados e `docs/testes/manualdevalidacao.md` | ✅ Concluído |


### Evidências de fechamento da Sprint 2
Na validação final realizada em 09/11/2026 foram confirmados:


- **163 testes de backend**, considerando 156 na suíte comum e 7 testes de integração com PostgreSQL executados separadamente;

- **26 testes de frontend** aprovados;

- **189 testes automatizados únicos** validados no projeto;

- integração PostgreSQL real com **7/7 testes aprovados**;

- `typecheck` de backend e frontend sem erros;

- build de produção do frontend concluído com sucesso;

- autenticação JWT e autorização administrativa funcionando no backend;

- dashboard e indicadores retornando valores consistentes;

- histórico de indicadores por serviço;

- persistência mantida após reinicialização dos containers sem remoção do volume;

- coleta periódica ocorrendo automaticamente;

- frontend atualizando sem recarregamento manual;

- estados `no_metrics` e `unavailable` persistidos e diferenciados;

- falha de um serviço sem interrupção da coleta dos demais.


### Situação da Sprint 2
O fluxo principal previsto para a Sprint foi validado ponta a ponta:


`serviço descoberto → métricas coletadas → tentativa persistida → intensidade de carbono obtida → energia/CO₂e calculados → histórico preservado → indicadores consolidados → dashboard e análise histórica apresentados no frontend`


**Situação:** ✅ Incremento funcional tecnicamente validado para a entrega da Sprint 2. O fechamento oficial permanece pendente da Sprint Review.


> O hash do commit final e os links definitivos de PRs devem ser registrados após o fechamento da branch *`chore/sprint2-finalizacao`*.
### Sprint 3 — Análise, comparação e consolidação
**Resultado esperado:** consolidar a exploração geográfica iniciada antecipadamente na Sprint 2 e implementar os recursos de comparação, ranking, filtros e refinamentos finais, concluindo a aplicação com validações de qualidade.


| Entrega planejada | Critério de aceite proposto | Frente responsável | Evidência prevista |

|---|---|---|---|

| Localização e mapa | Consolidar e validar a visualização geográfica adiantada na Sprint 2, tratando agrupamentos, estados, ausência de coordenadas, responsividade e integração final | Backend + Frontend | Capturas do mapa, cenários de localização e validação funcional |

| Ranking por consumo e emissões | Serviços são ordenados segundo métrica e período selecionados, usando dados comparáveis | Backend + Frontend | Testes do ranking e captura da interface |

| Comparação entre serviços | Usuário seleciona serviços e compara métricas no mesmo recorte temporal | Backend + Frontend | Cenário de uso validado e demonstração |

| Filtros e navegação | Períodos e seleções podem ser alterados sem resultados inconsistentes; estados vazios são comunicados | Frontend | Testes funcionais e capturas |

| Consolidação de qualidade e segurança | Revisão de responsividade, desempenho, tratamento de falhas e proteção dos recursos aplicáveis | Equipe | Resultado dos testes e checklist de validação final |

| Documentação e demonstração final | Artefatos atualizados, fluxo ponta a ponta validado e demonstração final disponível | Toda a equipe | [`arquitetura.md`](arquitetura.md), [`api.md`](api.md), [Sprint 3](sprints/sprint-3.md) e vídeo final |


**Dependências:** métricas persistidas, histórico temporal e indicadores calculados na Sprint 2.  

**Registro de execução:** [Sprint 3](sprints/sprint-3.md), a preencher conforme as entregas forem verificadas.


---
## 04. Governança e responsáveis
A responsabilidade pelas **tarefas individuais** é definida no [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2). Este plano registra os responsáveis por **entregas e frentes principais**, enquanto os registros de cada sprint detalham responsável principal, apoios, revisões e participação efetiva.

Na Sprint 2, a distribuição foi consolidada no backlog e nas evidências da entrega. Na Sprint 3, as atribuições devem seguir o planejamento registrado no respectivo backlog e no GitHub Projects.


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

- [ ] A entrega foi apresentada ou validada no fechamento da sprint, com feedback e decisões registrados quando houver Sprint Review.


_> Esta é a _**definição de pronto proposta para o projeto**_. Sua aplicação deve ser proporcional ao tipo de tarefa e validada pela equipe._


## 08. Controle de mudanças
Se surgir uma alteração relevante em prazo, escopo ou critério de aceite:


1\. Registrar e discutir a mudança na planning ou no refinamento do backlog.

2\. Atualizar o [Product Backlog](product-backlog.md) e as tarefas do [GitHub Projects](https://github.com/orgs/let-zapplin/projects/2).

3\. Atualizar **este plano apenas se mudar o marco, a entrega ou a dependência**.

4\. Registrar no documento da sprint o resultado efetivo e eventuais desvios.


Assim, o plano permanece enxuto e confiável, enquanto cada sprint preserva o histórico detalhado do desenvolvimento.
