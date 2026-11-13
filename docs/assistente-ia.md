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
- “O que é o GreenER e como a energia é calculada?”

A resposta combina:

1. **texto em português**;
2. **um gráfico** que comprova o fato (quando faz sentido);
3. **metadados** de período, dados parciais e modo de operação.

O Ollama foi escolhido por ser um LLM local, sem custo por requisição e sem envio de
dados para APIs de terceiros. O modelo é usado apenas para **desambiguar a intenção** e
**redigir respostas de conhecimento**. Os números e os gráficos vêm de código
determinístico do backend.

O assistente aplica **regras primeiro**: quando as palavras-chave já identificam a
pergunta com segurança, o modelo nem é chamado. Consultas de dados (rankings, resumo de
serviço e panorama) são respondidas por texto determinístico; o LLM só entra quando as
regras não conseguem decidir a intenção.

Desde a **fase 1**, o assistente mantém memória de curto prazo por conversa, usa o
contexto da página, resolve referências como “ele” e “esse serviço”, pede clarificação
quando o nome é ambíguo e sugere próximos passos ao final de cada resposta.

A **base de conhecimento** acrescenta respostas didáticas sobre o próprio GreenER e
sobre a metodologia de cálculo. Ela usa seções curadas do README e de
`docs/calculos.md`, não o repositório inteiro, e não cita arquivos nem fontes na
resposta.

---

## 2. Decisão de arquitetura: o modelo não acessa o banco

Este é o ponto mais importante do desenho:

> **O LLM não recebe acesso ao PostgreSQL, não gera SQL e não escolhe tabelas.**

Fluxo resumido:

```text
Pergunta do usuário
        │
        ▼
Cache de respostas / single-flight (perguntas autocontidas)
        │
        ▼
Backend classifica por regras; só consulta o Ollama se as regras não decidirem
        │
        ▼
Backend executa uma ferramenta permitida
(indicadores, dashboard ou histórico)
        │
        ▼
Dados: texto determinístico + gráfico, sem reescrita pelo modelo
Conhecimento: base curada; o Ollama apenas reescreve
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
| `PROJECT_INFO` | “O que é o GreenER?”, “Quem fez o projeto?” | Base curada em `chat.knowledge.ts` | Nenhum |
| `METHODOLOGY` | “Como a energia é calculada?”, “Quais são as limitações?” | Base curada em `chat.knowledge.ts` | Nenhum |
| `OUT_OF_SCOPE` | Qualquer outro assunto | Nenhuma | Nenhum |

### Clarificação e continuidade

- Se o trecho citado casa com mais de um serviço (por exemplo, “Solar” para “Solar
  Norte” e “Solar Sul”), o backend devolve `clarification` com opções clicáveis em vez
  de escolher por conta própria.
- A escolha pode ser feita pelo nome, pelo número (“serviço 2”) ou pela posição
  (“o segundo”), usando a clarificação pendente da conversa.
- Perguntas de continuidade (“e as emissões dele?”, “e o histórico?”) reaproveitam o
  último serviço ativo da mesma conversa.
- O contexto da página pode indicar um serviço quando a pergunta não cita o nome.
- Cada resposta inclui até 3 `suggestions` com pergunta, rótulo e período.

### Conhecimento do projeto e cálculos

Perguntas sobre o próprio GreenER e sobre a metodologia não consultam o banco: elas
usam uma **base curada** em `chat.knowledge.ts`, derivada do README e de
`docs/calculos.md`.

- **Seções fixas:** potência, energia, intensidade de carbono, emissões, visão geral da
  metodologia, premissas/limitações, visão geral do projeto, equipe, funcionalidades e
  arquitetura. Cada seção tem `id`, `intent`, `title`, `reference`, `summary`,
  `content` e `keywords`.
- **Recuperação lexical, não vetorial:** a mensagem e as palavras-chave passam por
  normalização (acentos, subscritos como `CO₂`, pontuação) e são pontuadas por frases e
  tokens. A seção com maior pontuação vence se atingir o limiar 4.
- **Dica de continuação:** a pergunta anterior da conversa entra com peso 0,3, apenas
  quando a mensagem atual já tem alguma evidência (pontuação ≥ 2). Isso resolve “E a
  energia?” sem deixar o histórico dominar o assunto.
- **Fallback determinístico:** sem pontuação suficiente, o backend usa a primeira seção
  da intenção classificada; a resposta nunca fica vazia.
- **Números sempre atuais:** `IndicadoresService.getIndicators` fornece o modelo de
  potência vigente, e o texto da seção recebe os coeficientes e a versão por
  placeholders. Assim a explicação didática não duplica valores que possam divergir do
  restante do GreenER.
- **Perguntas de dados têm precedência:** se a mensagem cita serviço, ranking, ambiente
  ou emissões, a intenção de dados vence, a menos que exista uma pista forte de
  explicação (“como é calculado”, “metodologia”, “o que é o GreenER”). “Qual serviço
  emite mais CO₂?” continua sendo ranking, não explicação.
- **Sem citação de fonte:** o texto final não menciona arquivos, caminhos ou referências
  da documentação. O Ollama pode reescrever a seção em até 4 frases, preservando
  fórmulas e coeficientes; em modo regras, o resumo curado é devolvido literalmente.

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
│  • conversationId, contexto da página e últimas 6 mensagens  │
│  • gráficos Recharts, clarificação e sugestões clicáveis     │
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
│ ChatService ──► InMemoryChatStateStore (TTL 30 min)          │
│       │                                                      │
│       ├───► cache de respostas + single-flight (em memória)  │
│       ├───► cache de indicadores por período (TTL 15 s)      │
│       ├───► cache de classificação (TTL 30 min)              │
│       │                                                      │
│       ├───────► chat.knowledge.ts (base curada + retrieval)  │
│       │                                                      │
│       └───────► OllamaClient ──HTTP──► http://ollama:11434   │
│                                                              │
│ Resposta: answer + chart + clarification + suggestions +     │
│           conversationId + period + partial + model + flags  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ Container ollama (separado)                                  │
│ imagem: ollama/ollama                                        │
│ volume: ollama_data → /root/.ollama                          │
│ modelo: qwen2.5:3b (configurável)                            │
│ função: desambiguar intenção + redigir conhecimento          │
└──────────────────────────────────────────────────────────────┘
```

O backend **não depende** do Ollama para iniciar. Se o container estiver fora do ar, a
Home continua funcionando em **modo regras**, com textos determinísticos. Ao subir, o
backend dispara um `warmup()` em segundo plano para carregar o modelo antes da primeira
pergunta.

---

## 5. Componentes do backend

Todos os arquivos novos ficam em `backend/src/modules/chat/`.

| Arquivo | Responsabilidade |
| --- | --- |
| `chat.types.ts` | Contrato completo: `ChatIntent`, `ChatReply`, `ChatContext`, `ChatHistoryMessage`, `ChatClarification`, `ChatSuggestion` e `ChatLlm`. |
| `chat.state.ts` | Memória em processo por `conversationId`, com TTL de 30 min e limite de 500 conversas. |
| `chat.cache.ts` | Cache TTL/LRU genérico e `SingleFlight` para juntar execuções simultâneas iguais. |
| `chat.period.ts` | Períodos permitidos, validação, cálculo de início/fim e frases em português. |
| `chat.prompt.ts` | Prompts do classificador e do redator, além do extrator de JSON. |
| `chat.knowledge.ts` | Base curada do README e de `docs/calculos.md`, normalização, recuperação lexical, classificação por pistas e renderização com os valores atuais do modelo de potência. |
| `ollama.client.ts` | Cliente HTTP de `/api/chat` do Ollama, com histórico, `num_ctx`, timeout, fallback para `null` e `warmup()`. |
| `chat.service.ts` | Orquestra validação, contexto, resolução de serviço, clarificação, classificação regras-primeiro, caches, ferramentas, conhecimento, gráficos, sugestões, estado e resposta final. |
| `chat.factory.ts` | Monta o `ChatService` com as dependências reais e o estado compartilhado. |
| `chat.controller.ts` | Lê `message`, `period`, `conversationId`, `context` e `history` do corpo. |
| `chat.routes.ts` | Rota `POST /api/chat` protegida por JWT. |
| `chat.knowledge.test.ts` | Recuperação das seções, dica de continuação, guarda de perguntas de dados, fallback e substituição de placeholders. |
| `chat.cache.test.ts` | Expiração, descarte LRU e reutilização de execuções simultâneas. |
| `chat.service.test.ts` | Testes unitários das intenções, gráficos, fallback, regras-primeiro e caches. |
| `chat.conversation.test.ts` | Memória, contexto, clarificação, histórico, período, conhecimento e avaliação determinística. |
| `chat.http.test.ts` | Testes HTTP de autenticação, validação e resposta. |

Integrações alteradas:

- `backend/src/config/env.ts`: variáveis `OLLAMA_*`, incluindo `OLLAMA_NUM_CTX`;
- `backend/src/server.ts`: `warmup()` do modelo em segundo plano após o `listen`;
- `backend/src/app.ts`: monta `/api/chat` antes do middleware global de erro;
- `backend/vitest.config.ts` e `backend/vitest.setup.ts`: variáveis fictícias para os
  testes HTTP carregarem o app sem depender do `.env` real.

---

## 6. Fluxo de uma pergunta, passo a passo

Exemplo: **“Qual serviço gasta mais energia nas últimas 24 horas?”**

1. O frontend envia `POST /api/chat` com `{ message, period, conversationId,
   context, history }` e o JWT.
2. `authMiddleware` valida o token. Sem token válido, a resposta é `401`.
3. `ChatController` repassa os campos ao `ChatService`.
4. O service valida mensagem (não vazia, até 500 caracteres), período,
   `conversationId`, contexto e histórico (até 12 mensagens de até 500 caracteres).
5. O service gera um `conversationId` (UUID) quando não recebe um e recupera o estado
   daquela conversa no `InMemoryChatStateStore`.
6. O período citado na própria pergunta (“últimas 6 horas”, “última semana”) tem
   precedência sobre o seletor da interface.
7. O service monta a chave do cache de respostas (mensagem normalizada, período,
   serviço de contexto e hash do histórico). Perguntas autocontidas podem ser
   respondidas direto do cache; chamadas simultâneas iguais são unificadas pelo
   `SingleFlight`.
8. `IndicadoresService.getIndicators` é consultado via **cache de indicadores** (TTL de
   15 s por período). A consulta ao PostgreSQL só acontece quando o cache expira, o que
   reaproveita os mesmos totais entre perguntas diferentes do mesmo período.
9. O service resolve o serviço citado, considerando nesta ordem: clarificação pendente,
   nome/ID na mensagem, `context.serviceName`, serviço ativo da conversa e, por fim,
   o serviço único disponível. Empates viram clarificação.
10. A classificação por regras roda primeiro. Se ela identificar a intenção com
    segurança, **o Ollama não é chamado**. Casos ambíguos (por exemplo, “Qual está
    pior?” ou “serviço” sem nome) vão ao classificador, que recebe apenas os nomes dos
    serviços ativos e o histórico recente; resultados válidos ficam em cache por 30 min.
11. As regras corrigem excessos do modelo: nome ambíguo nunca é escolhido pelo LLM,
    nome de serviço sozinho vira resumo e “ranking” explícito não vira resumo.
12. Para `RANKING_ENERGY`/`RANKING_EMISSIONS`, o backend filtra serviços ativos,
    descarta valores zerados, ordena pelo sentido pedido (“mais”/“maior” → decrescente,
    “menos”/“menor” → crescente), pega o top 5 e monta o gráfico.
13. Intenções de dados recebem a **resposta determinística** montada pelo backend
    (texto + gráfico), sem reescrita pelo modelo. O campo `model` fica `"regras"` e
    `degraded` é `false` quando o LLM está ligado e a classificação foi concluída.
14. Intenções de conhecimento montam o resumo curado; com o Ollama ligado, o modelo
    reescreve apenas essa seção. Clarificações e recusas de fora do escopo **não passam
    pelo modelo**.
15. O service gera até 3 sugestões determinísticas, salva o estado da conversa, grava a
    resposta no cache (60 s para dados, 30 min para conhecimento, 30 s quando degradada)
    e responde com texto, gráfico, clarificação, sugestões, período, `partial`, `model`
    e `degraded`.
16. O frontend adiciona a mensagem ao histórico, envia as últimas 6 mensagens na
    próxima pergunta e renderiza gráfico, opções de clarificação e sugestões.

Observação: a consulta de indicadores é reaproveitada pelo cache de 15 s. Para resumo
de serviço, há uma segunda consulta ao histórico; para panorama ambiental, a consulta
de disponibilidade do dashboard. Perguntas que dependem de contexto (continuações,
clarificação pendente) não entram no cache de respostas.

**Caminho de conhecimento (`PROJECT_INFO` / `METHODOLOGY`):** os passos 7–14 são
substituídos. O backend recupera a seção curada em `chat.knowledge.ts` (usando a
mensagem e, como dica, a pergunta anterior), injeta os valores atuais do modelo de
potência obtidos de `getIndicators` e envia apenas essa seção ao Ollama para reescrita,
sem citar arquivos ou referências. Sem Ollama, o resumo curado é a resposta final. Não
há gráfico, e o serviço ativo da conversa é preservado para a próxima pergunta.

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
  "message": "E as emissões dele?",
  "period": "24h",
  "conversationId": "8f14e45f-ceea-4a67-9f0b-7d2c1a4e5b10",
  "context": {
    "page": "/home",
    "serviceName": null
  },
  "history": [
    { "role": "user", "content": "Como está o serviço API Gateway?" },
    { "role": "assistant", "content": "Nas últimas 24 horas, o serviço API Gateway..." }
  ]
}
```

- `message`: string obrigatória, não vazia, até **500 caracteres**.
- `period`: opcional; um de `1h`, `6h`, `24h`, `7d`. Padrão: `24h`. Períodos citados
  na mensagem (`últimas 6 horas`, `última semana`) prevalecem sobre este campo.
- `conversationId`: opcional; até 64 caracteres alfanuméricos, `_` ou `-`. Se ausente,
  o backend gera um UUID e o devolve na resposta.
- `context`: opcional; `page` (até 200 caracteres) e `serviceName` (até 120). Serve para
  desambiguar perguntas que não citam o serviço.
- `history`: opcional; lista de até **12** mensagens com `role` (`user`/`assistant`) e
  `content` não vazio de até 500 caracteres. Serve apenas para continuidade; o modelo
  não trata o histórico como fonte de fatos.

### Resposta de sucesso (`200`)

```json
{
  "message": "Resposta do assistente",
  "conversationId": "8f14e45f-ceea-4a67-9f0b-7d2c1a4e5b10",
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
  "clarification": null,
  "suggestions": [
    {
      "label": "Ver emissões",
      "message": "Qual serviço emite mais CO₂ no mesmo período?",
      "period": "24h"
    },
    {
      "label": "Detalhar API Gateway",
      "message": "Como está o serviço API Gateway?",
      "period": "24h"
    }
  ],
  "partial": false,
  "disclaimer": "Valores estimados pelo modelo de potência v1 do GreenER; períodos com lacunas podem estar incompletos.",
  "model": "regras",
  "degraded": false
}
```

Valores acima são **ilustrativos**.

Quando há ambiguidade, `clarification` vem preenchido e `answer` contém a pergunta:

```json
{
  "clarification": {
    "question": "Encontrei mais de um serviço com esse nome. Qual deles você quer consultar?",
    "options": [
      {
        "label": "Solar Norte",
        "message": "Como está o serviço Solar Norte?",
        "serviceName": "Solar Norte"
      },
      {
        "label": "Solar Sul",
        "message": "Como está o serviço Solar Sul?",
        "serviceName": "Solar Sul"
      }
    ]
  }
}
```

Perguntas de conhecimento não trazem gráfico:

```json
{
  "answer": "O consumo de energia é estimado a partir da potência de cada componente e do tempo de uso registrado nas coletas. […]",
  "intent": "METHODOLOGY",
  "chart": null,
  "clarification": null,
  "partial": false,
  "model": "qwen2.5:3b",
  "degraded": false
}
```

### Campos de resposta

| Campo | Significado |
| --- | --- |
| `conversationId` | Identificador usado para retomar a memória da conversa. |
| `answer` | Texto final exibido ao usuário. |
| `intent` | Intenção classificada. |
| `period` | Janela usada no cálculo. |
| `chart` | Especificação declarativa do gráfico, ou `null`. |
| `clarification` | Pergunta de desambiguação com até 5 opções, ou `null`. |
| `suggestions` | Até 3 próximos passos determinísticos (`label`, `message`, `period`). |
| `partial` | `true` quando faltam coletas, métricas ou intensidade de carbono. |
| `disclaimer` | Aviso de que os valores são estimativas. |
| `model` | `"regras"` quando o texto é determinístico; nome do modelo quando ele redigiu a resposta de conhecimento. |
| `degraded` | `true` quando o modelo deveria ter participado mas não participou (LLM desligado, falha de classificação/redação, clarificação ou recusa). Respostas de dados determinísticas com o LLM ligado são `false`. |

### Erros

| Status | Código | Situação |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | Token ausente, inválido ou expirado. |
| `400` | `INVALID_CHAT_REQUEST` | Corpo que não é um objeto JSON. |
| `400` | `INVALID_CHAT_MESSAGE` | Mensagem ausente, vazia, não textual ou acima de 500 caracteres. |
| `400` | `INVALID_CHAT_PERIOD` | Período fora de `1h`, `6h`, `24h`, `7d`. |
| `400` | `INVALID_CHAT_CONVERSATION` | `conversationId` não textual, vazio ou fora do formato permitido. |
| `400` | `INVALID_CHAT_CONTEXT` | Contexto que não é objeto ou campo inválido/longo. |
| `400` | `INVALID_CHAT_HISTORY` | Histórico que não é lista, com mais de 12 itens ou item inválido. |
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
- “Mais”/“maior” usa ordem decrescente; “menos”/“menor” usa ordem crescente, tanto no
  texto quanto no gráfico e no campo `facts.order` (`asc`/`desc`).
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
| `OLLAMA_MODEL` | `qwen2.5:3b` | `${OLLAMA_MODEL:-qwen2.5:3b}` | Modelo usado para desambiguar intenção e redigir respostas de conhecimento. |
| `OLLAMA_TIMEOUT_MS` | `60000` | `${OLLAMA_TIMEOUT_MS:-60000}` | Timeout de cada chamada ao Ollama. |
| `OLLAMA_NUM_CTX` | `4096` | `${OLLAMA_NUM_CTX:-4096}` | Janela total de contexto: prompt + histórico + resposta. |
| `OLLAMA_ENABLED` | `true` | `${OLLAMA_ENABLED:-true}` | `false` força o modo regras. |

`OLLAMA_TIMEOUT_MS` e `OLLAMA_NUM_CTX` são validados como inteiros positivos.
`OLLAMA_ENABLED` aceita `true/false`, `1/0`, `yes/no`, `on/off`.

### Consumo de tokens e limites

O GreenER usa **Ollama local**, portanto **não há cobrança por token**. Não existe
fatura, cota mensal nem limite de requisições do provedor: o custo real é CPU, RAM e
tempo de resposta da máquina que executa o modelo.

Os “tokens” continuam existindo tecnicamente e são limitados assim:

| Controle | Onde fica | Efeito |
| --- | --- | --- |
| `num_predict` | `ollama.client.ts` | Limita a saída: 140 tokens na classificação e 220 na resposta final. |
| `OLLAMA_NUM_CTX` | `env.ts` / cliente | Limita o total de tokens por chamada (prompt + histórico + saída). Padrão 4096. |
| Histórico enviado | `chat.service.ts` | No máximo as últimas 6 mensagens para classificar e 4 para redigir. |
| Histórico recebido | `chat.controller.ts` | Até 12 mensagens; itens inválidos são recusados com `400`. |
| Fatos enviados | `chat.service.ts` | Apenas top 5, totais e flags; nunca o banco inteiro. |

Se o histórico crescer além da janela, o backend trunca o que envia. Aumentar
`OLLAMA_NUM_CTX` permite conversas mais longas, mas consome mais RAM e pode deixar a
resposta mais lenta. Não há rate limiting nem fila por usuário no protótipo; com o
modelo local, o limite prático é a capacidade da máquina.

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
  command: ["ollama pull ${OLLAMA_MODEL:-qwen2.5:3b} && ollama run --keepalive 30m ${OLLAMA_MODEL:-qwen2.5:3b} ok >/dev/null"]
  restart: "no"
```

- `ollama`: servidor HTTP e volume persistente dos modelos.
- `ollama-init`: baixa o modelo uma única vez e já o carrega na memória com
  `keep_alive` de 30 min, encerrando em seguida. Se o modelo já estiver no volume, a
  operação termina rapidamente.
- `backend`: recebe `OLLAMA_URL=http://ollama:11434` e chama `warmup()` ao iniciar.
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
- O backend chama `OllamaClient.warmup()` ao iniciar e o `ollama-init` já deixa o
  modelo carregado; `keep_alive: 30m` mantém o modelo na memória entre perguntas.
- Consultas de dados não chamam o modelo quando as regras classificam com segurança, e
  respostas repetidas podem sair do cache em memória (60 s para dados, 30 min para
  conhecimento).
- `OLLAMA_NUM_PARALLEL=1` evita disputa de RAM/CPU em máquinas modestas.
- O backend aplica timeout de 60 s por chamada; o frontend espera até 75 s.
- `OLLAMA_NUM_CTX=4096` limita prompt + histórico + resposta. Valores maiores gastam
  mais RAM e podem reduzir a velocidade.
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

O backend chama `warmup()` ao iniciar. Para deixar o modelo carregado antes mesmo do
primeiro acesso, rode uma vez:

```bash
wsl.exe -e bash -lc '~/.local/ollama/bin/ollama run --keepalive 30m qwen2.5:3b ok'
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
- cinco sugestões iniciais, incluindo “O que é o GreenER?” e “Como o CO₂ é calculado?”;
- `conversationId` gerado no primeiro envio e reutilizado até “Limpar conversa”;
- contexto de página (`context.page`) e últimas 6 mensagens enviadas a cada pergunta;
- histórico local (não persiste ao recarregar a página);
- indicador de carregamento;
- gráfico de barras ou linhas conforme a resposta;
- opções clicáveis de clarificação quando há ambiguidade;
- até 3 sugestões de próximos passos ao final de cada resposta;
- badges de **dados parciais** e **modo regras**;
- aviso de estimativa em cada resposta;
- botão para limpar a conversa, que também descarta o `conversationId` local;
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
- **Ferramentas allowlisted**: só existem as sete intenções implementadas.
- **Somente leitura**: nenhuma operação de escrita é exposta.
- **Validação de entrada**: mensagem não vazia, até 500 caracteres; período em lista
  fechada; `conversationId`, contexto e histórico com formato e tamanho limitados.
- **Memória isolada por conversa**: o estado só é recuperado pelo `conversationId`
  enviado pelo próprio cliente e expira em 30 minutos.
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

- A memória da conversa é **em processo**: vive 30 minutos, limita-se a 500 conversas e
  é perdida em reinício do backend. Não há persistência no PostgreSQL.
- O histórico completo da interface não é salvo no banco; o frontend mantém apenas a
  conversa atual e envia as últimas 6 mensagens.
- A classificação por regras é baseada em palavras-chave e pode errar sinônimos.
- A base de conhecimento é **lexical e curada**, não vetorial: sinônimos distantes do
  vocabulário das seções podem não ser recuperados, e alterações no README ou em
  `docs/calculos.md` exigem atualizar as seções manualmente.
- O resolvedor de serviços usa nome/ID/tokens; nomes muito parecidos podem exigir
  clarificação mesmo quando o usuário sabe qual quer.
- O cache de respostas é **em memória e por processo**: não é compartilhado entre
  instâncias, não aumenta o TTL quando o cache é limpo e pode devolver um texto
  determinístico de até 60 s atrás para perguntas de dados. Continuações, clarificações
  pendentes e perguntas dependentes de contexto não são cacheadas.
- A classificação por regras é conservadora de propósito: casos ambíguos ainda pagam
  uma chamada ao classificador (com cache de 30 min por mensagem + serviços).
- Respostas de conhecimento podem variar entre execuções; as respostas de dados são
  determinísticas para a mesma consulta.
- Não há streaming token a token (`stream: false`).
- Não há rate limiting nem fila por usuário.
- Não há GPU configurada por padrão.
- A suíte de avaliação cobre **intenções e clarificações determinísticas**, não a
  qualidade textual do LLM.
- Não há teste end-to-end com o Ollama real nem teste automatizado da interface.

---

## 13. Fallback determinístico

O assistente aplica regras primeiro e só usa o Ollama quando necessário. Sempre há um
caminho sem IA:

| Situação | Classificação | Texto | `degraded` | `model` |
| --- | --- | --- | --- | --- |
| Pergunta de dados com regras confiantes | Regras | Determinístico | `false` | `"regras"` |
| Pergunta de dados ambígua + Ollama classifica | Modelo | Determinístico | `false` | `"regras"` |
| Pergunta de dados ambígua, Ollama falha | Regras | Determinístico | `true` | `"regras"` |
| Conhecimento + Ollama disponível | Regras ou modelo | Modelo reescreve a seção curada | `false` | Nome do modelo |
| Conhecimento + Ollama falha ou desligado | Regras | Resumo curado | `true` | `"regras"` |
| Fora do escopo | Regras ou modelo | Recusa fixa | `true` | `"regras"` |
| Ambiguidade de serviço | Regras ou modelo | Pergunta fixa + opções | `true` | `"regras"` |

Regras de classificação resumidas:

- emissões + palavras de ranking → `RANKING_EMISSIONS`;
- energia/consumo + palavras de ranking → `RANKING_ENERGY`;
- nome de serviço citado → `SERVICE_SUMMARY`;
- ambiente/panorama/disponibilidade → `ENVIRONMENT_SUMMARY`;
- serviço/histórico/evolução sem nome → `SERVICE_SUMMARY`;
- clarificação pendente + nome/ordinal → `SERVICE_SUMMARY` do serviço escolhido;
- continuação (“e as emissões dele?”) + serviço ativo → `SERVICE_SUMMARY`;
- pista forte de explicação (“o que é o GreenER”, “como é calculado”, “metodologia”,
  “quem fez”, “funcionalidades”) → `PROJECT_INFO` ou `METHODOLOGY`, com a seção
  escolhida pela pontuação lexical;
- se a mensagem também cita dados, a intenção de dados vence, exceto com pista forte
  de explicação;
- resto → `OUT_OF_SCOPE`.

O classificador do Ollama só é consultado quando a regra não é confiável: `OUT_OF_SCOPE`
sem pistas, ou `SERVICE_SUMMARY` sem serviço resolvido e sem menção a energia/emissões.

Além da classificação, o backend aplica correções determinísticas:

- nome de serviço sozinho (“Solar Norte”) nunca vira ranking ou panorama;
- “ranking” explícito não vira resumo só porque a conversa tem serviço ativo;
- um nome que casa com dois serviços nunca é escolhido pelo LLM;
- pergunta de serviço sem nome, com vários serviços ativos, vira clarificação.

---

## 14. Testes

### Executar

```bash
cd backend
npm test
```

### Cobertura adicionada

`chat.knowledge.test.ts` (23 testes):

- recuperação das 12 perguntas de projeto/metodologia;
- dica da pergunta anterior para continuações curtas;
- 5 perguntas de dados que **não** devem casar com a base;
- classificação apenas com pista forte e fallback por intenção;
- renderização dos placeholders com os valores atuais do modelo de potência.

`chat.service.test.ts` (14 testes):

- ranking de energia ordenado, ignorando serviços removidos;
- resumo de serviço com histórico e gráfico de linha, preservando lacunas;
- panorama ambiental via dashboard;
- recusa de fora do escopo sem chamar ferramentas de dados;
- ranking sem dados;
- nome de serviço inexistente com lista de disponíveis;
- resposta determinística sem chamar o modelo quando as regras decidem;
- classificador consultado apenas quando as regras não decidem;
- cache de respostas, expiração do TTL de dados e reaproveitamento de indicadores;
- single-flight entre chamadas simultâneas e cache de classificação;
- mensagem vazia, mensagem longa e período inválido.

`chat.cache.test.ts` (5 testes):

- valor válido enquanto o TTL não expira;
- descarte da entrada expirada;
- descarte LRU acima do limite;
- reutilização de execução em andamento no `SingleFlight`;
- nova execução depois que a anterior termina.

`chat.conversation.test.ts` (46 testes):

- geração e reutilização de `conversationId`;
- clarificação por nome ambíguo e resolução pelo ordinal (“o segundo”);
- continuidade com “E as emissões dele?”;
- uso de `context.serviceName`;
- clarificação para pergunta de serviço sem nome;
- detecção de período na mensagem;
- sugestões coerentes com o ranking;
- resolução por ID (“serviço 2”);
- validação de `conversationId`, contexto e histórico;
- histórico enviado só ao classificador, com resposta de dados determinística;
- proteção contra o LLM escolher um serviço ambíguo;
- resposta de conhecimento em modo regras, com `degraded` e sem citação de fonte;
- conhecimento com o modelo, incluindo fatos e modelo de potência no contexto;
- guarda que impede conhecimento de roubar uma pergunta de dados;
- continuação de conhecimento (“E a energia?”) e preservação do serviço ativo;
- **suíte de avaliação** com 29 perguntas e intenções esperadas, sem Ollama.

`chat.http.test.ts` (6 testes):

- `401` sem token;
- `401` com token inválido;
- `400` para mensagem vazia;
- `400` para mensagem não textual;
- `400` para período inválido;
- `200` com resposta determinística quando não há dados.

Na implementação, os **94 testes do módulo de chat** passaram (23 de conhecimento, 14 de
serviço, 46 de conversa, 5 de cache e 6 HTTP). A suíte completa do backend terminou com
**250 testes passando e 7 ignorados** (integração com banco real). PostgreSQL e Ollama
são substituídos por mocks; `vitest.setup.ts` fornece URLs fictícias das APIs externas
para que o app carregue sem o `.env` real.

---

## 15. Mapa de arquivos alterados

```text
backend/
├── src/app.ts                                  (monta /api/chat)
├── src/config/env.ts                           (variáveis OLLAMA_*)
├── src/server.ts                               (warmup do modelo ao iniciar)
├── vitest.config.ts                            (setupFiles do teste)
├── vitest.setup.ts                             (env fictício para os testes)
└── src/modules/chat/
    ├── chat.types.ts
    ├── chat.state.ts
    ├── chat.cache.ts
    ├── chat.period.ts
    ├── chat.prompt.ts
    ├── chat.knowledge.ts
    ├── ollama.client.ts
    ├── chat.service.ts
    ├── chat.factory.ts
    ├── chat.controller.ts
    ├── chat.routes.ts
    ├── chat.knowledge.test.ts
    ├── chat.cache.test.ts
    ├── chat.service.test.ts
    ├── chat.conversation.test.ts
    └── chat.http.test.ts

frontend/
├── src/components/AssistantChat.tsx
├── src/components/AssistantChat.css
├── src/pages/Home.tsx                          (renderiza o painel)
├── src/services/chatApi.ts
└── src/types/chat.ts

compose.yaml                                    (ollama + ollama-init + volume + OLLAMA_NUM_CTX)
.env.example                                    (OLLAMA_URL, OLLAMA_MODEL, OLLAMA_NUM_CTX, ...)
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
Porque elas resolvem a maior parte das perguntas sozinhas: garantem disponibilidade,
previsibilidade, testes rápidos e respostas de dados determinísticas. O modelo só é
consultado quando as regras não decidem a intenção.

**O texto pode variar entre execuções?**
Respostas de dados não: o texto e o gráfico são montados pelo backend e reaproveitados
pelo cache. Respostas de conhecimento podem variar na redação, mas a seção curada, os
números e o período permanecem os mesmos para a mesma consulta.

**Como o assistente responde sobre o projeto e os cálculos?**
Com uma base curada em `chat.knowledge.ts`, derivada do README e de `docs/calculos.md`.
A seção é escolhida por pontuação lexical e injetada com os valores atuais do modelo de
potência; o texto final não cita arquivos nem fontes. O README inteiro não é enviado ao
modelo.

**Por que não colocar o README inteiro no prompt?**
O README tem cerca de 25 KB (~7 mil tokens) e não caberia na janela de 4096 tokens,
além de aumentar a latência. As seções curadas ocupam ~300–600 tokens, são estáveis,
testáveis e mantêm a proveniência apenas na base curada.

**Se as contas mudarem no código, a resposta didática acompanha?**
Os coeficientes, a versão do modelo de potência e a intensidade de carbono vêm de
`IndicadoresService` e são injetados por placeholders, então esses números acompanham.
Mudanças de texto no README ou em `docs/calculos.md`, porém, exigem atualizar as seções
manualmente.

**O uso do Qwen gasta tokens pagos?**
Não. O Ollama é local. Tokens existem tecnicamente, mas não há cobrança; os limites
são `num_predict` (saída), `OLLAMA_NUM_CTX` (janela total) e a capacidade da máquina.

**O assistente faz cache das respostas?**
Sim, em memória: respostas de dados por 60 s, de conhecimento por 30 min e respostas
degradadas por 30 s. Indicadores ficam 15 s por período e classificações 30 min. O
cache só vale para perguntas autocontidas; continuações e clarificações pendentes
sempre passam pelo fluxo completo. Chamadas simultâneas idênticas são unificadas.

**Qual o próximo passo natural?**
Persistir a memória no banco, streaming, rate limiting por usuário, mais intenções
(comparação entre períodos, regiões e serviços) e avaliação da qualidade textual do
modelo.
