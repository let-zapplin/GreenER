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
- acesso de rede à Metrics Aggregator API e à Carbon Intensity API para os cenários ambientais.

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

### Obter JWT para os próximos passos

No Insomnia, envie `POST http://localhost:3000/auth/login`, com Body do tipo JSON e `Content-Type: application/json`, usando uma conta já cadastrada:

```json
{
  "email": "seu-email-cadastrado",
  "password": "sua-senha"
}
```

Copie o campo `token` da resposta. Nos comandos seguintes, substitua `<token>` pelo valor obtido, sem os sinais `<` e `>`. Não publique tokens ou senhas nas evidências.

As consultas protegidas de histórico, indicadores, dashboard e intensidades exigem JWT válido. A sincronização manual de serviços também exige JWT. A coleta manual exige, adicionalmente, uma conta administradora. Descoberta e listagem de serviços permanecem públicas nesta versão.

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
curl.exe -i -X POST http://localhost:3000/api/servicos/sync -H "Authorization: Bearer <token>"
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

O monitoramento já utiliza `useDashboardSummary` e `useServiceIndicators`, além da listagem de serviços. Confira também as chamadas a `/api/dashboard` e `/api/indicadores`, as unidades exibidas e o tratamento de dados parciais. A implementação existente não equivale a uma validação manual já aprovada.

> Os hooks `useMonitoring` e `useDashboardSummary` utilizam intervalo de 60 segundos e timeout de 15 segundos nesta versão. O intervalo das demais consultas deve ser conferido no respectivo hook. Registre a configuração do commit testado.

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
frontend sinaliza remoção do catálogo
    ↓
serviço retorna
    ↓
backend volta para active
    ↓
frontend sinaliza retorno temporariamente
```

Consultar o banco para confirmar que o registro não é apagado e que `last_seen_at` representa a última vez em que o serviço foi efetivamente observado.

### Coleta individual: indisponibilidade e ausência de métricas

RF05 e RF06 já possuem implementação e testes automatizados. Valide separadamente do desaparecimento do catálogo:

- serviço presente no catálogo com tentativa `unavailable`: indisponibilidade da coleta, com motivo técnico preservado;
- serviço presente no catálogo com tentativa `no_metrics`: ausência de métricas, sem confundir com remoção ou indisponibilidade;
- tentativa `success` após uma falha: recuperação dos dados apresentados;
- falha isolada: os demais serviços continuam sendo processados.

Observe os estados nas respostas e no PostgreSQL. Use cenários controlados de desenvolvimento ou ocorrências reais da API; não provoque falhas em produção. Os testes automatizados simulam essas situações, mas não substituem a conferência da interface.

---

## 8. Validar persistência após reinicialização

Essa verificação comprova a preservação do histórico no volume da aplicação; é diferente da suíte de integração com banco temporário.

1. Escolha um serviço e salve o resultado abaixo, substituindo `7` pelo seu `id_service` interno:

```sql
SELECT
    c.id_collection,
    c.service_id_service,
    c.status,
    c.attempted_at,
    c.failure_reason,
    c.http_status,
    m.recorded_at,
    m.cpu_percent,
    m.memory_gb,
    m.disk_gb,
    m.network_gb,
    m.collection_interval_seconds
FROM collection c
LEFT JOIN metrics m ON m.collection_id_collection = c.id_collection
WHERE c.service_id_service = 7
ORDER BY c.attempted_at DESC, c.id_collection DESC
LIMIT 10;
```

Anote os `id_collection` e seus valores. Se não houver registros, aguarde a coleta automática ou execute a coleta manual com conta administradora, conforme a seção 12.

2. Pare os containers **sem remover volumes**:

```bash
docker compose down
```

3. suba novamente:

```bash
docker compose up -d
```

4. Consulte os IDs anotados, substituindo os exemplos abaixo pelos IDs da primeira consulta:

```sql
SELECT
    c.id_collection, c.service_id_service, c.status, c.attempted_at,
    c.failure_reason, c.http_status, m.recorded_at, m.cpu_percent,
    m.memory_gb, m.disk_gb, m.network_gb, m.collection_interval_seconds
FROM collection c
LEFT JOIN metrics m ON m.collection_id_collection = c.id_collection
WHERE c.id_collection IN (101, 102)
ORDER BY c.attempted_at DESC, c.id_collection DESC;
```

Resultado esperado: todos os IDs anotados continuam disponíveis com os mesmos valores. Novos registros dos jobs automáticos podem surgir; comparar apenas a contagem ou as dez linhas mais recentes não comprova preservação das coletas anteriores.

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

## 11. Validar indicadores ambientais — backend

Este roteiro verifica o endpoint `GET /api/indicadores` diretamente. A integração com dashboard/frontend já existe no código, mas precisa ser validada separadamente conforme a seção 6. Não interpretar implementação existente como evidência de execução aprovada.

### Pré-requisitos

- backend e PostgreSQL em execução, com o schema aplicado;
- pelo menos um serviço persistido;
- um snapshot de intensidade de carbono persistido para a região do serviço;
- pelo menos uma tentativa de coleta dentro do período escolhido;
- JWT válido obtido por `POST /auth/login`.

O endpoint de indicadores exige JWT, mas não exige usuário administrador. O disparo manual de coleta, por outro lado, exige JWT e usuário administrador. Os jobs periódicos iniciados com o backend também podem gerar as tentativas necessárias.

### Preparar ou localizar dados

Se necessário, sincronize snapshots regionais usando um JWT válido:

O backend também inicia a sincronização automática ao subir, por meio de `startCarbonIntensitySync()`. O intervalo é definido em `CARBON_INTENSITY_SYNC_INTERVAL_MS`, com padrão de 300.000 ms, contado após o término de cada ciclo. A sincronização do catálogo usa `SERVICE_SYNC_INTERVAL_MS`; a coleta de métricas usa `COLLECTION_INTERVAL_MS`. Os ciclos são independentes: após a primeira inicialização, aguarde novas coletas para obter tentativas posteriores ao primeiro snapshot regional.

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

## 12. Validar coleta manual e histórico por serviço

Use `GET /api/servicos` para escolher o `id_service` interno numérico. Não utilize o `external_id` no caminho do histórico.

### Coleta manual

```bash
curl.exe -i -X POST http://localhost:3000/api/metricas/collect -H "Authorization: Bearer <token>"
```

Com token de administrador, o esperado é `200` com o resumo da operação. Confira contadores e falhas: HTTP 200 não garante que todas as tentativas foram gravadas com sucesso. Com usuário comum, espere `403`; sem token, `401`. A coleta ocorre para os serviços elegíveis do catálogo, não apenas para um serviço escolhido. Os jobs automáticos também podem gerar registros.

### Histórico bruto de coletas

```bash
curl.exe -i http://localhost:3000/api/metricas/historico/7 -H "Authorization: Bearer <token>"
```

Substitua `7` pelo ID escolhido. Espere `200` com `service_id` e `collections`, da tentativa mais recente para a mais antiga. Compare os IDs, estados e datas com a consulta SQL da seção 8. Tentativas sem métricas devem continuar presentes com campos de métricas nulos.

| Cenário | Resultado esperado |
|---|---|
| ID válido sem registros, inclusive inexistente | `200` com `collections: []`, conforme o contrato atual |
| ID inválido, com JWT válido | `400` com `INVALID_SERVICE_ID` |
| JWT ausente ou inválido | `401` |

Essa rota não oferece filtro por período nesta versão. Ela lê os dados persistidos e não inicia uma nova coleta.

### Histórico ambiental por período

```bash
curl.exe -i "http://localhost:3000/api/indicadores/7/historico?start=2026-11-03T00:00:00.000Z&end=2026-11-04T00:00:00.000Z" -H "Authorization: Bearer <token>"
```

Substitua ID e datas por valores do seu ambiente. A rota exige JWT e período semiaberto válido (`start` incluído, `end` excluído). Espere `200` com `period`, `service` e `samples`. Confira os cálculos conforme a seção 11 e preserve lacunas como valores nulos, sem interpretá-las como consumo zero.

Para períodos com mais de 500 tentativas, o histórico ambiental reduz os pontos retornados em blocos. Cada bloco preserva uma amostra sem energia quando existir; caso contrário, utiliza a última amostra do bloco. Essa seleção não apaga registros do banco nem soma as amostras. `period.displayIntervalMs` informa o intervalo de exibição calculado pelo espaçamento dos blocos. Não espere correspondência de uma linha retornada para cada tentativa em períodos extensos; use o histórico bruto para conferir os registros completos.

| Cenário | Resultado esperado |
|---|---|
| Serviço existente, sem coletas no período | `200` com `samples: []` |
| Serviço inexistente | `404` com `SERVICE_NOT_FOUND` |
| ID inválido, com token e período válidos | `400` com `INVALID_SERVICE_ID` |
| Período ausente ou inválido, com token válido | `400` com `INVALID_INDICATOR_PERIOD` |
| JWT ausente ou inválido | `401` |

O histórico bruto recupera tentativas e métricas; o histórico ambiental calcula energia e emissão a partir das amostras do período. Não confundir os dois contratos.

## 13. Validar dados consolidados do dashboard — TEC19

Este roteiro verifica o endpoint `GET /api/dashboard`, protegido por JWT e disponível para usuários autenticados sem exigir perfil administrador.

### Consultar o período padrão

```bash
curl.exe -i http://localhost:3000/api/dashboard -H "Authorization: Bearer <token>"
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
curl.exe -i "http://localhost:3000/api/dashboard?start=2026-10-30T12:00:00.000Z&end=2026-10-31T12:00:00.000Z" -H "Authorization: Bearer <token>"
```

| Cenário | Resultado esperado |
|---|---|
| `start` e `end` válidos | HTTP `200`; resposta agrega somente o período semiaberto informado |
| Apenas um dos parâmetros, data vazia/repetida/inválida ou `end` não posterior a `start` | HTTP `400` com `code: "INVALID_DASHBOARD_PERIOD"` |
| JWT ausente ou inválido | HTTP `401 Unauthorized` |
| Amostra sem `collection_interval_seconds` ou sem intensidade de carbono elegível | `isPartial: true`; nenhum valor ausente é estimado por fallback |

### Registro da validação manual

Registre separadamente as verificações de API, PostgreSQL, preservação após reinicialização e frontend. A aprovação de uma dessas partes não comprova automaticamente o funcionamento das demais.

Preencha os dados da execução:

| Campo | Registro |
|---|---|
| Data e horário | A preencher |
| Responsável | A preencher |
| Branch e commit testado | A preencher |
| Ambiente utilizado | A preencher |
| Período consultado nos indicadores | A preencher |

#### Evidências por área

Preencha o resultado obtido e vincule as evidências após executar cada verificação.

| Área | Verificação | Resultado esperado | Resultado obtido | Situação | Evidência |
|---|---|---|---|---|---|
| API | Consultar histórico com JWT válido | HTTP 200 com o ID do serviço e suas coletas | A preencher | Não executado | Resposta salva ou captura do Insomnia |
| API | Consultar rota protegida sem JWT | HTTP 401 | A preencher | Não executado | Captura da resposta |
| API | Solicitar coleta com usuário comum | HTTP 403, sem iniciar coleta | A preencher | Não executado | Resposta e verificação da operação |
| API | Solicitar coleta com administrador | HTTP 200 com o resumo da operação | A preencher | Não executado | Resposta e registros do ciclo |
| API | Consultar indicadores e dashboard com período válido | HTTP 200 com resultados coerentes com os dados do período | A preencher | Não executado | Respostas e cálculo de conferência |
| PostgreSQL | Consultar uma coleta com métricas | Valores, datas e duração correspondem aos dados gravados | A preencher | Não executado | SQL e resultado da consulta |
| PostgreSQL | Consultar coletas sucessivas | Registros distintos, sem sobrescrever os anteriores | A preencher | Não executado | IDs e valores recuperados |
| PostgreSQL | Consultar tentativa `no_metrics` | Tentativa registrada sem linha associada em `metrics` | A preencher | Não executado | SQL e resultado da consulta |
| PostgreSQL | Consultar tentativa `unavailable` | Status e motivo da falha preservados | A preencher | Não executado | SQL e resultado da consulta |
| Reinicialização | Comparar registros antes e depois de reiniciar os containers sem remover volumes | Mesmos IDs e valores continuam disponíveis | A preencher | Não executado | Consultas e capturas antes e depois |
| Frontend | Abrir o monitoramento | Serviços, localização e estados correspondem à API | A preencher | Não executado | Tela e resposta na aba Network |
| Frontend | Aguardar atualização automática | Novas consultas e atualização sem reload manual | A preencher | Não executado | Vídeo ou capturas com horários |
| Frontend | Conferir indicadores apresentados | Valores e unidades correspondem à resposta do backend | A preencher | Não executado | Tela e resposta da API |

**Situações utilizadas:**

- **Não executado:** verificação ainda não realizada.
- **Aprovado:** resultado observado corresponde ao esperado.
- **Reprovado:** resultado observado diverge do esperado.
- **Bloqueado:** execução impedida; registrar o motivo.

Na comparação após reinicialização, confira os **identificadores e valores dos registros anteriores**, não apenas a quantidade total. Os jobs automáticos podem acrescentar novas coletas durante a validação.

Não utilize `docker compose down -v`: essa opção remove o volume do PostgreSQL.

#### Evidências dos testes automatizados

Os resultados automatizados devem ser registrados separadamente da validação manual.

| Suíte | Comando | Resultado obtido | Evidência |
|---|---|---|---|
| Backend: testes unitários e HTTP | `docker compose exec backend npm test` | A preencher, distinguindo aprovados, falhas e ignorados | Log ou captura |
| Frontend | `docker compose exec frontend npm test` | A preencher | Log ou captura |
| Integração com PostgreSQL real | `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test` | A preencher | Log ou captura |
| TypeScript do backend | `docker compose exec backend npm run typecheck` | A preencher | Log ou captura |
| TypeScript do frontend | `docker compose exec frontend npm run typecheck` | A preencher | Log ou captura |

Os sete testes de integração aparecem como `skipped` na execução comum do backend. Para validar a persistência automatizada, execute também a suíte com `compose.test.yaml`.

O banco dessa suíte é temporário. Portanto, sua aprovação não substitui a verificação manual de preservação após reinicialização do ambiente da aplicação.

Consulte o [manual de testes automatizados](./manual_teste_unitario.md) e o [manual de integração com PostgreSQL](./manual_integracao_postgres.md) para as instruções completas.

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

### Para o futuro
Esse é um projeto ainda em desenvolvimento, futuramente irá abarcar um circuito maior de validação.