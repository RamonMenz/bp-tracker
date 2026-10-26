# Especificação — Registro por fotografia do display

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** proposta funcional; escolha de OCR pendente de comparação técnica.  
**Referências:** TAP v1.0, de 22/09/2026, e [constituição do projeto](../constitution.md).

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

## 3. Fluxo do usuário

### 3.1 Entrada

1. Na tela de registro, o usuário escolhe **“Registrar por fotografia”**, sem remover ou deslocar o formulário manual a ponto de prejudicar seu uso.
2. O app explica brevemente: fotografar apenas o display, conferir os números e confirmar antes de salvar. Se houver processamento externo, informa previamente o envio e sua finalidade; sem concordância com esse envio, oferece retorno ao manual.
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
- O modelo atual, o schema Zod e as Security Rules aceitam apenas `source: 'manual'`. A origem de uma medição assistida precisa de decisão explícita antes da implementação; não basta enviar um novo valor de `source` ao repositório.
- Caso o modelo mude, atualizar coordenadamente tipos, schema, rules e testes negativos, revisando a necessidade de índices. Documentos antigos devem continuar legíveis, editáveis e exportáveis, incluindo `sessionReadings`.
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
| FOT-09 | OCR falhar, exceder o limite de tempo ou provedor externo ficar sem rede | Mensagem amigável permite nova tentativa ou manual; nenhum candidato é salvo. |
| FOT-10 | Inspecionar captura, pré-processamento, falhas e encerramento nas duas plataformas | Nenhuma mídia é persistida, inclusive em arquivos temporários, caches ou componentes de terceiros. Se houver persistência inevitável, a abordagem é reprovada. |
| FOT-11 | Inspecionar logs e relatórios de falha com entrada reconhecida e exceção contendo dados clínicos | Imagem, texto extraído e valores clínicos não são enviados aos coletores. |
| FOT-12 | Usar serviço externo candidato | O envio é informado antes de ocorrer; há evidência de atendimento às restrições de processamento, retenção e logs, além de custo compatível com o teto global. |
| FOT-13 | Consultar, editar e exportar registros anteriores e sessões de duas leituras | Mantém compatibilidade e comportamento do legado; isolamento entre contas continua protegido pelas rules. |
| FOT-14 | Navegar por teclado/leitor de tela e ampliar fonte | Captura, erros, revisão, correção, cancelamento e confirmação permanecem compreensíveis e operáveis. |
| FOT-15 | Comparar o registro manual antes e depois da integração em condições equivalentes | Não há perda funcional nem degradação atribuível à nova modalidade; registrar tempos e condições da comparação. |
| FOT-16 | Encerrar sessão ou colocar o app em segundo plano durante o fluxo | Interrompe captura e descarta mídia; resultado de uma sessão não pode ser salvo por outra conta. |

Os critérios devem ser verificados em Android real e nos navegadores Web declarados como suportados na decisão técnica. Testes unitários cobrem interpretação e validação; testes de integração cobrem confirmação, cancelamento e persistência; inspeção em runtime cobre câmera, armazenamento e rede. Mocks isolados não comprovam ausência de arquivos temporários.

## 6. [DECISÕES DO ENGENHEIRO]

### 6.1 Alternativas de bibliotecas e serviços de OCR

As opções abaixo são **candidatas para investigação**, não dependências aprovadas. Compatibilidade, manutenção, suporte a buffers, preços e políticas de retenção devem ser conferidos na documentação vigente e comprovados na prova de conceito antes da seleção.

| Alternativa | Aplicação possível | Vantagens a investigar | Limitações e condições de elegibilidade |
|---|---|---|---|
| Google ML Kit Text Recognition, por integração nativa Expo/React Native | Android, processamento no dispositivo | Reconhecimento local e possibilidade de trabalhar com quadros da câmera, sem servidor de OCR | Não oferece a mesma integração nativa na Web. Avaliar bridge mantida ou módulo nativo, compatibilidade com Expo SDK 57 e entrada em memória. Wrapper que exija foto em arquivo é inelegível. Medir desempenho em dígitos de sete segmentos. |
| Tesseract.js, com WebAssembly e worker | Web, processamento local | Pode receber imagem em memória e evita envio do display a terceiros | Inicialização, memória e tamanho do modelo podem afetar celulares. OCR de texto comum pode falhar em displays de sete segmentos. Não presumir compatibilidade direta com React Native nativo. Distinguir cache de modelo estático de persistência proibida da foto. |
| Tesseract nativo, por bridge ou módulo Expo | Android, processamento local | Permite investigar o mesmo motor de OCR em outra plataforma | Exige integração nativa e validação de buffers sem arquivos temporários. Avaliar manutenção, tamanho do binário e esforço para uma pessoa; não presumir que bindings existentes atendam às restrições. |
| OpenCV com segmentação determinística de dígitos de sete segmentos | Android/Web, como pré-processamento ou abordagem comparativa | Explora a estrutura dos displays sem treinar modelo do zero; pode reduzir ambiguidades em imagens controladas | OpenCV não é, por si só, um OCR pronto. Exige localização, segmentação e interpretação próprias; sensível a reflexos, inclinação e modelos de aparelho. Comparar esforço e robustez com os motores de OCR. |
| Google Cloud Vision — reconhecimento de texto | Android/Web por serviço complementar | OCR gerenciado como alternativa comparativa | Envia imagem clínica para terceiro. Verificar custos, retenção, logs e processamento sem persistência; não presumir que uma camada gratuita ou API síncrona garanta conformidade. Credenciais nunca ficam no cliente. |
| Azure AI Vision — OCR/Read, conforme API vigente | Android/Web por serviço complementar | Segundo provedor gerenciado para comparação | Mesmas exigências de transparência, custo e não persistência. Verificar se a operação é síncrona ou mantém resultados recuperáveis; qualquer retenção incompatível elimina a opção. |
| Serviço próprio com Tesseract ou PaddleOCR pré-treinado | Android/Web por serviço complementar | Centraliza um motor e permite controlar o código de processamento | Introduz hospedagem, segurança, latência e manutenção. Comprovar ausência de arquivos temporários, logs de corpo, filas e retenção pela infraestrutura. Exige escala a zero e custo dentro do saldo disponível. Não acumular serviço próprio de OCR e OCR pago de terceiros como duas soluções operacionais. |

### 6.2 Captura e pré-processamento

- **Web:** investigar `getUserMedia` com quadro em canvas/`ImageBitmap` ou buffer equivalente; encerrar tracks e liberar referências ao sair. Não usar download, IndexedDB ou service worker para guardar capturas.
- **Android:** investigar captura de quadro em memória, por integração de câmera compatível com o Expo Dev Client ou módulo nativo. Bibliotecas como Expo Camera e React Native VisionCamera são candidatas de captura, não motores de OCR; a API escolhida deve ser validada quanto a gravação em cache. Não assumir que uma opção base64 evita a criação prévia de arquivo.
- **Pré-processamento:** comparar OCR direto com recorte e normalização em memória. Adicionar OpenCV somente se o ganho medido justificar dependência, integração e custo de manutenção.
- O projeto já exige Dev Client; eventual dependência nativa implica novo build. Não gerar builds pagos nem contratar serviços apenas por constarem nesta lista.

### 6.3 Método de comparação e seleção

1. Aplicar primeiro os critérios eliminatórios: memória sem persistência de mídia, ausência de logs clínicos, confirmação obrigatória, compatibilidade com o legado, orçamento global e viabilidade até 15/12/2026.
2. Comparar ao menos duas abordagens viáveis para fotografia sobre o mesmo conjunto rotulado, registrando as versões e configurações utilizadas. Uma abordagem reprovada nos critérios eliminatórios pode ser discutida documentalmente, sem enviar imagens a ela.
3. Construir casos próprios com pelo menos dois modelos de aparelho, variando iluminação, inclinação, reflexo, foco, ausência de pulso e presença de números acessórios. Separar casos usados para ajustar regras dos casos usados na avaliação final. Não usar capturas de usuários do produto como dataset.
4. Medir acerto exato por campo e do par sistólica/diastólica, trocas de campos, reconhecimento incorreto apresentado como válido, ausência de resultado, latência de inicialização e processamento (incluindo p50/p95 quando o tamanho da amostra permitir), memória e custo estimado por volume de uso. Resultados sem saída também entram na análise.
5. Registrar resultados por plataforma e modelo de aparelho; não tratar a confiança numérica de motores diferentes como uma escala comum. Documentar tamanho da amostra e limitações.
6. Definir, antes da avaliação final, metas de acurácia e tempo de resposta e o limite de timeout, com base nas provas de conceito. Esta spec não inventa metas numéricas nem declara uma tecnologia vencedora sem evidência.
7. Formalizar a escolha, alternativas descartadas, custos, limitações, modo offline e cobertura de plataformas em documento próprio, posteriormente incorporado ao relatório técnico final. Se as plataformas exigirem motores distintos, justificar a escolha por plataforma e manter o contrato funcional comum.

### 6.4 Decisões ainda pendentes

- Motor ou combinação de motores; biblioteca de captura; necessidade de serviço complementar.
- Navegadores e versões Android efetivamente suportados, inclusive limites de memória e comportamento sem rede.
- Regras de associação dos campos e tratamento de displays sem rótulos ou fora dos modelos avaliados.
- Origem da medição no modelo (`source`) e eventual ajuste coordenado de schema e Security Rules, sem persistir mídia ou texto bruto.
- Limites quantitativos de reconhecimento e latência, timeout e orçamento restante para experimentos e operação.

O TAP previa a decisão técnica até **06/10/2026**, integração das modalidades até **27/10**, comparação até **10/11** e conclusão do ciclo até **15/12/2026**. A decisão não foi localizada no repositório durante o mapeamento inicial. Sua situação real precisa ser conciliada com esses marcos; esta especificação não retrodata uma decisão nem altera o cronograma aprovado.

## 7. Evidências de conclusão

A modalidade estará concluída quando os critérios de aceite tiverem evidências registradas, a comparação e a decisão técnica estiverem documentadas, e o fluxo estiver integrado às duas plataformas sem violar a constituição. Registrar limitações e casos não suportados explicitamente. Se nenhuma abordagem satisfizer as restrições, declarar o resultado e os limites investigados conforme a premissa do TAP, sem apresentar reconhecimento inseguro como entrega concluída.
