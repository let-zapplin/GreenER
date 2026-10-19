# Product Backlog

← [Índice da Documentação](../../README.md)

> Artefato mantido pelo **Product Owner**. Revisado e refinado ao início de cada sprint.
> Histórias seguem o formato: *"Como [persona], quero [ação] para [benefício]."*

---

## Legenda de Prioridade

| Valor     | Significado                                                     |
| --------- | --------------------------------------------------------------- |
| 🔴 Alta   | Essencial para o MVP — deve ser entregue nas primeiras sprints |
| 🟡 Média | Importante, mas pode aguardar estabilização do MVP            |
| 🟢 Baixa  | Desejável ou extensão opcional                                |

---

## Histórias de Usuário

| ID   | Como...                       | Quero...                                                                                              | Para...                                                                            | Prioridade | Sprint | Status                              |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------- |
| US01 | usuário da plataforma        | que o sistema identifique automaticamente os serviços disponíveis no Agregador de Métricas         | acompanhar os serviços existentes sem cadastrá-los manualmente                   | 🔴 Alta    | S1     | ✅ concluído                      |
| US02 | usuário da plataforma        | que o sistema reconheça quando serviços são adicionados, removidos ou ficam indisponíveis         | que o painel represente o estado atual do ambiente monitorado                      | 🔴 Alta    | S1     | ✅ concluído                      |
| US03 | usuário da plataforma        | que as métricas de cada serviço sejam coletadas periodicamente                                      | acompanhar seu comportamento ao longo do tempo                                     | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US04 | usuário da plataforma        | que novas métricas sejam consideradas a cada coleta                                                  | que as informações exibidas representem as alterações do ambiente monitorado   | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US05 | usuário da plataforma        | ser informado quando um serviço não responder ou estiver indisponível                              | saber quais serviços não estão sendo monitorados em tempo real                  | 🔴 Alta    | S1     | ✅ concluído                      |
| US06 | usuário da plataforma        | saber quando um serviço continua ativo mas deixa de fornecer métricas                               | diferenciar uma ausência de dados de uma indisponibilidade do serviço            | 🔴 Alta    | S1     | ✅ concluído                      |
| US07 | usuário da plataforma        | visualizar o consumo energético e a emissão estimada de CO₂e de cada serviço                      | compreender seu impacto ambiental individual                                       | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US08 | usuário da plataforma        | visualizar indicadores consolidados do ambiente                                                       | compreender rapidamente a situação geral das aplicações monitoradas            | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US09 | usuário da plataforma        | visualizar um dashboard com informações dos serviços monitorados                                   | acompanhar os indicadores em um único lugar                                      | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US10 | usuário da plataforma        | que o dashboard seja atualizado automaticamente                                                       | acompanhar o ambiente sem precisar recarregar a página manualmente                | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US11 | usuário da plataforma        | consultar o histórico das coletas realizadas                                                         | analisar como as métricas e os indicadores ambientais mudaram ao longo do tempo   | 🟡 Média  | S2     | ⏳ em desenvolvimento               |
| US12 | usuário da plataforma        | visualizar onde cada serviço está hospedado                                                         | relacionar sua localização aos indicadores apresentados                          | 🟡 Média  | S3     | 🔜 desenvolvimento futuro           |
| US13 | usuário da plataforma        | visualizar geograficamente os serviços que possuem coordenadas disponíveis                          | entender sua distribuição espacial                                               | 🟢 Baixa   | S3     | 🔜 desenvolvimento futuro           |
| US14 | usuário da plataforma        | ordenar os serviços pelo impacto ambiental estimado                                                  | identificar quais apresentam maior ou menor impacto no período analisado          | 🟡 Média  | S3     | 🔜 desenvolvimento futuro           |
| US15 | usuário da plataforma        | selecionar dois ou mais serviços e comparar suas métricas e indicadores ambientais                  | compreender suas diferenças de impacto                                            | 🟡 Média  | S3     | 🔜 desenvolvimento futuro           |
| US16 | usuário autorizado           | me autenticar antes de acessar a área de configuração                                              | impedir acesso não autorizado às configurações da plataforma                   | 🟡 Média  | S1     | ⚠️ concluído parcialmente        |
| TS01 | usuário                      | utilizar a plataforma em diferentes tamanhos de tela                                                  | conseguir acompanhar os dados tanto em computadores quanto em dispositivos móveis | 🔴 Alta    | S1     | 🔄️ em desenvolvimento continuado |
| TS02 | usuário                      | que o GreenER continue funcionando mesmo quando um serviço ou uma API auxiliar estiver indisponível | que uma falha isolada não impeça o acompanhamento de todo o ambiente             | 🟡 Média  | S3     | 🔜 desenvolvimento futuro           |
| TS03 | usuário                      | que a interface responda em tempo adequado                                                            | conseguir acompanhar continuamente o ambiente monitorado                           | 🟢 Baixa   | S3     | 🔜 desenvolvimento futuro           |
| TS04 | integrante da equipe técnica | encontrar instruções e documentação do projeto                                                    | conseguir executar, entender e manter a aplicação corretamente                   | 🔴 Alta    | S1     | 🔄️ em desenvolvimento continuado |

---

## Critérios de Aceitação

### Épico 1 — Monitoramento e Conferência dos Serviços

#### US01 — Descobrir serviços disponíveis

> **Como** usuário da plataforma, **quero** que o sistema identifique automaticamente os serviços disponíveis no Agregador de Métricas, **para** que eu possa acompanhar os serviços existentes sem cadastrá-los manualmente.

- [X] O sistema deve consultar o Agregador de Métricas
- [X] Os serviços retornados devem ser identificados pela aplicação
- [X] Novos serviços disponibilizados pelo agregador devem aparecer no sistema

**RF relacionado:** RF01 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US02 — Acompanhar mudanças nos serviços

> **Como** usuário da plataforma, **quero** que o sistema reconheça quando serviços são adicionados, removidos ou ficam indisponíveis, **para** que o painel represente o estado atual do ambiente monitorado.

- [X] Um novo serviço deve ser identificado durante a execução
- [X] Um serviço removido deve deixar de ser tratado como disponível
- [X] Um serviço indisponível deve ter seu estado atualizado
- [X] Quando um serviço retornar, seu estado deve ser atualizado novamente

**RF relacionado:** RF02 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US03 — Coletar métricas dos serviços

> **Como** usuário da plataforma, **quero** que as métricas de cada serviço sejam coletadas periodicamente, **para** que eu possa acompanhar seu comportamento ao longo do tempo.

- [X] O sistema deve consultar `/metrics/{id_servico}`
- [X] A consulta deve ocorrer para cada serviço disponível
- [ ] A coleta deve ocorrer periodicamente

**RF relacionado:** RF03 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US04 — Trabalhar com métricas variáveis

> **Como** usuário da plataforma, **quero** que novas métricas sejam consideradas a cada coleta, **para** que as informações exibidas representem as alterações do ambiente monitorado.

- [ ] O sistema não deve assumir que uma métrica permanecerá igual entre duas consultas
- [ ] Novos valores recebidos devem ser processados normalmente
- [ ] A interface deve poder apresentar os dados atualizados

**RF relacionado:** RF04 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 2 — Verificação de Disponibilidade

#### US05 — Identificar serviços indisponíveis

> **Como** usuário da plataforma, **quero** ser informado quando um serviço não responder ou estiver indisponível, **para** que eu saiba quais serviços não estão sendo monitorados normalmente.

- [ ] Falha na consulta de um serviço deve ser identificada
- [ ] O serviço deve ser sinalizado como indisponível
- [ ] A indisponibilidade de um serviço não deve impedir o monitoramento dos demais

**RF relacionado:** RF05 (relacionada ao RNF04) | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US06 — Identificar ausência de métricas

> **Como** usuário da plataforma, **quero** saber quando um serviço continua ativo mas deixa de fornecer métricas, **para** diferenciar ausência de dados de indisponibilidade do serviço.

- [ ] O sistema deve reconhecer quando o serviço continua listado em `/services`
- [ ] Deve verificar se esse serviço está retornando métricas
- [ ] Um serviço ativo sem métricas deve possuir uma sinalização própria

**RF relacionado:** RF06 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 3 — Impacto Ambiental

#### US07 — Visualizar impacto individual de um serviço

> **Como** usuário da plataforma, **quero** visualizar o consumo energético e a emissão estimada de CO₂e de cada serviço, **para** compreender seu impacto ambiental individual.

- [ ] Cada serviço deve possuir uma estimativa de consumo energético
- [ ] Cada serviço deve possuir uma estimativa de emissão de CO₂e
- [ ] Os cálculos devem utilizar os dados obtidos durante o monitoramento

**RF relacionado:** RF07 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US08 — Visualizar indicadores gerais

> **Como** usuário da plataforma, **quero** visualizar indicadores consolidados do ambiente, **para** compreender rapidamente a situação geral das aplicações monitoradas.

- [ ] Consumo energético total
- [ ] Emissão total
- [ ] Quantidade de serviços ativos
- [ ] Quantidade de serviços indisponíveis

**RF relacionado:** RF08 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 4 — Dashboard

#### US09 — Visualizar o dashboard de serviços

> **Como** usuário da plataforma, **quero** visualizar um dashboard com informações dos serviços monitorados, **para** acompanhar o ambiente em um único lugar.

Para cada serviço, o dashboard deve apresentar:

- [X] Estado de monitoramento
- [X] Localização
- [X] Métricas disponíveis
- [ ] Consumo energético estimado
- [ ] Emissão estimada de CO₂

**RF relacionado:** RF09 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US10 — Visualizar dados atualizados automaticamente

> **Como** usuário da plataforma, **quero** que o dashboard seja atualizado automaticamente, **para** acompanhar o ambiente sem precisar recarregar a página manualmente.

- [X] As informações devem ser atualizadas periodicamente
- [X] Não deve ser necessário atualizar manualmente a página
- [ ] A aplicação deve informar a data e hora da última atualização
- [ ] O intervalo utilizado para atualização deve ser definido pela aplicação

**RF relacionado:** RF11, RNF02 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 5 — Histórico e Análise Temporal

#### US11 — Consultar histórico de coletas

> **Como** usuário da plataforma, **quero** consultar o histórico das coletas realizadas, **para** analisar como as métricas e os indicadores ambientais mudaram ao longo do tempo.

- [ ] As coletas realizadas devem ser armazenadas
- [ ] Os dados históricos devem permanecer associados ao respectivo serviço
- [ ] O histórico deve permitir análise temporal

**RF relacionado:** RF10 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 6 — Distribuição Geográfica

#### US12 — Consultar localização do serviço

> **Como** usuário da plataforma, **quero** visualizar onde cada serviço está hospedado, **para** relacionar sua localização aos indicadores apresentados.

O sistema deve apresentar:

- [ ] Localização do serviço, quando disponível

**RF relacionado:** RF12 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US13 — Visualizar serviços no mapa

> **Como** usuário da plataforma, **quero** visualizar geograficamente os serviços que possuem coordenadas disponíveis, **para** entender sua distribuição espacial.

- [X] Serviços com latitude e longitude poderão ser apresentados no mapa
- [ ] A ausência de coordenadas não pode impedir a visualização das demais informações
- [ ] Serviços sem coordenadas devem continuar disponíveis nas outras visualizações

**RF relacionado:** RF13 | **Aceito por:** Product Owner (validar na Sprint Review)

> **Observação:** o próprio requisito usa "poderá", então esta story tem prioridade menor que as obrigatórias.

---

### Épico 7 — Comparação de Impacto entre Serviços

#### US14 — Ordenar serviços por impacto

> **Como** usuário da plataforma, **quero** ordenar os serviços pelo impacto ambiental estimado, **para** identificar quais apresentam maior ou menor impacto no período analisado.

- [ ] Deve ser possível ordenar por consumo energético estimado
- [ ] Deve ser possível ordenar por emissão estimada de CO₂
- [ ] O período utilizado na comparação deve ser apresentado

**RF relacionado:** RF14 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### US15 — Comparar serviços

> **Como** usuário da plataforma, **quero** selecionar dois ou mais serviços e comparar suas métricas e indicadores ambientais, **para** compreender suas diferenças de impacto.

- [ ] O usuário deve conseguir comparar dois ou mais serviços
- [ ] Os serviços devem ser comparados utilizando o mesmo período
- [ ] A comparação deve considerar métricas e indicadores ambientais

**RF relacionado:** RF15 | **Aceito por:** Product Owner (validar na Sprint Review)

---

### Épico 8 — Acesso à Configuração

#### US16 — Acessar área de configuração com autenticação

> **Como** usuário autorizado, **quero** me autenticar antes de acessar a área de configuração, **para** impedir acesso não autorizado às configurações da plataforma.

- [X] O processo de autenticação deve ocorrer pelo backend
- [ ] Após autenticação válida, deve ser utilizado JWT
- [ ] Usuários não autenticados não devem acessar recursos protegidos da área de configuração
- [X] Apenas esconder a interface no frontend não deve ser considerado controle de acesso

**Aceito por:** Product Owner (validar na Sprint Review)

---

### Technical Stories / Enablers (Requisitos Não Funcionais)

#### TS01 — Interface responsiva

> **Como** usuário, **quero** utilizar a plataforma em diferentes tamanhos de tela, **para** conseguir acompanhar os dados tanto em computadores quanto em dispositivos móveis.

- [X] Interface simples
- [X] Clara
- [X] Responsiva
- [X] Utilizável em navegadores e dispositivos móveis

**RNF relacionado:** — | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### TS02 — Tolerância a falhas

> **Como** usuário, **quero** que o GreenER continue funcionando mesmo quando um serviço ou uma API auxiliar estiver indisponível, **para** que uma falha isolada não impeça o acompanhamento de todo o ambiente.

- [ ] Falha de um serviço não derruba a aplicação
- [ ] Falha de uma API auxiliar não deve encerrar a aplicação
- [ ] O problema deve ser informado ao usuário

**RNF relacionado:** RNF04 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### TS03 — Desempenho adequado

> **Como** usuário, **quero** que a interface responda em tempo adequado, **para** conseguir acompanhar continuamente o ambiente monitorado.

- [ ] A aplicação deve apresentar tempo adequado de resposta

**RNF relacionado:** RNF03 | **Aceito por:** Product Owner (validar na Sprint Review)

---

#### TS04 — Documentação do sistema

> **Como** integrante da equipe técnica, **quero** encontrar instruções e documentação do projeto, **para** conseguir executar, entender e manter a aplicação corretamente.

A documentação deve conter:

- [X] Instruções de execução
- [X] Arquitetura
- [X] Modelo de dados
- [X] Endpoints criados pela equipe
- [X] Configuração do acesso às APIs auxiliares

**RNF relacionado:** RNF05 | **Aceito por:** Product Owner (validar na Sprint Review)

---

## Histórico de Alterações

| Data       | Alteração                  | Responsável   |
| ---------- | ---------------------------- | -------------- |
| 29/09/2026 | Criação inicial do backlog | Gustavo (P.O.) |
| 18/10/2026 | Atualização da Sprint 1    | Gustavo (P.O.) |

---

<div align="center">
  <a href="../../README.md">← Voltar ao Índice</a>
</div>
