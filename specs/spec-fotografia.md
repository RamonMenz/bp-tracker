# Especificação — Registro por fotografia do display

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** decisões técnicas definidas; implementação e validação pendentes.
**Referências:** TAP v1.0, de 22/09/2026, e [constituição do projeto](../constitution.md).

**Revisão documental (26/10, retomada em 27/10/2026):** [TASK-02: fontes, rastreabilidade, correções e pendências](../docs/revisao-specs.md). O [TAP original](../docs/fontes/Termo_de_Abertura_Aferi.docx) foi recebido e confrontado; P01 (origem após edição/sessão) e P02 (marco de decisão sem revisão posterior) permanecem pendentes. Recebimento não comprova aprovação. A [baseline](../docs/baseline-legado.md) e o [relatório das PoCs](../docs/pocs-fotografia-voz.md) delimitam código e execução comprovada; a integração ao produto continua pendente.

## 1. Objetivo e limites

Permitir que o usuário registre uma medição a partir de uma fotografia do display de um aparelho de pressão arterial, revisando e confirmando explicitamente os valores antes de salvar.

O fluxo atende Android e Web e complementa o formulário manual existente. Deve reconhecer sistólica e diastólica; pulso é opcional quando presente no display e identificado sem ambiguidade. O sistema transcreve números do aparelho, sem estimar pressão a partir de aparência física, diagnosticar ou prescrever.

Não fazem parte desta especificação: importação da galeria, reconhecimento contínuo, processamento em lote, armazenamento de fotografias, treinamento de modelos do zero, voz e geração de PDF. A arquitetura atual de autenticação, persistência e notificações deve ser preservada.

## 2. Invariantes

- O custo acumulado do projeto inteiro permanece limitado a **R$ 300,00**, incluindo eventual reconhecimento e hospedagem.
- Fotografias de uso são capturadas, processadas e descartadas em memória. Não podem ser gravadas em arquivo temporário, cache em disco, galeria, banco, Storage ou fila persistente de processamento.
- Imagem, texto extraído e valores clínicos não podem integrar logs, breadcrumbs, relatórios de falha ou telemetria. A mensagem de uma exceção do OCR também deve ser tratada como potencial conteúdo sensível; sanitizar apenas o contexto do logger não basta.
- Nenhum candidato reconhecido é criado ou atualizado no Firestore, inclusive em sua fila offline, antes da confirmação explícita.
- Permissão negada, falha no OCR, falta de conectividade ou indisponibilidade do provedor não podem bloquear o registro manual.
- A arquitetura escolhida na seção 6 processa as imagens localmente, sem envio a serviço de reconhecimento. A possibilidade genérica de serviço externo na constituição não autoriza um caminho remoto nesta entrega. Propor alternativa não autoriza adotá-la: observar o congelamento da decisão do TAP e o encaminhamento P02 antes de qualquer mudança, sem alterar a escolha vigente nesta revisão.

## 3. Fluxo do usuário

### 3.1 Entrada

1. Na tela de registro, o usuário escolhe **“Registrar por fotografia”**, sem remover ou deslocar o formulário manual a ponto de prejudicar seu uso.
2. O app explica brevemente: fotografar apenas o display, processar no próprio dispositivo, conferir os números e confirmar antes de salvar. Falta de recursos locais oferece retorno ao manual; não inicia envio externo como alternativa.
3. Somente após essa ação solicita acesso à câmera. A implementação web exige contexto seguro e disponibilidade da API de câmera.
4. Se a permissão for negada ou a câmera estiver indisponível, apresenta mensagem em português e ações para voltar ao registro manual ou tentar novamente quando possível. Não repete solicitações automaticamente.

### 3.2 Enquadramento e captura

1. Exibe orientação acessível para manter o display inteiro visível, aceso, estável e sem reflexos. O contorno visual é apenas apoio e não a única instrução.
2. O usuário aciona **“Capturar”**. Apenas uma captura é processada por vez; toques repetidos não iniciam operações concorrentes.
3. Produz um quadro em memória. APIs que primeiro salvam uma foto e depois a leem, mesmo com exclusão imediata, não atendem à constituição.
4. O usuário pode cancelar a qualquer momento antes do salvamento. A câmera deve ser liberada ao sair da captura e ao colocar o app em segundo plano; conteúdo transitório é descartado ao abandonar o fluxo.

### 3.3 Reconhecimento e interpretação

1. Mostra estado **“Lendo os valores…”**, sem bloquear a navegação para cancelar.
2. Eventual recorte, rotação, ajuste de contraste e conversão de formato ocorrem em memória.
3. O OCR devolve texto e, quando disponíveis, posições e indicadores de confiança. Uma etapa separada associa os números a sistólica, diastólica e pulso, considerando rótulos como SYS/DIA/PUL e a organização do display.
4. Horário, data, números de memória e ícones do aparelho não podem ser interpretados como valores de pressão por simples ordem de ocorrência.
5. Não usa a última medição, médias históricas ou valores padrão para completar campos ausentes. Ambiguidade entre sistólica e diastólica não pode ser resolvida por troca silenciosa dos números.
6. Resultado parcial ou ambíguo é apresentado como tal; campos incertos ficam vazios e identificados para preenchimento pelo usuário. Pulso ausente permanece vazio.
7. O tempo máximo de processamento será definido na prova de conceito. Ao excedê-lo, encerra a tentativa com mensagem amigável, sem salvar; oferece nova captura ou registro manual.

### 3.4 Revisão e confirmação

1. Exibe os candidatos em campos editáveis, com rótulos claros, unidades e aviso **“Confira os valores com o display do aparelho antes de salvar.”**
2. Apresenta data e hora editáveis, inicialmente correspondentes ao instante da captura. Uma data impressa no display não substitui esse valor automaticamente.
3. Oferece **“Tirar outra fotografia”**, **“Cancelar”** e **“Confirmar e salvar medição”**. Nova captura descarta os candidatos anteriores; cancelar não altera o histórico.
4. Aplica as validações existentes, sem introduzir faixas clínicas novas: sistólica inteira de 50 a 300 mmHg; diastólica inteira de 30 a 200 mmHg; sistólica maior que diastólica; pulso opcional inteiro de 20 a 250 bpm. Data e observação seguem as regras atuais do formulário e do repositório.
5. O botão de confirmação fica desabilitado enquanto os campos obrigatórios estiverem ausentes ou inválidos. Alta confiança do OCR nunca dispensa revisão e confirmação.
6. Só a ação explícita **“Confirmar e salvar medição”** autoriza a escrita dos valores exibidos, já incorporando eventuais correções. Capturar, avançar, aceitar permissões ou concluir o OCR não autoriza salvar.

### 3.5 Persistência e encerramento

1. Após confirmação, reutiliza o caminho de validação e persistência das medições, com schema, hook e repositório; componentes não acessam diretamente o Firestore.
2. Persiste somente os dados da medição e eventual origem definida na decisão de modelagem. Nunca anexa imagem, texto bruto, coordenadas de OCR ou confiança ao documento clínico.
3. Impede submissão duplicada enquanto a confirmação está em andamento. Em falha, mantém os campos numéricos para nova tentativa explícita, sem repetir a escrita automaticamente por ação da interface.
4. No sucesso, utiliza o feedback existente e mantém o comportamento da sugestão opcional de segunda medição. Qualquer futura entrada por fotografia nessa segunda leitura também exige revisão e confirmação.
5. Descarta buffers e referências de mídia assim que deixam de ser necessários, cancela operações e ignora respostas tardias após cancelamento, nova captura, saída ou troca de sessão. Esse descarte não deve ser descrito como garantia de sobrescrita física da memória de um runtime gerenciado.

## 4. Integração e preservação do legado

- Seguir `app/ → features/ → services/`, com interpretação determinística isolada e testável. Diferenças de câmera e OCR entre Android e Web ficam em adaptadores por plataforma.
- Carregar recursos pesados de captura/OCR sob demanda, sem inicializar câmera ou modelos durante o uso manual.
- Na baseline, modelo/schema/rules aceitavam apenas manual. A preparação da [TASK-11](../docs/task-11-persistencia-local.md), incorporada à staging pelo PR #62 e preservada nesta unificação, já amplia os três coordenadamente para manual/photo/voice. A origem escolhida é `source: 'photo'`; a preparação não comprova homologação nem conecta o escritor assistido às rotas clínicas.
- O caminho manual continua gerando manual; o repositório preparado preserva origem no update, inclusive em sessões, materializando localmente a opção conservadora de [P01](../docs/revisao-specs.md#p01-origem). Falta registrar seu aceite formal antes da habilitação clínica. A segunda leitura continua atualizando o mesmo documento com média arredondada e detalhes; editar apenas nota/data preserva detalhes, enquanto corrigir números/pulso os remove no legado.
- Caso o modelo mude, atualizar coordenadamente tipos, schema, rules e testes negativos, revisando a necessidade de índices. Documentos antigos devem continuar legíveis, editáveis e exportáveis, incluindo `sessionReadings`.
- Data e observação preservam o contrato atual: até 280 caracteres de nota, tolerância de futuro de 60 segundos no Zod e de 5 minutos nas rules. Essas tolerâncias existentes não são autorização para inferir data a partir do display ou relaxar validações.
- A persistência do registro confirmado continua seguindo o comportamento existente. Não presumir persistência offline de Firestore no Android: o código atual usa o SDK JS com `getFirestore`; a garantia deve ser verificada na plataforma.
- Os controles mantêm alvos de toque de pelo menos 48 dp, texto de corpo de pelo menos 16 px, escala de fonte, contraste AA, rótulos para leitores de tela e acesso por teclado na Web. Estados de erro e campos incertos não dependem somente de cor.

## 5. Critérios de aceite

| ID | Cenário | Resultado verificável |
|---|---|---|
| FOT-01 | Abrir o app e registrar manualmente sem conceder câmera | O fluxo legado permanece disponível; câmera e OCR não são inicializados. |
| FOT-02 | Escolher fotografia com permissão ainda não concedida | A solicitação ocorre no contexto da ação; recusa oferece saída funcional para o manual. |
| FOT-03 | Fotografar display legível com sistólica, diastólica e pulso | Campos identificados aparecem para revisão; nenhuma escrita ocorre antes da confirmação. |
| FOT-04 | Reconhecer apenas parte dos campos ou encontrar associação ambígua | Não inventa valores nem troca números silenciosamente; permite corrigir ou capturar novamente. |
| FOT-05 | Reconhecer valor fora de faixa ou sistólica menor ou igual à diastólica | Exibe erro por campo e impede confirmação até correção. |
| FOT-06 | Corrigir um candidato e confirmar | Salva os valores revisados pelo usuário, uma única vez, usando o repositório existente. |
| FOT-07 | Cancelar durante captura, processamento ou revisão | Nenhuma medição é criada/alterada; câmera e mídia transitória são liberadas; respostas tardias não restauram o fluxo. |
| FOT-08 | Repetir toques em captura ou confirmação | Não cria processamentos concorrentes nem registros duplicados. |
| FOT-09 | OCR falhar, exceder o limite de tempo ou recursos locais necessários estarem indisponíveis | Mensagem amigável permite nova tentativa ou manual; nenhum candidato é salvo nem enviado a reconhecedor remoto. |
| FOT-10 | Inspecionar captura, pré-processamento, falhas e encerramento nas duas plataformas | Nenhuma mídia é persistida, inclusive em arquivos temporários, caches ou componentes de terceiros. Se houver persistência inevitável, a abordagem é reprovada. |
| FOT-11 | Inspecionar logs e relatórios de falha com entrada reconhecida e exceção contendo dados clínicos | Imagem, texto extraído e valores clínicos não são enviados aos coletores. |
| FOT-12 | Inspecionar rede no caminho local escolhido, incluindo falhas e falta de conectividade | Nenhuma imagem, texto extraído ou valor candidato é enviado a serviço de reconhecimento. Distinguir download de assets estáticos, serviços legados e escrita Firestore posterior à confirmação; indisponibilidade não ativa nuvem. |
| FOT-13 | Consultar, editar e exportar registros anteriores e sessões de duas leituras | Mantém compatibilidade e comportamento do legado; isolamento entre contas continua protegido pelas rules. |
| FOT-14 | Navegar por teclado/leitor de tela e ampliar fonte | Captura, erros, revisão, correção, cancelamento e confirmação permanecem compreensíveis e operáveis. |
| FOT-15 | Comparar o registro manual antes e depois da integração em condições equivalentes | Não há perda funcional nem degradação atribuível à nova modalidade; registrar tempos e condições da comparação. |
| FOT-16 | Encerrar sessão ou colocar o app em segundo plano durante o fluxo | Interrompe captura e descarta mídia; resultado de uma sessão não pode ser salvo por outra conta. |

Os critérios devem ser verificados em Android real e nos navegadores Web declarados como suportados na decisão técnica. Testes unitários cobrem interpretação e validação; testes de integração cobrem confirmação, cancelamento e persistência; inspeção em runtime cobre câmera, armazenamento e rede. Mocks isolados não comprovam ausência de arquivos temporários.

## 6. [DECISÕES DO ENGENHEIRO]

### 6.1 Tecnologias de OCR escolhidas

A decisão de arquitetura é **Google ML Kit Text Recognition com modelo latino embarcado no Android** e **Tesseract.js com modelo neural LSTM em Web Worker na Web**. Ambos executam inferência local com modelos pré-treinados, sem treinamento do zero ou serviço complementar de reconhecimento.

| Plataforma | Escolha definitiva | Justificativa | Condições de implementação |
|---|---|---|---|
| Android | ML Kit Text Recognition, modelo latino embarcado, por módulo nativo compatível com Expo Dev Client | Inferência local, sem cobrança por leitura e sem distribuir um modelo multimodal grande; o modelo embarcado evita depender de download na primeira leitura | Receber quadro em memória por `media.Image`, `ByteBuffer` ou equivalente; comprovar compatibilidade com Expo SDK 57 e auditar bridge, armazenamento e rede. Modelos e métricas técnicas do SDK não autorizam envio de conteúdo clínico |
| Web | Tesseract.js, modelo LSTM pré-treinado e execução em Web Worker | OCR neural local, sem API paga; worker isola o processamento da interface | Receber canvas/`ImageBitmap` ou buffer compatível, carregar motor/modelo sob demanda e validar memória em navegador móvel. Cache de assets estáticos não pode incluir fotografias ou resultados |

**Custo de inferência:** R$ 0,00 por leitura. Distribuição de assets, builds, equipamentos e demais despesas continuam sujeitos ao teto global de **R$ 300,00**. Não há contratação de OCR em nuvem nesta arquitetura.

Esse valor descreve a ausência planejada de tarifa de API por inferência local, não despesa realizada, saldo disponível ou medição de custo total. Horas/despesas reais permanecem **não informado**, conforme a TASK-01; versões do motor, binding e modelo efetivamente adotadas serão registradas na PoC. As fontes consultadas estão na revisão da TASK-02 e não comprovam compatibilidade executada.

APIs Cloud Vision, Gemini e Claude foram descartadas do fluxo clínico por introduzirem transmissão de imagens, dependência de rede e condições de retenção. Modelos multimodais locais, como LLaVA e Moondream, acrescentam memória e esforço incompatíveis com a prioridade deste ciclo individual de aproximadamente 100 horas. Digital Ink não atende fotografias: sua entrada são traços de escrita.

A escolha não comprova acurácia em displays de sete segmentos. Nenhuma confiança do motor ou validação de faixa substitui a revisão explícita do usuário.

### 6.2 Captura e pré-processamento

- **Android:** usar captura de quadro em memória por integração nativa de câmera, compatível com o Dev Client, entregando o buffer ao ML Kit. Excluir APIs que primeiro gravam foto em cache, mesmo que retornem base64 ou apaguem o arquivo depois. O binding concreto deve cumprir esse contrato; sua adoção depende de inspeção, sem reabrir a escolha do motor.
- **Web:** usar `getUserMedia` e quadro em canvas/`ImageBitmap` ou buffer equivalente, sem download, IndexedDB, OPFS ou cache de mídia. Encerrar tracks e liberar referências ao sair.
- **Pré-processamento:** limitar a recorte do display, orientação e normalização em memória, medindo seu efeito. Não acrescentar OpenCV como dependência operacional nesta entrega.
- **Interpretação:** associar campos por rótulos e organização do display em lógica determinística compartilhada. Ambiguidades ficam explícitas para correção; não completar a partir do histórico ou trocar campos silenciosamente.
- Carregar câmera e OCR somente ao entrar na modalidade. Cancelar operações e ignorar resultados tardios na saída, nova captura, segundo plano ou troca de conta.

### 6.3 Validação e comparação da decisão

1. Validar primeiro os critérios eliminatórios: captura e processamento em memória, ausência de logs clínicos, inferência local, confirmação obrigatória, compatibilidade com o legado, orçamento e prazo até 15/12/2026. Se a integração falhar nesses critérios, não habilitar o caminho incompatível nem recorrer à nuvem automaticamente.
2. Comparar pelo menos duas abordagens viáveis sobre o mesmo conjunto rotulado, sem obrigar dois motores em produção. Usar ML Kit e Tesseract.js em ambientes compatíveis e registrar diferenças de hardware e plataforma, sem atribuir toda diferença de resultado apenas ao motor.
3. Construir casos próprios com pelo menos dois modelos de aparelho, exigência expressa em Premissas do TAP (P107), variando iluminação, inclinação, reflexo, foco, ausência de pulso e números acessórios. Separar ajuste de regras e avaliação final; não usar capturas de usuários do produto como dataset. Procedimentos envolvendo terceiros dependem de aprovação prévia da orientadora (P048); a PoC com recursos próprios e entradas sintéticas não comprova essa autorização.
4. Medir acerto exato por campo e do par sistólica/diastólica, trocas, reconhecimento incorreto apresentado como válido, ausência de resultado, inicialização, latência, memória e tamanho adicionado ao app. Registrar p50/p95 quando a amostra permitir, versões, configurações e resultados por aparelho/plataforma.
5. Fixar metas quantitativas e timeout a partir da prova de conceito, antes da avaliação final. Esses parâmetros são resultados de validação; a decisão de arquitetura está fechada, mas não implica desempenho já medido.
6. Incorporar comparação, limitações, custos e cobertura comprovada ao relatório técnico final. O prazo do TAP permanece: integração em 27/10, comparação em 10/11 e conclusão em 15/12/2026; a escolha registrada agora não deve ser retrodatada para o marco de 06/10.

### 6.4 Integração definitiva e parâmetros de validação

- Usar adaptadores por plataforma com contrato comum de candidatos e interpretação pura; manter o formulário manual disponível em falhas e indisponibilidade.
- Registrar origem `source: 'photo'` somente após confirmação explícita. Na implementação, atualizar conjuntamente tipo, schema Zod, Security Rules e testes negativos, revisar índices e preservar `source: 'manual'`, documentos antigos e `sessionReadings`.
- Persistir somente os campos clínicos revisados e a origem; imagem, texto bruto, posições e confiança permanecem transitórios. Não enfileirar escrita offline antes de confirmar.
- Validar versões Android/navegadores suportados, layouts de display, limites de memória, acurácia e timeout. Publicar a cobertura real sem prometer suporte universal ou conformidade apenas pela escolha da biblioteca.

## 7. Evidências de conclusão

A modalidade estará concluída quando os critérios de aceite tiverem evidências registradas, a comparação e a decisão técnica estiverem documentadas, e o fluxo estiver integrado às duas plataformas sem violar a constituição. Registrar limitações e casos não suportados explicitamente. Se nenhuma abordagem satisfizer as restrições, declarar o resultado e os limites investigados conforme a premissa do TAP, sem apresentar reconhecimento inseguro como entrega concluída.
