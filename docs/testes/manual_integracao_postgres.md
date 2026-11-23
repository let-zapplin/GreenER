# Testes de integração de coletas com PostgreSQL real

← [Voltar ao índice da documentação](../../README.md)

**Atualização documental: 23/11/2026 — fechamento da Sprint 3.** Os resultados abaixo são registros de execuções anteriores. A atualização deste manual não representa uma nova execução dos testes.

## 1. Para que servem

Os testes HTTP existentes simulam consultas ou operações de coleta.
Já [`coletas.integration.test.ts`](../../backend/src/modules/coletas/coletas.integration.test.ts) usa `ColetasRepository` e PostgreSQL reais:
executa `INSERT`, `SELECT`, transações e restrições do esquema.
Não usa `vi.mock`, `spyOn` ou `mockResolvedValue`.

**Alcance:** a suíte valida a persistência das tentativas, as métricas associadas, o histórico bruto por serviço, as restrições e as transações de `ColetasRepository`. Não executa as consultas analíticas de indicadores, a associação de snapshots de carbono, os cálculos ambientais ou as projeções. Também não valida a interface, as APIs externas nem a integração completa da plataforma.

## 2. Arquivos

### Ambiente Docker

O arquivo [`compose.test.yaml`](../../compose.test.yaml), na raiz:

- Cria o projeto Docker `greener-tests`, separado do Compose da aplicação.
- `postgres-test` executa PostgreSQL 17 com banco `greener_test`.
- As credenciais fixas desse arquivo são exclusivas do ambiente de testes.
- Não publica porta no host e não compartilha o volume `postgres_data`.
- Carrega `database/schema.sql` para criar as tabelas no banco vazio.
- Usa `tmpfs`: os dados são temporários e são perdidos ao parar o banco.
- Aguarda o healthcheck antes de iniciar `backend-test`.
- `backend-test` executa o Vitest, sem iniciar o servidor e os jobs automáticos.
- As variáveis `POSTGRES_*` do serviço apontam para `postgres-test`.

### Suíte de integração

O arquivo [`coletas.integration.test.ts`](../../backend/src/modules/coletas/coletas.integration.test.ts):

- Define os sete cenários e os dados usados em cada um.
- Importa o pool de conexão e o repository reais.
- Antes de inserir dados, exige `NODE_ENV=test`, host `postgres-test` e banco
  `greener_test`. Confirma também `current_database()` pela conexão real.
- Essa conferência ajuda a evitar execução acidental no banco de desenvolvimento.

O [`schema.sql`](../../database/schema.sql) cria um banco novo completo. Não executamos as migrations sobre
esse mesmo schema, porque as alterações já fazem parte da estrutura atual.
O teste não aplica alterações ao banco de desenvolvimento.

## 3. Como o código funciona

### `describe.skipIf(!enabled)`

Habilita a suíte apenas quando `RUN_DB_INTEGRATION_TESTS=true`, definida pelo
Compose de testes. Na execução comum do backend, os sete testes ficam `skipped`.

### `beforeAll`

Confere a configuração e a identidade do banco antes dos cenários.

### `beforeEach`

Insere uma localização e um serviço próprios para cada teste.
`randomUUID` cria identificadores diferentes para evitar colisões entre execuções.
As consultas usam parâmetros `$1`, `$2` etc., separando o SQL dos valores.
`RETURNING` devolve o ID gerado pelo PostgreSQL.

### `success(cpu = 25)`

Monta uma coleta válida com valores conhecidos. O parâmetro permite variar a CPU.
A duração da amostra é 45 segundos e a data das métricas é fixa.
`as const` mantém o tipo literal `"success"` esperado pelo repository.

### `repository.saveCollection`

Executa o código real de gravação. Na coleta `success`, insere `collection` e `metrics`
na mesma transação. Se falhar, o repository solicita `ROLLBACK`.

### `repository.findHistoryByService`

Executa a consulta SQL real e recupera os registros daquele serviço.

### `afterEach`

Remove apenas os dados criados pelo cenário: métricas, coletas, serviços e
localização, nessa ordem para respeitar as chaves estrangeiras.
Não usa `TRUNCATE` nem apaga todas as tabelas.

### `afterAll`

Fecha o pool para liberar as conexões quando a suíte termina.

## 4. Cenários

1. **Gravar e recuperar métricas, datas e duração:**
   Confere os valores retornados pelo PostgreSQL. cpu_percent volta como string
   "25.00", seguindo o comportamento do driver pg para o tipo DECIMAL.

2. **Preservar duas coletas:**
   Salva CPU 25 e depois CPU 50. Confere dois registros diferentes, o ID anterior
   preservado e a ordem do histórico, com o mais recente primeiro.

3. **Gravar `no_metrics`:**
   Confere a tentativa com HTTP 404 e verifica diretamente que não há linha
   correspondente na tabela metrics.

4. **Gravar `unavailable`:**
   Confere status, HTTP 503, motivo da indisponibilidade e ausência de CPU.

5. **Separar históricos:**
   Cria dois serviços e grava valores diferentes. Confere que cada consulta
   recupera apenas a coleta do serviço solicitado.

6. **Desfazer uma gravação incompleta:**
   Envia duração -1 para provocar uma violação CHECK na inserção em metrics.
   Confere o erro PostgreSQL 23514 e que não restou uma linha em collection.
   Isso comprova o rollback real da tentativa já inserida pela transação.
   A mensagem de erro registrada pelo repository é esperada nesse cenário.

7. **Ler por conexão independente:**
   Salva pelo repository, abre outro pool e recupera os valores por ele.
   Confirma que o commit tornou os dados visíveis para outra conexão.
   Esse teste não reinicia o container; o reinício é uma validação separada.

## 5. Como executar

Abra o Docker Desktop. No terminal, entre na raiz onde estão `compose.yaml` e
`compose.test.yaml`. Não é necessário iniciar a aplicação de desenvolvimento.

### Iniciar o ambiente e executar os testes

Execute:

```powershell
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test
```

Significado:

- `-f compose.test.yaml`: seleciona somente o ambiente de testes.
- `up`: cria e inicia os serviços desse ambiente.
- `--build`: prepara a imagem com as dependências do backend.
- `--abort-on-container-exit`: encerra os serviços quando o processo de testes termina.
- `--exit-code-from backend-test`: devolve o resultado do processo de testes ao terminal.

A primeira execução pode demorar mais por causa do download e da construção
da imagem. Os logs do PostgreSQL aparecerão junto com os do Vitest.

Resumo esperado:

```text
Test Files  1 passed (1)
     Tests  7 passed (7)
```

Para repetir, execute o mesmo comando. Como o banco é temporário, ele volta
vazio e o `schema.sql` cria as tabelas novamente na inicialização.

### Remover os containers de testes

Para remover os containers e a rede desse ambiente após a execução:

```powershell
docker compose -f compose.test.yaml down
```

Esse comando seleciona o projeto `greener-tests`. O Compose da aplicação e seu
volume `postgres_data` são separados.

## 6. Relação com o comando `npm test` habitual

```powershell
docker compose exec backend npm test
```

Continua executando os testes comuns. Ele encontra a suíte de integração,
mas apresenta seus sete cenários como `skipped` porque o ambiente comum não
habilita `RUN_DB_INTEGRATION_TESTS`.

**`Skipped` não significa que a persistência foi validada.** Para validar a task,
execute também o comando com `compose.test.yaml` e registre seu resultado.
Não configure `RUN_DB_INTEGRATION_TESTS` no `.env` de desenvolvimento para tentar
rodar esta suíte no banco normal; use o ambiente separado.

## 7. Evidências da task

### Registro histórico — Sprint 2

**Resultado informado pela equipe em 08/11/2026:** os sete testes de integração
PostgreSQL foram aprovados usando o ambiente `compose.test.yaml`. O commit
específico dessa execução não foi informado.

### Regressão registrada — Sprint 3

| Campo | Registro |
| --- | --- |
| Data da execução | 21/11/2026 |
| Ambiente | Projeto Docker `greener-tests`, banco exclusivo `greener_test` |
| Comando | `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-test` |
| Resultado | **Um arquivo aprovado; sete testes aprovados; código de saída 0** |
| Referência | [Consolidação dos testes da Sprint 3](./consolidacao_testes_sprint3.md) |
| Commit da execução | Não identificado no registro disponível; não atribuir automaticamente o commit atual à execução anterior. |

O teste de rollback provocou intencionalmente o erro PostgreSQL `23514`, por violação da restrição `chk_metrics_collection_interval_seconds`. A suíte terminou aprovada; essa mensagem não representa falha da execução.

Para uma nova execução, registre data, commit testado, comando, resumo e código de saída. Os resultados das suítes comuns de backend e frontend devem ser registrados separadamente, sem substituir a execução dedicada com PostgreSQL real.

A verificação manual de preservação após restart continua sendo outra evidência:
o banco temporário de testes foi projetado para ser descartado ao parar.

## 8. Documentação relacionada

- [Manual de execução dos testes automatizados](./manual_teste_unitario.md): inventário, testes comuns, typechecks e builds.
- [Manual de validação do fluxo de dados](./manualdevalidacao.md): roteiros e evidências de API, banco, frontend e reinicialização da aplicação.
- [Consolidação dos testes e entregas da Sprint 3](./consolidacao_testes_sprint3.md): resultados e limites das evidências finais.
- [Documentação do banco](../../database/README.md): schema, migrations e persistência no volume da aplicação.
