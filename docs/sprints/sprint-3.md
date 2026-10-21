# Sprint Backlog 3 - GreenER

← [Voltar ao índice da documentação](../../README.md)

> **Período:** 10/11/2026 a 23/11/2026  
> **Objetivo da Sprint:** transformar os dados históricos coletados pelo GreenER em recursos de análise e tomada de decisão, implementando mapa, ranking, comparação e filtros temporais, além de consolidar experiência, desempenho, testes e documentação para entrega do MVP.

---

## 1. Diretrizes de planejamento

A Sprint 3 é mais curta e deve priorizar **análise, integração, refinamento e fechamento**. Novas estruturas fundamentais de persistência ou cálculo devem estar resolvidas na Sprint 2.

A divisão mantém carga principal próxima entre todos os integrantes, preservando continuidade das áreas em que cada um demonstrou autonomia na Sprint 1 e evitando concentração de conhecimento em uma única pessoa.

### Prioridade

| Prioridade | Significado |
| --- | --- |
| **P0** | Obrigatório para concluir requisitos ou validar o MVP |
| **P1** | Importante para qualidade, usabilidade ou robustez da entrega |
| **P2** | Refinamento que pode ter escopo reduzido se houver risco à entrega |

---

## 2. Sprint Backlog

| Ordem | ID | Tipo | Item | Requisitos | Rubrica relacionada | Área | Prioridade | SP | Responsável | Apoio / revisão | Dependências | Status | Entrega esperada |
| ---: | --- | --- | --- | --- | --- | --- | :---: | ---: | --- | --- | --- | --- | --- |
| 1 | TEC24 | Técnico | Implementar filtros e seleção de período | RF14, RF15 | DW03, DW04, BD04 | Frontend / Backend | **P0** | **5** | **Vitor** | Marcello | Histórico Sprint 2 | ⬜ A fazer | Período explícito e reutilizável por histórico, ranking e comparação. |
| 2 | TEC35 | Técnico | Criar consultas analíticas por período | RF10, RF14, RF15 | BD04, BD02 | Backend / DB | **P0** | **5** | **Gustavo** | Marcello | TEC24 | ⬜ A fazer | Consultas com filtros temporais, agregações, ordenação e relacionamento por serviço. |
| 3 | US12 | User Story | Consolidar localização dos serviços | RF12 | DW04 | Frontend / Backend | **P1** | **2** | **Patricia** | Igor | Dados persistidos | ⬜ A fazer | País, região e cidade apresentados quando disponíveis e contratos aceitando campos opcionais. |
| 4 | US13 | User Story | Implementar visualização geográfica com serviços reais | RF13 | DW04 | Frontend | **P1** | **5** | **Igor** | Vitor + Patricia | US12 | ⬜ A fazer | Mapa usa latitude/longitude reais; serviços sem coordenadas continuam disponíveis nas demais visualizações. |
| 5 | US14 | User Story | Implementar ranking de impacto | RF14 | BD04, DW03, DW04 | Frontend / Backend | **P0** | **5** | **Marcello** | Gustavo + Patricia | TEC24, TEC35 | ⬜ A fazer | Ordenação por energia ou CO₂e, com período analisado explicitamente informado. |
| 6 | US15 | User Story | Implementar comparação entre serviços | RF15 | BD04, DW03, DW04 | Frontend / Backend | **P0** | **8** | **Marcello** | Gustavo + Patricia | TEC24, TEC35 | ⬜ A fazer | Dois ou mais serviços comparados no mesmo período por métricas e indicadores ambientais. |
| 7 | TEC34 | Técnico / UI | Implementar painéis adaptáveis e recolhíveis | RF09, RNF01 | DW04 | Frontend / UX | **P1** | **5** | **Patricia** | Vitor | Dashboard Sprint 2 | ⬜ A fazer | Usuário pode abrir/minimizar áreas sem perder legibilidade, aprofundando o conceito adaptativo validado na Review. |
| 8 | TEC27 | Técnico / UI | Refinar dashboard e visualizações | RF08, RF09, RNF01 | DW04, DW05 | Frontend / UX | **P1** | **5** | **Vitor** | Patricia | US13, US14, US15 | ⬜ A fazer | Cards, gráficos, ranking, comparação e mapa organizados em hierarquia clara e coerente com a identidade visual. |
| 9 | TEC25 | Técnico | Reforçar tolerância a falhas | RNF04 | TP03 | Backend / Frontend | **P1** | **5** | **Igor** | Marcello | Fluxo completo | ⬜ A fazer | Falhas de serviço, Metrics API ou Carbon API isoladas, tratadas e comunicadas sem derrubar a aplicação. |
| 10 | TEC26 | Técnico | Revisar desempenho da aplicação | RNF03 | DW03, DW05 | Geral | **P1** | **3** | **Igor** | Gustavo | Fluxo completo | ⬜ A fazer | Identificar consultas/polling redundantes e corrigir gargalos relevantes para uso contínuo. |
| 11 | TEC28 | Técnico / UI | Finalizar responsividade e experiência mobile | RNF01 | DW04 | Frontend / UX | **P1** | **5** | **Vitor** | Patricia | TEC27 | ⬜ A fazer | Fluxos principais utilizáveis em desktop e mobile sem cortes ou perda de informação. |
| 12 | TEC30 | Técnico | Ampliar cobertura de testes automatizados | Qualidade | TP03, ES07 | Backend / Frontend | **P1** | **5** | **Patricia** | Todos | Durante toda a Sprint | ⬜ A fazer | Cobertura de ranking, comparação, filtros, falhas, autenticação e regressões das Sprints anteriores. |
| 13 | TEC31 | Técnico | Validar requisitos e fluxo completo do MVP | RF01-RF15, RP05 | ES03, ES04, ES07 | Geral | **P0** | **5** | **Gustavo** | Todos | Demais entregas | ⬜ A fazer | Checklist ponta a ponta dos requisitos, evidências e pendências antes da entrega. |
| 14 | TEC32 | Técnico | Revisar documentação técnica final | RNF05 | ES08 | Geral | **P0** | **3** | **Gustavo** | Vitor + todos | TEC31 | ⬜ A fazer | README, arquitetura, banco, API, cálculos e registros de Sprint coerentes com a versão final. |
| 15 | TEC33 | Técnico | Preparar ambiente e roteiro de demonstração final | RP04, RP05, Entrega | DW07, ES08 | Geral | **P0** | **3** | **Patricia** | Vitor + todos | TEC31 | ⬜ A fazer | Projeto inicializa de forma previsível por Docker e equipe consegue demonstrar os principais fluxos sem preparação manual improvisada. |

**Total planejado:** 69 SP

---

## 3. Distribuição de capacidade

| Integrante | SP principais | Foco da Sprint 3 |
| --- | ---: | --- |
| **Gustavo** | **13** | consultas analíticas, validação do MVP e documentação final |
| **Marcello** | **13** | ranking e comparação |
| **Igor** | **13** | mapa, tolerância a falhas e desempenho |
| **Patricia** | **15** | localização, interface adaptativa, testes e preparação da demonstração |
| **Vitor** | **15** | filtros, refinamento do dashboard e responsividade |

> A pontuação representa responsabilidade principal. O fechamento do MVP exige revisão cruzada e validação coletiva, especialmente em TEC31, TEC32 e TEC33.

---

## 4. Sequência recomendada

### 10/11 a 13/11 - Base analítica
- TEC24, TEC35 e US12.

### 14/11 a 17/11 - Recursos de análise
- US13, US14 e US15.

### 18/11 a 20/11 - Experiência e consolidação visual
- TEC34, TEC27 e TEC28.

### 21/11 - Robustez e regressão
- TEC25, TEC26 e TEC30.

### 22/11 a 23/11 - Freeze de funcionalidades
- TEC31, TEC32 e TEC33.
- Após o freeze, somente correções impeditivas ou regressões.

---

## 5. Critério de sucesso da Sprint

Ao final da Sprint 3, o GreenER deve permitir que o usuário:

1. consulte serviços e indicadores ambientais atuais e históricos;
2. selecione um período de análise;
3. visualize localização e serviços no mapa quando houver coordenadas;
4. ordene serviços por energia ou CO₂e;
5. compare dois ou mais serviços no mesmo período;
6. utilize a aplicação de forma responsiva e compreensível;
7. continue utilizando o sistema mesmo diante de falhas isoladas;
8. execute todo o MVP por Docker e encontre documentação coerente com a entrega.

---

## 6. Definition of Done da Sprint 3

Mantém-se a DoD da Sprint 2, com dois critérios adicionais:

- [ ] não houve regressão nos requisitos aceitos nas Sprints anteriores;
- [ ] a funcionalidade foi incluída no checklist final de rastreabilidade `requisito → código → teste → evidência`.
