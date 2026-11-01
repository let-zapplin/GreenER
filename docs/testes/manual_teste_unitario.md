# Manual de execução dos testes automatizados

Este manual reúne os testes unitários, HTTP e de integração do GreenER e explica como executá-los no Docker. O backend utiliza **Vitest**, os testes HTTP utilizam **Supertest** e o frontend utiliza **Node.js Test Runner**.

O nome deste arquivo foi mantido para preservar os links do projeto. Seu conteúdo agora abrange a suíte automatizada da Sprint 2.

## 1. Tipos de teste

| Tipo | O que verifica | PostgreSQL real? |
|---|---|---|
| Unitário | Services, controllers, middlewares, integrações e repositories com dependências controladas | Não; o acesso ao banco é simulado |
| HTTP | Requisições ao Express, autenticação, validações, status e respostas | Não; consultas ou operações são simuladas |
| Integração de persistência | SQL, gravação, recuperação, restrições e transações pelo repository real | Sim, em banco exclusivo |
| Frontend | Sessão, conversão dos dados e estados do monitoramento | Não |

Nos testes HTTP, a autenticação JWT usa o código real e segredos temporários de teste. As demais camadas continuam reais, exceto as operações explicitamente simuladas em cada cenário. Não é necessário abrir o Insomnia nem fazer login manualmente.

Os testes de rotas de intensidades e dashboard inspecionam a presença dos middlewares. Essa inspeção é diferente dos arquivos `*.http.test.ts`, que enviam requisições HTTP por meio do Supertest.

## 2. Preparar o ambiente

1. Inicie o Docker Desktop.
2. Abra um terminal na raiz do projeto, onde estão `compose.yaml`, `compose.test.yaml`, `backend` e `frontend`.
3. Confirme que o `.env` da aplicação está configurado conforme o README.

Se ainda não existir `.env`, copie o modelo:

~~~powershell
Copy-Item .env.example .env
~~~

Faça a cópia apenas se o arquivo não existir, para preservar sua configuração. Revise os valores necessários à inicialização e não compartilhe credenciais.

Inicie os containers da aplicação:

~~~powershell
docker compose up -d
~~~

O parâmetro `-d` mantém os containers em segundo plano. O código é compartilhado por volumes; não é necessário reconstruir as imagens a cada alteração nos testes.

Quando for necessário reconstruir as imagens, por exemplo após alterar o Dockerfile:

~~~powershell
docker compose up --build -d
~~~

Confira os serviços:

~~~powershell
docker compose ps
~~~

Se um serviço não iniciar, consulte:

~~~powershell
docker compose logs backend
docker compose logs frontend
~~~

A suíte de integração utiliza outro Compose, descrito na seção 6.

## 3. Executar as suítes comuns

### Backend

~~~powershell
docker compose exec backend npm test
~~~

O comando executa `vitest run` dentro do container. O Vitest encontra automaticamente os arquivos `*.test.ts`; não é necessário cadastrar novos testes em uma lista.

Resumo de referência para a versão descrita neste manual:

~~~text
Test Files  25 passed | 1 skipped (26)
     Tests  139 passed | 7 skipped (146)
~~~

O arquivo ignorado é `coletas.integration.test.ts`. Seus sete testes precisam do banco exclusivo e são executados separadamente. **`Skipped` não significa que a persistência foi validada.**

### Frontend

~~~powershell
docker compose exec frontend npm test
~~~

O comando executa `node --test tests/*.test.ts`. O total de referência é **26 testes aprovados em três arquivos**.

As quantidades podem mudar com novas implementações. Confira se existem falhas e registre o commit da versão à qual o resultado pertence. As contagens deste manual não substituem a evidência de uma execução.

## 4. Inventário dos testes

Os caminhos do backend abaixo são relativos a `backend/src/`. As quantidades incluem os casos expandidos de testes parametrizados com `it.each`.

### Backend: regras, integrações e autenticação

| Arquivo | Testes | Cobertura principal |
|---|---:|---|
| `integrations/metrics-api.test.ts` | 10 | Métricas e duração, ausência de métricas, HTTP 404/500, payload e JSON inválidos, conexão e timeout |
| `integrations/carbon-api.test.ts` | 6 | Catálogo regional, payload inválido, códigos duplicados, HTTP, conexão e timeout |
| `jobs/metrics-collection.job.test.ts` | 3 | Coleta imediata, repetição, continuidade após falha e logs |
| `jobs/service-sync.job.test.ts` | 4 | Descoberta imediata, repetição, falhas, bloqueio de sobreposição e logs |
| `modules/servicos/servicos.service.test.ts` | 7 | Descoberta, falhas externas, localização, atualização e remoção de serviços |
| `modules/coletas/coletas.service.test.ts` | 18 | Coleta por serviço, estados, falhas isoladas, amostras sucessivas, concorrência e validação do histórico |
| `modules/coletas/coletas.repository.test.ts` | 4 | Transação, gravação, indisponibilidade, ausência de métricas e erro de rollback, com banco simulado |
| `modules/indicadores/indicadores.service.test.ts` | 5 | Energia, emissão, duração ausente, intensidade ausente, lacunas e período inválido |
| `modules/indicadores/indicadores.controller.test.ts` | 3 | Período, parâmetros ausentes ou repetidos e propagação de erros |
| `modules/intensidades/intensidades.service.test.ts` | 3 | Catálogo, snapshots regionais e configuração de idade máxima |
| `modules/intensidades/intensidades.repository.test.ts` | 3 | Critérios da consulta temporal e regional, com conexão simulada |
| `modules/intensidades/intensidades.controller.test.ts` | 3 | Contrato das respostas, quantidade sincronizada e erros |
| `modules/intensidades/intensidades.routes.test.ts` | 1 | Middleware JWT em descoberta, sincronização e listagem |
| `modules/dashboard/dashboard.service.test.ts` | 5 | Últimas 24 horas, agregação de serviços ativos, lacunas e período |
| `modules/dashboard/dashboard.repository.test.ts` | 1 | Critérios SQL da contagem de disponibilidade, com conexão simulada |
| `modules/dashboard/dashboard.controller.test.ts` | 3 | Resumo, período opcional, parâmetros inválidos e erros |
| `modules/dashboard/dashboard.routes.test.ts` | 1 | Middleware JWT na rota consolidada |
| `modules/auth/auth.service.test.ts` | 4 | Login válido, usuário ausente, senha incorreta e e-mail duplicado |
| `shared/utils/jwt.util.test.ts` | 5 | Emissão e verificação reais, token malformado, assinatura e expiração |
| `shared/utils/jwt-expiration.test.ts` | 16 | Formatos aceitos e rejeitados na configuração da expiração e padrão |
| `shared/middlewares/auth.middleware.test.ts` | 7 | JWT válido, cabeçalho ausente ou incorreto, token malformado, expirado ou com outro segredo |
| `shared/middlewares/admin.middleware.test.ts` | 5 | Administrador, usuário comum, identificação inválida, usuário removido e falha na consulta |

Os testes de APIs externas simulam as respostas; não dependem da disponibilidade das APIs do cliente. Os testes de repositories simulados verificam comandos e parâmetros, sem executar SQL no PostgreSQL.

### HTTP de coletas: oito testes

Arquivo: [coletas.http.test.ts](../../backend/src/modules/coletas/coletas.http.test.ts).

| Endpoint | Cenário | Resultado esperado |
|---|---|---|
| `GET /api/metricas/historico/:serviceId` | Sem token | 401 |
| Mesmo endpoint | Token inválido | 401 |
| Mesmo endpoint | Token válido e histórico vazio | 200 com lista vazia |
| Mesmo endpoint | Token válido e ID inválido | 400, sem consultar o repository |
| Mesmo endpoint | Token válido e histórico com registros | 200 com registros esperados |
| `POST /api/metricas/collect` | Sem token | 401 |
| Mesmo endpoint | Usuário comum autenticado | 403, sem iniciar coleta |
| Mesmo endpoint | Administrador | 200 com resumo e uma chamada à coleta |

A consulta ao histórico, a consulta de permissão e a operação de coleta são simuladas conforme o cenário. O teste de administrador não inicia uma coleta real nem grava métricas.

### HTTP de indicadores: dez testes

Arquivo: [indicadores.http.test.ts](../../backend/src/modules/indicadores/indicadores.http.test.ts).

| Cenário em `GET /api/indicadores` | Resultado esperado |
|---|---|
| Sem token | 401 |
| Sem período, com token válido | 400 |
| Data inicial inválida | 400 |
| Data final anterior à inicial | 400 |
| Datas iguais | 400 |
| Data inicial repetida | 400 |
| Token inválido | 401 |
| Token e período válidos, sem serviços retornados | 200 com totais zerados e resultado parcial |
| Falha inesperada na consulta | 500 com mensagem genérica |
| Coleta válida com métricas e intensidade | 200 com energia e emissão calculadas |

A consulta é simulada. No cenário com coleta, o cálculo usa duração de 60 segundos e intensidade de 200 gCO₂e/kWh. O teste confere aproximadamente `0,000849166667 kWh` e `0,169833333333 gCO₂e` no resumo e na amostra do serviço.

### HTTP do dashboard: quatro testes

Arquivo: [dashboard.http.test.ts](../../backend/src/modules/dashboard/dashboard.http.test.ts).

| Cenário em `GET /api/dashboard` | Resultado esperado |
|---|---|
| Sem token | 401, sem executar consultas |
| Token e período válidos, sem serviços retornados | 200 com resumo esperado |
| Apenas data inicial, com token válido | 400, sem executar consultas |
| Falha na consulta de disponibilidade | 500 com mensagem genérica |

As duas consultas são simuladas. Omitir ambas as datas é permitido e utiliza as últimas 24 horas; informar somente uma delas é inválido. Sem serviços ativos, o dashboard retorna `isPartial: false`, conforme sua regra atual, diferente do resumo vazio de indicadores.

### Frontend: 26 testes

| Arquivo relativo a `frontend/` | Testes | Cobertura principal |
|---|---:|---|
| `tests/authSession.test.ts` | 7 | Token inválido ou expirado, sessão, armazenamento corrompido, migração e logout |
| `tests/monitoringState.test.ts` | 15 | Serviços novos, removidos e retornados; ausência de métricas; indisponibilidade; prazos e última confirmação |
| `tests/serviceMapping.test.ts` | 4 | Conversão e distinção entre ativo, removido, sem métricas e indisponível |

Esses testes verificam funções de sessão e monitoramento. Não verificam renderização de componentes ou navegação completa em um navegador.

## 5. Executar um arquivo ou módulo

### Arquivos HTTP implementados

~~~powershell
docker compose exec backend npm test -- src/modules/coletas/coletas.http.test.ts
docker compose exec backend npm test -- src/modules/indicadores/indicadores.http.test.ts
docker compose exec backend npm test -- src/modules/dashboard/dashboard.http.test.ts
~~~

Os resultados esperados são, respectivamente, **oito, dez e quatro testes aprovados**.

### Todos os testes comuns de um módulo

~~~powershell
docker compose exec backend npm test -- src/modules/coletas
docker compose exec backend npm test -- src/modules/indicadores
docker compose exec backend npm test -- src/modules/dashboard
docker compose exec backend npm test -- src/modules/intensidades
~~~

No módulo de coletas, os sete testes de integração ficam ignorados na execução comum. O módulo de indicadores executa service, controller e HTTP, totalizando **18 testes** na versão descrita.

### Outros grupos

~~~powershell
docker compose exec backend npm test -- src/modules/servicos/servicos.service.test.ts
docker compose exec backend npm test -- src/integrations
docker compose exec backend npm test -- src/jobs
docker compose exec backend npm test -- src/shared
~~~

Para executar um único arquivo do frontend, chame diretamente o executor:

~~~powershell
docker compose exec frontend node --test tests/authSession.test.ts
~~~

## 6. Executar os sete testes com PostgreSQL real

Arquivo: [coletas.integration.test.ts](../../backend/src/modules/coletas/coletas.integration.test.ts).

O [compose.test.yaml](../../compose.test.yaml) possui banco `greener_test`, container `postgres-test` e executor `backend-test`. Ele cria as tabelas pelo `database/schema.sql` e não utiliza o volume do banco de desenvolvimento. O servidor da aplicação e os jobs não são iniciados nesse ambiente.

Na raiz do projeto, execute:

~~~powershell
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
~~~

O comando prepara a imagem, aguarda o banco ficar disponível, executa a suíte e encerra os serviços ao terminar. Não é necessário iniciar antes a aplicação pelo Compose comum.

Os sete cenários são:

1. Gravação e recuperação de métricas, datas e duração.
2. Preservação de duas coletas e ordenação do histórico.
3. Tentativa `no_metrics` sem linha associada em `metrics`.
4. Motivo e status HTTP de indisponibilidade.
5. Separação dos históricos de dois serviços.
6. Rollback real quando a inserção das métricas viola uma restrição.
7. Leitura da gravação por uma conexão independente.

Resumo esperado:

~~~text
Test Files  1 passed (1)
     Tests  7 passed (7)
~~~

Os testes criam e limpam seus próprios registros. O banco usa armazenamento temporário em `tmpfs`, descartado ao parar. **Essa suíte não comprova preservação após reinicialização do container.** A evidência manual de reinicialização da aplicação é complementar.

Para remover os containers e a rede de testes:

~~~powershell
docker compose -f compose.test.yaml down
~~~

Não habilite `RUN_DB_INTEGRATION_TESTS` no `.env` de desenvolvimento. Utilize o Compose específico, que define a configuração exigida pela suíte.

A explicação detalhada está no [manual de integração com PostgreSQL](./manual_integracao_postgres.md).

## 7. Interpretar resultados e mensagens de erro

| Resultado | Significado |
|---|---|
| `passed` | O comportamento correspondeu às verificações |
| `failed` | Uma verificação ou a preparação/execução falhou |
| `skipped` | O cenário não foi executado; não equivale a validação aprovada |

Um teste de bloqueio passa quando recebe **401** ou **403**, conforme o cenário. Um teste de falha interna passa quando recebe **500** com o corpo esperado. Aprovação do teste não significa necessariamente que o acesso foi permitido.

Podem aparecer mensagens em `stderr` nos cenários que provocam falhas:

~~~text
Erro na API Metrics: Error: HTTP 500: Internal Server Error
Erro inesperado: Error: Falha simulada na consulta de disponibilidade
new row for relation "metrics" violates check constraint "chk_metrics_collection_interval_seconds"
~~~

O último erro é provocado pela duração negativa no teste de rollback. A aplicação e o PostgreSQL registram a falha; o teste verifica o tratamento correto.

**Confira o resumo final.** Um `console.error` sozinho não significa falha na suíte. Já `failed`, rejeições não tratadas ou encerramento com erro exigem investigação. Fora dos cenários controlados, mensagens semelhantes podem indicar problemas reais.

## 8. Acompanhar alterações e verificar TypeScript

Para repetir os testes comuns do backend ao alterar o código:

~~~powershell
docker compose exec backend npm run test:watch
~~~

Pressione `Ctrl+C` para encerrar o acompanhamento. Os containers continuam em execução. A suíte de PostgreSQL exige seu comando separado.

Para conferir os tipos:

~~~powershell
docker compose exec backend npm run typecheck
docker compose exec frontend npm run typecheck
~~~

A verificação TypeScript é complementar e não substitui a execução dos cenários.

## 9. Resolver problemas

### Vitest ou Supertest não encontrado no container

As dependências já estão declaradas. Sincronize a instalação e repita o teste:

~~~powershell
docker compose exec backend npm install
~~~

Se faltarem dependências no frontend:

~~~powershell
docker compose exec frontend npm install
~~~

O container utiliza instalação própria de `node_modules`; instalar somente no computador não atualiza essa instalação.

### VS Code não encontra Supertest, mas o Docker executa o teste

O editor aberto no Windows utiliza dependências locais. Na raiz:

~~~powershell
npm.cmd --prefix backend install
~~~

Se necessário, abra um arquivo `.ts`, pressione `Ctrl+Shift+P` e selecione **TypeScript: Restart TS Server**. `npm.cmd` evita o bloqueio de `npm.ps1` pela política do PowerShell. A execução documentada dos testes permanece no Docker.

### Teste dentro de outro teste

A mensagem `Calling the test function inside another test function is not allowed` indica um `it` dentro de outro. Feche o cenário anterior com `});` antes do seguinte. Os blocos `it` devem ficar separados dentro do `describe`.

### Coluna ausente no banco da aplicação

Uma mensagem como `column m.collection_interval_seconds does not exist` indica diferença entre o código e o banco existente. Consulte as migrations no [manual do banco](../../database/README.md).

Reiniciar containers não reaplica o `schema.sql` em um banco que já possui dados. Para preservar o histórico, aplique a migration pertinente conforme a documentação. O banco temporário de integração é criado do zero com o esquema atual.

## 10. Registrar a validação e encerrar

Para a evidência final da task, registre:

- Data e commit testado.
- Resultado do backend, distinguindo aprovados e ignorados.
- Resultado separado dos sete testes com PostgreSQL real.
- Resultado do frontend e das verificações TypeScript.
- Links dos testes, PRs e evidência manual de preservação após reinicialização.

Para encerrar a aplicação:

~~~powershell
docker compose down
~~~

O comando preserva o volume do PostgreSQL. A opção `-v` remove os volumes e não deve ser usada quando os dados precisarem ser preservados.

### Documentação complementar

- [Manual de integração com PostgreSQL](./manual_integracao_postgres.md).
- [Roteiro de validação manual](./manualdevalidacao.md).
- [Fórmulas e unidades dos cálculos](../calculos.md).
