# Cálculos Ambientais — GreenER

← [Voltar ao índice da documentação](../README.md)

> **Situação:** cálculo de energia e CO₂e disponível no backend, ainda parcial.
> Este documento descreve o comportamento atual de `GET /api/indicadores`, incluindo as premissas provisórias. Os fatores do modelo são os valores do exemplo fornecido pelo cliente; não são medições diretas de potência do hardware.

---

## 1. Objetivo e fluxo

O módulo transforma métricas técnicas persistidas em estimativas de consumo energético e emissão de CO₂ equivalente:

```text
tentativas de coleta e métricas salvas
      ↓
estimativa de potência do serviço
      ↓
energia estimada por amostra
      ↓
intensidade de carbono regional salva
      ↓
emissão estimada de CO₂e
```

O endpoint consulta o PostgreSQL, não as APIs externas. Os resultados são calculados a cada requisição e não são persistidos como registros de indicadores.

---

## 2. Entradas, unidades e limitações

| Dado | Campo persistido / API | Unidade usada pelo cálculo | Uso e observações |
|---|---|---|---|
| Uso da CPU | `cpu_percent` | percentual (%) | Convertido para fração dividindo por 100; valores fora de 0 a 100 são inválidos |
| Memória | `memory_gb` | GB | Multiplicada pelo fator de potência de memória |
| Disco | `disk_gb` | GB | Multiplicado pelo fator de potência de disco |
| Rede | `network_gb` | GB | Multiplicada pelo fator de potência de rede |
| Duração da amostra | `collection_interval_seconds` na resposta da Metrics API | segundos | A API declara esse campo, mas o código atual não o valida como parte do payload de métricas nem o persiste |
| Intervalo usado atualmente | `COLLECTION_INTERVAL_MS` | milissegundos | Intervalo configurado entre ciclos do job; usado provisoriamente como duração de cada amostra |
| Intensidade de carbono | `carbon_intensity_gco2e_per_kwh` | gCO₂e/kWh | Snapshot regional salvo, associado à coleta segundo região e tempo |
| Participação renovável | `renewable_share_percent` | percentual (%) | Persistida, mas não utilizada nos cálculos atuais |

Os sufixos `_gb` são tratados como GB porque esse é o contrato refletido nos nomes dos campos, mas a semântica exata dos valores de memória, disco e rede ainda deve ser confirmada com a documentação do fornecedor. Em particular, é necessário confirmar se `network_gb` representa volume transferido durante uma amostra ou outra medida; o modelo atual aplica diretamente o fator em W/GB.

**Limitação importante:** `COLLECTION_INTERVAL_MS` controla o intervalo entre ciclos automáticos de coleta; ele não comprova quanto tempo cada amostra representa. Até que `collection_interval_seconds` seja validado e persistido por amostra, energia e emissões devem ser interpretadas como estimativas provisórias. O endpoint retorna o valor utilizado em `period.collectionIntervalMs`.

---

## 3. Modelo de potência e energia

### Fatores do modelo atual

| Recurso | Fator | Unidade | Fonte |
|---|---:|---|---|
| CPU | 100 W de potência máxima | W | Parâmetro do exemplo de cálculo fornecido pelo cliente |
| Memória | 0,375 W/GB | W/GB | Parâmetro do exemplo de cálculo fornecido pelo cliente |
| Disco | 0,01 W/GB | W/GB | Parâmetro do exemplo de cálculo fornecido pelo cliente |
| Rede | 0,02 W/GB | W/GB | Parâmetro do exemplo de cálculo fornecido pelo cliente |

Esses fatores estão definidos no código como modelo versão `1`. Ainda não são configuráveis por usuário nem carregados do banco.

### Fórmulas

```text
potência_CPU (W) = (cpu_percent / 100) × 100 W
potência_memória (W) = memory_gb × 0,375 W/GB
potência_disco (W) = disk_gb × 0,01 W/GB
potência_rede (W) = network_gb × 0,02 W/GB

potência_total (W) =
    potência_CPU + potência_memória + potência_disco + potência_rede

energia (kWh) =
    potência_total (W) × duração (ms) / 3.600.000.000
```

O divisor converte simultaneamente milissegundos em horas e watt-hora em quilowatt-hora. No código atual, a duração usada é `COLLECTION_INTERVAL_MS`, e não a duração individual declarada pela Metrics API.

### Exemplo manual reproduzível

Considere uma tentativa com status `success`, `COLLECTION_INTERVAL_MS=60000` e os seguintes valores:

```text
CPU = 50%
memória = 2 GB
disco = 10 GB
rede = 5 GB
```

```text
potência_CPU      = (50 / 100) × 100 W = 50 W
potência_memória  = 2 × 0,375 W/GB    = 0,75 W
potência_disco    = 10 × 0,01 W/GB   = 0,10 W
potência_rede     = 5 × 0,02 W/GB    = 0,10 W
potência_total    = 50 + 0,75 + 0,10 + 0,10 = 50,95 W

energia = 50,95 W × 60000 ms / 3.600.000.000
        ≈ 0,000849166667 kWh
```

Este exemplo verifica a aritmética do modelo, não a precisão física das premissas nem a duração real da amostra.

---

## 4. Intensidade de carbono e CO₂e

O backend usa o campo `carbon_intensity_gco2e_per_kwh`, recebido da Carbon API e persistido em snapshots regionais. Para uma tentativa, seleciona o snapshot mais recente que:

1. pertence à mesma `region_code` do serviço;
2. foi registrado em ou antes de `attempted_at`;
3. está dentro da idade máxima configurada em `CARBON_INTENSITY_MAX_AGE_MS`.

Se essa variável não estiver configurada, nenhum snapshot é considerado utilizável pelo cálculo. Não há fallback silencioso para um fator antigo. Se não existir intensidade elegível, o endpoint ainda pode retornar a energia estimada, mas a emissão da amostra fica indisponível e a lacuna é indicada como `carbon_intensity_unavailable`.

### Fórmula

```text
emissão (gCO₂e) = energia (kWh) × intensidade (gCO₂e/kWh)
```

Usando a energia do exemplo anterior e uma intensidade ilustrativa de `200 gCO₂e/kWh`:

```text
emissão = 0,000849166667 kWh × 200 gCO₂e/kWh
        ≈ 0,169833333 gCO₂e
```

O campo `renewable_share_percent` é armazenado, mas não entra nessa fórmula nem reduz a intensidade. Utilizá-lo como desconto junto com a intensidade atual poderia contar o benefício renovável duas vezes; qualquer indicador derivado deve ser definido separadamente antes de ser implementado.

---

## 5. Tentativas incompletas e agregação

- Só tentativas com status `success` e valores numéricos válidos de CPU, memória, disco e rede produzem energia.
- CPU fora de 0–100%, valores negativos ou valores ausentes/não finitos invalidam as métricas da amostra.
- Estados `no_metrics`, `unavailable` e `error` são apresentados como lacunas; não são preenchidos com valores estimados ou simulados.
- Energia é somada para amostras com métricas válidas. Emissões são somadas apenas quando a amostra também possui intensidade válida.
- A resposta informa contagem de tentativas, contagens válidas, coberturas, `isPartial` e a lista `gaps`.
- A cobertura é calculada sobre tentativas registradas no banco. Intervalos sem uma linha de tentativa não são detectados nem incluídos no denominador.
- `latestSampleInPeriod` representa a tentativa registrada mais recente no período; não representa necessariamente uma amostra válida.

---

## 6. Precisão e apresentação

O serviço calcula com números JavaScript (`number`) e não aplica arredondamento explícito antes de retornar os valores. Portanto, pequenas diferenças de representação decimal podem aparecer na resposta JSON. O frontend deverá definir a formatação de exibição sem arredondar os valores usados em cálculos agregados.

Unidades retornadas:

| Campo | Unidade |
|---|---|
| `energyKwh` | kWh |
| `emissionsGco2e` | gCO₂e |
| `carbonIntensityGco2ePerKwh` | gCO₂e/kWh |
| `collectionIntervalMs` | ms |
| coberturas | percentual de 0 a 100 |

O contrato HTTP e o exemplo completo de resposta estão em [`docs/api.md`](./api.md).

---

## 7. Histórico e reprodutibilidade

O endpoint calcula resultados sob demanda a partir das tentativas, métricas e snapshots já persistidos; não grava um resultado calculado para cada consulta. Cada tentativa é identificada por `collectionId` e `attemptedAt`, e a resposta contém o fator aplicado quando disponível.

Os snapshots regionais e as datas de registro permitem selecionar o fator válido para o instante da tentativa, dentro do limite de idade configurado. A reprodutibilidade completa da energia ainda depende de persistir e usar a duração real de cada amostra e de confirmar as unidades/semântica das métricas.

---

## 8. Estado da validação

- [x] Fórmulas de potência, energia e CO₂e registradas conforme a implementação atual.
- [x] Fatores atualmente codificados e sua fonte documentados.
- [x] Exemplo numérico reproduzível incluído.
- [x] Lacunas de coleta e intensidade descritas.
- [ ] Confirmar com o fornecedor as unidades e a semântica dos quatro campos de métricas.
- [ ] Validar, persistir e usar `collection_interval_seconds` por amostra.
- [ ] Validar o cálculo de ponta a ponta com dados de um PostgreSQL em execução.
- [ ] Definir política de arredondamento de apresentação no frontend.

---

## 9. Histórico de decisões

| Data | Decisão | Motivo | Evidência |
|---|---|---|---|
| 20/10/2026 | Estrutura documental criada antes da implementação dos cálculos | Evitar fórmula implícita e garantir rastreabilidade da US07 | Sprint 2 / TEC21 |
| 31/10/2026 | Documentar fórmulas, fatores e limitações conforme o módulo atual | Distinguir estimativa implementada de duração real e semântica ainda não confirmadas | `backend/src/modules/indicadores/indicadores.service.ts` |
