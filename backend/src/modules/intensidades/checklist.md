# Checklist consolidada

**Nenhum arquivo foi alterado.** Esta versão incorpora as decisões tomadas e separa o que já está definido do que ainda depende do grupo.

### Decisões já definidas

- **API externa:** Carbon API configurada como `CARBON_API_URL`; documentação em [carbon.unilaunch.org/docs](https://carbon.unilaunch.org/docs).
- **Associação regional:** usar `region_code` como identidade da região; cidade não determina a associação do fator.
- **Histórico:** sincronizar o catálogo e guardar snapshots. Os cálculos devem usar o snapshot mais recente registrado antes ou no instante da coleta.
- **Fator desatualizado:** a idade máxima será configurável pelo `.env`, sem definir agora um valor ou padrão.
- **API externa:** primeira integração consulta e valida o catálogo completo; mapeamento e regras de negócio ficam no Service.
- **Controller:** a resposta de sincronização deve informar snapshots inseridos, sem o campo `updated`.
- **Autenticação:** todas as rotas do módulo exigirão JWT.
- **Prefixo futuro:** `/api/intensidades`.
- **Frontend:** não escolherá snapshots; consumirá resultados ambientais calculados pelo backend.
- **Testes:** ficam para o final, depois que o código das camadas estiver implementado.

## 0. Contrato e decisões pendentes

- [X] Confirmar formato de `GET /regions`: `{ regions, total }`.
- [X] Confirmar nomes dos campos, incluindo `code`, `carbon_intensity_gco2e_per_kwh` e `renewable_share_percent`.
- [X] Confirmar a unidade de intensidade documentada: `gCO₂e/kWh`.
- [X] Confirmar a associação regional por código.
- [ ] Definir com o grupo o **valor** da idade máxima do snapshot.
- [ ] Decidir se essa variável de ambiente será obrigatória ou terá um padrão.
- [ ] Definir como cálculos e endpoints indicarão que não há snapshot suficientemente recente. Não se deve usar silenciosamente um valor antigo.
- [ ] Considerar que a API não fornece histórico nem horário de vigência: o sistema só poderá registrar o instante em que observou cada valor.

**Pronto quando:** as regras temporais e o comportamento para dados desatualizados estiverem acordados, mesmo que o limite continue configurável.

## 1. Repository

Arquivos: `intensidades.repository.ts`, `localidades.repository.ts` e `schema.sql`.

- [ ] Manter a persistência de **histórico**: uma nova sincronização deve poder inserir novos snapshots sem substituir os anteriores.
- [ ] Criar uma consulta histórica por `region_code` e instante: localizar o snapshot mais recente com `registered_at` anterior ou igual ao horário da coleta.
- [ ] Aplicar a idade máxima configurada para decidir se o snapshot encontrado ainda pode ser usado.
- [ ] Garantir que intensidade e participação renovável sejam lidas do **mesmo snapshot**.
- [ ] Resolver a ambiguidade atual de localização: o schema permite várias cidades para o mesmo código regional, enquanto a busca existente seleciona uma localização sem ordenação. O fator regional não deve parecer específico de uma cidade arbitrária.
- [ ] Preservar a listagem do histórico com localização e horário de registro.

**Pronto quando:** o repository puder fornecer o fator correto para uma região e um instante passado, ou indicar que não há um snapshot utilizável.

## 2. Service

Arquivo: `intensidades.service.ts`.

- [ ] Mapear o envelope `{ regions, total }` e seus campos snake_case para tipos internos.
- [ ] Validar os dados da resposta em runtime; uma interface TypeScript não valida o JSON recebido.
- [ ] Usar `code` como código da região e associá-lo a `region_code`.
- [ ] Persistir um snapshot por região em cada sincronização bem-sucedida.
- [ ] Remover a ramificação incompleta para registros existentes: o fluxo histórico insere novos snapshots, não deixa o bloco de atualização vazio.
- [ ] Implementar a consulta temporal necessária aos cálculos e tratar snapshot ausente ou desatualizado conforme a política definida.
- [ ] Definir `registered_at` como horário em que o backend observou/registrou o valor, não como horário de vigência fornecido pela API — pois a API não documenta esse último.

**Pronto quando:** descoberta, sincronização histórica e seleção temporal estiverem coerentes com as decisões acima.

## 3. Controller

Arquivo: `intensidades.controller.ts`.

- [ ] Corrigir comentários e mensagens copiados de serviços.
- [ ] Padronizar as chaves de resposta. Atualmente a descoberta usa `intensities` e a listagem usa `intensidades`.
- [ ] Informar na resposta da sincronização somente a quantidade de snapshots inseridos, sem `updated`.
- [ ] Continuar encaminhando erros ao middleware global por `next(error)`.

**Pronto quando:** as respostas tiverem um contrato consistente e descreverem a semântica de histórico.

## 4. Routes

Arquivo: `intensidades.routes.ts`.

- [ ] Manter os caminhos relativos de descoberta, sincronização e listagem.
- [ ] Exigir JWT em **todas** as rotas.
- [ ] Conferir que cada handler corresponda ao método e à resposta definidos no Controller.

**Pronto quando:** as rotas estiverem configuradas e protegidas, ainda que ainda não registradas no Express.

## 5. Integração externa

Arquivo existente: `carbon-api.ts`. O arquivo está vazio; `metrics-api.ts` serve como referência de organização, mas faz cast direto do JSON sem validação de runtime.

- [ ] Implementar uma função para consultar o catálogo em `GET {CARBON_API_URL}/regions`.
- [ ] Aplicar o timeout já configurado para APIs externas.
- [ ] Tratar erros HTTP, timeout, conexão e corpo inválido como falha explícita da API externa.
- [ ] Validar o envelope e os campos da resposta antes de retorná-la.
- [ ] Deixar o mapeamento para o modelo interno e as regras de persistência no Service.
- [ ] Não incluir consulta individual por região neste primeiro escopo.

**Pronto quando:** o Service puder consumir um catálogo validado por uma interface interna clara.

## 6. `app.ts`

Arquivo: `app.ts`.

- [ ] Somente depois de o módulo estar funcional, importar suas rotas.
- [ ] Registrar o router sob `/api/intensidades`.
- [ ] Manter `errorMiddleware` depois das rotas.

**Pronto quando:** o Express expuser o prefixo escolhido e encaminhar os erros ao middleware global.

## 7. Frontend e documentação da API

- [ ] O frontend consumirá resultados ambientais calculados pelo backend; não decidirá qual snapshot aplicar.
- [ ] Se surgirem telas administrativas para descoberta, sincronização ou consulta, criar cliente e tipos de intensidades seguindo o padrão de `serviceApi.ts`.
- [ ] Qualquer cliente dessas rotas deverá enviar o JWT, pois todas estarão protegidas.
- [ ] Documentar prefixo, autenticação, formato das respostas e erros depois de o contrato do backend estar estável.

## 8. Testes e validação — última etapa

O teste atual em `intensidades.service.test.ts` ainda referencia `ServicosService`, `ExternalService`, `servicos.repository` e `metricsApiUrl`; portanto, precisa ser substituído por testes próprios do módulo.

- [ ] Testar resposta válida e envelope malformado da API.
- [ ] Testar falhas HTTP, conexão e timeout.
- [ ] Testar o mapeamento dos campos externos para os internos.
- [ ] Testar a persistência de snapshots em sincronizações sucessivas.
- [ ] Testar seleção por `region_code`, instante da coleta e limite de atualidade.
- [ ] Testar respostas e encaminhamento de erros do Controller.
- [ ] Testar JWT nas três rotas e o registro do prefixo quando o módulo for integrado ao Express.
- [ ] Executar testes direcionados e `typecheck`.

**Resultados já observados:** o teste atual falhou nos quatro casos porque `ServicosService` não é um construtor/exportação do módulo de intensidades. O `typecheck` também apontou esses imports e um erro separado já existente em `servicos.service.ts`, relacionado a `region_code` e `regionCode`. Esses problemas devem ser distinguidos ao validar as mudanças futuras.

Assim, quando as camadas estiverem implementadas, poderemos comparar o código final com esta checklist e fazer a revisão/auditoria novamente, sem confundir os itens já decididos com as pendências que ainda dependem do grupo.
