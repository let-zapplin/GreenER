# Manual de validação do fluxo de dados

## Objetivo e situação atual

Verificar o caminho dos serviços desde a Metrics API até sua persistência no PostgreSQL, sua consulta pela API GreenER e sua exibição no React.

```text
Metrics API → Backend → PostgreSQL → API GreenER → React
```

O backend e a API GreenER pertencem à mesma aplicação: ela busca e armazena dados e também oferece endpoints para consultá-los.

Na implementação consultada para este manual:

- `GET /api/servicos/discover` busca serviços na Metrics API.
- `POST /api/servicos/sync` busca e salva os serviços e suas localizações no PostgreSQL.
- `GET /api/servicos` lista os serviços armazenados no PostgreSQL.
- A tela de monitoramento ainda consulta `/api/servicos/discover`. Portanto, sua exibição não comprova a leitura do banco pelo React.
- Os arquivos do módulo `coletas` estão vazios. Este roteiro valida serviços e localizações; a coleta de CPU, memória, disco e rede ainda precisa ser implementada e validada.

## 1. Iniciar o ambiente

Pré-requisitos: Docker Desktop em execução, arquivo `.env` configurado e acesso à rede para consultar a Metrics API.

Abra um terminal na pasta que contém `compose.yaml`. A partir da pasta externa deste repositório, entre na pasta interna:

```bat
cd GreenER
```

Se já estiver na pasta que contém `compose.yaml`, não execute esse `cd` novamente.

Inicie o ambiente e confira os containers:

```bat
docker compose up -d --build
docker compose ps
```

Resultado esperado: `postgres`, `backend` e `frontend` em execução, com PostgreSQL e backend saudáveis (`healthy`).

Os comandos HTTP deste manual usam `curl.exe`, disponível no Windows e utilizável tanto no CMD quanto no PowerShell. `Invoke-RestMethod` é exclusivo do PowerShell.

## 2. Verificar a resposta do backend

```bat
curl.exe -i http://localhost:3000/health
```

Resultado esperado: HTTP `200` e corpo semelhante a:

```json
{
  "status": "ok",
  "message": "GreenER backend funcionando"
}
```

Esse endpoint verifica a resposta do backend. Ele não comprova a conexão com o banco nem com a Metrics API.

## 3. Descobrir serviços na Metrics API

```bat
curl.exe -i http://localhost:3000/api/servicos/discover
```

Resultado esperado: HTTP `200`, mensagem e lista no campo `services`, contendo identificadores (`id`), nomes e localizações. Registre alguns serviços para comparar com as próximas etapas.

Uma lista vazia deve ser registrada como tal: sem serviços disponíveis, não é possível comprovar a gravação de um serviço novo neste teste.

**Trecho verificado:** Metrics API → Backend → resposta da API GreenER.

## 4. Sincronizar os serviços com o banco

Este comando grava ou atualiza os serviços no PostgreSQL:

```bat
curl.exe -i -X POST http://localhost:3000/api/servicos/sync
```

Resultado esperado: HTTP `200` e resposta semelhante a:

```json
{
  "message": "Serviços sincronizados com sucesso",
  "created": 8,
  "updated": 0
}
```

Os números são ilustrativos. Se já houver registros no banco, a primeira execução deste roteiro também poderá retornar serviços atualizados.

## 5. Conferir a persistência no DBeaver

Crie uma conexão PostgreSQL:

| Campo | Valor |
| --- | --- |
| Host | `127.0.0.1` |
| Porta | `5433` |
| Banco de dados | Valor de `POSTGRES_DB` no `.env` |
| Usuário | Valor de `POSTGRES_USER` no `.env` |
| Senha | Senha definida na inicialização do banco |

Para o banco `greener`, a URL é:

```text
jdbc:postgresql://127.0.0.1:5433/greener
```

O backend usa `postgres:5432` dentro da rede Docker. O DBeaver acessa o container pela porta publicada no Windows, `5433`. Não altere o `.env` para configurar o DBeaver.

No editor SQL do DBeaver, execute:

```sql
SELECT
    s.id,
    s.name,
    l.region_code,
    l.city
FROM service s
JOIN location l
    ON l.id_location = s.location_id_location
ORDER BY s.id;
```

Compare IDs, nomes e localizações com a descoberta. A fonte externa pode mudar entre requisições; registre divergências e o horário de cada consulta antes de classificá-las como falha.

**Trecho verificado:** Metrics API → Backend → PostgreSQL.

### Verificar ausência de duplicação

Registre a quantidade inicial:

```sql
SELECT COUNT(*) AS total_servicos FROM service;
```

Execute novamente, no terminal, o mesmo comando de sincronização:

```bat
curl.exe -i -X POST http://localhost:3000/api/servicos/sync
```

Repita a contagem no DBeaver. Se a lista externa permanecer igual, espera-se `created: 0` e a mesma quantidade de serviços no banco. O campo `updated` contabiliza os serviços já existentes processados pela sincronização, mesmo que seus valores não tenham mudado.

Confira também os identificadores repetidos:

```sql
SELECT id, COUNT(*) AS quantidade
FROM service
GROUP BY id
HAVING COUNT(*) > 1;
```

Resultado esperado: nenhuma linha retornada.

## 6. Consultar os dados persistidos pela API GreenER

```bat
curl.exe -i http://localhost:3000/api/servicos
```

Resultado esperado: HTTP `200` e serviços compatíveis com a consulta SQL. Nessa resposta, o identificador externo aparece como `external_id`; na descoberta e na tabela `service`, ele se chama `id`. Compare os registros por esse identificador, sem depender da ordem da lista.

**Trecho verificado:** PostgreSQL → API GreenER.

## 7. Conferir a exibição no React

Acesse:

```text
http://localhost:5173/monitoramento
```

1. Abra as ferramentas do navegador com `F12`.
2. Selecione a aba **Network/Rede** e filtre por **Fetch/XHR**.
3. Recarregue a página.
4. Confira a URL da requisição de serviços, seu status e seu corpo de resposta.
5. Compare os nomes e localizações da resposta com os cartões exibidos.
6. Aguarde uma nova consulta automática. A tela está configurada para aguardar 10 segundos após o término de cada tentativa.

Resultado esperado: requisição bem-sucedida e dados exibidos de acordo com a resposta recebida.

**Limitação atual:** a tela usa `/api/servicos/discover`, que consulta a Metrics API novamente. Isso verifica a integração da tela com o backend, mas não fecha o trecho PostgreSQL → API GreenER → React. Para concluir esse fluxo, o frontend precisa consumir a listagem persistida e tratar o formato retornado por ela.

## 8. Registrar as evidências e a conclusão

Guarde as respostas HTTP, resultados SQL e capturas da tela e da aba Network/Rede. Para cada execução, registre data, versão ou commit testado, resultado observado e eventuais erros.

| Verificação | Resultado esperado | Resultado observado |
| --- | --- | --- |
| Saúde do backend | HTTP 200 e `status: ok` | Preencher |
| Descoberta externa | HTTP 200 e lista de serviços | Preencher |
| Sincronização | HTTP 200 e contadores de criação/atualização | Preencher |
| Persistência | Serviços e localizações presentes no SQL | Preencher |
| Nova sincronização | Sem duplicar serviços | Preencher |
| Listagem pelo banco | API compatível com o SQL | Preencher |
| Exibição React | Cartões compatíveis com a resposta HTTP | Preencher |
| Leitura do banco pelo React | Tela consumindo a listagem persistida | Pendente na implementação atual |

Não registre o fluxo completo como aprovado apenas porque os cartões aparecem. A aprovação completa exige comprovar que a tela recebeu os dados consultados no PostgreSQL.

## Solução de problemas

### Backend ou frontend sem resposta

Confira o estado e os logs:

```bat
docker compose ps
docker compose logs --tail 50 backend
docker compose logs --tail 50 frontend
```

### Falha na descoberta ou sincronização

Confira os logs do backend e do banco e a configuração de `METRICS_API_URL` no `.env`:

```bat
docker compose logs --tail 50 backend
docker compose logs --tail 50 postgres
```

### DBeaver apresenta erro de conexão ou senha

Confirme host `127.0.0.1`, porta `5433` e as credenciais do banco inicializado. Alterar `POSTGRES_PASSWORD` no `.env` não altera a senha de um volume já inicializado. A conexão pelo CLI dentro do container pode não exigir senha e não comprova a autenticação usada pelo DBeaver.

Também pode existir um PostgreSQL instalado no Windows ocupando a mesma porta. No PowerShell, identifique os processos:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5433 |
    Select-Object LocalAddress, LocalPort, OwningProcess

Get-Process -Id <PID_ENCONTRADO>
```

Substitua `<PID_ENCONTRADO>` pelo número retornado. Se confirmar que o serviço local `postgresql-x64-18` está ocupando a porta e puder interrompê-lo, execute no **PowerShell como administrador**:

```powershell
Stop-Service -Name postgresql-x64-18
```

Teste novamente no DBeaver. Essa ação interrompe o banco local; não apaga seus dados nem altera o Compose.

Não execute `docker compose down -v` para resolver a conexão: esse comando remove os volumes e os dados persistidos.
