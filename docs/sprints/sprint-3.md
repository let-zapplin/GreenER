# Sprint Backlog 3 - GreenER

← [Voltar ao índice da documentação](../../README.md)

> **Período:** 10/11/2026 a 23/11/2026  
> **Objetivo da Sprint:** transformar os dados históricos consolidados na Sprint 2 em recursos de análise e tomada de decisão, implementando ranking, comparação e filtros temporais, **consolidando o mapa antecipado na Sprint 2** e finalizando experiência, desempenho, testes e documentação do MVP.

---

## 1. Diretrizes de planejamento

A Sprint 3 é a etapa final do MVP e deve priorizar **análise, integração, refinamento, regressão e fechamento**.

As estruturas fundamentais de:

- coleta;
- persistência;
- histórico;
- cálculo ambiental;
- indicadores;
- autenticação;
- atualização automática

já foram tecnicamente validadas na Sprint 2 e devem ser reutilizadas, não reimplementadas.

### Adaptação antes do início da Sprint 3

A **US13 — Visualização geográfica com serviços reais**, originalmente estimada em **5 SP para a Sprint 3**, foi antecipada para a Sprint 2 durante a reformulação do Monitoramento.

Consequências para este planejamento:

- a US13 permanece visível neste backlog para rastreabilidade;
- seus **5 SP não são contabilizados novamente** na capacidade da Sprint 3;
- a Sprint 3 fica responsável pela revisão, integração definitiva e refinamentos do mapa;
- o total de trabalho novo/planejado da Sprint 3 passa de **69 SP para 64 SP**.

> Esta adaptação foi registrada em 09/11/2026, antes da Sprint Review 2. Eventuais novos ajustes decorrentes da Review devem ser registrados depois que o feedback realmente ocorrer.

### Prioridade

| Prioridade | Significado |
| --- | --- |
| **P0** | Obrigatório para concluir requisitos ou validar o MVP |
| **P1** | Importante para qualidade, usabilidade ou robustez |
| **P2** | Refinamento que pode ter escopo reduzido se houver risco à entrega |

---

## 2. Sprint Backlog

| Ordem | ID | Tipo | Item | Requisitos | Rubrica relacionada | Área | Prioridade | SP S3 | Responsável | Apoio / revisão | Dependências | Status inicial | Entrega esperada |
| ---: | --- | --- | --- | --- | --- | --- | :---: | ---: | --- | --- | --- | --- | --- |
| 1 | TEC24 | Técnico | Implementar filtros e seleção de período | RF14, RF15 | DW03, DW04, BD04 | Frontend / Backend | **P0** | **5** | **Vitor** | Marcello | Histórico Sprint 2 | ⬜ A fazer | Período explícito e reutilizável por histórico, ranking e comparação. |
| 2 | TEC35 | Técnico | Criar consultas analíticas por período | RF10, RF14, RF15 | BD04, BD02 | Backend / DB | **P0** | **5** | **Gustavo** | Marcello | TEC24 | ⬜ A fazer | Consultas com filtros temporais, agregações, ordenação e relacionamento por serviço. |
| 3 | US12 | User Story | Consolidar localização dos serviços | RF12 | DW04 | Frontend / Backend | **P1** | **2** | **Patricia** | Igor | Dados persistidos | 🔄 Parcial | Validar contratos opcionais/nulos e consolidar localização nas visualizações finais. |
| 4 | US13 | User Story | Consolidar a visualização geográfica antecipada na Sprint 2 | RF13, RNF01, RNF04 | DW04 | Frontend | **P1** | **0*** | **Igor** | Vitor + Patricia | Implementação da Sprint 2 | 🔄 Em revisão | Concluir revisão/integração, agrupamentos, estados, ausência de coordenadas e responsividade. |
| 5 | US14 | User Story | Implementar ranking de impacto | RF14 | BD04, DW03, DW04 | Frontend / Backend | **P0** | **5** | **Marcello** | Gustavo + Patricia | TEC24, TEC35 | ⬜ A fazer | Ordenação por energia ou CO₂e com período explicitamente informado. |
| 6 | US15 | User Story | Implementar comparação entre serviços | RF15 | BD04, DW03, DW04 | Frontend / Backend | **P0** | **8** | **Marcello** | Gustavo + Patricia | TEC24, TEC35 | ⬜ A fazer | Dois ou mais serviços comparados no mesmo período por métricas e indicadores ambientais. |
| 7 | TEC34 | Técnico / UI | Implementar painéis adaptáveis e recolhíveis | RF09, RNF01 | DW04 | Frontend / UX | **P1** | **5** | **Patricia** | Vitor | Dashboard Sprint 2 | ⬜ A fazer | Usuário pode abrir/minimizar áreas sem perder legibilidade. |
| 8 | TEC27 | Técnico / UI | Refinar dashboard e visualizações | RF08, RF09, RNF01 | DW04, DW05 | Frontend / UX | **P1** | **5** | **Vitor** | Patricia | US13 integrada, US14, US15 | ⬜ A fazer | Monitoramento, gráficos, ranking, comparação e mapa organizados em hierarquia coerente. |
| 9 | TEC25 | Técnico | Reforçar e revalidar tolerância a falhas | RNF04 | TP03 | Backend / Frontend | **P1** | **5** | **Igor** | Marcello | Fluxo completo | ⬜ A fazer | Regressão de falhas de serviço/APIs e comunicação adequada ao usuário. |
| 10 | TEC26 | Técnico | Revisar desempenho da aplicação | RNF03 | DW03, DW05 | Geral | **P1** | **3** | **Igor** | Gustavo | Fluxo completo | ⬜ A fazer | Identificar polling/consultas redundantes e gargalos relevantes. |
| 11 | TEC28 | Técnico / UI | Finalizar responsividade e experiência mobile | RNF01 | DW04 | Frontend / UX | **P1** | **5** | **Vitor** | Patricia | TEC27 | ⬜ A fazer | Fluxos principais utilizáveis em desktop e mobile sem cortes ou perda de informação. |
| 12 | TEC30 | Técnico | Ampliar cobertura de testes automatizados | Qualidade | TP03, ES07 | Backend / Frontend | **P1** | **5** | **Patricia** | Todos | Durante toda a Sprint | ⬜ A fazer | Cobertura de ranking, comparação, filtros, regressões, mapa e autenticação. |
| 13 | TEC31 | Técnico | Validar requisitos e fluxo completo do MVP | RF01-RF15, RP05 | ES03, ES04, ES07 | Geral | **P0** | **5** | **Gustavo** | Todos | Demais entregas | ⬜ A fazer | Checklist ponta a ponta `requisito → código → teste → evidência`. |
| 14 | TEC32 | Técnico | Revisar documentação técnica final | RNF05 | ES08 | Geral | **P0** | **3** | **Gustavo** | Vitor + todos | TEC31 | ⬜ A fazer | README, arquitetura, banco, API, cálculos e registros coerentes com o MVP final. |
| 15 | TEC33 | Técnico | Preparar ambiente e roteiro de demonstração final | RP04, RP05, Entrega | DW07, ES08 | Geral | **P0** | **3** | **Patricia** | Vitor + todos | TEC31 | ⬜ A fazer | Projeto inicializa por Docker e principais fluxos podem ser demonstrados sem preparação improvisada. |

\* **US13:** os 5 SP originais foram transferidos para o escopo executado da Sprint 2 e não são contados novamente na Sprint 3.

### Totais

```text
Planejamento original da Sprint 3: 69 SP
US13 antecipada para a Sprint 2:   -5 SP
-----------------------------------------
Trabalho novo/planejado na S3:     64 SP
```

---

## 3. Distribuição de capacidade após a antecipação da US13

| Integrante | SP principais restantes na S3 | Foco da Sprint 3 |
| --- | ---: | --- |
| **Gustavo** | **13** | consultas analíticas, validação do MVP e documentação final |
| **Marcello** | **13** | ranking e comparação |
| **Igor** | **8** | consolidação/revisão do mapa, tolerância a falhas e desempenho |
| **Patricia** | **15** | localização, interface adaptativa, testes e preparação da demonstração |
| **Vitor** | **15** | filtros, refinamento do dashboard e responsividade |

**Total restante: 64 SP.**

> A redução dos SP de Igor nesta tabela não significa redução de contribuição no projeto: os 5 SP da US13 foram executados antecipadamente na Sprint 2. A tabela acima representa apenas o **trabalho restante da Sprint 3**.

---

## 4. Sequência recomendada

### 10/11 a 13/11 — Base analítica
- TEC24;
- TEC35;
- US12;
- finalizar revisão/integração pendente da US13, se necessário.

### 14/11 a 17/11 — Recursos de análise
- US14;
- US15;
- validar integração do mapa com o Monitoramento sem bloquear ranking/comparação.

### 18/11 a 20/11 — Experiência e consolidação visual
- TEC34;
- TEC27;
- TEC28.

### 21/11 — Robustez e regressão
- TEC25;
- TEC26;
- TEC30.

### 22/11 a 23/11 — Freeze de funcionalidades
- TEC31;
- TEC32;
- TEC33;
- após o freeze, somente correções impeditivas ou regressões.

---

## 5. Critério de sucesso da Sprint

Ao final da Sprint 3, o GreenER deve permitir que o usuário:

1. consulte serviços e indicadores ambientais atuais e históricos;
2. selecione um período de análise;
3. utilize o mapa funcional antecipado na Sprint 2 de forma integrada e responsiva;
4. ordene serviços por energia ou CO₂e;
5. compare dois ou mais serviços no mesmo período;
6. utilize a aplicação em desktop e mobile sem perda de informação essencial;
7. continue utilizando o sistema diante de falhas isoladas;
8. execute todo o MVP por Docker;
9. encontre documentação coerente com a versão entregue.

---

## 6. Definition of Done da Sprint 3

Mantém-se a DoD utilizada na Sprint 2.

Uma entrega só pode ser marcada como concluída quando:

- [ ] critérios de aceite foram verificados;
- [ ] código foi revisado e integrado;
- [ ] testes relevantes foram executados;
- [ ] typecheck/build permanecem aprovados;
- [ ] não houve regressão nos requisitos aceitos nas Sprints anteriores;
- [ ] erros e estados incompletos são tratados;
- [ ] documentação afetada foi atualizada;
- [ ] a funcionalidade foi incluída no checklist final de rastreabilidade `requisito → código → teste → evidência`.

---

## 7. Pendências de adaptação após a Sprint Review 2

A Sprint Review 2 ainda não havia ocorrido no momento deste replanejamento.

Após a Review, registrar aqui somente decisões realmente tomadas, por exemplo:

- alterações de prioridade;
- refinamentos solicitados;
- itens removidos ou adicionados;
- mudanças nos critérios de aceite;
- ajustes de responsáveis ou sequência.

Não registrar feedback presumido antes da Review.
