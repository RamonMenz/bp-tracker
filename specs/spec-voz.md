# Especificação — Registro de medições de pressão arterial por voz

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** proposta funcional; escolha de reconhecimento de fala pendente de comparação técnica.  
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
- O modelo atual, o schema Zod e as Security Rules aceitam apenas `source: 'manual'`. A origem de uma medição assistida precisa de decisão explícita antes da implementação, coordenada com fotografia; não basta enviar um novo valor de `source` ao repositório.
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

### 7.1 Alternativas de bibliotecas e serviços de reconhecimento de fala

As opções abaixo são **candidatas para investigação**, não dependências aprovadas. Compatibilidade com Expo SDK 57, manutenção, português brasileiro, entrada por buffers e garantias de retenção devem ser conferidos na documentação vigente e comprovados na prova de conceito. As estimativas de latência são qualitativas, não benchmarks. Não há cotação comercial validada nesta spec.

| Alternativa | Aplicação possível e prós | Contras e esforço | Custo estimado | Privacidade e elegibilidade | Latência esperada a medir |
|---|---|---|---|---|---|
| Android `SpeechRecognizer`, preferindo reconhecimento explicitamente no dispositivo | Android por bridge mantida ou módulo Expo; integração com o sistema e possível reaproveitamento de modelos instalados | Suporte local depende de versão, dispositivo, serviço instalado e idioma; hints de preferência offline não garantem execução local. Verificar entrada de áudio e comportamento interno da bridge | Em modo local, R$ 0 de consumo de API, usando dispositivo existente; contabilizar eventual build ou equipamento no orçamento global | Preferir API explicitamente local quando disponível. Caminho padrão pode enviar áudio a servidor do fornecedor; sem evidência de não persistência e transparência, é inelegível | Potencialmente curta com modelo pronto; medir inicialização, endpoint de fala e resultado final em aparelhos reais |
| Web Speech API (`SpeechRecognition` e modo local, quando disponível) | Web; integração pequena, sem distribuir motor próprio de STT | Suporte varia por navegador; modo local e pacote pt-BR não são universais. Não presumir paridade com Android ou disponibilidade offline | Sem cobrança direta de API pela aplicação em implementações usuais; não há garantia de cota, continuidade ou gratuidade futura do serviço do navegador | Muitas implementações usam servidor externo. `getUserMedia` local não torna o reconhecimento local; preferências e políticas do navegador precisam de verificação. Sem garantias suficientes, descartar | Potencialmente curta em sessão aquecida; modo remoto acrescenta rede e disponibilidade do serviço |
| Whisper multilíngue via `whisper.cpp`, por integração nativa | Android; processamento local, controle dos buffers e possibilidade de modelo quantizado; dispensa serviço de STT | Peso do modelo, memória, bateria e processamento podem ser altos em aparelhos modestos. Verificar binding compatível, API PCM em memória e desempenho de modelos pequenos; não usar modelo apenas em inglês | R$ 0 de consumo de API em dispositivo existente; download, distribuição, builds e tempo de integração continuam sendo custos a avaliar | Áudio pode permanecer no dispositivo se toda a cadeia trabalhar em memória. Excluir wrappers que exijam WAV temporário; modelo estático pode ser armazenado sem armazenar áudio | Variável conforme modelo, quantização e hardware; pode ultrapassar a duração da fala em celulares de entrada; medir frio e aquecido |
| Whisper local no navegador via WebAssembly/WebGPU, por `whisper.cpp` ou runtime compatível | Web; evita servidor e pode compartilhar a família de modelos com Android | Download inicial grande, limites de memória, suporte desigual de WebGPU e competição com a interface. Usar worker; não pressupor desempenho móvel aceitável | R$ 0 de API; estimar banda/hospedagem de modelos e manter dentro da camada gratuita disponível | Processar buffers localmente, sem gravar áudio em IndexedDB, Cache API ou OPFS. Verificar implementação e políticas de cache separadamente para modelos e mídia | Inicialização potencialmente longa na primeira carga; inferência varia muito entre CPU/WASM e GPU; medir em navegador móvel |
| API gerenciada: Google Cloud Speech-to-Text, Azure AI Speech ou API de transcrição da OpenAI | Android/Web por serviço complementar; motores prontos de fala e menor carga computacional no aparelho | Depende de rede; custos, formatos, regiões e políticas diferem por provedor. Exige proteção de credenciais e limite de consumo; não assumir que todos oferecem camada gratuita ou retenção zero | Variável por duração e modalidade. Usar tarifa vigente e franquia elegível na fórmula abaixo; recorrência é fator desfavorável. Crédito promocional temporário não comprova sustentabilidade | Envia voz e dado clínico a terceiros. Verificar retenção de áudio e texto, uso para treinamento, logs, operação síncrona/streaming e elegibilidade de controles de retenção. Se houver retenção incompatível, eliminar a opção mesmo com baixo preço | Rede + upload/streaming + inferência; medir p50/p95 e falhas. Streaming pode reduzir espera percebida, mas não autoriza uso de resultado parcial para salvar |
| Serviço próprio com Whisper/`whisper.cpp` ou outro modelo pré-treinado | Android/Web por serviço complementar; um motor para ambas as plataformas e controle do código de processamento | Introduz hospedagem, segurança, concorrência, cold start e manutenção. CPU pode ser lenta; GPU pode exceder o orçamento. Não criar infraestrutura de alta disponibilidade neste ciclo | Não presumir R$ 0: depende de cota, RAM/CPU e duração. Considerar faixa de R$ 0 a R$ 100 prevista para hospedagem no TAP, limitada ao saldo real e sem acumular operação paga própria e serviço de STT pago | Processamento fora do aparelho exige informação prévia. Provar ausência de arquivos temporários, swap de conteúdo pela aplicação, logs de corpo, filas e retenção; camada gratuita não comprova conformidade | Upload + cold start + inferência; pode ser significativamente maior que a opção local aquecida; medir sem ocultar inicialização |

**Estimativa de consumo para comparação:** 1.000 tentativas de 10 segundos representam aproximadamente **166,7 minutos** de áudio, antes de arredondamentos de cobrança e novas tentativas. Custo variável em reais = minutos faturáveis × tarifa por minuto × câmbio, acrescido de tributos, hospedagem e transferência aplicáveis, descontando somente a franquia comprovadamente disponível. Como exemplo puramente aritmético, uma tarifa hipotética de US$ 0,006/min e câmbio hipotético de R$ 5,50/US$ resultaria em cerca de **R$ 5,50** para esse volume, sem os custos adicionais. Esses números não são uma oferta ou cotação de qualquer provedor; a decisão deve registrar preços, data da consulta e saldo compartilhado com fotografia e demais despesas.

**Orientação inicial para as provas de conceito:** investigar primeiro Android explicitamente local e uma alternativa local Web; usar Whisper como comparador quando o hardware permitir. APIs de sistema/navegador com processamento indeterminado não recebem preferência apenas pela integração simples. Nuvem só permanece candidata após passar pelos critérios eliminatórios de privacidade, custo e prazo. A escolha final continua aberta à revisão do engenheiro e à evidência comparativa.

### 7.2 Captura e pré-processamento

- **Web:** investigar `getUserMedia` com Web Audio/`AudioWorklet` para PCM em memória ou mecanismo equivalente compatível com o motor. `MediaRecorder` pode entregar segmentos em memória, mas formato, implementação e ausência de persistência precisam ser verificados; não criar download ou arquivo de apoio.
- **Android:** investigar API de reconhecimento explicitamente local ou captura por `AudioRecord`/bridge compatível com Expo Dev Client, entregando buffers ao motor. Bibliotecas de gravação que só retornam URI não atendem; nem Expo Audio nem outra biblioteca devem ser escolhidos apenas por oferecerem gravação de microfone.
- **Pré-processamento:** definir formato aceito, amostragem, canais, limite de duração e tamanho de buffer com base na prova de conceito. Conversão e eventual detecção de atividade de voz ocorrem em memória; silêncio não pode autorizar salvamento. Avaliar interferência de leitor de tela, eco e ruído sem registrar áudio de uso para depuração.
- O projeto já exige Dev Client; eventual dependência nativa implica novo build. Não gerar builds pagos, baixar modelos incompatíveis com o dispositivo ou contratar serviços apenas por constarem nesta lista. Não deixar microfone aberto para antecipar a inicialização.

### 7.3 Método de comparação e seleção

1. Aplicar primeiro os critérios eliminatórios: memória sem persistência de áudio, ausência de logs clínicos, processamento externo conhecido e informado, confirmação obrigatória, compatibilidade com o legado, orçamento global e viabilidade até 15/12/2026.
2. Comparar ao menos duas abordagens viáveis para voz sobre o mesmo conjunto rotulado, registrando versões, modelos, configuração de idioma e local de processamento. Uma abordagem reprovada nos critérios eliminatórios pode ser discutida documentalmente, sem enviar amostras a ela.
3. Construir casos próprios com locutores mediante consentimento informado e por escrito, amostras anonimizadas e uso exclusivo na construção dos casos de teste. Variar formas coloquiais e completas, sotaques, ritmo, pausas, ruído, pulso opcional, silêncio e ambiguidades. Separar casos de ajuste das regras dos casos de avaliação final; não usar áudios de usuários do produto. Os arquivos acadêmicos consentidos são distintos da captura transitória de uso e não entram no repositório por padrão.
4. Medir acerto exato por campo e do par sistólica/diastólica após interpretação, erros de escala por dez, trocas de campos, falsos preenchimentos em silêncio/ruído, ausência de resultado e taxa de correção em sessões de teste controladas. WER da transcrição é medida auxiliar: transcrever palavras corretamente não comprova conversão clínica correta. Resultado sem saída também entra na análise.
5. Medir inicialização, tempo até resultado final após o fim da fala, duração total, p50/p95 quando o tamanho da amostra permitir, memória, tamanho dos modelos e custo por volume de tentativas. Separar execução fria/aquecida e condições com/sem rede; não comparar apenas o trecho de inferência de um motor com o fluxo completo de outro.
6. Registrar resultados por plataforma, dispositivo e grupo de casos, sem tratar confiança numérica de motores diferentes como escala comum. Definir antes da avaliação final metas de acurácia e tempo de resposta, duração máxima e timeout com base nas provas de conceito; não declarar tecnologia vencedora sem evidência.
7. Formalizar escolha, alternativas descartadas, custos, limitações, modo offline e cobertura de plataformas em documento próprio, posteriormente incorporado ao relatório técnico final. Se as plataformas exigirem motores distintos, justificar por plataforma e manter o contrato funcional comum. Não pressupor estudo de usabilidade com participantes: coleta de voz consentida para casos de teste tem finalidade distinta.

### 7.4 Decisões ainda pendentes

- Motor ou combinação de motores, biblioteca de captura, modelo e quantização, necessidade de serviço complementar e saldo disponível do orçamento global.
- Navegadores e versões Android efetivamente suportados; disponibilidade de pt-BR local, limites de memória, download inicial e comportamento sem rede.
- Gramática final das expressões suportadas além dos exemplos obrigatórios, regras de escala, identificação do pulso e tratamento de autocorreções e resultados parciais.
- Origem da medição no modelo (`source`) e ajuste coordenado com fotografia de schema e Security Rules, sem persistir áudio ou transcrição.
- Metas quantitativas de acerto, latência, duração máxima e timeout; evidências de retenção e logs para cada candidato que processe áudio externamente.

O TAP previa a decisão técnica até **06/10/2026**, integração das modalidades até **27/10**, comparação até **10/11** e conclusão do ciclo até **15/12/2026**. A decisão não foi localizada no repositório durante o mapeamento inicial. Sua situação real precisa ser conciliada com esses marcos; esta especificação não retrodata uma decisão nem altera o cronograma aprovado. Eventual redução da entrega de voz segue a prioridade da fotografia estabelecida no TAP, sem relaxar privacidade ou confirmação.
