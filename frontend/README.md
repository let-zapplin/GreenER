# 🖥️ GreenER — Frontend

Aplicação web do GreenER, responsável por apresentar os serviços monitorados, seus estados, localização, indicadores ambientais e histórico de energia estimada.

← [Voltar para o README principal](../README.md)

> **Referência atualizada no fechamento da Sprint 2 — 09/11/2026.**  
> O frontend consome dados reais fornecidos pelo backend. Cálculos de energia e CO₂e permanecem centralizados na API GreenER.

---

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Organização do código](#-organização-do-código)
- [Telas](#-telas)
- [Monitoramento](#monitoramento)
- [Análises](#análises)
- [Autenticação](#-autenticação)
- [Atualização automática](#-atualização-automática)
- [Configuração](#-configuração)
- [Como executar](#️-como-executar)
- [Testes e validação](#-testes-e-validação)
- [Documentação relacionada](#-documentação-relacionada)

---

## 🛠 Tecnologias

| Tecnologia | Uso no frontend |
| --- | --- |
| **React 19** | Construção da interface e componentes |
| **TypeScript** | Tipagem estática |
| **Vite** | Servidor de desenvolvimento e build |
| **React Router** | Navegação e rotas da aplicação |
| **Recharts** | Gráficos de histórico ambiental |
| **MapLibre GL** | Renderização do mapa de serviços |
| **OpenFreeMap** | Estilo/cartografia utilizada pelo mapa operacional |
| **MapTiler SDK** | Recursos cartográficos utilizados em partes da experiência visual |
| **Phosphor Icons** | Ícones da interface |
| **Docker** | Execução containerizada do frontend |

As regras de negócio e os cálculos ambientais não são duplicados no frontend. A interface consome as respostas estruturadas da API GreenER.

---

## 📂 Organização do código

O código principal fica em `src/`, separado por responsabilidade:

| Pasta | Responsabilidade |
| --- | --- |
| `pages/` | Telas e composição dos fluxos principais |
| `components/` | Componentes reutilizáveis |
| `hooks/` | Estado e ciclos de consulta da interface |
| `services/` | Comunicação HTTP com o backend |
| `contexts/` | Contextos compartilhados |
| `providers/` | Providers globais da aplicação |
| `types/` | Tipos TypeScript |
| `styles/` | Estilos globais |

Estrutura geral:

```text
frontend/
├── assets/
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

O fluxo mais comum de dados é:

```text
page
  ↓
component
  ↓
hook / service
  ↓
API GreenER
```

Os hooks concentram estado de carregamento, erro, atualização automática e preservação dos últimos dados válidos.

---

## 🧭 Telas

| Tela | Descrição | Situação no fechamento da Sprint 2 |
| --- | --- | --- |
| **Landing / Login** | Apresentação inicial e autenticação | ✅ Implementada |
| **Home** | Navegação principal após autenticação | ✅ Implementada |
| **Sobre / Funcionamento** | Contexto do projeto e funcionamento da solução | ✅ Implementadas |
| **Monitoramento** | Visão operacional dos serviços, indicadores, estados e localização | ✅ Implementada; refinamentos visuais da TEC37 em revisão |
| **Análises** | Histórico ambiental por serviço e período | ✅ Implementada |
| **Mapa de serviços** | Visualização geográfica complementar no Monitoramento | 🔄 Implementação funcional presente; US13 em revisão no fechamento |

> O Monitoramento e a página de Análises possuem responsabilidades diferentes: o primeiro apresenta o **estado atual do ambiente**, enquanto Análises concentra a **exploração temporal**.

---

## Monitoramento

A página de Monitoramento apresenta a situação operacional do ambiente monitorado.

Ela utiliza principalmente:

```text
GET /api/servicos
GET /api/dashboard
```

e cruza as informações necessárias para apresentar:

- serviços monitorados;
- localização;
- estado do catálogo;
- estado da última coleta;
- energia estimada;
- emissão estimada de CO₂e;
- contadores do ambiente;
- horário da última atualização;
- visualização geográfica dos serviços.

### Estados apresentados

O frontend diferencia estados provenientes do backend:

- `active`;
- `removed`;
- `no_metrics`;
- `unavailable`;
- `error`;

e destaques temporários derivados pela própria interface:

- `new`;
- `returned`.

`no_metrics` não é tratado como indisponibilidade: o serviço continua presente no catálogo, mas a última tentativa não forneceu métricas utilizáveis.

### Seleção de serviços

Lista, mapa e detalhes compartilham a seleção do serviço.

Ao selecionar um serviço:

- o card correspondente é destacado;
- o mapa pode focar sua localização;
- o painel de detalhes apresenta suas informações;
- ações relacionadas podem direcionar o usuário para a página de Análises.

Quando vários serviços compartilham coordenadas, o mapa pode agrupá-los e permitir a escolha individual.

### Visão geográfica

A visualização geográfica utiliza **MapLibre GL** com estilo do **OpenFreeMap**.

O mapa recebe latitude e longitude existentes no catálogo de serviços. Serviços sem coordenadas continuam acessíveis pela lista e pelas demais visualizações.

Esse comportamento mantém o mapa como recurso complementar, sem transformar a localização geográfica em requisito para visualizar um serviço.

> A US13 foi antecipada da Sprint 3 para a Sprint 2. No fechamento documental, a implementação funcional estava em revisão e seus refinamentos finais permanecem sujeitos à integração definitiva.

---

## Análises

A página de Análises utiliza o histórico ambiental retornado por:

```text
GET /api/indicadores/:serviceId/historico
```

A interface oferece:

- seleção de serviço;
- períodos de `1h`, `6h`, `24h` e `7d`;
- gráfico temporal de energia estimada;
- tooltip com valores da amostra;
- tratamento de lacunas;
- estados de carregamento e erro;
- estado de ausência de histórico;
- diferentes modos/layouts de visualização;
- zoom por seleção de intervalo;
- restauração da janela temporal.

O gráfico utiliza **Recharts**.

Amostras sem energia calculável permanecem como lacunas. O frontend não converte ausência de dado em consumo zero.

A seleção também pode ser recebida pela URL:

```text
/analises?serviceId=<id>
```

permitindo abrir Análises já focada em um serviço escolhido no Monitoramento.

---

## 🔐 Autenticação

O frontend possui fluxo de autenticação integrado ao backend.

Principais elementos:

- `AuthProvider` para compartilhar a sessão;
- `useAuth` para consumir o contexto;
- `useAuthForm` para o formulário de login;
- armazenamento/uso do token nas consultas autenticadas;
- proteção das rotas internas no frontend.

Principais rotas autenticadas da interface:

```text
/home
/monitoramento
/analises
```

A proteção do frontend melhora a navegação, mas **não substitui a autorização do backend**.

O backend continua responsável por validar JWT e permissões em cada endpoint protegido.

---

## 🔄 Atualização automática

Monitoramento e dados consolidados são atualizados periodicamente sem exigir `F5`.

Na configuração validada da Sprint 2:

```text
intervalo principal do frontend: 60 segundos
timeout das consultas: 15 segundos
```

O próximo ciclo é agendado após a conclusão da requisição anterior, reduzindo o risco de sobreposição.

Fluxo:

```text
consulta
  ↓
sucesso?
 ├─ sim → atualiza dados + horário da última atualização
 └─ não → preserva últimos dados válidos + informa falha
  ↓
agenda próximo ciclo
```

Esse comportamento permite que uma indisponibilidade temporária do backend não esvazie imediatamente a tela.

A atualização automática do frontend foi validada manualmente em 09/11/2026.

---

## 🔐 Configuração

O frontend se comunica com o backend por uma URL configurável.

Use o arquivo [`.env.example`](../.env.example) da raiz como referência.

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL pública do backend. Em desenvolvimento local: `http://localhost:3000` |
| `VITE_MAPTILER_API_KEY` | Chave pública opcional para recursos que utilizem MapTiler SDK |

O mapa operacional baseado em MapLibre/OpenFreeMap não deve depender de uma chave secreta no frontend.

> Variáveis `VITE_*` são incorporadas ao bundle do navegador e devem conter apenas valores públicos.

---

## ▶️ Como executar

### Com Docker — recomendado

Na raiz do repositório:

```bash
docker compose up --build
```

Acesse:

```text
http://localhost:5173
```

O frontend utiliza o backend iniciado pelo mesmo Compose.

Para executar em segundo plano:

```bash
docker compose up -d
```

### Localmente

Requisitos:

- Node.js 24 ou superior;
- npm;
- backend disponível para os fluxos que consultam dados reais.

```bash
cd frontend
npm install
npm run dev
```

A aplicação fica disponível em:

```text
http://localhost:5173
```

Principais caminhos:

```text
/               → landing/login
/home           → home autenticada
/monitoramento  → dashboard operacional
/analises       → histórico e análises
```

---

## 🧪 Testes e validação

Comandos disponíveis:

| Comando | Função |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run typecheck` | Executa `tsc --noEmit` |
| `npm test` | Executa os testes automatizados do frontend |
| `npm run build` | Executa typecheck e gera o build em `dist/` |
| `npm run preview` | Serve localmente o build gerado |

### Evidência do fechamento da Sprint 2

Em 09/11/2026:

- **26/26 testes do frontend aprovados**;
- `npm run typecheck` concluído sem erros;
- `npm run build` concluído com sucesso;
- **5030 módulos transformados**;
- build finalizado pelo Vite em aproximadamente **1,93 s**;
- atualização automática do Monitoramento validada sem reload manual.

O build apresentou apenas aviso não bloqueante sobre chunks acima de 500 kB. Esse ponto fica registrado como oportunidade futura de otimização relacionada ao RNF03.

As evidências completas estão em:

[`docs/testes/manualdevalidacao.md`](../docs/testes/manualdevalidacao.md)

---

## 📚 Documentação relacionada

- [`README.md`](../README.md) — visão geral do GreenER;
- [`backend/README.md`](../backend/README.md) — backend e integrações;
- [`docs/api.md`](../docs/api.md) — endpoints consumidos pelo frontend;
- [`docs/arquitetura.md`](../docs/arquitetura.md) — arquitetura e fluxo de dados;
- [`docs/calculos.md`](../docs/calculos.md) — fórmulas de energia e CO₂e;
- [`docs/sprints/sprint-2.md`](../docs/sprints/sprint-2.md) — registro da Sprint 2.

---

## Próximas evoluções

Para a Sprint 3 permanecem principalmente:

- ranking de impacto;
- comparação entre serviços;
- filtros analíticos;
- refinamentos finais de responsividade;
- consolidação do mapa;
- otimização de desempenho;
- ampliação da cobertura de testes.

Essas funcionalidades devem reutilizar a API e os dados históricos já consolidados, evitando duplicar cálculos ambientais no frontend.
