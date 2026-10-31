# Manual de execução dos testes unitários

Este manual explica como executar os testes unitários do backend do GreenER com Vitest, dentro do Docker.

## 1. Preparar o ambiente

- Tenha Docker e Docker Compose instalados e o Docker Desktop iniciado.
- Abra um terminal na raiz do projeto: a pasta que contém compose.yaml, backend e frontend.
- Confirme que o arquivo .env existe nessa pasta e está configurado. Se ainda não existir, copie o modelo pelo PowerShell:

~~~powershell
Copy-Item .env.example .env
~~~

Execute essa cópia apenas se ainda não houver um .env, para preservar sua configuração. Revise os valores necessários à inicialização dos containers e não compartilhe credenciais.

## 2. Iniciar os containers

Na pasta do compose.yaml, execute:

~~~powershell
docker compose up -d
~~~

O parâmetro -d mantém os containers em segundo plano. Não é necessário reconstruir as imagens a cada teste: o código do backend é compartilhado com o container por um volume.

Caso precise reconstruir as imagens, por exemplo após alterar o Dockerfile, execute:

~~~powershell
docker compose up --build -d
~~~

Confira o estado dos serviços:

~~~powershell
docker compose ps
~~~

Aguarde o backend estar em execução. Se ele não iniciar, consulte:

~~~powershell
docker compose logs backend
~~~

## 3. Executar os testes

Com o backend em execução, ainda na pasta do compose.yaml, rode:

~~~powershell
docker compose exec backend npm test
~~~

O comando executa o script test do backend, definido como vitest run, dentro do container. A aplicação continua funcionando.

Para executar somente os testes de descoberta de serviços:

~~~powershell
docker compose exec backend npm test -- src/modules/servicos/servicos.service.test.ts
~~~

Para executar somente os testes do módulo de indicadores:

~~~powershell
docker compose exec backend npm test -- src/modules/indicadores
~~~

Esse comando executa os testes de service e controller do módulo, sem rodar o restante da suíte.

## 4. Interpretar o resultado

Os testes de discoverServices verificam:

1. Retorno dos serviços com location como objeto e com metrics_path.
2. Tratamento de uma resposta HTTP 500.
3. Tratamento de falha de conexão.
4. Cancelamento da requisição ao atingir o timeout.

A API externa e o repositório são simulados nesses testes. O cenário de timeout usa um relógio simulado, sem aguardar cinco segundos reais. Embora o Compose inicie o banco para atender à configuração do ambiente, esses testes não consultam o banco nem a API real.

O resumo esperado para esse arquivo é semelhante a:

~~~text
Test Files  1 passed (1)
     Tests  4 passed (4)
~~~

Se outros testes forem adicionados ao projeto, a quantidade total pode mudar. O importante é verificar se todos passaram.

Mensagens como as seguintes são esperadas nos cenários que simulam falhas:

~~~text
Erro na API Metrics: Error: HTTP 500: Internal Server Error
Erro na API Metrics: TypeError: Falha de conexão
Erro na API Metrics: DOMException [AbortError]: Requisição cancelada
~~~

Esses registros vêm do console.error do serviço e, sozinhos, não significam que o teste falhou. Se aparecer failed ou Unhandled Rejection no resultado, confira a descrição do teste e a mensagem de falha. Em uma execução normal da aplicação, fora dos testes, esses erros podem indicar problemas reais.

### Testes do módulo de indicadores

O comando focado executa atualmente sete testes em dois arquivos:

- `indicadores.service.test.ts` (4 testes): cálculo de energia e emissões, ausência de intensidade, coletas sem métricas e validação do período;
- `indicadores.controller.test.ts` (3 testes): encaminhamento do período ao service, validação de parâmetros ausentes/repetidos e encaminhamento de erros ao middleware.

Os testes usam dependências simuladas. Eles verificam as regras do service e o contrato do controller, mas **não executam a consulta SQL do repository em um PostgreSQL real**, não chamam as APIs externas e não validam a integração com o frontend. Para isso, siga o roteiro manual de indicadores em [`manualdevalidacao.md`](./manualdevalidacao.md).

## 5. Executar automaticamente ao alterar o código

~~~powershell
docker compose exec backend npm run test:watch
~~~

O Vitest acompanha as alterações e executa novamente os testes afetados. Pressione Ctrl+C para encerrar o acompanhamento; os containers continuam funcionando.

## 6. Se o Vitest não for encontrado

As dependências instaladas no computador e no container ficam em ambientes separados. Atualize as dependências dentro do container:

~~~powershell
docker compose exec backend npm install
docker compose exec backend npm test
~~~

Esse passo também pode ser necessário depois de receber alterações de dependências da equipe, pois o container utiliza um volume próprio para node_modules.

## 7. Verificar o TypeScript (opcional)

Além dos testes, é possível conferir os tipos do backend:

~~~powershell
docker compose exec backend npm run typecheck
~~~

Essa verificação é complementar aos testes unitários.

## 8. Encerrar o ambiente

Na pasta do compose.yaml, execute:

~~~powershell
docker compose down
~~~

O comando encerra e remove os containers, preservando os dados no volume do PostgreSQL.

## Alternativa: executar sem Docker

Com Node.js 24 ou superior instalado no computador, entre na pasta backend e execute:

~~~powershell
npm install
npm test
~~~

Para acompanhar alterações, use npm run test:watch. Os testes de descoberta não precisam da aplicação nem do banco em execução. Execute os comandos npm na pasta backend, onde está seu package.json.
