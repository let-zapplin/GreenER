# Plano de entregas — GreenER

## Objetivo
Evoluir incrementalmente uma aplicação de monitoramento de serviços e de seus impactos ambientais, com histórico, indicadores e recursos de análise.

## Cronograma
| Sprint | Período | Objetivo | Entregáveis e critérios de aceite |
|---|---|---|---|
| 1 | 28/09–19/10/2026 | Estabelecer a fundação e o primeiro fluxo funcional | Infraestrutura Docker; modelos e protótipos; descoberta e sincronização de serviços; listagem no React; autenticação inicial; testes e validação do fluxo. Evidências no registro da sprint. |
| 2 | 20/10–09/11/2026 | Coletar métricas e produzir indicadores | Coleta periódica por serviço; persistência histórica; cálculo documentado de energia e CO₂e; dashboard com totais e evolução; atualização automática; testes de cálculo e falhas. |
| 3 | 10/11–23/11/2026 | Apoiar comparação e decisão | Mapa por localização; ranking por período; comparação entre serviços; filtros; melhorias de desempenho, responsividade, tolerância a falhas e validação final. |

## Marcos e dependências
- Sprint 2 depende do cadastro e da identificação dos serviços implementados na Sprint 1.
- Sprint 3 depende das séries históricas e indicadores da Sprint 2.
- Integrações externas devem prever indisponibilidade, timeout e respostas incompletas.
- As datas são as documentadas no README; os critérios futuros representam metas, não funcionalidades já concluídas.

## Definição de pronto
Uma entrega é considerada pronta quando possui implementação revisada, teste pertinente, evidência de funcionamento, documentação atualizada e integração validada quando aplicável.

## Acompanhamento
O status detalhado e os responsáveis por tarefa devem ser acompanhados no GitHub Projects e nos registros de cada sprint, evitando duplicar listas divergentes.