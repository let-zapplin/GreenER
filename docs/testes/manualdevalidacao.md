# Manual de validação do fluxo de dados — GreenER

← [Voltar ao índice da documentação](../../README.md)

## Objetivo

Validar o fluxo funcional do GreenER e fornecer roteiros reproduzíveis para as integrações e funcionalidades do backend.

Fluxo de cálculo documentado:

```text
Metrics API ──→ coleta ──→ PostgreSQL
Carbon API ───→ snapshots regionais ──→ PostgreSQL
                                      ↓
                    GET /api/indicadores?start=...&end=...
```

O endpoint de indicadores calcula energia e CO₂e no backend a partir dos dados persistidos. A validação manual descrita neste documento deve ser realizada contra o ambiente em execução; testes unitários isolados não comprovam a integração com PostgreSQL, as APIs externas ou o frontend.

---

## 1. Iniciar o ambiente

Pré-requisitos:

- Docker Desktop/Engine em execução;
- `.env` configurado a partir de `.env.example`;
- acesso de rede à Metrics Aggregator API.

Na pasta que contém `compose.yaml`:

```bash
docker compose up -d --build
docker compose ps
```

Resultado esperado: `postgres`, `backend` e `frontend` em execução, com os healthchecks configurados sem falha.

---

## 2. Validar saúde do backend

```bash
curl.exe -i http://localhost:3000/health
```

Resultado esperado: HTTP `200` e corpo semelhante a:

```json
{
  "status": "ok",
  "message": "GreenER backend funcionando"
}
```

Essa rota confirma apenas a resposta HTTP do backend.

---

## 3. Validar descoberta externa

```bash
curl.exe -i http://localhost:3000/api/servicos/discover
```

Verificar:

- HTTP `200`;
- lista em `services`;
- `id`, `name`, `location` e `metrics_path` quando fornecidos pela API.

**Trecho validado:** Metrics API → Backend.

---

## 4. Validar sincronização e persistência

Executar:

```bash
curl.exe -i -X POST http://localhost:3000/api/servicos/sync
```

Resposta esperada semelhante a:

```json
{
  "message": "Serviços sincronizados com sucesso",
  "created": 0,
  "updated": 8,
  "removed": 0
}
```

Os números dependem do estado do banco e da resposta externa.

No PostgreSQL/DBeaver, consultar:

```sql
SELECT
    s.id_service,
    s.id AS external_id,
    s.name,
    s.status,
    s.last_seen_at,
    l.region_code,
    l.country,
    l.region,
    l.city,
    l.latitude,
    l.longitude
FROM service s
JOIN location l
    ON l.id_location = s.location_id_location
ORDER BY s.id_service;
```

Verificar ausência de duplicação indevida:

```sql
SELECT id, COUNT(*) AS quantidade
FROM service
GROUP BY id
HAVING COUNT(*) > 1;
```

Resultado esperado: nenhuma linha.

---

## 5. Validar listagem persistida pela API interna

```bash
curl.exe -i http://localhost:3000/api/servicos
```

Comparar a resposta com os registros consultados no PostgreSQL.

**Trecho validado:** PostgreSQL → API GreenER.

---

## 6. Validar consumo pelo frontend

1. autentique-se pela interface;
2. acesse `http://localhost:5173/monitoramento`;
3. abra `F12 → Network/Rede → Fetch/XHR`;
4. localize a chamada a `GET /api/servicos`;
5. compare nomes, localização e status com a resposta da API;
6. aguarde novas atualizações automáticas e confirme que a página não exige reload manual.

Resultado esperado: o React consome a **listagem persistida** do GreenER e representa os dados retornados pelo backend.

> O intervalo de atualização deve ser conferido no código/configuração da versão testada e documentado em `docs/api.md` ou `docs/arquitetura.md` quando estabilizado.

---

## 7. Validar indisponibilidade e retorno do catálogo

Quando a Metrics API apresentar mudança real no catálogo, observar:

```text
serviço presente
    ↓
serviço deixa /services
    ↓
backend marca o serviço como removido (`removed`)
    ↓
frontend sinaliza indisponibilidade
    ↓
serviço retorna
    ↓
backend volta para active
    ↓
frontend sinaliza retorno temporariamente
```

Consultar o banco para confirmar que o registro não é apagado e que `last_seen_at` representa a última vez em que o serviço foi efetivamente observado.

> Esse cenário não substitui a validação futura de **RF05 durante coleta individual** nem de **RF06 serviço ativo sem métricas**.

---

## 8. Validar persistência após reinicialização

Essa verificação é importante para a evolução do histórico.

1. registre a quantidade de serviços:

```sql
SELECT COUNT(*) FROM service;
```

2. pare os containers **sem remover volumes**:

```bash
docker compose down
```

3. suba novamente:

```bash
docker compose up -d
```

4. execute a mesma consulta SQL.

Resultado esperado: os registros persistidos anteriormente continuam disponíveis.

> Não utilizar `docker compose down -v` neste teste. `-v` remove o volume do PostgreSQL.

---

## 9. Cenários de loading, vazio e erro

Confirmar no frontend:

- estado de carregamento antes da resposta;
- estado vazio quando não houver serviços;
- mensagem de erro quando a chamada ao backend falhar;
- recuperação do fluxo após nova tentativa/atualização bem-sucedida.

Não manter alterações artificiais de teste no código após a validação.

---

## 10. Evidências da Sprint 1

| Verificação | Resultado esperado | Situação |
|---|---|---|
| Backend | `/health` retorna 200 | Validado na Sprint 1 |
| Descoberta | `/discover` consulta API externa | Validado na Sprint 1 |
| Sincronização | serviços persistidos/atualizados | Validado na Sprint 1 |
| Listagem persistida | `/api/servicos` compatível com PostgreSQL | Validado na Sprint 1 |
| React lê API interna | monitoramento consome `/api/servicos` | Validado na Sprint 1 |
| Loading / erro / vazio | estados tratados | Validado na Sprint 1 |
| Mudança de catálogo | indisponível/retorno representados | Validado durante evolução da Sprint 1 |
| Persistência após restart | registros permanecem sem `-v` | Revalidar e registrar evidência na Sprint 2 |

---

## 11. Validar indicadores ambientais — backend (US07 parcial)

Este roteiro verifica o endpoint `GET /api/indicadores` diretamente. Ele não valida a integração do dashboard/frontend, que continua pendente.

### Pré-requisitos

- backend e PostgreSQL em execução, com o schema aplicado;
- pelo menos um serviço persistido;
- um snapshot de intensidade de carbono persistido para a região do serviço;
- pelo menos uma tentativa de coleta dentro do período escolhido;
- JWT válido obtido por `POST /auth/login`.

O endpoint de indicadores exige JWT, mas não exige usuário administrador. O disparo manual de coleta, por outro lado, exige JWT e usuário administrador. Os jobs periódicos iniciados com o backend também podem gerar as tentativas necessárias.

### Preparar ou localizar dados

Se necessário, sincronize snapshots regionais usando um JWT válido:

```bash
curl.exe -i -X POST http://localhost:3000/api/intensidades/sync -H "Authorization: Bearer <token>"
```

Para inspecionar as tentativas recentes e escolher um período que inclua uma coleta, consulte o PostgreSQL:

```sql
SELECT
    c.id_collection,
    c.attempted_at,
    c.status AS collection_status,
    s.id_service,
    s.name AS service_name,
    l.region_code,
    m.cpu_percent,
    m.memory_gb,
    m.disk_gb,
    m.network_gb
FROM collection c
JOIN service s
    ON s.id_service = c.service_id_service
JOIN location l
    ON l.id_location = s.location_id_location
LEFT JOIN metrics m
    ON m.collection_id_collection = c.id_collection
ORDER BY c.attempted_at DESC
LIMIT 20;
```

Confirme também que há um snapshot regional registrado antes da tentativa escolhida:

```sql
SELECT
    l.region_code,
    ci.carbon_intensity_gco2e_per_kwh,
    ci.registered_at
FROM carbon_intensity ci
JOIN location l
    ON l.id_location = ci.location_id_location
ORDER BY ci.registered_at DESC
LIMIT 20;
```

O cálculo só associa intensidade da mesma região, registrada até `attempted_at` e dentro do limite `CARBON_INTENSITY_MAX_AGE_MS`. Sem esse limite configurado, nenhuma intensidade é considerada utilizável.

### Consultar o período

Defina `start` como instante anterior ou igual a `attempted_at` e `end` como instante posterior à tentativa. O limite é semiaberto: `start` é incluído e `end` é excluído.

```bash
curl.exe -i "http://localhost:3000/api/indicadores?start=2026-10-30T12:00:00.000Z&end=2026-10-30T13:00:00.000Z" -H "Authorization: Bearer <token>"
```

Substitua as datas do exemplo por um intervalo que inclua a tentativa escolhida na consulta SQL.

Verificar na resposta `200 OK`:

- `period` contém os limites consultados e `collectionIntervalMs`;
- `latestSampleInPeriod.collectionIntervalSeconds` contém a duração da amostra usada no cálculo;
- `powerModel` informa os fatores usados;
- `summary` e `services[].periodTotals` trazem energia em kWh, emissões em gCO₂e, contagens e cobertura;
- `latestSampleInPeriod` corresponde à tentativa mais recente do serviço no período;
- `gaps` identifica tentativas sem métricas válidas ou sem intensidade utilizável;
- com métricas e intensidade válidas, `gapReason` é `null` e `isPartial` é `false` para o cenário completo.

Para conferir a aritmética de uma tentativa completa, use as métricas e o fator regional retornados pelas consultas SQL, junto do `collectionIntervalSeconds` informado em `latestSampleInPeriod`:

```text
potência_total (W) =
    (cpu_percent / 100 × 100)
    + memory_gb × 0,375
    + disk_gb × 0,01
    + network_gb × 0,02

energia (kWh) = potência_total × collectionIntervalSeconds / 3.600.000
emissão (gCO₂e) = energia × carbon_intensity_gco2e_per_kwh
```

`period.collectionIntervalMs` continua indicando o intervalo configurado entre ciclos do job (`COLLECTION_INTERVAL_MS`), mas não participa do cálculo. Uma amostra histórica sem `collection_interval_seconds` deve apresentar `collectionIntervalSeconds: null`, `energyKwh: null`, `emissionsGco2e: null` e `gapReason: "collection_interval_unavailable"`.

### Cenários de lacuna e validação de entrada

Sempre que possível, use dados já existentes; não altere registros de produção apenas para criar um cenário de teste.

| Cenário | Resultado esperado |
|---|---|
| Tentativa com status `no_metrics`, `unavailable` ou `error` | Energia e emissão da amostra são `null`; motivo aparece em `gapReason` e em `gaps` |
| Amostra sem intervalo real persistido | Energia e emissão da amostra são `null`; `gapReason` é `collection_interval_unavailable` |
| Métricas válidas, mas sem intensidade elegível | Energia pode ser calculada; emissão e intensidade da amostra são `null`; `gapReason` é `carbon_intensity_unavailable` |
| `start`/`end` ausente, repetido ou inválido, ou `end` não posterior a `start` | HTTP `400` com `code: "INVALID_INDICATOR_PERIOD"` |
| JWT ausente ou inválido | HTTP `401 Unauthorized` |
| Período válido sem tentativas | HTTP `200`, sem amostras; `collectionCount` é zero e o resumo fica parcial |

Uma resposta parcial não deve ser interpretada como consumo zero para os períodos sem registros. A cobertura representa somente as tentativas registradas no banco e não detecta intervalos sem tentativa.

## Validar dados consolidados do dashboard — TEC19

Este roteiro verifica o endpoint `GET /api/dashboard`, protegido por JWT e disponível para usuários autenticados sem exigir perfil administrador.

### Consultar o período padrão

```bash
curl.exe -i http://localhost:3000/api/dashboard -H "Authorization: ******"
```

Verificar na resposta `200 OK`:

- `period.start` e `period.end` delimitam as últimas 24 horas conforme o horário do backend;
- `summary` retorna `energyKwh`, `emissionsGco2e`, `activeServiceCount`, `noMetricsServiceCount`, `unavailableServiceCount` e `isPartial`;
- `activeServiceCount + noMetricsServiceCount + unavailableServiceCount` corresponde aos serviços atualmente ativos no catálogo;
- energia e emissões consideram somente serviços ativos no catálogo e tentativas do período;
- serviços removidos do catálogo não entram nas contagens nem nos totais;
- sem serviços ativos, energia/emissões e contagens são zero, com `isPartial: false`;
- `isPartial` é verdadeiro se um serviço ativo não teve coleta no período ou se uma amostra não pôde contribuir integralmente para os indicadores.

### Classificação dos serviços

As contagens usam a última tentativa registrada, mesmo que seja anterior ao período dos totais:

| Serviço no catálogo | Última tentativa | Contagem esperada |
|---|---|---|
| `active` | `success` | Ativo |
| `active` | `error` | Ativo |
| `active` | `no_metrics` | Sem Métricas |
| `active` | sem tentativa | Ativo |
| `active` | `unavailable` | Indisponível |
| `removed` | qualquer estado | Excluído das contagens |

### Consultar período explícito e validar erros

```bash
curl.exe -i "http://localhost:3000/api/dashboard?start=2026-10-30T12:00:00.000Z&end=2026-10-31T12:00:00.000Z" -H "Authorization: ******"
```

| Cenário | Resultado esperado |
|---|---|
| `start` e `end` válidos | HTTP `200`; resposta agrega somente o período semiaberto informado |
| Apenas um dos parâmetros, data vazia/repetida/inválida ou `end` não posterior a `start` | HTTP `400` com `code: "INVALID_DASHBOARD_PERIOD"` |
| JWT ausente ou inválido | HTTP `401 Unauthorized` |
| Amostra sem `collection_interval_seconds` ou sem intensidade de carbono elegível | `isPartial: true`; nenhum valor ausente é estimado por fallback |

### Registro da validação manual

Preencher após executar o roteiro, sem marcar como validado apenas por causa dos testes unitários:

| Campo | Registro |
|---|---|
| Data e ambiente | A preencher |
| Branch/commit testado | A preencher |
| Período consultado | A preencher |
| Cenários executados | A preencher |
| Resultado e evidência (status HTTP/logs/captura) | A preencher |
| PostgreSQL e frontend validados? | A preencher separadamente |

Os testes unitários atuais de service/controller cobrem cálculos, dados ausentes e validação de query com dependências simuladas. Eles não executam a query do repository em um PostgreSQL real nem demonstram integração visual com o frontend.

---

## Solução de problemas

### Ver logs

```bash
docker compose ps
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend
docker compose logs --tail=50 postgres
```

### Conferir conexão PostgreSQL pelo host

O Compose publica o banco em `127.0.0.1:5433` para ferramentas como DBeaver. O backend utiliza `postgres:5432` dentro da rede Docker.

Alterar uma senha no `.env` não modifica automaticamente as credenciais de um volume PostgreSQL já inicializado.
