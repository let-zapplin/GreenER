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

> Esta tabela é atualizada a cada sprint, com as telas que já foram implementadas.

| Tela | Descrição | Situação |
| --- | --- | --- |
| Home, Sobre e Funcionamento | Apresentação do projeto e de seu funcionamento | Implementadas |
| Monitoramento | Descoberta de serviços, localização e mudanças na lista | Implementada |
| Análises | Aviso “Coming soon” e acesso ao monitoramento | Página provisória |
| Dashboard | Apresentação dos dados dos serviços, do consumo de energia e das emissões de CO₂e | ⏳ Planejada |
| Login | Autenticação pela landing page e acesso às rotas protegidas | Implementada |
| Configuração | Ajustes do monitoramento, com acesso protegido | ⏳ Planejada |

O monitoramento consulta `/api/servicos` imediatamente ao abrir a tela, com uma sessão autenticada, para obter os serviços armazenados no backend e seus status. A cada 1 segundo, verifica se pode iniciar uma nova consulta; se a anterior ainda estiver em andamento, aguarda o próximo ciclo, sem sobrepor requisições. O timeout de cada consulta no frontend é de 15 segundos, definido em `src/hooks/useMonitoring.ts`.

A tela informa a última atualização bem-sucedida e sinaliza dados desatualizados quando uma consulta falha. Ao voltar à página, o cabeçalho indica que os dados estão sendo atualizados, sem exibir um aviso de falha. O histórico de serviços permanece disponível durante a navegação na mesma aba; recarregar a aplicação reinicia esse histórico. Uma primeira resposta vazia também conta como consulta bem-sucedida, permitindo detectar como novos os serviços que surgirem depois.

Os status exibidos combinam a disponibilidade informada pelo backend com os destaques temporários “Novo” e “Retornou”, definidos pelo frontend. O status “Indisponível” depende do valor enviado pelo backend; a ausência de um serviço na resposta apenas o remove da lista exibida. A coleta de métricas e os indicadores ambientais ainda não estão implementados. Os indicadores têm legenda e acesso por teclado; ao clicar ou ativar um indicador, a página rola até o card correspondente e destaca o serviço. Clicar fora do card ou pressionar Escape remove a seleção.

Os cards mostram nome, região, status e localização. As informações de atualização do ambiente ficam recolhidas no cabeçalho e podem ser abertas manualmente; recolher esse painel não interrompe as consultas automáticas.

Os destaques “Novo” e “Retornou” têm prazo de 3 segundos a partir da detecção, sem renovar esse prazo nas consultas seguintes. Depois desse período, a próxima consulta bem-sucedida que confirmar o serviço como disponível muda seu status para “Ativo”. Se uma consulta retornar o status “Indisponível”, esse status substitui imediatamente o destaque. Se uma consulta posterior informar que o serviço está disponível novamente, ele recebe o destaque “Retornou”, iniciando outro período de 3 segundos.

---

## 🔐 Configuração

O frontend se comunica com o [backend](../backend/README.md) por meio de uma URL configurada em variável de ambiente. Use o [`.env.example`](../.env.example) como modelo.

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL pública da API do backend; exemplo: `http://localhost:3000` |


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

Acesse `http://localhost:5173` para a landing page. Após o login, a Home fica em `/home`, e os serviços em `/monitoramento`.

O `AuthProvider` compartilha a sessão pelo `useAuth`. O formulário usa `useAuthForm`, e as consultas autenticadas ficam no `useMonitoring`. As rotas `/home`, `/monitoramento` e `/analises` exigem uma sessão no frontend; a autorização dos endpoints continua sendo responsabilidade do backend.

O globo usa `@maptiler/sdk` e cartografia local. Para imagens de satélite, configure `VITE_MAPTILER_API_KEY` no `.env` da raiz e reinicie o frontend.

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos |
| `npm test` | Verifica descoberta, mudanças de status e histórico durante a navegação |
| `npm run build` | Verifica os tipos e gera o build em `dist/` |
| `npm run preview` | Serve o build localmente para conferência |

O Vite lê os arquivos `.env` da raiz do repositório. Variáveis destinadas ao frontend devem usar o prefixo `VITE_` e conter apenas valores públicos.

---

## 📚 Documentação Relacionada

- [`backend/README.md`](../backend/README.md): API consumida pelo frontend
- [`docs/api.md`](../docs/api.md): endpoints disponíveis
- [`docs/arquitetura.md`](../docs/arquitetura.md): fluxo dos dados entre as partes da aplicação
