# Cálculos Ambientais — GreenER

← [Voltar ao índice da documentação](../README.md)

> **Situação:** em elaboração durante a Sprint 2.  
> Este documento deve registrar somente fórmulas, fatores e unidades efetivamente definidos e utilizados pelo projeto. Não considerar campos marcados como **A definir** como implementação concluída.

---

## 1. Objetivo

Documentar de forma reproduzível como o GreenER transforma métricas técnicas dos serviços em estimativas de:

- consumo energético;
- emissão de CO₂ equivalente (CO₂e).

O documento deve permitir que outra pessoa reproduza manualmente um cálculo e compare o resultado com o backend.

---

## 2. Fluxo conceitual

```text
métricas do serviço
      ↓
modelo de estimativa energética
      ↓
energia estimada
      ↓
intensidade de carbono da região
      ↓
emissão estimada de CO₂e
```

---

## 3. Dados de entrada

A implementação da Sprint 2 deverá registrar aqui quais campos retornados por `/metrics/{id_servico}` são realmente utilizados.

| Dado | Unidade recebida | Origem | Utilizado no cálculo? | Observação |
|---|---|---|---|---|
| CPU | **A confirmar** | Metrics Aggregator API | A definir | Documentar nome exato do campo e significado |
| Memória | **A confirmar** | Metrics Aggregator API | A definir | Documentar unidade da API |
| Disco | **A confirmar** | Metrics Aggregator API | A definir | Documentar unidade da API |
| Rede | **A confirmar** | Metrics Aggregator API | A definir | Documentar unidade da API |
| Intensidade de carbono | **A confirmar** | Carbon Intensity API | Sim, após integração | Registrar unidade exata retornada pela API |
| Período/duração da coleta | **A definir** | Configuração GreenER | Sim | Deve ser coerente com o intervalo efetivo de coleta |

> As unidades acima devem ser copiadas da documentação/resposta real das APIs e não inferidas.

---

## 4. Estimativa de energia

### Fórmula adotada

**A definir e validar antes da implementação da US07.**

Registrar aqui:

```text
Energia estimada = ...
```

### Variáveis

| Símbolo / campo | Significado | Unidade |
|---|---|---|
| A definir | A definir | A definir |

### Premissas

Registrar explicitamente as premissas do modelo, incluindo:

- quais métricas influenciam o consumo;
- se existem coeficientes ou fatores de conversão;
- fonte dos coeficientes;
- duração considerada por coleta;
- limitações da estimativa.

---

## 5. Intensidade de carbono

A Carbon Intensity API deverá fornecer o fator utilizado para transformar energia em emissão estimada.

Documentar após TEC18:

| Item | Valor / regra |
|---|---|
| Endpoint utilizado | A definir após integração |
| Identificador geográfico utilizado | A definir |
| Unidade do fator | A confirmar pela API |
| Comportamento quando região não possui dado | A definir |
| Política para falha/timeout | A definir |
| Persistência do fator utilizado na coleta | A definir na revisão de banco |

Para manter consistência histórica, o projeto deve conseguir identificar qual fator de carbono foi utilizado em um cálculo realizado no passado.

---

## 6. Cálculo de CO₂e

### Fórmula adotada

**A definir após confirmação das unidades de energia e intensidade de carbono.**

A relação conceitual é:

```text
emissão estimada = energia estimada × fator de intensidade de carbono
```

A fórmula final deve registrar as unidades e conversões necessárias para que o resultado não dependa de interpretação implícita.

---

## 7. Exemplo manual obrigatório

Após definição das fórmulas, incluir pelo menos um exemplo completo com valores reais ou controlados:

```text
Serviço: exemplo
Período: ...

Métricas recebidas:
- CPU: ...
- Memória: ...
- Disco: ...
- Rede: ...

1. Energia estimada
   cálculo: ...
   resultado: ...

2. Intensidade de carbono
   região: ...
   fator utilizado: ...

3. CO₂e
   cálculo: ...
   resultado: ...
```

O resultado manual deve ser comparado com o retorno do backend em teste automatizado ou validação documentada.

---

## 8. Arredondamento e apresentação

Definir antes de concluir a US07:

- precisão utilizada internamente no backend;
- regra de arredondamento para apresentação;
- unidade utilizada nos endpoints;
- unidade utilizada no frontend;
- quando realizar conversão de unidade.

O valor persistido deve evitar perda desnecessária de precisão por arredondamento precoce.

---

## 9. Histórico e período

Cada resultado ambiental deve estar associado a uma coleta e a um instante/período identificável. Isso permitirá que as próximas funcionalidades utilizem dados comparáveis em:

- histórico;
- ranking;
- comparação entre serviços;
- filtros por período.

A Sprint 3 deverá agregar valores apenas dentro do mesmo recorte temporal quando houver comparação entre serviços.

---

## 10. Validação

Antes de declarar os cálculos concluídos:

- [ ] fórmula documentada;
- [ ] unidades documentadas;
- [ ] fontes dos fatores registradas;
- [ ] exemplo manual reproduzível;
- [ ] teste automatizado de um cenário conhecido;
- [ ] teste de variação das métricas;
- [ ] comportamento de erro da Carbon API definido;
- [ ] resposta da API documentada em `docs/api.md`;
- [ ] persistência do resultado/fator compatível com o histórico.

---

## 11. Histórico de decisões

| Data | Decisão | Motivo | Evidência |
|---|---|---|---|
| 20/10/2026 | Estrutura documental criada antes da implementação dos cálculos | Evitar fórmula implícita e garantir rastreabilidade da US07 | Sprint 2 / TEC21 |
| A preencher |  |  |  |
