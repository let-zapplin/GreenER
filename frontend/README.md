# 🖥️ GreenER: Frontend

Aplicação web do GreenER, onde o usuário acompanha os serviços monitorados, o consumo de energia e as emissões de CO₂e estimadas.

Voltar para o [README principal](../README.md).

---

## 📋 Índice

- 🛠 Tecnologias
- 📂 Organização do Código
- 🧭 Telas
- 🔐 Configuração
- ▶️ Como Executar
- 📚 Documentação Relacionada

---

## 🛠 Tecnologias

- React com TypeScript
- Vite para desenvolvimento e build
- Docker

---

## 📂 Organização do Código

O código fica em `src/`, separado por responsabilidade:

| Pasta | Responsabilidade |
| --- | --- |
| `pages` | Telas da aplicação |
| `components` | Componentes reutilizáveis da interface |
| `services` | Chamadas HTTP ao backend |
| `types` | Tipos dos serviços e dos estados de monitoramento |
| `styles` | Estilos globais |

Estrutura geral:

```
frontend/
├── assets/
│   ├── camadasFundo/
│   ├── icones/
│   ├── pfps/
│   └── … imagens e ilustrações
├── tests/
├── Dockerfile
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── components/
    ├── contexts/
    ├── hooks/
    ├── pages/
    ├── providers/
    ├── services/
    ├── styles/
    ├── types/
    ├── App.tsx
    └── main.tsx
```

---

## 🧭 Telas

> Esta tabela descreve as telas presentes na versão integrada.

| Tela | Descrição | Situação |
| --- | --- | --- |
| Home, Sobre e Funcionamento | Apresentação do projeto e de seu funcionamento | Implementadas |
| Monitoramento | Serviços, estados de coleta, indicadores ambientais, mapa e detalhes por serviço | Implementada |
| Análises | Histórico ambiental por serviço, seleção de período e modos de visualização | Implementada |
| Login | Autenticação pela landing page e acesso às rotas protegidas | Implementada |

O Monitoramento consulta `/api/servicos` e `/api/dashboard` com a sessão autenticada, para obter serviços, estados e indicadores ambientais. As consultas são iniciadas ao abrir a tela e repetidas a cada 60 segundos, reagendando o próximo ciclo após a resposta anterior. O timeout das consultas é de 15 segundos. O resumo exibe totais ambientais, estados de coleta e horários da última atualização bem-sucedida.

Quando uma consulta falha, os últimos dados válidos permanecem disponíveis e a interface sinaliza a falha ou desatualização. O histórico de serviços usado para destacar entradas e retornos permanece disponível durante a navegação na mesma aba; recarregar a aplicação reinicia esse histórico. Uma primeira resposta vazia também conta como consulta bem-sucedida, permitindo detectar como novos os serviços que surgirem depois.

Os status exibidos combinam a disponibilidade e o resultado da coleta enviados pelo backend com os destaques temporários “Novo” e “Retornou”, definidos pelo frontend. Serviços ativos sem métricas são diferenciados dos indisponíveis. O mapa e a lista de serviços são interativos: selecionar um serviço destaca sua localização e seus detalhes; a seleção pode ser removida clicando fora do card ou pressionando Escape.

O painel de visão geral do ambiente pode ser recolhido sem interromper as consultas automáticas. A página de Análises apresenta histórico ambiental em kWh por serviço, com seleção de períodos de 1h, 6h, 24h ou 7d, estados de carregamento/erro/ausência de dados e visualizações em diferentes layouts. O gráfico permite ampliar um intervalo e restaurar a janela temporal.

Os destaques “Novo” e “Retornou” têm prazo de 3 segundos a partir da detecção, sem renovar esse prazo nas consultas seguintes. Depois desse período, a próxima consulta bem-sucedida que confirmar o serviço como disponível muda seu status para “Ativo”. Se uma consulta retornar o status “Indisponível”, esse status substitui imediatamente o destaque. Se uma consulta posterior informar que o serviço está disponível novamente, ele recebe o destaque “Retornou”, iniciando outro período de 3 segundos.

---

## 🔐 Configuração

O frontend se comunica com o [backend](../backend/README.md) por meio de uma URL configurada em variável de ambiente. Use o [`.env.example`](../.env.example) como modelo.

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL pública da API do backend; exemplo: `http://localhost:3000` |
| `VITE_MAPTILER_API_KEY` | Chave pública opcional para recursos de mapa que dependam de tiles do MapTiler |


---

## ▶️ Como Executar

### Com Docker (recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

### Localmente

Requisitos: Node.js 24 ou superior e npm. O backend será necessário para as funcionalidades que consumirem a API.

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173` para a landing page. Após o login, a Home fica em `/home`, o Monitoramento em `/monitoramento` e as Análises em `/analises`.

O `AuthProvider` compartilha a sessão pelo `useAuth`. O formulário usa `useAuthForm`; as consultas autenticadas usam os hooks de Monitoramento, indicadores e histórico. As rotas `/home`, `/monitoramento` e `/analises` exigem uma sessão no frontend; a autorização dos endpoints continua sendo responsabilidade do backend.

O globo usa `@maptiler/sdk` e cartografia local. Para imagens de satélite, configure `VITE_MAPTILER_API_KEY` no `.env` da raiz e reinicie o frontend.

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos |
| `npm test` | Verifica sessão, descoberta e mudanças de status e histórico durante a navegação |
| `npm run build` | Verifica os tipos e gera o build em `dist/` |
| `npm run preview` | Serve o build localmente para conferência |

O Vite lê os arquivos `.env` da raiz do repositório. Variáveis destinadas ao frontend devem usar o prefixo `VITE_` e conter apenas valores públicos.

---

## 📚 Documentação Relacionada

- [`backend/README.md`](../backend/README.md): API consumida pelo frontend
- [`docs/api.md`](../docs/api.md): endpoints disponíveis
- [`docs/arquitetura.md`](../docs/arquitetura.md): fluxo dos dados entre as partes da aplicação
