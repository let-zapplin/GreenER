import type { ChatIntent } from "./chat.types.js";

export type ChatKnowledgeIntent = Extract<
  ChatIntent,
  "PROJECT_INFO" | "METHODOLOGY"
>;

export type ChatPowerModel = {
  version: string;
  cpuMaximumWatts: number;
  memoryWattsPerGb: number;
  diskWattsPerGb: number;
  networkWattsPerGb: number;
};

export type ChatKnowledgeSection = {
  id: string;
  intent: ChatKnowledgeIntent;
  title: string;
  reference: string;
  summary: string;
  content: string;
  keywords: string[];
};

const KNOWLEDGE_THRESHOLD = 4;
const HINT_WEIGHT = 0.3;

const STOPWORDS = new Set([
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "e",
  "ou",
  "que",
  "para",
  "por",
  "com",
  "sobre",
  "como",
  "qual",
  "quais",
  "me",
  "seu",
  "sua",
  "ao",
  "aos",
  "mais",
  "menos",
  "muito",
  "pouco",
]);

// Cues fortes evitam que perguntas de dados ("qual serviço gasta mais energia?")
// sejam capturadas como explicação metodológica.
const STRONG_KNOWLEDGE_CUES = [
  "o que e o greener",
  "o que e o projeto",
  "sobre o greener",
  "sobre o projeto",
  "para que serve",
  "como funciona",
  "como calcul",
  "como e calcul",
  "calculad",
  "formula",
  "metodologia",
  "premissas",
  "quem fez",
  "quem desenvolveu",
  "equipe",
  "autores",
  "fatec",
  "unilaunch",
  "letzapplin",
  "funcionalidades",
  "recursos",
  "o que da para fazer",
  "o que voce faz",
  "o que voce sabe",
  "readme",
  "documentacao",
  "limitacoes",
  "estimativa",
  "potencia",
  "intensidade",
  "snapshot",
  "medicao",
  "me explica",
  "explica",
  "didatic",
  "como usar",
  "de onde vem",
  "origem dos numeros",
  "passo a passo",
  "as contas",
  "essas contas",
];

const EXPLANATION_CUES = [
  "como",
  "por que",
  "porque",
  "o que",
  "explica",
  "significa",
  "serve",
  "funciona",
  "vem",
];

const SECTIONS: ChatKnowledgeSection[] = [
  {
    id: "power-model",
    intent: "METHODOLOGY",
    title: "Modelo de potência (versão 1)",
    reference: "docs/calculos.md §3 e §4",
    summary:
      "A potência estimada soma quatro parcelas: CPU proporcional ao uso (máximo de {{cpuMaximumWatts}}), memória ({{memoryWattsPerGb}} W/GB), disco ({{diskWattsPerGb}} W/GB) e rede ({{networkWattsPerGb}} W/GB). Esses coeficientes são premissas do modelo v{{powerModelVersion}}, não constantes físicas universais.",
    content:
      "O modelo v{{powerModelVersion}} estima a potência em watts a partir de cada amostra: P_total = P_cpu + P_memória + P_disco + P_rede. P_cpu = (cpuPercent / 100) × {{cpuMaximumWatts}}; P_memória = memoryGb × {{memoryWattsPerGb}}; P_disco = diskGb × {{diskWattsPerGb}}; P_rede = networkGb × {{networkWattsPerGb}}. Os coeficientes são adotados pelo GreenER e devem ser tratados como premissas da versão atual. Se forem alterados, a versão do modelo precisa ser atualizada para preservar a rastreabilidade.",
    keywords: [
      "modelo de potencia",
      "como e calculada a potencia",
      "modelo v1",
      "potencia estimada",
      "potencia total",
      "p total",
      "potencia da cpu",
      "cpu percent",
      "watts",
      "coeficientes",
      "memoria",
      "disco",
      "rede",
      "cpu",
    ],
  },
  {
    id: "energy-calculation",
    intent: "METHODOLOGY",
    title: "Como a energia é calculada",
    reference: "docs/calculos.md §5",
    summary:
      "A energia de cada amostra é a potência total multiplicada pela duração real da coleta: E(kWh) = P(W) × t(s) ÷ 3.600.000. O intervalo configurado do job não substitui a duração real informada pela amostra.",
    content:
      "Para converter potência em energia, o GreenER usa a duração real da amostra: horas = t / 3600 e kW = W / 1000, então E_kWh = P_total × (t / 3600) / 1000, equivalente a (P_total × t) / 3.600.000. O campo collectionIntervalSeconds é o que vale no cálculo; o intervalo configurado do job (COLLECTION_INTERVAL_MS) indica apenas quando um novo ciclo começa. Usar a duração real evita superestimar ou subestimar o consumo.",
    keywords: [
      "como a energia e calculada",
      "como e calculada a energia",
      "como calcula a energia",
      "calculo de energia",
      "energia estimada",
      "energia em kwh",
      "a energia",
      "energia",
      "kwh",
      "quilowatt hora",
      "duracao da amostra",
      "intervalo da amostra",
      "collection interval",
      "collectionintervalseconds",
      "potencia em energia",
    ],
  },
  {
    id: "carbon-intensity",
    intent: "METHODOLOGY",
    title: "Intensidade de carbono regional",
    reference: "docs/calculos.md §6",
    summary:
      "A intensidade de carbono vem de snapshots regionais em gCO₂e/kWh, ligados à região do serviço e ao instante da coleta. A API de carbono não é consultada em tempo real pelos indicadores.",
    content:
      "O GreenER persiste snapshots da Carbon Intensity API. Para cada coleta, associa a intensidade usando o region_code do serviço, o attempted_at da tentativa, o snapshot mais recente registrado até aquele instante e o limite de idade configurado em CARBON_INTENSITY_MAX_AGE_MS. A requisição de indicadores usa esses snapshots já gravados, em vez de recalcular o passado com um fator ambiental atual. Sem um fator elegível, a amostra pode ter energia calculada e emissão nula.",
    keywords: [
      "intensidade de carbono",
      "carbon intensity",
      "fator regional",
      "fator de emissao",
      "regiao do servico",
      "region code",
      "snapshot",
      "snapshots",
      "gco2e por kwh",
      "gco2 kwh",
      "api de carbono",
    ],
  },
  {
    id: "emissions-calculation",
    intent: "METHODOLOGY",
    title: "Como o CO₂e é calculado",
    reference: "docs/calculos.md §7 e §9",
    summary:
      "A emissão de cada amostra é a energia em kWh multiplicada pela intensidade de carbono da região: CO₂e(g) = E(kWh) × intensidade(gCO₂e/kWh). No período, o GreenER soma as emissões das amostras calculáveis.",
    content:
      "Depois de estimar a energia, o GreenER calcula CO₂e_g = E_kWh × intensidade_carbono, com E em kWh e intensidade em gCO₂e/kWh. Por período, o total é a soma das emissões das amostras calculáveis, usando intervalo semiaberto start <= attempted_at < end. Amostras sem intensidade elegível não assumem emissão zero: permanecem nulas e podem tornar o período parcial.",
    keywords: [
      "como o co2 e calculado",
      "como o co2e e calculado",
      "como e calculado o co2",
      "como e calculada a emissao",
      "como calcula a emissao",
      "calculo de emissao",
      "calculo da emissao",
      "as emissoes",
      "emissao",
      "emissoes",
      "emissao de co2",
      "emissao de co2e",
      "emissoes de co2",
      "co2 equivalente",
      "co2e",
      "gco2e",
      "pegada de carbono",
      "soma das emissoes",
      "emissao por periodo",
    ],
  },
  {
    id: "methodology-overview",
    intent: "METHODOLOGY",
    title: "Visão geral das contas",
    reference: "docs/calculos.md §1",
    summary:
      "O GreenER estima as contas em quatro etapas: potência (W) → energia (kWh) → intensidade regional (gCO₂e/kWh) → emissão (gCO₂e). Tudo é calculado no backend com os dados de cada coleta e coeficientes assumidos pelo modelo v{{powerModelVersion}}.",
    content:
      "O fluxo de cálculo é: CPU, memória, disco e rede → potência estimada em watts → energia em kWh usando a duração real da amostra → intensidade de carbono regional em gCO₂e/kWh → emissão estimada em gCO₂e. O cálculo fica centralizado no backend e é reutilizado por indicadores, dashboard e histórico. Os resultados são estimativas ambientais, não medições físicas diretas de energia; detalhes e exemplo completo estão em docs/calculos.md.",
    keywords: [
      "as contas",
      "essas contas",
      "como sao calculados",
      "como sao calculadas",
      "como voces calculam",
      "como o greener calcula",
      "calculo ambiental",
      "calculos ambientais",
      "metodologia de calculo",
      "modelo de calculo",
      "passo a passo do calculo",
      "de onde vem os numeros",
      "origem dos numeros",
      "formula",
    ],
  },
  {
    id: "assumptions-limitations",
    intent: "METHODOLOGY",
    title: "Premissas e limitações",
    reference: "docs/calculos.md §10 e §12",
    summary:
      "Os valores são estimativas: o modelo usa coeficientes adotados (versão {{powerModelVersion}}), não medições físicas, e períodos com lacunas podem ficar parciais. Quando falta duração ou intensidade, energia ou emissão ficam nulas — o GreenER não assume zero.",
    content:
      "O GreenER não mede energia fisicamente; ele estima a partir das métricas coletadas. Lacunas possíveis incluem no_metrics, unavailable, error, invalid_metrics, collection_interval_unavailable e carbon_intensity_unavailable. Sem métricas válidas, energia e emissão ficam nulas; sem duração da amostra, a energia fica nula e COLLECTION_INTERVAL_MS não é usado como fallback; sem intensidade de carbono, a energia ainda pode ser calculada e a emissão fica nula. isPartial = true indica lacunas relevantes no período e não deve ser lido como medição completa do impacto real.",
    keywords: [
      "limitacoes",
      "limitacao",
      "quais sao as limitacoes",
      "premissas",
      "premissas do modelo",
      "o modelo e confiavel",
      "e confiavel",
      "precisao",
      "estimativa",
      "estimado",
      "dados parciais",
      "periodo parcial",
      "por que o periodo esta parcial",
      "ispartial",
      "lacunas",
      "nao mede",
      "medicao fisica",
      "por que o valor e nulo",
      "por que falta dado",
    ],
  },
  {
    id: "project-overview",
    intent: "PROJECT_INFO",
    title: "O que é o GreenER",
    reference: "README.md — O projeto",
    summary:
      "O GreenER é uma plataforma que usa métricas computacionais (CPU, memória, disco e rede) para estimar o consumo de energia e as emissões de CO₂e de serviços digitais, preservando o histórico para análise. Os valores são estimativas ambientais, não medições físicas.",
    content:
      "Empresas já monitoram CPU, memória, armazenamento, rede e disponibilidade das aplicações. O GreenER amplia esse olhar: usa essas métricas para estimar consumo de energia e emissão de CO₂e dos serviços, mantém o histórico operacional e permite analisar a evolução do ambiente. O projeto é um ABP do curso de Desenvolvimento de Software Multiplataforma (DSM) da FATEC Jacareí, desenvolvido pela equipe Let:zApplin em parceria com a Unilaunch. A fonte dos dados são o Agregador de Métricas e o Serviço de Intensidade de Carbono da Unilaunch.",
    keywords: [
      "o que e o greener",
      "o que e o projeto",
      "sobre o greener",
      "sobre o projeto",
      "para que serve o greener",
      "objetivo do greener",
      "greener",
      "plataforma",
      "monitoramento ambiental",
      "estimativa de energia",
      "estimativa de emissao",
      "unilaunch",
      "fatec",
      "abp",
      "dsm",
    ],
  },
  {
    id: "project-team",
    intent: "PROJECT_INFO",
    title: "Equipe e contexto acadêmico",
    reference: "README.md — Equipe",
    summary:
      "O GreenER é um projeto de ABP do curso de DSM da FATEC Jacareí, feito pela equipe Let:zApplin em parceria com a Unilaunch. A equipe tem Vitor Hirch (Scrum Master), Gustavo Koiti (Product Owner), Igor Souza, Marcello Campbell e Patricia R. Maidana.",
    content:
      "O projeto foi desenvolvido pela equipe Let:zApplin, do curso de Desenvolvimento de Software Multiplataforma da FATEC Jacareí, em parceria com a Unilaunch, no 2º semestre de 2026. Integrantes e papéis: Vitor Hirch (Scrum Master), Gustavo Koiti (Product Owner), Igor Souza (desenvolvedor), Marcello Campbell (desenvolvedor) e Patricia R. Maidana (desenvolvedora). A documentação fica na pasta docs do repositório, incluindo arquitetura, cálculos, API e registros das sprints.",
    keywords: [
      "quem fez o greener",
      "quem fez o projeto",
      "quem desenvolveu o projeto",
      "quem criou o projeto",
      "quem desenvolveu",
      "quem criou",
      "equipe do greener",
      "equipe",
      "autores",
      "integrantes",
      "scrum master",
      "product owner",
      "fatec jacarei",
      "faculdade",
      "unilaunch",
      "letzapplin",
      "projeto academico",
    ],
  },
  {
    id: "project-features",
    intent: "PROJECT_INFO",
    title: "O que dá para fazer na plataforma",
    reference: "README.md — O que o GreenER já faz",
    summary:
      "A plataforma permite monitorar os serviços, acompanhar indicadores ambientais, analisar o histórico de energia e emissões, comparar serviços em rankings e visualizar a localização geográfica.",
    content:
      "O GreenER faz descoberta e sincronização automática dos serviços, coleta periódica de CPU, memória, disco e rede, identificação de serviços removidos e estados success, no_metrics, unavailable e error. Exibe indicadores ambientais consolidados, dashboard e monitoramento geográfico. Em Análises, permite selecionar serviço e período, ver histórico de energia, gráfico temporal e lacunas. Há rankings de energia e emissões e comparação entre serviços.",
    keywords: [
      "o que da para fazer",
      "funcionalidades",
      "quais sao as funcionalidades",
      "quais as funcionalidades",
      "funcionalidades do greener",
      "recursos da plataforma",
      "o que voce faz",
      "o que voce sabe fazer",
      "quais telas",
      "telas do greener",
      "monitoramento",
      "analises",
      "dashboard",
      "mapa",
      "localizacao geografica",
      "ranking de servicos",
      "historico de energia",
      "como usar o greener",
      "me ajuda",
    ],
  },
  {
    id: "project-architecture",
    intent: "PROJECT_INFO",
    title: "Como o GreenER funciona",
    reference: "README.md — Como funciona",
    summary:
      "O backend descobre os serviços no Agregador de Métricas, coleta CPU, memória, disco e rede periodicamente, grava no PostgreSQL e calcula energia e CO₂e a partir do histórico; o frontend mostra monitoramento, análises e mapa.",
    content:
      "Fluxo do GreenER: o backend consulta o Agregador de Métricas em /services e sincroniza o catálogo; coleta cada serviço ativo em /metrics/{id}; persiste serviços, localizações, tentativas de coleta, métricas válidas, snapshots de intensidade de carbono e usuários no PostgreSQL; calcula energia e CO₂e; e expõe indicadores, dashboard e histórico. O frontend React consome a API e apresenta Monitoramento, Análises e visualização geográfica. O modelo de linguagem do assistente não acessa o banco: recebe fatos prontos do backend.",
    keywords: [
      "como funciona o greener",
      "como o greener funciona",
      "funcionamento",
      "arquitetura",
      "fluxo de dados",
      "descoberta de servicos",
      "coleta periodica",
      "agregador de metricas",
      "banco de dados",
      "postgresql",
      "backend",
      "frontend",
      "api",
      "servicos monitorados",
    ],
  },
];

const OVERVIEW_BY_INTENT: Record<ChatKnowledgeIntent, string> = {
  PROJECT_INFO: "project-overview",
  METHODOLOGY: "methodology-overview",
};

function normalize(value: string): string {
  return value
    .replace(/[₀-₉]/g, (character) =>
      String("₀₁₂₃₄₅₆₇₈₉".indexOf(character)),
    )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token !== "" && !STOPWORDS.has(token));
}

function matchesSingleKeyword(token: string, keyword: string): boolean {
  return (
    token === keyword ||
    token === `${keyword}s` ||
    token === `${keyword}es`
  );
}

function scoreSection(
  section: ChatKnowledgeSection,
  message: string,
  hint: string | null,
): number {
  const text = normalize(message);
  const messageTokens = new Set(tokenize(message));
  const titleTokens = new Set(tokenize(section.title));
  const hintText = hint === null ? "" : normalize(hint);

  const direct = scoreText(section, text, messageTokens, titleTokens);
  const context =
    hintText === ""
      ? 0
      : scoreText(
          section,
          hintText,
          new Set(tokenize(hintText)),
          titleTokens,
        ) * HINT_WEIGHT;

  return direct + (direct >= 2 ? context : 0);
}

function scoreText(
  section: ChatKnowledgeSection,
  text: string,
  tokens: Set<string>,
  titleTokens: Set<string>,
): number {
  let score = 0;

  for (const keyword of section.keywords) {
    const normalized = normalize(keyword);

    if (normalized.includes(" ")) {
      if (text.includes(normalized)) {
        score += 4;
      }
      continue;
    }

    for (const token of tokens) {
      if (matchesSingleKeyword(token, normalized)) {
        score += 2;
        break;
      }
    }
  }

  for (const token of titleTokens) {
    if (tokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

export function hasStrongKnowledgeCue(message: string): boolean {
  const text = normalize(message);
  return STRONG_KNOWLEDGE_CUES.some((cue) => text.includes(normalize(cue)));
}

function asksForExplanation(message: string): boolean {
  const text = normalize(message);
  return EXPLANATION_CUES.some((cue) => {
    const normalized = normalize(cue);
    return text === normalized || ` ${text} `.includes(` ${normalized} `);
  });
}

export function retrieveKnowledge(
  message: string,
  hint: string | null = null,
): ChatKnowledgeSection | null {
  if (normalize(message) === "") {
    return null;
  }

  let best: ChatKnowledgeSection | null = null;
  let bestScore = 0;

  for (const section of SECTIONS) {
    const score = scoreSection(section, message, hint);

    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }

  return bestScore >= KNOWLEDGE_THRESHOLD ? best : null;
}

export function classifyKnowledgeByRules(
  message: string,
  hasDataReference: boolean,
): ChatKnowledgeIntent | null {
  const section = retrieveKnowledge(message);

  if (section === null) {
    return null;
  }

  if (hasStrongKnowledgeCue(message)) {
    return section.intent;
  }

  if (!hasDataReference && asksForExplanation(message)) {
    return section.intent;
  }

  return null;
}

export function fallbackKnowledgeSection(
  intent: ChatKnowledgeIntent,
): ChatKnowledgeSection {
  const id = OVERVIEW_BY_INTENT[intent];
  return SECTIONS.find((section) => section.id === id) ?? SECTIONS[0];
}

export function renderKnowledgeSection(
  section: ChatKnowledgeSection,
  powerModel: ChatPowerModel,
): ChatKnowledgeSection {
  const values: Record<string, string> = {
    powerModelVersion: powerModel.version,
    cpuMaximumWatts: formatWatts(powerModel.cpuMaximumWatts),
    memoryWattsPerGb: formatDecimal(powerModel.memoryWattsPerGb),
    diskWattsPerGb: formatDecimal(powerModel.diskWattsPerGb),
    networkWattsPerGb: formatDecimal(powerModel.networkWattsPerGb),
  };

  const replace = (value: string) =>
    value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);

  return {
    ...section,
    summary: replace(section.summary),
    content: replace(section.content),
  };
}

function formatWatts(value: number): string {
  return `${formatDecimal(value)} W`;
}

function formatDecimal(value: number): string {
  return String(value).replace(".", ",");
}
