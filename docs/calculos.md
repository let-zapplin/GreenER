# Cálculos Ambientais — GreenER

← [Voltar ao índice da documentação](../README.md)

> **Referência atualizada no fechamento da Sprint 2 — 09/11/2026.**  
> O GreenER transforma métricas de infraestrutura em **estimativas** de potência, energia e emissão de CO₂e. Os resultados não representam medição elétrica direta do hardware.

---

## 1. Objetivo

O GreenER utiliza as métricas coletadas de cada serviço para estimar:

1. potência computacional aproximada;
2. energia consumida durante a duração real da amostra;
3. emissão de CO₂e associada à região do serviço.

Fluxo:

```text
CPU + memória + disco + rede
          ↓
potência estimada (W)
          ↓
duração real da amostra
          ↓
energia estimada (kWh)
          ↓
intensidade de carbono regional
          ↓
emissão estimada (gCO₂e)
```

O cálculo é centralizado no backend e reutilizado pelos endpoints de indicadores, dashboard e histórico.

---

## 2. Métricas utilizadas

Cada amostra válida pode fornecer:

| Campo | Unidade usada no modelo | Significado |
| --- | --- | --- |
| `cpuPercent` | `%` | utilização de CPU |
| `memoryGb` | `GB` | memória associada à amostra |
| `diskGb` | `GB` | volume de disco associado à amostra |
| `networkGb` | `GB` | volume de rede associado à amostra |
| `collectionIntervalSeconds` | `s` | duração real representada pela amostra |

O campo `collectionIntervalSeconds` é essencial para transformar potência em energia.

> O intervalo configurado do job (`COLLECTION_INTERVAL_MS`) indica quando o backend tenta iniciar novos ciclos. Ele **não substitui** a duração real da amostra no cálculo energético.

---

## 3. Modelo de potência — versão 1

O backend expõe o modelo utilizado em `powerModel`.

No fechamento da Sprint 2:

```json
{
  "version": "1",
  "cpuMaximumWatts": 100,
  "memoryWattsPerGb": 0.375,
  "diskWattsPerGb": 0.01,
  "networkWattsPerGb": 0.02
}
```

### Parâmetros

| Parâmetro | Valor | Unidade |
| --- | ---: | --- |
| Potência máxima de CPU | `100` | W |
| Memória | `0.375` | W/GB |
| Disco | `0.01` | W/GB |
| Rede | `0.02` | W/GB |

Esses valores são **coeficientes adotados pelo modelo estimativo do GreenER**.

Eles devem ser interpretados como premissas da versão atual do sistema e não como constantes físicas universais aplicáveis a qualquer equipamento.

Caso esses fatores sejam alterados futuramente, a versão do modelo deve ser atualizada para manter rastreabilidade.

---

## 4. Potência estimada

A potência total estimada é a soma das quatro parcelas:

```text
P_total = P_cpu + P_memoria + P_disco + P_rede
```

onde `P_total` é medido em watts.

### 4.1 CPU

A CPU é proporcional à utilização observada:

```text
P_cpu = (cpuPercent / 100) × cpuMaximumWatts
```

Com o modelo atual:

```text
P_cpu = (cpuPercent / 100) × 100 W
```

Exemplo para `75.73%`:

```text
P_cpu = 0.7573 × 100
P_cpu = 75.73 W
```

### 4.2 Memória

```text
P_memoria = memoryGb × memoryWattsPerGb
```

Com o modelo atual:

```text
P_memoria = memoryGb × 0.375 W/GB
```

### 4.3 Disco

```text
P_disco = diskGb × diskWattsPerGb
```

Com o modelo atual:

```text
P_disco = diskGb × 0.01 W/GB
```

### 4.4 Rede

```text
P_rede = networkGb × networkWattsPerGb
```

Com o modelo atual:

```text
P_rede = networkGb × 0.02 W/GB
```

---

## 5. Conversão de potência para energia

Potência é medida em watts, enquanto o indicador ambiental do GreenER utiliza energia em quilowatt-hora.

Para uma amostra com duração `t` em segundos:

```text
horas = t / 3600
```

e:

```text
kW = W / 1000
```

Portanto:

```text
E_kWh = P_total × (t / 3600) / 1000
```

Forma equivalente:

```text
E_kWh = (P_total × t) / 3.600.000
```

onde:

- `P_total` está em W;
- `t` está em segundos;
- `E_kWh` é retornado em kWh.

---

## 6. Intensidade de carbono

A Carbon Intensity API fornece fatores regionais expressos em:

```text
gCO₂e/kWh
```

O GreenER persiste snapshots desses valores no PostgreSQL.

Para uma tentativa de coleta, o backend associa a intensidade de carbono usando:

1. o `region_code` do serviço;
2. o instante `attempted_at` da coleta;
3. o snapshot mais recente registrado até aquele instante;
4. o limite de idade configurado em `CARBON_INTENSITY_MAX_AGE_MS`.

Fluxo:

```text
service.region_code
        +
collection.attempted_at
        ↓
snapshot de carbon_intensity elegível
        ↓
gCO₂e/kWh
```

A requisição de indicadores não consulta a Carbon API em tempo real: utiliza os snapshots previamente persistidos.

Isso evita recalcular arbitrariamente o passado com um fator ambiental atual.

---

## 7. Cálculo de CO₂e

Depois de estimar a energia:

```text
CO₂e_g = E_kWh × intensidade_carbono
```

onde:

- `E_kWh` está em kWh;
- `intensidade_carbono` está em gCO₂e/kWh;
- o resultado está em gCO₂e.

Exemplo:

```text
E = 0.001 kWh
I = 400 gCO₂e/kWh

CO₂e = 0.001 × 400
CO₂e = 0.4 gCO₂e
```

---

## 8. Exemplo real validado — Billing API

Na validação de 09/11/2026, a coleta `4642` do serviço **Billing API** retornou:

```text
cpuPercent                 = 75.73 %
memoryGb                   = 2.852416 GB
diskGb                     = 18.31104 GB
networkGb                  = 0.54594 GB
collectionIntervalSeconds  = 51 s
carbonIntensity            = 85 gCO₂e/kWh
```

### 8.1 Potência da CPU

```text
P_cpu = (75.73 / 100) × 100
P_cpu = 75.73 W
```

### 8.2 Potência da memória

```text
P_memoria = 2.852416 × 0.375
P_memoria = 1.069656 W
```

### 8.3 Potência do disco

```text
P_disco = 18.31104 × 0.01
P_disco = 0.1831104 W
```

### 8.4 Potência da rede

```text
P_rede = 0.54594 × 0.02
P_rede = 0.0109188 W
```

### 8.5 Potência total

```text
P_total =
75.73
+ 1.069656
+ 0.1831104
+ 0.0109188

P_total = 76.9936852 W
```

### 8.6 Energia

```text
E_kWh =
(76.9936852 × 51)
/
3.600.000
```

Resultado:

```text
E_kWh = 0.0010907438736666665 kWh
```

A API retornou:

```json
"energyKwh": 0.0010907438736666667
```

A pequena diferença na última casa decimal é resultado normal da representação de ponto flutuante.

### 8.7 Emissão

```text
CO₂e =
0.0010907438736666665
× 85
```

Resultado:

```text
CO₂e = 0.09271322926166665 gCO₂e
```

A API retornou:

```json
"emissionsGco2e": 0.09271322926166667
```

Portanto, o cálculo manual reproduz o valor entregue pelo backend.

---

## 9. Cálculo por período

O endpoint:

```text
GET /api/indicadores?start=<ISO>&end=<ISO>
```

utiliza um intervalo semiaberto:

```text
start <= attempted_at < end
```

Isso evita contar duas vezes uma amostra exatamente na fronteira quando períodos consecutivos são consultados.

Para cada serviço, o backend soma as amostras calculáveis do período:

```text
energia_periodo =
Σ energia_amostra
```

e:

```text
emissao_periodo =
Σ emissao_amostra
```

Os mesmos princípios são utilizados na consolidação do dashboard.

### Validação de 24 horas

No período:

```text
start = 2026-11-08T13:59:32.000Z
end   = 2026-11-09T13:59:32.000Z
```

o endpoint de indicadores retornou:

```text
energyKwh        = 0.42272948956661666
emissionsGco2e   = 102.99165469044364
collectionCount  = 770
validMetricCount = 769
isPartial        = true
```

O dashboard retornou os mesmos totais ambientais na validação realizada no mesmo fechamento, confirmando que ambos reutilizam a mesma lógica de consolidação.

---

## 10. Cobertura e resultados parciais

Nem toda tentativa possui dados suficientes para todos os cálculos.

Possíveis lacunas incluem:

```text
no_metrics
unavailable
error
invalid_metrics
collection_interval_unavailable
carbon_intensity_unavailable
```

### Sem métricas válidas

Quando não existe amostra válida:

```text
energyKwh = null
emissionsGco2e = null
```

O sistema não assume consumo zero.

### Sem duração da amostra

Registros históricos anteriores à persistência de `collection_interval_seconds` podem não possuir duração conhecida.

Nesses casos:

```text
energyKwh = null
```

e o GreenER **não utiliza `COLLECTION_INTERVAL_MS` como fallback**.

### Sem intensidade de carbono

Uma amostra pode ter energia calculável, mas não possuir um fator regional elegível.

Nesse caso:

```text
energyKwh = valor calculado
emissionsGco2e = null
```

Assim, energia ainda pode contribuir para o total enquanto a emissão permanece parcial.

### `isPartial`

`isPartial = true` indica que existem lacunas relevantes no período.

Um total parcial não deve ser interpretado como medição completa do impacto real.

---

## 11. Intervalo do job x duração da amostra

Há dois conceitos diferentes:

```text
COLLECTION_INTERVAL_MS
```

e:

```text
collection_interval_seconds
```

### `COLLECTION_INTERVAL_MS`

Configura aproximadamente quando um novo ciclo automático é iniciado.

Na configuração de entrega:

```text
60000 ms = 60 s
```

### `collection_interval_seconds`

É fornecido pela amostra e representa a duração efetivamente usada no cálculo.

Na coleta real do Billing API:

```text
collectionIntervalSeconds = 51
```

Mesmo com o job configurado para 60 segundos, o cálculo utiliza:

```text
51 segundos
```

e não:

```text
60 segundos
```

Essa distinção é necessária para evitar superestimar ou subestimar energia.

---

## 12. Precisão numérica

O backend trabalha com números de ponto flutuante.

Por isso, valores como:

```text
0.09271322926166665
```

podem aparecer como:

```text
0.09271322926166667
```

Esse comportamento é esperado em cálculos computacionais com `number`.

A interface pode arredondar valores para apresentação, mas o backend preserva maior precisão no contrato da API.

---

## 13. Premissas e limitações

O GreenER realiza **estimativas**, não medições elétricas.

### Premissas principais

- CPU é convertida em potência por proporcionalidade linear;
- memória, disco e rede utilizam coeficientes fixos;
- a duração real da amostra representa o período de consumo considerado;
- a emissão é calculada multiplicando a energia estimada pelo fator regional;
- snapshots ambientais persistidos representam a melhor informação regional disponível ao sistema naquele instante.

### Limitações

O modelo atual não considera diretamente:

- modelo físico específico do processador;
- eficiência da fonte de alimentação;
- PUE do datacenter;
- virtualização e compartilhamento de hardware;
- frequência dinâmica de CPU;
- consumo base/idle independente da utilização;
- eficiência específica de disco ou rede;
- perdas de infraestrutura;
- emissões incorporadas na fabricação do hardware.

Consequentemente, o GreenER deve apresentar seus valores como:

```text
energia estimada
emissão estimada
```

e não como consumo elétrico certificado.

### Origem dos coeficientes

Os coeficientes `100 W`, `0.375 W/GB`, `0.01 W/GB` e `0.02 W/GB` constituem o **modelo v1 adotado pelo projeto**.

Os materiais disponíveis nesta revisão documentam os valores utilizados pelo sistema, mas não registram uma fonte externa específica que estabeleça esses quatro números como padrão científico universal.

Por isso, esta documentação não atribui uma origem que não esteja comprovada no repositório. Caso a equipe adote posteriormente uma referência científica ou um modelo calibrado, essa fonte deve ser registrada aqui juntamente com a nova versão do modelo.

---

## 14. Rastreabilidade no sistema

Os cálculos aparecem principalmente em:

```text
backend/src/modules/indicadores/
```

O repository obtém os dados históricos.

O service:

```text
métricas
  ↓
modelo de potência
  ↓
energia
  ↓
intensidade regional
  ↓
CO₂e
  ↓
agregação e cobertura
```

O frontend apenas apresenta esses resultados.

Endpoints principais:

```text
GET /api/indicadores
GET /api/indicadores/:serviceId/historico
GET /api/dashboard
```

Os contratos estão documentados em [`docs/api.md`](api.md).

---

## 15. Evidências do fechamento da Sprint 2

Na validação de 09/11/2026 foram confirmados:

- modelo de potência retornado explicitamente pela API;
- cálculo energético usando `collectionIntervalSeconds`;
- associação da intensidade de carbono regional;
- histórico por serviço;
- totais por período;
- lacunas sem imputação de valores;
- consistência entre indicadores e dashboard;
- caso real do Billing API reproduzido manualmente;
- testes automatizados cobrindo cálculo e tratamento de cenários incompletos.

As evidências completas estão em:

[`docs/testes/manualdevalidacao.md`](testes/manualdevalidacao.md)

---

## 16. Resumo das fórmulas

### Potência

```text
P_cpu =
(cpuPercent / 100) × 100
```

```text
P_memoria =
memoryGb × 0.375
```

```text
P_disco =
diskGb × 0.01
```

```text
P_rede =
networkGb × 0.02
```

```text
P_total =
P_cpu + P_memoria + P_disco + P_rede
```

### Energia

```text
E_kWh =
(P_total × collectionIntervalSeconds)
/
3.600.000
```

### CO₂e

```text
CO₂e_g =
E_kWh × carbonIntensityGco2ePerKwh
```

### Agregação

```text
energia_periodo =
Σ E_kWh
```

```text
emissao_periodo =
Σ CO₂e_g
```
