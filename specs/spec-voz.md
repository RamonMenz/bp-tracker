# Especificação — Registro de medições de pressão arterial por voz

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** decisões técnicas definidas; implementação e validação pendentes.
**Referências:** TAP v1.0, de 22/09/2026, [constituição do projeto](../constitution.md) e [spec de fotografia](./spec-fotografia.md).

## 1. Objetivo e limites

Permitir que o usuário registre uma medição ditando os números em português brasileiro, revisando e confirmando explicitamente os valores antes de salvar.

O fluxo atende Android e Web e complementa o formulário manual existente. Deve interpretar formas usuais como **“doze por oito”** e **“cento e vinte por oitenta”**, produzindo candidatos de **120/80 mmHg**. Pulso é opcional e só deve ser preenchido quando enunciado com identificação inequívoca. O sistema transcreve e organiza números informados pelo usuário, sem estimar valores ausentes, diagnosticar ou prescrever.

Não fazem parte desta especificação: importação de arquivos de áudio, escuta contínua ou em segundo plano, palavra de ativação, comandos falados para salvar, ditado livre de observações, treinamento de modelos do zero, fotografia e geração de PDF. A arquitetura atual de autenticação, persistência e notificações deve ser preservada.

## 2. Invariantes

- O custo acumulado do projeto inteiro permanece limitado a **R$ 300,00**, incluindo experimentos, eventual reconhecimento e hospedagem. A modalidade de voz não dispõe de um orçamento adicional de R$ 300,00.
- Áudios de uso são capturados, processados e descartados estritamente em memória. Não podem ser gravados em arquivo temporário, cache em disco, galeria, banco, Storage ou fila persistente de processamento. Gravar e apagar depois não atende à constituição.
- Áudio, transcrição, hipóteses intermediárias e valores clínicos não podem integrar logs, breadcrumbs, relatórios de falha ou telemetria. Mensagens de exceção e respostas do reconhecedor são potencialmente sensíveis; sanitizar apenas o contexto do logger não basta.
- Nenhum candidato reconhecido é criado ou atualizado no Firestore, inclusive em sua fila offline, antes da confirmação explícita. Resultados parciais do motor nunca autorizam escrita.
- Permissão negada, ausência de suporte a português brasileiro, falha no reconhecimento, falta de conectividade ou indisponibilidade do provedor não podem bloquear o registro manual.
- Usar uma API do sistema operacional ou do navegador não comprova processamento local. Qualquer processamento externo deve ser identificado e informado previamente, sem troca silenciosa de modo local para nuvem.

## 3. Fluxo do usuário

### 3.1 Entrada

1. Na tela de registro, o usuário escolhe **“Registrar por voz”**, sem remover ou deslocar o formulário manual a ponto de prejudicar seu uso.
2. O app explica brevemente: dizer os valores, conferir os campos e confirmar antes de salvar. Oferece exemplos como “doze por oito” e “cento e vinte por oitenta, pulso setenta e dois”.
3. Se houver processamento externo, informa antes da captura o envio de áudio e sua finalidade. Sem concordância com esse envio, oferece retorno ao manual; não inicia uma alternativa remota automaticamente.
4. Somente após essa ação solicita acesso ao microfone e eventuais permissões de reconhecimento necessárias. A implementação web exige contexto seguro e disponibilidade das APIs escolhidas; a existência de microfone não implica disponibilidade de reconhecimento de fala.
5. Se a permissão for negada ou a capacidade estiver indisponível, apresenta mensagem em português e ações para voltar ao registro manual ou tentar novamente quando possível. Não repete solicitações automaticamente.

### 3.2 Orientação e captura

1. Exibe instrução curta para dizer uma única medição, falando de forma natural e, quando possível, em ambiente silencioso. O indicador visual de escuta também deve ter texto e semântica acessível.
2. O usuário aciona **“Começar a falar”**. Apenas uma captura é processada por vez; toques repetidos não iniciam sessões concorrentes.
3. Recebe quadros ou segmentos de áudio em memória. APIs de gravação que exigem URI de arquivo são inelegíveis, mesmo que ofereçam leitura posterior em base64.
4. Oferece **“Terminar fala”** e **“Cancelar”**. Detecção de silêncio pode encerrar a captura e avançar ao reconhecimento, mas nunca confirmar uma medição. A duração máxima será definida na prova de conceito para limitar memória e custo.
5. O microfone é liberado ao encerrar a captura, sair do fluxo, interromper a sessão ou colocar o app em segundo plano. Ao abandonar o fluxo, o conteúdo transitório é descartado; retomar o app não reinicia a escuta automaticamente.

### 3.3 Reconhecimento e interpretação

1. Mostra estado **“Interpretando os valores…”**, sem bloquear a ação de cancelar. Transcrição parcial, quando exibida, é identificada como provisória e não habilita salvamento.
2. Configura português brasileiro (`pt-BR` ou equivalente do motor). Eventual conversão de amostragem, canais ou formato acontece em memória. Não aplica transformação que invente fala ou números ausentes.
3. Separa reconhecimento de fala de interpretação: o motor produz texto; uma etapa determinística transforma expressões numéricas e associa campos. Não usa um modelo generativo para completar ou corrigir silenciosamente a medição.
4. Interpreta a convenção coloquial como conversão de escala por dez **apenas quando o par inteiro corresponder a uma forma suportada e inequívoca**; não multiplica qualquer número menor que a faixa mínima para fazê-lo passar na validação. A revisão mostra sempre valores em mmHg.

| Enunciação ou transcrição equivalente | Candidato esperado | Regra de interpretação |
|---|---|---|
| “doze por oito” / “12 por 8” | Sistólica 120; diastólica 80; pulso vazio | Par na convenção coloquial; multiplicar ambos por dez. |
| “cento e vinte por oitenta” / “120 por 80” | Sistólica 120; diastólica 80; pulso vazio | Par em mmHg; preservar os valores. |
| “treze por nove” | Sistólica 130; diastólica 90 | Mesma convenção coloquial, sujeita à validação existente. |
| “treze vírgula cinco por oito vírgula cinco” | Sistólica 135; diastólica 85 | Decimal de uma casa na convenção coloquial, convertido para mmHg inteiro; não arredondar. |
| “sistólica cento e vinte, diastólica oitenta” | Sistólica 120; diastólica 80 | Associar pelos rótulos explícitos, inclusive se a ordem dos campos mudar. |
| “cento e vinte por oitenta, pulso setenta e dois” | Sistólica 120; diastólica 80; pulso 72 | Pulso associado pelo rótulo, sem aplicar a escala coloquial ao pulso. |
| “doze por oitenta” | Par marcado como ambíguo; campos incertos vazios | Escalas misturadas não são normalizadas silenciosamente; pedir correção ou nova fala. |
| “cento e vinte” / “pulso setenta e dois” | Somente o campo inequivocamente identificado, se houver; demais vazios | Nunca completar o par com histórico ou valores padrão. |
| “doze por oito, não, quatorze por nove” | Resultado marcado como ambíguo | Duas medições ou autocorreção exigem nova fala ou correção manual; não escolher a última por conveniência. |
| Silêncio, ruído ou fala sem uma medição identificável | Sem candidato | Não aceitar números alucinados pelo motor como uma medição válida por estarem dentro da faixa. |

5. Normaliza numerais por extenso, algarismos, caixa e pontuação gerada pelo motor, preservando a distinção entre separador do par e separador decimal. Sem estrutura de par ou rótulos inequívocos, não atribui números por simples ordem de ocorrência. Regras para outras formas coloquiais devem ser documentadas e testadas antes de serem aceitas.
6. Não usa a última medição, médias históricas ou padrões pessoais para preencher campos. Não troca sistólica e diastólica para satisfazer a validação. Pulso sem rótulo inequívoco permanece vazio; data, hora e observação não são extraídas da fala neste ciclo.
7. Resultado parcial ou ambíguo é apresentado como tal. Campos incertos ficam vazios e identificados para correção. Limites de duração e processamento serão definidos na prova de conceito; ao excedê-los, encerra a tentativa com mensagem amigável, sem salvar.

### 3.4 Revisão e confirmação

1. Exibe os candidatos em campos editáveis, com rótulos claros, unidades e aviso **“Confira os valores reconhecidos antes de salvar.”** Para “doze por oito”, mostra explicitamente **120 e 80 mmHg**, tornando a conversão visível.
2. Apresenta data e hora editáveis, inicialmente correspondentes ao início da captura. O horário de chegada da resposta não substitui o instante da captura.
3. Oferece **“Falar novamente”**, **“Cancelar”** e **“Confirmar e salvar medição”**. Nova fala descarta os candidatos anteriores; cancelar não altera o histórico. A transcrição pode ser mostrada como apoio transitório, mas nunca como substituta dos campos numéricos revisáveis.
4. Aplica as validações existentes, sem introduzir faixas clínicas novas: sistólica inteira de 50 a 300 mmHg; diastólica inteira de 30 a 200 mmHg; sistólica maior que diastólica; pulso opcional inteiro de 20 a 250 bpm. Data e observação seguem as regras atuais do formulário e do repositório.
5. O botão de confirmação fica desabilitado enquanto os campos obrigatórios estiverem ausentes ou inválidos. Alta confiança, fala fluente ou números dentro da faixa nunca dispensam revisão e confirmação.
6. Só a ação explícita **“Confirmar e salvar medição”**, acessível por toque, teclado ou tecnologia assistiva, autoriza a escrita dos valores exibidos, já incorporando correções. Dizer “salvar”, encerrar a fala, aceitar permissões ou concluir a transcrição não autoriza salvar.

### 3.5 Persistência e encerramento

1. Após confirmação, reutiliza o caminho de validação e persistência das medições, com schema, hook e repositório; componentes não acessam diretamente o Firestore.
2. Persiste somente os dados da medição e eventual origem definida na decisão de modelagem. Nunca anexa áudio, transcrição, hipóteses alternativas, confiança ou características de voz ao documento clínico.
3. Impede submissão duplicada enquanto a confirmação está em andamento. Em falha, mantém os campos numéricos para nova tentativa explícita, sem repetir a escrita automaticamente por ação da interface e sem reabrir o microfone.
4. No sucesso, utiliza o feedback existente e mantém o comportamento da sugestão opcional de segunda medição. Qualquer futura entrada por voz nessa segunda leitura também exige revisão e confirmação.
5. Descarta buffers de áudio e transcrição assim que deixam de ser necessários, cancela operações e ignora respostas tardias após cancelamento, nova captura, saída ou troca de sessão. Não promete sobrescrita física da memória de runtimes gerenciados nem cancelamento retroativo de processamento externo já iniciado.

## 4. Integração e preservação do legado

- Seguir `app/ → features/ → services/`, com interpretação determinística isolada e testável. Diferenças de microfone e reconhecimento entre Android e Web ficam em adaptadores por plataforma; o contrato comum devolve candidatos e campos incertos, sem persistir.
- Carregar recursos pesados de áudio e modelos sob demanda, sem inicializar microfone, workers ou motores durante o uso manual. O cache permitido de um modelo estático não autoriza cache de áudio ou transcrição.
- O modelo atual, o schema Zod e as Security Rules aceitam apenas `source: 'manual'`. A origem escolhida é `source: 'voice'`, conforme a seção de decisões; sua inclusão exige atualização coordenada na implementação; não basta enviar um novo valor de `source` ao repositório.
- Caso o modelo mude, atualizar coordenadamente tipos, schema, rules e testes negativos, revisando a necessidade de índices. Documentos antigos devem continuar legíveis, editáveis e exportáveis, incluindo `sessionReadings`.
- A persistência do registro confirmado continua seguindo o comportamento existente. Não presumir persistência offline de Firestore no Android: o código atual usa o SDK JS com `getFirestore`; a garantia deve ser verificada na plataforma. Reconhecimento offline e sincronização offline são capacidades distintas.
- Os controles mantêm alvos de toque de pelo menos 48 dp, texto de corpo de pelo menos 16 px, escala de fonte, contraste AA, rótulos para leitores de tela e acesso por teclado na Web. Estados de escuta e campos incertos não dependem somente de cor ou som. Validar interação com TalkBack e leitor de tela Web para que anúncios do próprio app não sejam interpretados como fala clínica.

## 5. Critérios de aceite

| ID | Cenário | Resultado verificável |
|---|---|---|
| VOZ-01 | Abrir o app e registrar manualmente sem conceder microfone | O fluxo legado permanece disponível; microfone e reconhecimento não são inicializados. |
| VOZ-02 | Escolher voz com permissão ainda não concedida | Solicita no contexto da ação; recusa oferece saída funcional para o manual, sem repetição automática. |
| VOZ-03 | Dizer “doze por oito” ou “cento e vinte por oitenta” | Ambas as formas geram candidatos 120/80 mmHg para revisão; nenhuma escrita ocorre antes da confirmação. |
| VOZ-04 | Dizer um par com pulso explicitamente identificado ou sem pulso | Preenche pulso apenas no primeiro caso; ausência não é completada com zero ou histórico. |
| VOZ-05 | Dizer a forma decimal coloquial ou números por extenso da tabela | Converte conforme as regras documentadas, sem arredondamento silencioso e com unidades visíveis. |
| VOZ-06 | Misturar escalas, enunciar dois pares, corrigir-se na mesma fala ou fornecer resultado parcial | Sinaliza a ambiguidade, mantém campos incertos vazios e permite correção ou nova fala. |
| VOZ-07 | Obter números fora de faixa ou sistólica menor ou igual à diastólica | Exibe erro por campo e impede confirmação até correção; não troca ou escala valores para validá-los. |
| VOZ-08 | Corrigir um candidato e confirmar | Salva os valores revisados, uma única vez, pelo repositório existente; não grava áudio ou transcrição. |
| VOZ-09 | Cancelar durante captura, reconhecimento ou revisão | Nenhuma medição é criada/alterada; microfone e mídia transitória são liberados; respostas tardias não restauram o fluxo. |
| VOZ-10 | Repetir toques em iniciar/terminar fala ou confirmação | Não cria sessões concorrentes nem registros duplicados. |
| VOZ-11 | Capturar silêncio, ruído, falha do motor, duração excessiva ou timeout | Não salva; apresenta ausência de resultado ou erro amigável e permite nova tentativa ou manual. Incluir casos negativos na avaliação do motor. |
| VOZ-12 | Ficar sem rede ou sem pacote local de português brasileiro | Expõe a indisponibilidade e oferece manual; não envia áudio a outro serviço silenciosamente. |
| VOZ-13 | Inspecionar captura, conversão, reconhecimento, falhas e encerramento nas duas plataformas | Nenhum áudio é persistido, inclusive em arquivos temporários, caches ou componentes de terceiros; persistência inevitável reprova a abordagem. |
| VOZ-14 | Inspecionar logs e relatórios com transcrição e exceção contendo dados clínicos | Áudio, transcrição e valores clínicos não são enviados aos coletores. |
| VOZ-15 | Usar reconhecedor do sistema, navegador ou nuvem | O local de processamento é conhecido; envio externo é informado previamente e há evidência de conformidade com retenção, logs e teto global. |
| VOZ-16 | Consultar, editar e exportar registros antigos e sessões de duas leituras | Mantém compatibilidade e comportamento do legado; isolamento entre contas continua protegido pelas rules. |
| VOZ-17 | Navegar por teclado/leitor de tela, ampliar fonte e usar o fluxo com TalkBack | Captura, estados, revisão, correção, cancelamento e confirmação permanecem operáveis; não exige resposta apenas sonora. |
| VOZ-18 | Comparar o registro manual antes e depois da integração em condições equivalentes | Não há perda funcional nem degradação atribuível à nova modalidade; registrar tempos e condições da comparação. |
| VOZ-19 | Encerrar sessão, receber interrupção de áudio ou colocar o app em segundo plano | Encerra captura e descarta áudio; não reinicia sozinho nem permite salvar resultado de uma sessão em outra conta. |

Os critérios devem ser verificados em Android real e nos navegadores Web declarados como suportados na decisão técnica. Testes unitários cobrem interpretação e validação; testes de integração cobrem confirmação, cancelamento e persistência; inspeção em runtime cobre microfone, armazenamento e rede. Mocks isolados não comprovam ausência de arquivos temporários ou processamento remoto pelo sistema operacional.

## 6. Evidências de conclusão

A modalidade estará concluída quando os critérios de aceite tiverem evidências registradas, a comparação e a decisão técnica estiverem documentadas, e o fluxo estiver integrado às duas plataformas sem violar a constituição. Registrar limitações e casos não suportados explicitamente. Conforme o TAP, fotografia plenamente implementada e comparada tem precedência sobre duas modalidades parciais; eventual entrega parcial de voz deve declarar o alcance atingido. Se nenhuma abordagem satisfizer as restrições, documentar os limites investigados, sem apresentar reconhecimento inseguro como entrega concluída.

## 7. [DECISÕES DO ENGENHEIRO]

### 7.1 Tecnologias de reconhecimento de fala escolhidas

A decisão é **Android `SpeechRecognizer` explicitamente no dispositivo** e **Web Speech API somente em modo local comprovado**, seguidos de **parser determinístico compartilhado para português brasileiro**. Não haverá fallback remoto automático.

| Plataforma | Escolha definitiva | Justificativa | Condições de habilitação |
|---|---|---|---|
| Android | `SpeechRecognizer.createOnDeviceSpeechRecognizer`, disponível a partir da API 31, por integração compatível com Expo Dev Client | Reaproveita reconhecimento de IA do sistema, evita distribuir Whisper e não cobra por transcrição local | Consultar `isOnDeviceRecognitionAvailable`, verificar suporte/pacote pt-BR e validar ausência de armazenamento e envio de áudio na implementação. `EXTRA_PREFER_OFFLINE` sozinho não é garantia suficiente |
| Web | `SpeechRecognition` com `processLocally = true`, quando suportado e validado para pt-BR | Integração pequena, sem motor próprio de grande porte e sem serviço pago | Verificar disponibilidade local e idioma; se ausentes ou indeterminados, deixar voz indisponível e oferecer registro manual. Não usar o reconhecedor remoto padrão |

**Custo de inferência:** R$ 0,00. Modelos do sistema, quando necessários, podem exigir instalação prévia; o áudio de uso não pode ser persistido. Builds, distribuição e equipamentos permanecem no teto global de **R$ 300,00**.

Whisper.cpp multilíngue fica como **comparador acadêmico e contingência documentada**, sem integrar o fluxo de produção escolhido. Seu modelo, memória, bateria e integração nativa/WASM ampliam o esforço para aproximadamente 100 horas totais. Eventual adoção futura exige revisão explícita desta decisão com evidências. APIs OpenAI/Google/Azure e hospedagem própria foram descartadas do fluxo principal por transmissão de voz, condições de retenção e manutenção adicionais.

A disponibilidade de voz será declarada por dispositivo/navegador. Onde o caminho local não puder ser comprovado, a modalidade fica indisponível; eventual entrega parcial será registrada conforme o TAP, priorizando fotografia completa. A API escolhida, isoladamente, não prova ausência de persistência interna pelo fornecedor.

### 7.2 Captura, interpretação e confirmação

- **Captura:** iniciar o reconhecedor local apenas após ação e permissão do usuário; não usar gravador que devolva arquivo/URI nem criar WAV temporário. Auditar bridge e serviço local, sem presumir conformidade por aceitar preferência offline. Liberar microfone e resultados transitórios ao cancelar, sair, receber interrupção, entrar em segundo plano ou trocar de conta.
- **Formato:** usar o formato interno do reconhecedor escolhido; não adicionar captura paralela ou conversão de áudio desnecessária. Limites de sessão e timeout serão fixados na prova de conceito. Instalação/cache de modelo estático é distinta de armazenamento proibido de áudio/transcrição.
- **Parser:** consumir somente o resultado final e aplicar as regras da seção 3 em lógica pura, sem LLM complementar. “Doze por oito” propõe 120/80 mmHg; “cento e vinte por oitenta” propõe o mesmo par. Escalas mistas, múltiplas medições ou correções ambíguas exigem revisão, sem completar pelo histórico. Pulso precisa de identificação inequívoca.
- **Confirmação:** preencher campos editáveis e aplicar as validações existentes. Resultado final, silêncio, confiança alta ou comando de voz não autoriza escrita. Somente a ação explícita “Confirmar e salvar medição” autoriza persistir os valores revisados.
- **Privacidade:** áudio e transcrição ficam transitórios em memória, sem logs, arquivos, cache, telemetria clínica ou envio remoto. Substituir mensagens de erro potencialmente sensíveis por códigos técnicos seguros antes de encaminhar ao logger.

### 7.3 Validação e comparação da decisão

1. Validar localidade, memória sem arquivos, ausência de logs clínicos, confirmação obrigatória, preservação do legado e orçamento antes de habilitar voz. Sem comprovação, oferecer manual, sem fallback para nuvem.
2. Comparar ao menos duas abordagens viáveis com o mesmo conjunto rotulado; usar reconhecimento local escolhido e Whisper.cpp multilíngue em ambiente compatível como comparador. Não incorporar ambos ao produto apenas para cumprir a comparação. Registrar modelos, versões, idioma, hardware e diferenças de plataforma.
3. Construir casos próprios com consentimento informado e por escrito de locutores externos, anonimizados para testes. Variar expressões coloquiais/completas, sotaques, ritmo, ruído, pulso, silêncio e ambiguidades. Separar ajuste e avaliação; arquivos acadêmicos consentidos não são áudios de uso nem entram no repositório por padrão.
4. Medir acerto exato por campo e do par após parsing, erros de escala por dez, trocas, falsos preenchimentos em ruído/silêncio, ausência de resultado e correções em casos controlados. WER é auxiliar; transcrição correta não comprova interpretação clínica correta.
5. Medir inicialização, tempo após fim da fala, duração total, memória, bateria e tamanho adicional quando viável. Separar frio/aquecido e com/sem rede; registrar p50/p95 quando a amostra permitir. Fixar duração máxima, timeout e metas antes da avaliação final, sem inventar resultados.
6. Incorporar limitações, cobertura, comparação e evidências ao relatório técnico. Coleta consentida para casos de teste não implica estudo de usabilidade. Manter os marcos do TAP: integração em 27/10, comparação em 10/11 e conclusão em 15/12/2026, sem retrodatação da decisão para 06/10.

### 7.4 Integração definitiva e parâmetros de validação

- Isolar reconhecedores em adaptadores por plataforma e compartilhar parser, validação e revisão. Carregar recursos sob demanda, sem alterar o caminho manual.
- Usar `source: 'voice'` após confirmação. Atualizar conjuntamente tipos, schema, Security Rules e testes negativos, revisar índices e preservar `source: 'manual'`, a origem fotográfica e documentos antigos com `sessionReadings`.
- Usar o repositório existente após confirmação, sem escrita ou fila offline anterior. Persistir somente campos clínicos revisados e origem, sem áudio, transcrição ou confiança.
- Validar a matriz de dispositivos/navegadores com pt-BR local, a gramática suportada, limites de sessão e desempenho. Documentar indisponibilidade e alcance parcial sem declarar funcionamento universal.
