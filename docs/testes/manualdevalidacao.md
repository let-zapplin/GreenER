# Manual de validação do fluxo de dados — GreenER

← [Voltar ao índice da documentação](../../README.md)

## Objetivo

Validar o fluxo funcional consolidado ao final da Sprint 1 e fornecer uma base para ampliar as verificações durante a Sprint 2.

Fluxo validado atualmente:

```text
Metrics API /services
      ↓
Backend
      ↓
PostgreSQL
      ↓
GET /api/servicos
      ↓
React
```

> Este manual não considera coleta de métricas, energia, CO₂e ou histórico como concluídos. Esses cenários devem ser adicionados conforme as respectivas tarefas da Sprint 2 forem implementadas.

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

## 11. Extensão deste manual durante a Sprint 2

Adicionar seções somente após implementação para:

- coleta real de `/metrics/{id_servico}`;
- múltiplas coletas e variação de métricas;
- serviço indisponível durante a coleta;
- serviço ativo sem métricas;
- persistência do histórico;
- Carbon Intensity API;
- cálculo de energia e CO₂e;
- endpoint consolidado de indicadores;
- gráfico histórico;
- JWT validado no backend.

Cada seção nova deve registrar comando/cenário, resultado esperado, evidência e versão/commit testado.

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
