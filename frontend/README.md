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
├── Dockerfile
└── src/
    ├── components/
    ├── pages/
    ├── services/
    ├── types/
    └── styles/
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
| Login | Acesso à área de configuração | ⏳ Planejada |
| Configuração | Ajustes do monitoramento, com acesso protegido | ⏳ Planejada |

O monitoramento consulta `/api/servicos/discover` imediatamente ao abrir a tela e verifica a cada 1 segundo se pode iniciar uma nova consulta. Se a anterior ainda estiver em andamento, aguarda o próximo ciclo, sem sobrepor requisições. O timeout do frontend é de 15 segundos, superior aos 10 segundos configurados para a API externa no `.env.example`. Se o timeout do backend for aumentado, ajuste também `REQUEST_TIMEOUT_MS` em `src/pages/Monitoring.tsx`.

A tela informa a última atualização bem-sucedida e sinaliza dados desatualizados quando uma consulta falha. Ao voltar à página, o cabeçalho indica que os dados estão sendo atualizados, sem exibir um aviso de falha. O histórico de serviços permanece disponível durante a navegação na mesma aba; recarregar a aplicação reinicia esse histórico. Uma primeira resposta vazia também conta como consulta bem-sucedida, permitindo detectar como novos os serviços que surgirem depois.

Os status refletem presença, ausência e retorno na lista de descoberta. A coleta de métricas, a verificação individual de disponibilidade e os indicadores ambientais ainda não estão implementados. Os indicadores têm legenda e acesso por teclado; ao clicar ou ativar um indicador, a página rola até o card correspondente e destaca apenas o serviço. Clicar fora do card ou pressionar Escape remove a seleção.

Os cards mostram nome, região, status e localização. As informações de atualização do ambiente ficam recolhidas no cabeçalho e podem ser abertas manualmente; recolher esse painel não interrompe as consultas automáticas.

Os destaques “Novo” e “Retornou” permanecem por 3 segundos a partir da detecção, sem renovar esse prazo nas consultas seguintes. Depois desse período, a próxima consulta bem-sucedida que confirmar sua presença muda o serviço para “Ativo”. Se ele desaparecer da lista antes disso, muda imediatamente para “Indisponível”; um novo retorno inicia outro período de 3 segundos.

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

Acesse `http://localhost:5173` para a Home ou `http://localhost:5173/monitoramento` para acompanhar os serviços.

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
