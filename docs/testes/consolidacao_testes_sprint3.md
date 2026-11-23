# Consolidação dos testes e entregas — Sprint 3

## Identificação

- **Data da consolidação:** 21/11/2026.
- **Consolidação geral:** Patricia R. Maidana.
- **Branch consultada:** `tec30-ampliar-cobertura-de-testes-automatizados`.
- **Commit consultado:** [`6a8e616`](https://github.com/let-zapplin/GreenER/commit/6a8e616).
- **Objetivo:** reunir as entregas, os testes e as evidências das novas funcionalidades e da regressão das anteriores.

O levantamento utiliza o histórico local do Git, os arquivos presentes no projeto e os resultados das execuções. Os autores identificados são autores de commits; não representam necessariamente o responsável originalmente definido no backlog, o autor do PR ou quem aprovou a entrega. Os links de PR foram identificados pelas mensagens de merge, sem consulta ao estado atual no GitHub.

## Entregas e cobertura identificada

Os arquivos de teste citados abaixo são a cobertura disponível atualmente. Eles podem ter recebido complementos posteriores ao PR de implementação da funcionalidade.

| Funcionalidade | Autores identificados | PRs ou commit relacionados | Testes e evidências disponíveis | Observação |
| --- | --- | --- | --- | --- |
| Filtros e seleção de período | Vitor; testes complementares de Patricia | [PR #169](https://github.com/let-zapplin/GreenER/pull/169); [commit 6a8e616](https://github.com/let-zapplin/GreenER/commit/6a8e616) | `frontend/tests/analysisPeriod.test.ts` | Quatro testes aprovados; a integração do filtro com a tela exige conferência manual. |
| Consultas analíticas e consolidados | Gustavo Koiti | [PR #170](https://github.com/let-zapplin/GreenER/pull/170) | `backend/src/modules/indicadores/indicadores.service.test.ts`; testes HTTP e de serviço do dashboard | Cobertura de recursos, energia, emissão e estados parciais. A integração PostgreSQL existente testa coletas, não a consulta SQL dos indicadores. |
| Ranking de impacto | Vitor; validação manual de Patricia | [PR #172](https://github.com/let-zapplin/GreenER/pull/172); [PR #176 — documentação](https://github.com/let-zapplin/GreenER/pull/176) | Validação manual de energia, CO₂e, ordenação e aviso de dados parciais | Patricia informou que registrou capturas na task. Não há teste automatizado específico do componente de ranking. |
| Comparação entre serviços | Vitor; testes complementares de Patricia | [PR #174](https://github.com/let-zapplin/GreenER/pull/174); [PR #182](https://github.com/let-zapplin/GreenER/pull/182); [commit 6a8e616](https://github.com/let-zapplin/GreenER/commit/6a8e616) | `frontend/tests/comparisonSeries.test.ts`; `frontend/tests/comparisonMetrics.test.ts` | Dez testes aprovados nesses dois arquivos. Apresentação da falha HTTP parcial corrigida posteriormente nesta branch; conferência visual pendente. |
| Mapa e estados dos serviços | Marcello e Vitor; complementos de Patricia | [PR #171](https://github.com/let-zapplin/GreenER/pull/171); [PR #182](https://github.com/let-zapplin/GreenER/pull/182) | `serviceGeoJson.test.ts`, `regionEnergy.test.ts`, `monitoringState.test.ts`, `serviceMapping.test.ts` e `mapFocus.test.ts`, em `frontend/tests` | Coordenadas ausentes e inválidas, preservação de ponto válido, estados e foco possuem cobertura automatizada. Isso não substitui a conferência visual do mapa. |
| Localização dos serviços | Igor | [PR #177](https://github.com/let-zapplin/GreenER/pull/177) | `frontend/tests/serviceLocation.test.ts`; `backend/src/modules/servicos/servicos.service.test.ts` | Cobertura de informações de localização opcionais e ausentes. |
| Refinamentos de interface | Marcello, Patricia e Vitor | [PR #173](https://github.com/let-zapplin/GreenER/pull/173) | Validação visual dos fluxos e painéis | Confirmar as evidências específicas de navegação, abertura e recolhimento dos painéis. |
| Responsividade | Patricia | [PR #180](https://github.com/let-zapplin/GreenER/pull/180); [PR #187](https://github.com/let-zapplin/GreenER/pull/187) | Alterações em gráficos, comparação, ranking, mapa e estilos | A entrega do código está identificada; confirmar evidências de uso em desktop e celular. |
| Tolerância a falhas | Patricia | [PR #182](https://github.com/let-zapplin/GreenER/pull/182) | Testes de comparação e mapa; validação manual da interrupção e recuperação do backend | Patricia informou aprovação manual e documentação das evidências na task. Falha isolada de histórico não foi validada manualmente. |
| Projeção ambiental por localização | Vitor | [PR #179](https://github.com/let-zapplin/GreenER/pull/179); [PR #181](https://github.com/let-zapplin/GreenER/pull/181) | `backend/src/modules/projecoes/projecoes.service.test.ts`; `backend/src/modules/projecoes/projecoes.http.test.ts` | Sucesso, dados ausentes, validação de entrada e autenticação possuem cenários automatizados. |
| Redistribuição automática de serviços | Gustavo Koiti e Vitor | [PR #185](https://github.com/let-zapplin/GreenER/pull/185) | Testes de projeções e indicadores; `frontend/tests/redistributionEmissions.test.ts` | Cobertura das políticas, viabilidade, cobertura parcial e emissões comparáveis. |
| Assistente Karma | Igor, Marcello e Vitor | [PR #186](https://github.com/let-zapplin/GreenER/pull/186) | Arquivos `*.test.ts` de `backend/src/modules/chat` | Cobertura de serviço, HTTP, conversação, conhecimento, cache e cliente Ollama. Os testes de ranking do assistente não validam o componente visual de ranking. |
| Autenticação e regressões anteriores | Contribuições de sprints anteriores; complementos de testes de Patricia | Histórico anterior à consolidação; sem atribuição a um único PR da Sprint 3 | `frontend/tests/authSession.test.ts`; testes de auth, middlewares JWT/admin e utilitários JWT do backend | Suítes aprovadas; conferir também login, acesso protegido e logout na plataforma. |

## Dois arquivos acrescentados por Patricia nesta task

Os arquivos abaixo pertencem ao [commit 6a8e616](https://github.com/let-zapplin/GreenER/commit/6a8e616). Não foi identificado número de PR associado a esse commit no histórico local consultado; isso não descarta a existência de um PR aberto.

### `frontend/tests/analysisPeriod.test.ts`

**Resultado: quatro testes aprovados.**

1. Reconhece os filtros de 1h, 6h, 24h e 7d.
2. Rejeita durações que não correspondem aos filtros disponíveis.
3. Calcula início e fim dos quatro filtros a partir de um horário fixo.
4. Mantém a janela correta ao atravessar a meia-noite e mudar de mês.

Os testes exercitam `isSupportedAnalysisPeriod` e `createAnalysisPeriodWindow`, de `frontend/src/services/analysisPeriod.ts`. Não acessam API ou banco nem comprovam, isoladamente, a aplicação do filtro na interface.

### `frontend/tests/comparisonMetrics.test.ts`

**Resultado: cinco testes aprovados.**

1. Usa totais do período para energia e emissão, sem usar a última amostra.
2. Usa médias de CPU, memória e disco, sem usar os picos.
3. Usa o total de rede do período, sem usar a última amostra.
4. Preserva recursos ausentes como `null` em um serviço parcial.
5. Preserva valores zero sem confundi-los com dados ausentes.

Os testes exercitam `getComparisonPeriodValue`, de `frontend/src/lib/comparisonMetrics.ts`. Os dados controlados distinguem médias, picos, última amostra e totais. Não recalculam os indicadores do backend nem renderizam a tela.

Ambos utilizam a estrutura existente de `node:test` e `node:assert/strict`, sem novas dependências ou mudanças na aplicação.

## Resultados das verificações

| Verificação | Último resultado confirmado | Contexto |
| --- | --- | --- |
| Suíte comum do backend | **300 testes aprovados; sete ignorados** | Execução da análise de 21/11/2026, anterior ao commit que acrescenta os dois arquivos de frontend. |
| Suíte completa do frontend | **62 testes aprovados; nenhuma falha ou teste ignorado** | Reexecutada após a correção da apresentação da comparação parcial, na cópia de trabalho baseada no commit `6a8e616`. Não há teste automatizado de renderização desse cenário na suíte atual. |
| Integração PostgreSQL | **Sete testes aprovados** | Executada em 21/11/2026, no ambiente exclusivo de `compose.test.yaml`. |
| Typecheck do backend | **Aprovado** | Execução da análise anterior à inclusão dos dois arquivos de teste. |
| Typecheck do frontend | **Aprovado** | Reexecutado após a correção da apresentação da comparação parcial. |
| Build do backend | **Aprovado** | Execução da análise anterior à inclusão dos dois arquivos de teste. |
| Build do frontend | **Aprovado com aviso de tamanho dos arquivos gerados** | Reexecutado após a correção da apresentação da comparação parcial; o aviso não impediu a compilação. |

Os sete testes ignorados na suíte comum são os testes de integração das coletas, habilitados separadamente por `RUN_DB_INTEGRATION_TESTS=true`. Eles passaram na execução dedicada. A mensagem de violação de restrição durante a integração é esperada pelo cenário que valida rollback.

Os typechecks atuais não abrangem os arquivos de teste: o frontend inclui `src` e `vite.config.ts`; o backend exclui `src/**/*.test.ts`. Portanto, a aprovação do typecheck não deve ser apresentada como verificação estática dos arquivos de teste.

## Evidências manuais e pendências

| Cenário | Situação nesta consolidação | Evidência ou encaminhamento |
| --- | --- | --- |
| Interrupção e recuperação do backend | **✅ Aprovado conforme execução informada por Patricia** | Capturas e descrição estão anexadas no comentário da issue #162.  |
| Ranking com dados parciais retornados pela API | **✅ Aprovado conforme execução informada por Patricia** |  Captura anexada no comentário da issue #162. |
| Mapa com coordenadas ausentes | **✅ Preparação dos dados aprovada por teste automatizado** | `serviceGeoJson.test.ts`. Cenário visual com coordenadas ausentes não foi reproduzido de forma controlada. |
| Filtros aplicados na plataforma | **✅ Evidência manual dos fluxos normais confirmada por Patricia** | Fluxo normal registrado na consolidação e navegação das análises evidenciada no PR #189; testes automatizados cobrem as janelas 1h, 6h, 24h e 7d. |
| Comparação na plataforma | **✅ Evidência manual dos fluxos normais confirmada por Patricia** |PR #189 contém captura da área de Comparação; seleção de serviços e visualizações normal/consolidada foram registradas. |
| Responsividade e painéis | **✅ Evidências confirmadas por Patricia** | Conferência em desktop e celular de controles, gráficos, mapa e painéis. |
| Login, acesso protegido e logout | **✅ Suítes automatizadas aprovadas; confirmar evidência manual** | Executado o fluxo na plataforma e registrar o resultado. |
| Falha HTTP isolada na comparação temporal | **⚠️ Apresentação corrigida; validação manual pendente** |O código preserva históricos bem-sucedidos e identifica consultas com falha. A PR #189 declara que o cenário não foi reproduzido manualmente por bloqueio de requisição; não foi encontrada captura posterior que permita marcar a evidência visual como aprovada.|

As evidências citadas por Patricia foram conferidas no GitHub. A issue #162 contém anexos da regressão de tolerância a falhas e do ranking parcial; a PR #189 contém capturas das execuções de testes, navegação de Explorar/Comparação/Projeções e responsividade. A única evidência visual específica não localizada é a falha HTTP parcial de um único histórico da comparação temporal.

### Correção da apresentação da comparação parcial

`useComparisonHistories.ts` utiliza `Promise.allSettled`, preserva os históricos recebidos e informa erro quando alguma consulta falha. A condição de `Analyses.tsx` que escondia o gráfico temporal diante de qualquer erro foi removida. A tela agora exibe os históricos disponíveis junto de um aviso de comparação parcial e dos nomes dos serviços cujas consultas falharam. Se apenas um histórico responder, a tela informa essa limitação. Se nenhum responder, mantém a mensagem de erro sem exibir o gráfico.

O aviso dos históricos aparece somente na evolução temporal, pois a comparação consolidada utiliza outra consulta. Os testes de gaps e de métricas consolidadas não comprovam esse cenário de requisições. A tentativa de bloqueio de uma consulta no navegador não foi concluída e a PR #189 registra explicitamente essa limitação. No fechamento de 23/11/2026, não foi localizada captura posterior; portanto, a correção permanece documentada como implementada, mas sem evidência visual controlada desse caso específico.

## Como reproduzir as verificações

Executar os comandos na pasta principal do projeto, com os serviços de aplicação iniciados.

### Dois arquivos novos

```powershell
docker compose exec frontend node --test tests/analysisPeriod.test.ts tests/comparisonMetrics.test.ts
```

### Suítes comuns

```powershell
docker compose exec backend npm test
docker compose exec frontend npm test
```

### Integração PostgreSQL

```powershell
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
```

Esse comando executa os testes de coletas em um PostgreSQL exclusivo, com banco `greener_test`, sem utilizar o banco de dados da aplicação.

### Typechecks e builds

```powershell
docker compose exec backend npm run typecheck
docker compose exec frontend npm run typecheck
docker compose exec backend npm run build
docker compose exec frontend npm run build
```

## Critérios de aceite da task

| Critério | Situação |
| --- | --- |
| Patricia consolida a cobertura geral | ✅ Consolidada neste relatório, com evidências do GitHub verificadas e limites separados das aprovações. |
| Suíte comum permanece aprovada | ✅ Backend com 300 aprovados/7 ignorados na última execução registrada; frontend atualizado para 101 testes aprovados no fechamento documentado de 23/11. |
| Integração PostgreSQL permanece aprovada | Sete testes aprovados na execução dedicada. |
| Typechecks continuam aprovados | ✅ Execuções registradas como aprovadas; alterações finais de documentação não alteram o código compilado. |
| Build continua aprovado | ✅ Última execução registrada aprovada, com aviso não bloqueante de tamanho de bundle. |

