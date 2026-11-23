# Product Backlog - GreenER

← [Voltar ao índice da documentação](../README.md)

> Artefato mantido pelo **Product Owner** e refinado a cada Sprint.  
> **Atualização da consolidação da Sprint 3 — 23/11/2026.**
> Este registro consolida a implementação e as evidências técnicas da entrega final. Feedback externo recebido posteriormente deve ser registrado separadamente.
>
> A matriz RF01–RF15, as referências de implementação/testes e as evidências de autenticação e Docker estão no [manual de validação final](testes/manualdevalidacao.md).
>
> Além dos requisitos obrigatórios do MVP, a Sprint 3 entregou dois incrementos adicionais relevantes: **TEC34 — Workspace com layout adaptativo/personalizável** e **TEC39 — protótipo do assistente de IA Karma**. Eles são registrados neste Product Backlog por fazerem parte do produto efetivamente entregue, sem que sua presença implique, por si só, pontuação adicional na rubrica acadêmica.

---

## 1. Legenda

### Prioridade

| Valor | Significado |
| --- | --- |
| 🔴 **Alta** | Obrigatória para o MVP ou necessária para desbloquear requisitos centrais |
| 🟡 **Média** | Obrigatória/importante, mas depende da base funcional anterior |
| 🟢 **Baixa** | Refinamento ou extensão cujo escopo pode ser reduzido sem impedir o fluxo central |

### Status

| Status | Significado |
| --- | --- |
| ✅ Concluído | Implementado e tecnicamente verificado na versão atual |
| 🔄 Em revisão | Implementação funcional existe, mas ainda depende de revisão/integração final |
| 🔄 Parcial | Parte relevante existe, mas ainda falta critério obrigatório |
| ⏳ Planejado | Selecionado para Sprint futura |
| 🧪 Protótipo | Incremento funcional entregue em caráter experimental, fora do núcleo obrigatório do MVP |

---

## 2. Histórias de Usuário e Technical Stories

| ID | Como... | Quero... | Para... | Req. | Prioridade | Sprint | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US01 | usuário da plataforma | que o sistema identifique automaticamente os serviços disponíveis | acompanhar os serviços sem cadastro manual | RF01 | 🔴 Alta | S1 | ✅ Concluído |
| US02 | usuário da plataforma | que o sistema reconheça inclusão, remoção e retorno de serviços | manter o ambiente monitorado coerente com a fonte externa | RF02 | 🔴 Alta | S1 | ✅ Concluído |
| US03 | usuário da plataforma | que as métricas de cada serviço sejam coletadas periodicamente | acompanhar seu comportamento ao longo do tempo | RF03 | 🔴 Alta | S2 | ✅ Concluído |
| US04 | usuário da plataforma | que cada nova coleta considere a variação das métricas | representar corretamente as mudanças do ambiente | RF04 | 🔴 Alta | S2 | ✅ Concluído |
| US05 | usuário da plataforma | ser informado quando um serviço não responder ou estiver indisponível | saber quando seu monitoramento está comprometido | RF05 | 🔴 Alta | S2 | ✅ Concluído |
| US06 | usuário da plataforma | saber quando um serviço continua ativo mas não fornece métricas | diferenciar ausência de dados de indisponibilidade | RF06 | 🔴 Alta | S2 | ✅ Concluído |
| US07 | usuário da plataforma | visualizar energia e CO₂e de cada serviço | compreender seu impacto ambiental individual | RF07 | 🔴 Alta | S2 | ✅ Concluído |
| US08 | usuário da plataforma | visualizar indicadores consolidados | compreender rapidamente o estado geral do ambiente | RF08 | 🔴 Alta | S2 | ✅ Concluído |
| US09 | usuário da plataforma | visualizar um dashboard operacional | acompanhar serviços, métricas e impacto em um único lugar | RF09 | 🔴 Alta | S2 | ✅ Concluído |
| US10 | usuário da plataforma | que o dashboard seja atualizado automaticamente | acompanhar o ambiente sem recarregar a página | RF11, RNF02 | 🔴 Alta | S2 | ✅ Concluído |
| US11 | usuário da plataforma | consultar o histórico das coletas | analisar evolução de métricas e impacto ao longo do tempo | RF10 | 🔴 Alta | S2 | ✅ Concluído |
| US12 | usuário da plataforma | visualizar onde cada serviço está hospedado | relacionar localização e indicadores | RF12 | 🟡 Média | S2-S3 | ✅ Concluído — localização persistida e consolidada nas telas finais |
| US13 | usuário da plataforma | visualizar geograficamente serviços com coordenadas | entender sua distribuição espacial | RF13 | 🟡 Média | **S2 → S3** | ✅ Concluído — mapa integrado ao Monitoramento e consolidado na Sprint 3 |
| US14 | usuário da plataforma | ordenar serviços pelo impacto ambiental | identificar maiores e menores impactos no período | RF14 | 🔴 Alta | S3 | ✅ Concluído |
| US15 | usuário da plataforma | comparar dois ou mais serviços | compreender diferenças de métricas e impacto no mesmo período | RF15 | 🔴 Alta | S3 | ✅ Concluído |
| US16 | usuário autorizado | me autenticar para acessar recursos protegidos | impedir acesso não autorizado | RP06 | 🔴 Alta | S2 | ✅ Concluído |
| US17 | usuário da plataforma | projetar o impacto ambiental de um serviço em diferentes localidades | avaliar alternativas de hospedagem com menor emissão| RF16 | 🟡 Média | S3 | ✅ Concluído — projeção ambiental por localização implementada e coberta por testes automatizados |
| TS01 | usuário | utilizar a plataforma em diferentes tamanhos de tela | acompanhar dados em desktop e mobile | RNF01 | 🔴 Alta | S1-S3 | ✅ Concluído — interface responsiva e evidências desktop/mobile consolidadas |
| TS02 | usuário | que uma falha isolada não derrube o GreenER | continuar acompanhando os demais serviços | RNF04 | 🔴 Alta | S2-S3 | ✅ Concluído — regressão final executada; a captura manual controlada da falha HTTP parcial da comparação não foi reproduzida, mas a correção permanece registrada |
| TS03 | usuário | que a interface responda em tempo adequado | acompanhar continuamente o ambiente | RNF03 | 🟡 Média | S3 | ✅ Concluído — revisão de desempenho realizada, com lazy loading e pausa de polling; otimização adicional do bundle permanece como evolução não bloqueante |
| TS04 | equipe técnica | encontrar documentação coerente e reproduzível | executar, compreender e manter o projeto | RNF05 | 🔴 Alta | S1-S3 | ✅ Concluído — documentação da entrega final revisada e reconciliada |
| TEC34 | usuário da plataforma | personalizar páginas de acompanhamento com blocos adaptáveis | organizar o Workspace de acordo com o que desejo monitorar ou analisar | RF09, RNF01 | 🟡 Média | S3 | ✅ Concluído — Workspace com páginas personalizadas, widgets móveis/redimensionáveis e persistência de layout |
| TEC39 | usuário da plataforma | interagir com um assistente inteligente sobre os dados do GreenER | consultar informações da plataforma em linguagem natural | Incremento adicional | 🟢 Baixa | S3 | 🧪 Protótipo — Karma entregue como demonstração experimental e documentada separadamente |

---

## 3. Critérios de Aceitação

### Épico 1 - Descoberta, monitoramento e coletas

#### US01 - Descobrir serviços disponíveis
- [x] consultar o Agregador de Métricas;
- [x] identificar os serviços retornados.

**RF:** RF01

#### US02 - Acompanhar mudanças no catálogo
- [x] reconhecer novo serviço;
- [x] reconhecer serviço que deixa de aparecer em `/services`;
- [x] atualizar seu estado sem apagar o histórico;
- [x] reconhecer retorno e atualizar o estado novamente.

**RF:** RF02

#### US03 - Coletar métricas dos serviços
- [x] consultar `/metrics/{id_servico}` de forma real;
- [x] executar a consulta para cada serviço ativo;
- [x] persistir o resultado associado ao serviço;
- [x] executar a coleta periodicamente.

**RF:** RF03

#### US04 - Trabalhar com métricas variáveis
- [x] não assumir valores estáticos entre coletas;
- [x] persistir novas amostras sem sobrescrever o histórico;
- [x] processar normalmente valores diferentes entre requisições;
- [x] refletir novas coletas nas respostas e visualizações.

**RF:** RF04

---

### Épico 2 - Disponibilidade e qualidade da coleta

#### US05 - Identificar serviço indisponível
- [x] identificar falha/timeout durante a coleta individual;
- [x] registrar `unavailable` sem criar métricas artificiais;
- [x] sinalizar a indisponibilidade de forma coerente no frontend;
- [x] garantir que a falha de um serviço não interrompa os demais.

**RF:** RF05 | **Relacionado:** RNF04

#### US06 - Identificar ausência de métricas
- [x] reconhecer que o serviço continua presente em `/services`;
- [x] detectar ausência de métricas válidas;
- [x] diferenciar `no_metrics` de `unavailable`;
- [x] apresentar sinalização própria ao usuário.

**RF:** RF06

---

### Épico 3 - Impacto ambiental

#### US07 - Calcular impacto individual
- [x] calcular consumo energético estimado por serviço;
- [x] associar intensidade de carbono adequada à região e ao instante da coleta;
- [x] calcular emissão estimada de CO₂e;
- [x] persistir métricas, duração da amostra e snapshots necessários à consistência histórica;
- [x] documentar fórmula, unidades, fatores e exemplo em `docs/calculos.md`;
- [x] validar o cálculo com testes automatizados e exemplo manual.

**RF:** RF07

#### US08 - Visualizar indicadores gerais
- [x] consumo energético total;
- [x] emissão total;
- [x] quantidade de serviços ativos;
- [x] quantidade de serviços sem métricas;
- [x] quantidade de serviços indisponíveis;
- [x] dados provenientes do backend, sem valores fixos no frontend.

**RF:** RF08

---

### Épico 4 - Dashboard e atualização contínua

#### US09 - Dashboard operacional

Apresentar no Monitoramento:

- [x] estado de monitoramento;
- [x] localização disponível;
- [x] métricas reais;
- [x] consumo energético estimado;
- [x] emissão estimada de CO₂e;
- [x] indicadores consolidados do ambiente.

**RF:** RF09

#### US10 - Atualização automática
- [x] atualizar a interface sem reload manual;
- [x] definir e documentar intervalo de sincronização do catálogo;
- [x] definir e documentar intervalo de coleta de métricas;
- [x] definir atualização do frontend coerente com o backend;
- [x] informar data/hora da última atualização relevante ao usuário.

**RF:** RF11 | **RNF:** RNF02

---

### Épico 5 - Histórico e análise temporal

#### US11 - Histórico de coletas
- [x] possuir entidade que represente uma tentativa individual;
- [x] associar cada coleta ao serviço;
- [x] registrar data/hora e estado da tentativa;
- [x] preservar amostras anteriores;
- [x] consultar histórico por serviço e período;
- [x] preservar registros após reinicialização dos containers sem remoção do volume;
- [x] disponibilizar histórico ambiental para visualização em Análises.

**RF:** RF10

---

### Épico 6 - Distribuição geográfica

#### US12 - Localização do serviço
- [x] persistir país e região recebidos da API;
- [x] persistir/exibir cidade quando disponível;
- [x] consolidar localização e responsividade nas visualizações finais.

**RF:** RF12

#### US13 - Mapa dos serviços
- [x] usar latitude/longitude reais dos serviços fornecidas pela API;
- [x] apresentar no mapa os serviços com coordenadas;
- [x] manter serviços sem coordenadas disponíveis nas demais visualizações;
- [x] integrar o mapa ao **Monitoramento** como recurso operacional complementar;
- [x] permitir selecionar serviços agrupados quando compartilham coordenadas;
- [x] concluir revisão/integração e refinamentos finais na Sprint 3.

**RF:** RF13

> **Adaptação de escopo:** a US13 foi originalmente planejada para a Sprint 3, mas sua implementação funcional foi antecipada para a Sprint 2 durante a reformulação do Monitoramento e consolidada na Sprint 3.

---

### Épico 7 - Ranking e comparação

#### US14 - Ranking de impacto
- [x] ordenar por consumo energético estimado;
- [x] ordenar por emissão estimada de CO₂e;
- [x] utilizar dados agregados no período selecionado;
- [x] informar claramente o período considerado.

**RF:** RF14

**Evidência:** ranking manual validado para energia e CO₂e no período de 24 horas; ordem, período e sinalização de dados parciais registrados no [manual de validação final](testes/manualdevalidacao.md).

**Decisão de interpretação do Product Owner (21/11/2026):** serviços removidos com dados no período selecionado permanecem disponíveis para ranking e comparação histórica. No ranking, são identificados como “Removido”. A decisão relaciona as mudanças de catálogo (RF02), a preservação do histórico (RF10), o ranking (RF14) e a comparação (RF15).

**Ressalva de dados parciais (decisão do Product Owner, 21/11/2026):** o indicador atual no frontend é suficiente nesta etapa; a limitação será explicada ao cliente na apresentação final do MVP. Não declarar as amostras observadas como cobertura completa.

#### US15 - Comparação entre serviços
- [x] selecionar dois ou mais serviços;
- [x] comparar todos usando o mesmo período;
- [x] apresentar métricas e indicadores ambientais relevantes;
- [x] manter leitura simples e útil para tomada de decisão.

**RF:** RF15

**Evidência:** comparação manual de Audit Stream e Checkout Worker em 24 horas, com série temporal, totais, indicadores e gráfico do período; detalhes no [manual de validação final](testes/manualdevalidacao.md).

**Limite da validação manual:** a comparação com um serviço removido ainda não foi repetida manualmente; a decisão de mantê-lo disponível quando há dados no período está registrada acima.

---

### Épico 8 - Projeção ambiental

#### US17 - Projeção por localização

- [x] selecionar um serviço monitorado;
- [x] utilizar o consumo energético observado no período;
- [x] selecionar localidades alternativas;
- [x] manter energia constante entre os cenários;
- [x] recalcular CO₂e usando intensidade regional;
- [x] apresentar intensidade de carbono;
- [x] apresentar participação renovável quando disponível;
- [x] comparar cenário atual e cenários projetados;
- [x] sinalizar claramente que os valores são estimativas;
- [x] manter cálculo no backend.

**RF:** RF16

**Extensão entregue — redistribuição de serviços:**

- [x] utilizar a energia observada dos serviços no período para avaliar regiões alternativas, mantendo essa energia nos cenários projetados;
- [x] oferecer políticas de preservação das contagens atuais por região, distribuição balanceada e distribuição sem cotas;
- [x] informar inviabilidade quando as restrições de uma política não puderem ser atendidas, sem relaxá-las silenciosamente;
- [x] preservar serviços sem energia calculável e sinalizar dados parciais ou ausência de fatores regionais utilizáveis;
- [x] comparar emissões observadas e projetadas sobre a mesma cobertura de amostras, sem confundir ausência de dados com emissão zero;
- [x] apresentar os resultados como sugestões, sem executar migração real dos serviços.

**Evidência:** projeções e redistribuição possuem testes de serviço e HTTP no backend e testes de comparação de emissões no frontend. A interface está integrada; os roteiros e limites das evidências manuais estão no [manual de validação](testes/manualdevalidacao.md#14-validar-redistribuição-regional--api-e-frontend). A conclusão da implementação não significa que todos os cenários desse roteiro foram reproduzidos manualmente.

---

### Épico 9 - Autenticação e acesso protegido

#### US16 - Autenticação JWT
- [x] autenticar credenciais no backend;
- [x] gerar JWT após autenticação válida;
- [x] tratar senha de forma não reversível e segredo via variável de ambiente;
- [x] validar JWT antes de acessar recursos protegidos;
- [x] responder com `401` para token ausente/inválido/expirado;
- [x] aplicar autorização administrativa quando necessária;
- [x] garantir que proteção do frontend não seja o único controle de acesso.

**RP:** RP06

---

### Épico 10 - Workspace adaptável

#### TEC34 - Painéis adaptáveis e personalizáveis

- [x] manter uma página fixa de **Monitoramento** com visão operacional pronta para uso;
- [x] permitir ao usuário criar páginas próprias no Workspace;
- [x] permitir renomear e excluir páginas personalizadas;
- [x] disponibilizar widgets de monitoramento e análise para composição do layout;
- [x] permitir mover e redimensionar widgets dentro da grade;
- [x] permitir minimizar e expandir widgets;
- [x] permitir adicionar e remover blocos das páginas personalizadas;
- [x] persistir o arranjo criado pelo usuário localmente no navegador, por `localStorage`;
- [x] adaptar o layout para diferentes larguras de tela;
- [x] preservar a página de **Análises** como espaço dedicado, mantendo widgets analíticos também disponíveis no Workspace.

**Relacionado:** RF09, RNF01

**Resultado da Sprint 3:** o Monitoramento passa a fazer parte de um Workspace que oferece uma visão padrão pronta para uso e, ao mesmo tempo, permite que cada usuário organize páginas próprias de acordo com sua rotina.

A persistência do layout é local ao navegador e à origem da aplicação; não corresponde à gravação no PostgreSQL nem à sincronização entre dispositivos.

> **Observação de escopo:** TEC34 integra o incremento efetivamente entregue na Sprint 3 e é documentada por rastreabilidade do produto. Seu registro aqui não pressupõe pontuação independente na rubrica.

---

### Épico 11 - Assistente inteligente experimental

#### TEC39 - Protótipo do Camaleão IA Karma

- [x] disponibilizar uma interface conversacional integrada ao GreenER;
- [x] permitir consultas em linguagem natural sobre informações disponíveis na plataforma;
- [x] reutilizar regras e serviços determinísticos do backend para obtenção de fatos e valores;
- [x] evitar delegar ao modelo de linguagem os cálculos ambientais do produto;
- [x] preservar contexto durante a conversa dentro do escopo implementado;
- [x] documentar arquitetura, limitações e comportamento experimental;
- [x] registrar roadmap de evolução futura separado do escopo obrigatório do MVP.

**Classificação:** incremento adicional / protótipo experimental.

**Resultado da Sprint 3:** a Karma foi entregue como uma prova de conceito funcional que permite consultas conversacionais aos dados e recursos do GreenER, dentro dos limites do protótipo experimental.

> **Limitação conhecida:** o protótipo ainda não substitui as visualizações e fluxos determinísticos da plataforma. A documentação específica em `docs/assistente-ia.md` registra suas limitações atuais e o roadmap de evolução.

> **Observação de escopo:** TEC39 não corresponde a um requisito obrigatório original do MVP. Sua inclusão no Product Backlog registra uma evolução real do produto e não implica pontuação adicional automática na rubrica.

---

## 4. Technical Stories / Requisitos Não Funcionais

### TS01 - Responsividade
- [x] interface base responsiva;
- [x] navegação utilizável em diferentes larguras;
- [x] prototipação mobile realizada na Sprint 2;
- [x] revisar Monitoramento, Análises, ranking, comparação e mapa no fechamento da Sprint 3.

**RNF:** RNF01

### TS02 - Tolerância a falhas
- [x] falha de sincronização do catálogo não encerra o backend;
- [x] falha de um serviço não interrompe a coleta dos demais;
- [x] falha da Metrics API é tratada;
- [x] falha/ausência de intensidade é representada como lacuna;
- [x] falha transitória no frontend preserva os últimos dados válidos;
- [x] dados incompletos são sinalizados sem inventar valores;
- [x] registrar a regressão final e a interrupção/recuperação de backend;
- [x] preservar resultados válidos da comparação quando uma consulta de histórico falha isoladamente.

**RNF:** RNF04

> **Limite da evidência final:** a correção para falha HTTP parcial na comparação foi integrada e registrada, porém a equipe não localizou uma captura manual controlada reproduzindo especificamente esse cenário. A ausência dessa captura é documental e não é apresentada como funcionalidade pendente do MVP.

### TS03 - Desempenho
- [x] revisar intervalos de polling/sincronização/coleta;
- [x] analisar consultas históricas e agregações;
- [x] implementar lazy loading e pausa de polling em segundo plano;
- [x] reavaliar o bundle de produção e registrar o aviso de chunk acima de 500 kB como oportunidade de otimização futura, sem bloqueio do build atual.

**RNF:** RNF03

### TS04 - Documentação técnica
- [x] instruções de execução;
- [x] documentação de arquitetura;
- [x] documentação dos endpoints existentes;
- [x] modelo de dados e migrations atualizados;
- [x] `docs/calculos.md` coerente com o modelo v1;
- [x] README e registro da Sprint 2 atualizados no fechamento técnico;
- [x] manual de validação atualizado;
- [x] Sprint Review 2 realizada e registrada como ocorrência;
- [x] revisar novamente a documentação no fechamento da Sprint 3.

> O eventual feedback externo recebido após o fechamento deve ser registrado como nova ocorrência, sem manter a documentação final da Sprint 3 artificialmente aberta.

**RNF:** RNF05

---

## 5. Direcionamentos incorporados da Sprint Review 1

- manter a identidade visual limpa e o conceito adaptativo do camaleão;
- evoluir a adaptação de puramente visual para funcional;
- revisar banco, coletas e persistência antes de avançar no dashboard analítico;
- tratar histórico como base para gráficos, ranking e comparação;
- tornar o mapa funcional e conectado aos serviços reais;
- priorizar gráficos simples e legíveis;
- construir ranking e comparação com utilidade clara e período explícito;
- melhorar comentários em regras/decisões não óbvias e a comunicação técnica.

---

## 6. Adaptações registradas durante a Sprint 2

Antes da Sprint Review 2, já ocorreram duas adaptações de escopo verificáveis:

1. **US13 antecipada da Sprint 3 para a Sprint 2**, com implementação funcional do mapa no Monitoramento;
2. **TEC37 incorporada à Sprint 2** para reformular a apresentação dos indicadores do Monitoramento.

Na data em que essas adaptações foram registradas, a Sprint Review 2 ainda não havia ocorrido. Portanto, elas são registradas como decisões tomadas durante a execução, não como feedback do cliente.

---

## 7. Adaptações e incrementos registrados durante a Sprint 3

Durante a execução da Sprint 3, o Product Backlog evoluiu além do núcleo originalmente previsto para ranking, comparação e consolidação geográfica:

1. **TEC34 — Workspace/layout adaptativo:** o Monitoramento foi incorporado a um Workspace com página fixa e suporte à criação de páginas personalizadas, composição por widgets, movimentação, redimensionamento e persistência do arranjo;
2. **US17 — projeção ambiental por localização:** a funcionalidade foi concluída na Sprint 3 e passou a permitir comparação de cenários regionais mantendo constante o consumo energético observado;
3. **TEC39 — Karma:** foi desenvolvido um protótipo experimental de assistente inteligente para consultas em linguagem natural sobre os dados e recursos do GreenER.

Esses incrementos são registrados porque fazem parte da versão final demonstrada do produto. **TEC34 e TEC39 não devem ser interpretadas automaticamente como critérios adicionais de pontuação da rubrica**; sua documentação assegura rastreabilidade entre planejamento, implementação e entrega.

---

## 8. Histórico de alterações

| Data | Alteração | Responsável |
| --- | --- | --- |
| 29/09/2026 | Criação inicial do Product Backlog | Gustavo (Product Owner) |
| 18/10/2026 | Refinamento para fechamento da Sprint 1 | Gustavo (Product Owner) |
| 20/10/2026 | Revisão pós-Review 1 e planejamento das Sprints 2 e 3 | Equipe GreenER |
| 09/11/2026 | Atualização dos status após validação técnica da Sprint 2 e registro da antecipação da US13 | Equipe GreenER |
| 21/11/2026 | Registro das evidências e da decisão de interpretação para RF14/RF15; validação final RF01–RF15 e pendências mantidas explicitamente | Gustavo (Product Owner) |
| 23/11/2026 | Consolidação da Sprint 3: estados finais de US12/US13/US17 e RNF01–RNF05; registro do Workspace adaptativo (TEC34), do protótipo Karma (TEC39) e das limitações/evoluções não bloqueantes | Gustavo (Product Owner) |
| 23/11/2026 | Revisão de coerência documental: referências de histórico/ranking/comparação, critérios da redistribuição, persistência local e minimização do Workspace e descrição do protótipo Karma | Equipe GreenER |

---

<div align="center">
  <a href="../README.md">← Voltar ao Índice</a>
</div>
