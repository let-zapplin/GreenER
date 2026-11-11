# Assistente GreenER com Ollama

Documento único do protótipo de chat com IA na Home autenticada do GreenER.

> **Pergunta direta: o Ollama fica dentro do container do backend?**
>
> **Não.** O Ollama roda em um **processo/container separado**, com volume próprio
> para os modelos. O backend continua sendo uma imagem Node enxuta e conversa com o
> Ollama por HTTP (`http://ollama:11434` no Compose ou `http://localhost:11434` em
> execução nativa). Neste ambiente, sem Docker, o Ollama roda dentro do **WSL2** e é
> acessado pelo backend pela porta `11434` (ver seção 10).

---

## 1. Objetivo do protótipo

Adicionar à Home autenticada um assistente de escopo limitado que responde perguntas
sobre os dados monitorados pelo GreenER, por exemplo:

- “Qual serviço gasta mais energia?”
- “Qual serviço emite mais CO₂?”
- “Como está o serviço X no período?”
- “Qual é o panorama ambiental das últimas 24 horas?”

A resposta combina:

1. **texto em português**;
2. **um gráfico** que comprova o fato (quando faz sentido);
3. **metadados** de período, dados parciais e modo de operação.

O Ollama foi escolhido por ser um LLM local, sem custo por requisição e sem envio de
dados para APIs de terceiros. O modelo é usado apenas para **entender a intenção** e
**redigir a resposta**. Os números e os gráficos vêm de código determinístico do backend.

---

## 2. Decisão de arquitetura: o modelo não acessa o banco

Este é o ponto mais importante do desenho:

> **O LLM não recebe acesso ao PostgreSQL, não gera SQL e não escolhe tabelas.**

Fluxo resumido:

```text
Pergunta do usuário
        │
        ▼
Backend classifica a intenção (Ollama ou regras)
        │
        ▼
Backend executa uma ferramenta permitida
(indicadores, dashboard ou histórico)
        │
        ▼
Backend monta um JSON compacto com os fatos
        │
        ▼
Ollama apenas reescreve a resposta em linguagem natural
        │
        ▼
Frontend renderiza texto + especificação do gráfico
```

Por que não deixar o modelo consultar o banco:

- **Precisão:** o modelo pode inventar serviços, números ou períodos.
- **Segurança:** texto livre poderia virar SQL indevido (SQL injection, leitura ampla).
- **Custo e latência:** várias idas ao banco por pergunta, com resultados imprevisíveis.
- **Auditabilidade:** ferramentas determinísticas são testáveis e reproduzíveis.
- **Escopo:** o assistente só consegue responder o que as ferramentas permitem.

As únicas operações expostas são **de leitura**. O assistente não cria, edita ou apaga
nada.

---

## 3. O que o assistente responde e o que não responde

### Intenções suportadas

| Intenção | Pergunta típica | Ferramenta usada | Gráfico |
| --- | --- | --- | --- |
| `RANKING_ENERGY` | “Qual serviço gasta mais energia?” | `IndicadoresService.getIndicators` | Barras, top 5 em kWh |
| `RANKING_EMISSIONS` | “Qual serviço emite mais CO₂?” | `IndicadoresService.getIndicators` | Barras, top 5 em gCO₂e |
| `SERVICE_SUMMARY` | “Como está o serviço X?” | `IndicadoresService.getIndicators` + `getServiceHistory` | Linha do consumo em kWh |
| `ENVIRONMENT_SUMMARY` | “Panorama ambiental do período” | `DashboardService.getSummary` | Barras de disponibilidade |
| `OUT_OF_SCOPE` | Qualquer outro assunto | Nenhuma | Nenhum |

### Fora do escopo (recusa determinística)

- previsão do tempo, notícias, receitas, programação;
- conselhos jurídicos, médicos ou financeiros;
- qualquer tentativa de alterar dados;
- pedidos para gerar SQL ou acessar o banco;
- perguntas que dependam de dados que o GreenER não coleta.

A recusa é sempre produzida por uma resposta fixa do backend, sem passar pela redação
do modelo:

> “Consigo responder apenas perguntas sobre os dados monitorados pelo GreenER, como
> consumo de energia, emissões, ranking entre serviços e disponibilidade. […]”

---

## 4. Arquitetura completa

```text
┌──────────────────────────────────────────────────────────────┐
│ Navegador — Home autenticada                                 │
│ <AssistantChat />                                            │
│  • seletor de período (1h, 6h, 24h, 7d)                      │
│  • histórico local da conversa                               │
│  • gráficos Recharts                                         │
└───────────────────────────┬──────────────────────────────────┘
                            │ POST /api/chat
                            │ Authorization: Bearer <JWT>
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend Express                                              │
│                                                              │
│ authMiddleware ──► ChatController ──► ChatService            │
│                                           │                  │
│                     ┌─────────────────────┼────────────────┐ │
│                     ▼                     ▼                │ │
│            IndicadoresService     DashboardService         │ │
│            (energia/emissões)     (disponibilidade)        │ │
│                     │                     │                │ │
│                     └──────────► PostgreSQL ◄──────────────┘ │
│                                                              │
│ ChatService ──► OllamaClient ──HTTP──► http://ollama:11434   │
│                                                              │
│ Resposta: answer + chart + period + partial + model + flags  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Container ollama (separado)                                  │
│ imagem: ollama/ollama                                        │
│ volume: ollama_data → /root/.ollama                          │
│ modelo: qwen2.5:3b (configurável)                            │
│ função: classificar intenção + redigir resposta              │
└──────────────────────────────────────────────────────────────┘
```

O backend **não depende** do Ollama para iniciar. Se o container estiver fora do ar, a
Home continua funcionando em **modo regras**, com textos determinísticos.

---

## 5. Componentes do backend

Todos os arquivos novos ficam em `backend/src/modules/chat/`.

| Arquivo | Responsabilidade |
| --- | --- |
| `chat.types.ts` | Tipos compartilhados (`ChatIntent`, `ChatReply`, `ChatChart`) e a interface `ChatLlm`. |
| `chat.period.ts` | Períodos permitidos, validação, cálculo de início/fim e frases em português. |
| `chat.prompt.ts` | Prompts do classificador e do redator, além do extrator de JSON. |
| `ollama.client.ts` | Cliente HTTP de `/api/chat` do Ollama, com timeout e fallback para `null`. |
| `chat.service.ts` | Orquestra classificação, ferramentas, gráficos, fallback e resposta final. |
| `chat.factory.ts` | Monta o `ChatService` com as dependências reais. |
| `chat.controller.ts` | Valida o corpo da requisição e devolve a resposta HTTP. |
| `chat.routes.ts` | Rota `POST /api/chat` protegida por JWT. |
| `chat.service.test.ts` | Testes unitários das intenções, gráficos e fallback. |
| `chat.http.test.ts` | Testes HTTP de autenticação, validação e resposta. |

Integrações alteradas:

- `backend/src/config/env.ts`: novas variáveis `OLLAMA_*`;
- `backend/src/app.ts`: monta `/api/chat` antes do middleware global de erro.

---

## 6. Fluxo de uma pergunta, passo a passo

Exemplo: **“Qual serviço gasta mais energia nas últimas 24 horas?”**

1. O frontend envia `POST /api/chat` com `{ message, period: "24h" }` e o JWT.
2. `authMiddleware` valida o token. Sem token válido, a resposta é `401`.
3. `ChatController` confere o corpo e repassa a pergunta ao `ChatService`.
4. O service valida a mensagem (não vazia, até 500 caracteres) e o período.
5. O service calcula `start` e `end` a partir do relógio do servidor.
6. `IndicadoresService.getIndicators` consulta o PostgreSQL uma vez e devolve os totais
   por serviço no período.
7. O service envia ao Ollama a pergunta e **somente os nomes dos serviços ativos** para
   classificação. O modelo responde um JSON com `intent` e `serviceName`.
8. Se o Ollama estiver desligado, der timeout ou devolver algo inválido, entra a
   classificação por regras (palavras-chave).
9. Para `RANKING_ENERGY`, o backend filtra serviços ativos, descarta valores zerados,
   ordena decrescente, pega o top 5 e monta a especificação do gráfico de barras.
10. O backend monta um contexto compacto com ranking, totais e sinalização de dados
    parciais.
11. O Ollama recebe esse contexto e reescreve a resposta em até 3 frases, preservando
    os números. Se falhar, o texto determinístico é usado.
12. O backend responde JSON com texto, gráfico, período, `partial`, `model` e
    `degraded`.
13. O frontend adiciona a mensagem ao histórico e renderiza o gráfico Recharts.

Observação: a consulta de indicadores acontece **uma vez por pergunta**. Para resumo de
serviço, há uma segunda consulta ao histórico; para panorama ambiental, a consulta de
disponibilidade do dashboard.

---

## 7. Contrato da API

### Requisição

```http
POST /api/chat
Authorization: Bearer <JWT>
Content-Type: application/json
```

```json
{
  "message": "Qual serviço gasta mais energia?",
  "period": "24h"
}
```

- `message`: string obrigatória, não vazia, até **500 caracteres**.
- `period`: opcional; um de `1h`, `6h`, `24h`, `7d`. Padrão: `24h`.

### Resposta de sucesso (`200`)

```json
{
  "message": "Resposta do assistente",
  "answer": "Nas últimas 24 horas, o serviço que consumiu mais energia foi API Gateway, com 0,8421 kWh. Em seguida aparecem Workers (0,512 kWh).",
  "intent": "RANKING_ENERGY",
  "period": {
    "start": "2026-11-09T12:00:00.000Z",
    "end": "2026-11-10T12:00:00.000Z",
    "label": "24h"
  },
  "chart": {
    "type": "bar",
    "title": "Consumo de energia por serviço",
    "unit": "kWh",
    "data": [
      { "label": "API Gateway", "value": 0.8421 },
      { "label": "Workers", "value": 0.512 }
    ]
  },
  "partial": false,
  "disclaimer": "Valores estimados pelo modelo de potência v1 do GreenER; períodos com lacunas podem estar incompletos.",
  "model": "qwen2.5:3b",
  "degraded": false
}
```

Valores acima são **ilustrativos**.

### Campos de resposta

| Campo | Significado |
| --- | --- |
| `answer` | Texto final exibido ao usuário. |
| `intent` | Intenção classificada. |
| `period` | Janela usada no cálculo. |
| `chart` | Especificação declarativa do gráfico, ou `null`. |
| `partial` | `true` quando faltam coletas, métricas ou intensidade de carbono. |
| `disclaimer` | Aviso de que os valores são estimativas. |
| `model` | Modelo que redigiu a resposta ou `"regras"`. |
| `degraded` | `true` quando o texto final não veio do modelo (regras, falha ou recusa). |

### Erros

| Status | Código | Situação |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | Token ausente, inválido ou expirado. |
| `400` | `INVALID_CHAT_REQUEST` | Corpo que não é um objeto JSON. |
| `400` | `INVALID_CHAT_MESSAGE` | Mensagem ausente, vazia, não textual ou acima de 500 caracteres. |
| `400` | `INVALID_CHAT_PERIOD` | Período fora de `1h`, `6h`, `24h`, `7d`. |
| `500` | `INTERNAL_ERROR` | Falha inesperada; detalhes não são expostos. |

### Exemplo com `curl`

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@exemplo.com","password":"sua-senha"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")

curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Qual serviço gasta mais energia?","period":"24h"}'
```

---

## 8. Regras de dados e gráficos

### Fonte dos números

- **Rankings:** `IndicadoresService.getIndicators`, que já aplica o modelo de potência
  v1, o intervalo de coleta e a intensidade de carbono.
- **Panorama:** `DashboardService.getSummary`, que agrega apenas serviços ativos e
  classifica disponibilidade.
- **Histórico:** `IndicadoresService.getServiceHistory`, que devolve amostras calculadas
  e lacunas (`gapReason`).

### Regras aplicadas pelo assistente

- Apenas serviços com status `active` entram em rankings e no panorama.
- Valores iguais a zero são omitidos do ranking.
- O ranking mostra no máximo **5 serviços**.
- Os números são arredondados para até **6 casas decimais** na resposta estruturada e
  formatados com até **4 casas** no texto.
- O histórico é reduzido para no máximo **60 pontos** no gráfico do chat; uma amostra
  sem energia é preservada por bloco para representar a interrupção.
- `partial` reflete a sinalização já calculada pelos services existentes.
- Nenhum valor é recalculado com uma regra diferente da usada no resto do GreenER.

### Tipos de gráfico

| Origem | Tipo | Eixo X | Eixo Y |
| --- | --- | --- | --- |
| Ranking de energia/emissões | Barras | Nome do serviço | kWh ou gCO₂e |
| Histórico de um serviço | Linha | Horário (ou data, em 7d) | kWh |
| Panorama ambiental | Barras | Disponibilidade | Quantidade de serviços |

O backend envia apenas **dados + metadados**. O frontend escolhe o componente Recharts
com base em `chart.type`. O modelo **não gera código de gráfico**.

---

## 9. Ollama: configuração e operação

### Variáveis de ambiente

| Variável | Padrão do código | No Compose | Uso |
| --- | --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434` | `http://ollama:11434` | Endereço da API do Ollama. |
| `OLLAMA_MODEL` | `qwen2.5:3b` | `${OLLAMA_MODEL:-qwen2.5:3b}` | Modelo usado para classificar e redigir. |
| `OLLAMA_TIMEOUT_MS` | `60000` | `${OLLAMA_TIMEOUT_MS:-60000}` | Timeout de cada chamada ao Ollama. |
| `OLLAMA_ENABLED` | `true` | `${OLLAMA_ENABLED:-true}` | `false` força o modo regras. |

`OLLAMA_TIMEOUT_MS` é validado como inteiro positivo. `OLLAMA_ENABLED` aceita
`true/false`, `1/0`, `yes/no`, `on/off`.

### Serviços no Docker Compose

```yaml
ollama:
  image: ollama/ollama:latest
  ports: ["11434:11434"]
  volumes: [ollama_data:/root/.ollama]
  environment:
    OLLAMA_KEEP_ALIVE: 30m
    OLLAMA_NUM_PARALLEL: "1"

ollama-init:
  image: ollama/ollama:latest
  depends_on:
    ollama: { condition: service_healthy }
  environment:
    OLLAMA_HOST: http://ollama:11434
  entrypoint: ["/bin/sh", "-c"]
  command: ["ollama pull ${OLLAMA_MODEL:-qwen2.5:3b}"]
  restart: "no"
```

- `ollama`: servidor HTTP e volume persistente dos modelos.
- `ollama-init`: executa `ollama pull` uma vez e encerra. Se o modelo já estiver no
  volume, a operação termina rapidamente.
- `backend`: recebe `OLLAMA_URL=http://ollama:11434`.
- O volume `ollama_data` evita baixar o modelo a cada `docker compose up`.

O backend **não usa `depends_on: ollama`**. Assim ele sempre sobe, e o assistente cai
no modo regras enquanto o Ollama/modelo não estiverem prontos.

### Modelos sugeridos

| Modelo | Tamanho aproximado | Observação |
| --- | --- | --- |
| `qwen2.5:3b` | ~2 GB | Padrão; bom equilíbrio entre qualidade e RAM em português. |
| `llama3.2:3b` | ~2 GB | Alternativa comum para classificação e texto curto. |
| `gemma3:4b` | ~3 GB | Mais qualidade, exige mais RAM/CPU. |

Para trocar:

```bash
OLLAMA_MODEL=llama3.2:3b docker compose up -d
```

O `ollama-init` baixa o novo modelo e o backend passa a usá-lo na próxima requisição.

### Desempenho

- A inferência roda em **CPU por padrão**.
- A primeira resposta após carregar o modelo é mais lenta; `keep_alive: 30m` mantém o
  modelo na memória entre perguntas.
- `OLLAMA_NUM_PARALLEL=1` evita disputa de RAM/CPU em máquinas modestas.
- O backend aplica timeout de 60 s por chamada; o frontend espera até 75 s.
- Para GPU NVIDIA, é possível adicionar `deploy.resources.reservations.devices` ao
  serviço `ollama`. Isso **não** está configurado no protótipo.

---

## 10. Como executar

> **Neste ambiente não há Docker e ele não será instalado.** O protótipo foi validado
> com **WSL2 + processos nativos**: PostgreSQL 18 no Windows, Ollama dentro do WSL e
> backend/frontend rodando com Node 24. O `compose.yaml` continua no repositório como
> alternativa, mas os passos abaixo são os que foram executados e verificados.

### Sem Docker: WSL2 + processos nativos

Pré-requisitos: Node 24, PostgreSQL 18 instalado e uma distro Ubuntu no WSL2. Nenhum
passo exige `sudo` (o Ollama é instalado em user space).

As credenciais de banco e o `JWT_SECRET` continuam vindo do `.env` na raiz do
repositório. Os comandos abaixo acontecem na raiz, exceto quando indicado.

#### 1. PostgreSQL isolado na porta 5433

O PostgreSQL do Windows na porta 5432 pode ter credenciais desconhecidas. Por isso o
protótipo usa um cluster separado, que contém apenas as tabelas do GreenER e não
interfere em outros bancos.

```bash
PGDATA="$LOCALAPPDATA/GreenER/pgdata"
PGBIN="/c/Program Files/PostgreSQL/18/bin"

# uma única vez: cria o cluster (senha igual à do .env)
"$PGBIN/initdb.exe" -D "$PGDATA" -U greener -E UTF8 \
  --auth-host=scram-sha-256 --pwfile=/tmp/pgpass.tmp
rm -f /tmp/pgpass.tmp

# iniciar (repetir a cada reinício da máquina)
"$PGBIN/pg_ctl.exe" -D "$PGDATA" \
  -l "$LOCALAPPDATA/GreenER/postgres.log" \
  -o "-p 5433 -c listen_addresses=127.0.0.1" start

# uma única vez: banco + schema
"$PGBIN/createdb.exe" -h 127.0.0.1 -p 5433 -U greener greener
PGPASSWORD="$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)" \
  "$PGBIN/psql.exe" -h 127.0.0.1 -p 5433 -U greener -d greener \
  -f database/schema.sql
```

Parar o cluster:

```bash
"$PGBIN/pg_ctl.exe" -D "$PGDATA" stop
```

Verificar se está aceitando conexões:

```bash
"$PGBIN/pg_isready.exe" -h 127.0.0.1 -p 5433
```

#### 2. Ollama dentro do WSL

Instalação em user space, sem `sudo`:

```bash
wsl.exe -e bash -lc '
VERSION=v0.40.16
curl -fL "https://github.com/ollama/ollama/releases/download/$VERSION/ollama-linux-amd64.tar.zst" -o /tmp/ollama.tar.zst
mkdir -p ~/.local/ollama
zstd -d -c /tmp/ollama.tar.zst | tar -x -C ~/.local/ollama
'
```

Se `zstd` não existir e não houver `sudo`, baixe o `.deb` do pacote (`apt-get download
zstd`), extraia com `dpkg-deb -x` e use o binário extraído para descompactar.

Subir o servidor em segundo plano, escutando em todas as interfaces para que o
Windows alcance `localhost:11434`:

```bash
wsl.exe -e bash -lc '
setsid nohup env OLLAMA_HOST=0.0.0.0:11434 \
  OLLAMA_MODELS="$HOME/.ollama/models" \
  LD_LIBRARY_PATH="$HOME/.local/ollama/lib/ollama" \
  "$HOME/.local/ollama/bin/ollama" serve \
  >"$HOME/.ollama/serve.log" 2>&1 </dev/null &
'
```

Baixar o modelo (uma única vez) e conferir:

```bash
wsl.exe -e bash -lc '~/.local/ollama/bin/ollama pull qwen2.5:3b'
curl http://localhost:11434/api/version
```

O log do servidor fica em `/home/<usuario>/.ollama/serve.log` dentro do WSL.

#### 3. Backend na porta 3001

A porta 3000 pode estar ocupada por outro projeto; nesta validação o GreenER usa 3001.
Host e porta do banco são sobrescritos por variável de ambiente, sem editar o `.env`.

```bash
cd backend
npm install
PORT=3001 \
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5433 \
OLLAMA_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5:3b \
OLLAMA_TIMEOUT_MS=120000 OLLAMA_ENABLED=true \
npm run dev
```

- Os jobs de descoberta, coleta e intensidades rodam sozinhos. O primeiro ciclo de
  descoberta cadastra os 8 serviços; o ciclo seguinte (≈60 s) grava as métricas.
- Se o Ollama estiver desligado, o assistente continua respondendo em modo regras.

#### 4. Frontend apontando para 3001

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:3001 npm run dev -- --port 5173
```

Abrir `http://localhost:5173`, autenticar e usar o painel **Pergunte aos seus dados**.
O `VITE_API_URL` do shell vence o valor do `.env` do frontend.

#### 5. Teste rápido do endpoint

O exemplo com `curl` da seção 7.4 serve como verificação direta. O login fica em
`POST /auth/login` (sem o prefixo `/api`) e devolve o token usado no cabeçalho
`Authorization`.

### Com Docker (alternativa não usada aqui)

Na raiz:

```bash
docker compose up --build
```

O `ollama-init` baixa `qwen2.5:3b` no primeiro uso. A Home fica em
`http://localhost:5173/home`, o backend em `http://localhost:3000` e o Ollama em
`http://localhost:11434`.

### Sem Ollama (modo regras)

```env
OLLAMA_ENABLED=false
```

Nesse modo, classificação e texto usam apenas as regras determinísticas. Nenhuma
requisição sai para o Ollama, e a resposta traz `model: "regras"` e `degraded: true`.

---

## 11. Comportamento no frontend

O painel `AssistantChat` aparece na Home autenticada, entre o hero e os cartões de
análise.

Recursos:

- seletor de período com quatro opções;
- sugestões de perguntas quando a conversa está vazia;
- histórico local (não persiste ao recarregar a página);
- indicador de carregamento;
- gráfico de barras ou linhas conforme a resposta;
- badges de **dados parciais** e **modo regras**;
- aviso de estimativa em cada resposta;
- botão para limpar a conversa;
- `aria-live` no histórico e rótulos acessíveis;
- em `401`, o usuário é deslogado;
- em timeout ou falha de rede, uma mensagem amigável é adicionada ao histórico.

O frontend não faz cálculos: ele apenas exibe o texto e a especificação de gráfico
recebidas.

---

## 12. Segurança e limitações de escopo

### Controles implementados

- **JWT obrigatório** em `POST /api/chat`.
- **Sem acesso do modelo ao banco**: apenas o backend consulta o PostgreSQL.
- **Ferramentas allowlisted**: só existem as cinco intenções implementadas.
- **Somente leitura**: nenhuma operação de escrita é exposta.
- **Validação de entrada**: mensagem não vazia, até 500 caracteres; período em lista
  fechada.
- **Sem geração de SQL ou código** pelo modelo.
- **Gráfico declarativo**: o modelo não envia HTML, JavaScript ou código Recharts.
- **Prompt injection**: o texto do usuário e o contexto são enviados como dados
  (JSON string), e os prompts instruem o modelo a não executar instruções do conteúdo.
  A recusa de fora de escopo é determinística.
- **Dados compactos**: o modelo recebe apenas o necessário (top 5, totais, flags), não
  o banco inteiro.
- **Timeout e fallback**: falhas do Ollama não derrubam a Home.
- **Erros internos**: o middleware global devolve mensagem genérica, sem stack trace.

### Limitações do protótipo

- A conversa **não tem memória**: cada pergunta é independente.
- A classificação por regras é baseada em palavras-chave e pode errar sinônimos.
- O modelo ainda pode parafrasear de forma imprecisa; os números e gráficos, porém,
  vêm do backend.
- Não há streaming token a token (`stream: false`).
- Não há cache de respostas do modelo.
- Não há rate limiting nem fila por usuário.
- Não há GPU configurada por padrão.
- Não há avaliação automatizada de qualidade das respostas do LLM.
- O histórico local do chat não é salvo no banco.
- O teste automatizado cobre backend e contrato HTTP; **não** há teste end-to-end com
  o Ollama real nem teste automatizado da interface.

---

## 13. Fallback determinístico

O assistente tenta o Ollama primeiro, mas sempre tem um caminho sem IA:

| Situação | Classificação | Texto | `degraded` | `model` |
| --- | --- | --- | --- | --- |
| Ollama disponível e responde | Modelo | Modelo | `false` | Nome do modelo |
| Ollama classifica, mas falha ao redigir | Modelo | Regras | `true` | `"regras"` |
| Ollama indisponível/desligado | Regras | Regras | `true` | `"regras"` |
| Fora do escopo | Modelo ou regras | Recusa fixa | `true` | `"regras"` |

Regras de classificação resumidas:

- emissões + palavras de ranking → `RANKING_EMISSIONS`;
- energia/consumo + palavras de ranking → `RANKING_ENERGY`;
- nome de serviço citado → `SERVICE_SUMMARY`;
- ambiente/panorama/disponibilidade → `ENVIRONMENT_SUMMARY`;
- serviço/histórico/evolução sem nome → `SERVICE_SUMMARY`;
- resto → `OUT_OF_SCOPE`.

---

## 14. Testes

### Executar

```bash
cd backend
npm test
```

### Cobertura adicionada

`chat.service.test.ts` (8 testes):

- ranking de energia ordenado, ignorando serviços removidos;
- uso de classificação e resposta do Ollama;
- resumo de serviço com histórico e gráfico de linha, preservando lacunas;
- panorama ambiental via dashboard;
- recusa de fora do escopo sem chamar ferramentas de dados;
- ranking sem dados;
- nome de serviço inexistente com lista de disponíveis;
- mensagem vazia, mensagem longa e período inválido.

`chat.http.test.ts` (6 testes):

- `401` sem token;
- `401` com token inválido;
- `400` para mensagem vazia;
- `400` para mensagem não textual;
- `400` para período inválido;
- `200` com resposta determinística quando não há dados.

Na implementação, os 14 testes do módulo de chat passaram. PostgreSQL e Ollama são
substituídos por mocks nesses testes.

---

## 15. Mapa de arquivos alterados

```text
backend/
├── src/app.ts                                  (monta /api/chat)
├── src/config/env.ts                           (variáveis OLLAMA_*)
└── src/modules/chat/
    ├── chat.types.ts
    ├── chat.period.ts
    ├── chat.prompt.ts
    ├── ollama.client.ts
    ├── chat.service.ts
    ├── chat.factory.ts
    ├── chat.controller.ts
    ├── chat.routes.ts
    ├── chat.service.test.ts
    └── chat.http.test.ts

frontend/
├── src/components/AssistantChat.tsx
├── src/components/AssistantChat.css
├── src/pages/Home.tsx                          (renderiza o painel)
├── src/pages/Home.css                          (remove texto de debug)
├── src/services/chatApi.ts
└── src/types/chat.ts

compose.yaml                                    (ollama + ollama-init + volume)
.env.example                                    (OLLAMA_URL, OLLAMA_MODEL, ...)
docs/assistente-ia.md                           (este documento)
```

---

## 16. Perguntas frequentes

**O Ollama vai dentro da imagem do backend?**
Não. É um serviço separado no Compose. Isso evita carregar gigabytes de modelo na
imagem Node, permite usar GPU/RAM de forma independente e mantém o backend stateless.

**O assistente funciona sem internet?**
Sim, depois que a imagem e o modelo forem baixados. A inferência é local.

**O modelo vê os dados brutos do banco?**
Não. Ele recebe apenas um JSON compacto com os fatos já calculados.

**O modelo pode criar ou apagar dados?**
Não. O assistente só executa ferramentas de leitura.

**Por que não usar text-to-SQL?**
Porque aumenta o risco de consultas indevidas, resultados imprevisíveis e respostas
alucinadas. As ferramentas allowlisted cobrem o escopo do protótipo com segurança.

**Por que manter regras se existe LLM?**
Para garantir disponibilidade, previsibilidade, testes rápidos e degradação graciosa.

**O texto pode variar entre execuções?**
Sim. A redação pode variar, mas os fatos, números, período e gráfico vêm do backend e
permanecem os mesmos para a mesma consulta.

**Qual o próximo passo natural?**
Memória de conversa, streaming, cache de respostas, rate limiting por usuário, mais
intenções (comparação entre períodos, regiões e serviços) e uma suíte de avaliação das
respostas do modelo.
