# Revisão da constituição e das especificações — TASK-02

**Revisão inicial:** 26/10/2026, base `7d72cb3347dca04bde9b8a706f523a6da245dea2`. **Retomada:** 27/10/2026, base `7fbe13784afd6b8aee0fea2aa8122150836f1028`, após recebimento do TAP original. **Resultado atual:** fonte primária arquivada e confrontação documental realizada; TASK-02 permanece aberta pelas decisões P01/P02. Nenhuma funcionalidade, dependência ou escolha de motor foi alterada nesta retomada. Os registros de execução das TASK-01/04/05 continuam com seus limites originais.

## 1. Fontes, versões e limites da revisão

| Fonte | Identificação conhecida e acesso | Uso e limite |
|---|---|---|
| [TAP original](./fontes/Termo_de_Abertura_Aferi.docx) e [transcrição localizável](./fontes/tap-aferi-v1.0.md) | Recebido em 27/10/2026; corpo identifica Aferi, versão 1.0, data 22/09/2026 e autoria de Ramon Pedro Menz; 52.985 bytes; SHA-256 `a097e30c3268f21bafb08bbb86d5660b426d50df1fbf8241fa7b89590994d5e2` | Ausente na revisão inicial, agora lido integralmente e preservado byte a byte. Localizadores Pxxx são parágrafos do XML, não páginas nem cláusulas oficiais. Campos de aprovação/data não preenchidos no texto e nenhuma assinatura digital identificada; recebimento não prova aprovação da orientadora. Propriedade técnica de criação em 2023 não foi usada para datar o TAP |
| [Constituição](../constitution.md) | Histórico de inclusão em `ebf7fa6`, 26/10/2026; sem número próprio de versão | Regras centrais preservadas; aplicação agora explicita aprovação prévia para escopo/prazos/terceiros e congelamento da decisão, conforme TAP. Não equivale a aprovação concedida |
| [Fotografia](../specs/spec-fotografia.md), [voz](../specs/spec-voz.md) e [PDF](../specs/spec-relatorio-pdf.md) | Decisões consolidadas no commit `e62181a`, 26/10/2026; sem versões semânticas individuais | Fontes acessíveis das escolhas fechadas, com correções documentais desta revisão. A data de registro não demonstra decisão ou PoC em 06/10 |
| [Plano de tarefas](../tasks.md) | Inclusão em `c540bae`, 26/10/2026; atualização local da TASK-01 anterior a esta revisão | Fonte secundária de cronograma, capacidade, prioridade e tarefas; não prova execução ou autorização que só conste no TAP |
| [Baseline da TASK-01](./baseline-legado.md) | Levantamento de 26/10/2026; SHA-256 do arquivo recebido nesta etapa: `20be1330f7eaed52194eec344337edea942b697782edd76bf45775fb99bcd43f` | Separa leitura de código, comandos executados e dependências de ambiente. Preservada sem alterações nesta tarefa |
| Código/configuração | `package.json`, locks, `app.config.ts`, `firestore.rules`, `src/` e `functions/` da base | Contratos existentes reconferidos estaticamente; não é implementação das novas modalidades |
| Chat disponível | Solicitações de TASK-01–TASK-05, publicação em Git e envio do TAP em 27/10/2026 | Preservadas escolhas explícitas de processamento local, memória, confirmação, Android/Web, teto e ausência de fallback remoto. Usuário autorizou versionar o TAP e continuar a TASK-02; não aprovou P01 nem exceção ao marco de decisão. Não se inventam aprovações anteriores |
| Documentação técnica pública | Fontes primárias listadas na seção 3, consultadas em 26/10/2026 | Apoiam a análise documental das APIs, sem instalar ou executar os componentes; páginas mutáveis não são prova de compatibilidade com o app |

**Fonte primária disponível:** a matriz da seção 2 foi refeita contra o original. Nome, versão, data, dois modelos de aparelho, marcos, cortes e aprovação prévia agora têm localizadores verificáveis. O TAP não define motores, `source`, bibliotecas PDF nem a gramática exata de voz; esses detalhes permanecem decisões das specs. O anexo não resolve P01 nem comprova aprovação ou cumprimento dos marcos. A extração usou ZIP/XML local, sem executar conteúdo ou seguir links do documento.

O recebimento do TAP não produz evidência funcional. Os resultados de 384 testes do app e 16 das Functions da TASK-01 são evidência do legado. As PoCs isoladas e suas versões foram posteriormente implementadas em `7fbe137`; [seu relatório](./pocs-fotografia-voz.md) registra OCR Web sintético aprovado, pt-BR local Web não disponível e build Android bloqueado por HTTP 403. Nada disso comprova integração clínica, câmera real, transcrição local real, regras, atestação/push ou desempenho de dispositivo.

## 2. Rastreabilidade direta dos principais requisitos do TAP

Os identificadores `R01`–`R15` são desta revisão, não códigos do TAP. Cada vínculo aponta para a transcrição do original. Títulos de seção e IDs Pxxx permitem conferir o requisito sem inventar paginação de DOCX. “Coberto” significa especificado, não implementado, aprovado pela orientadora ou aceito funcionalmente.

| ID | Requisito e localizador da fonte primária | Constituição e specs que o detalham | Critérios/tarefas e situação |
|---|---|---|---|
| R01 | Android/Web e mesma base BP Tracker: Título [P011–P012](./fontes/tap-aferi-v1.0.md#p011); iOS excluído em [P043](./fontes/tap-aferi-v1.0.md#p043) | Constituição §4; fotografia §§1/6.1; voz §§1/7.1; PDF §§1/7.1 | Alvos cobertos; voz condicional. TASK-04–06/18/26 devem comprovar cobertura; PoC isolada não é integração |
| R02 | Fotografia do display com confirmação: Objetivo [P021](./fontes/tap-aferi-v1.0.md#p021) | Fotografia §§3.1–3.5/6.2; constituição §3 | FOT-02–09. SYS/DIA, pulso opcional e revisão detalham a entrega; somente PoC isolada implementada, sem gravação |
| R03 | Voz com formas usuais de pt-BR e confirmação: Objetivo [P022](./fontes/tap-aferi-v1.0.md#p022) | Voz §§3.2–3.5/7.2; constituição §3 | VOZ-03–12. “Doze por oito” e escala 120/80 são detalhamento da spec, não citação do TAP. Parser e integração pendentes |
| R04 | PDF com gráfico, tabela e médias do intervalo: Objetivo [P023](./fontes/tap-aferi-v1.0.md#p023) | PDF §§3.2–3.5/7.2 | PDF-02–10/19/20; denominadores, sessões e retrato consistente especificados; nenhum PDF executado |
| R05 | Nenhum valor reconhecido gravado sem confirmação: Restrições [P114](./fontes/tap-aferi-v1.0.md#p114), também P021–P022 | Constituição §3; fotografia §§3.4/6.4; voz §§3.4/7.4; PDF §§2/3.4 | FOT-03/06–08; VOZ-03/08–10; inclui fila offline. PoCs não têm writer; isso não comprova confirmação na futura integração |
| R06 | Capturas em memória, sem persistência/log; casos sem dados de usuários; telemetria anônima: Restrições [P112–P113](./fontes/tap-aferi-v1.0.md#p112) | Constituição §2; fotografia §§2/6.2; voz §§2/7.2; PDF §§2/3.5 | FOT-10–12; VOZ-13–15; PDF-11–13/17. TAP admite envio informado como fator desfavorável; escolha posterior e instruções do usuário vedam fallback remoto. Exportar PDF é distinto de persistir captura |
| R07 | Manual/edição/consulta sem degradação: [P115](./fontes/tap-aferi-v1.0.md#p115); base e infraestrutura preservadas: Exclusões [P040–P044](./fontes/tap-aferi-v1.0.md#p040) | Constituição §4; §4 das três specs | FOT-01/13–15; VOZ-01/16–18; PDF-01/21/22; L01–L18. Execução funcional e referência de desempenho pendentes |
| R08 | Teto e composição: Orçamento [P073–P078](./fontes/tap-aferi-v1.0.md#p073); sem contratação externa: [P048](./fontes/tap-aferi-v1.0.md#p048) | Constituição §1; §2 e decisões das specs | Reconhecimento 0–100 e hospedagem 0–100 são alternativos, aparelho 0–200, sempre teto 300. São previsões, não despesas/saldo. Valores reais: **não informado** |
| R09 | Aproximadamente 100 h e equipe individual: Cronograma [P080](./fontes/tap-aferi-v1.0.md#p080) e Restrições [P111](./fontes/tap-aferi-v1.0.md#p111) | Fotografia §6.1; voz §7.1; PDF §7.4; controle do plano | Planejamento 18/38/28/16 = 100 h; não são horas realizadas ou adicionais. Consumo/saldo: **não informado** |
| R10 | Comparar alternativas por modalidade em casos rotulados: [P024](./fontes/tap-aferi-v1.0.md#p024); sem treino do zero: [P041](./fontes/tap-aferi-v1.0.md#p041) | Fotografia §§6.1/6.3; voz §§7.1/7.3; TASK-20–22 | ML Kit/Tesseract e local/Whisper.cpp são escolhas posteriores, não motores nomeados no TAP. Comparação pendente; não exige dois motores no produto |
| R11 | Ao menos dois modelos de aparelho e locutores com consentimento escrito/anonimização: Premissas [P107](./fontes/tap-aferi-v1.0.md#p107); aprovação prévia para terceiros: [P048](./fontes/tap-aferi-v1.0.md#p048) | Constituição §2/Aplicação; fotografia §6.3; voz §7.3; TASK-16/17 | Dois modelos são exigência expressa. Consentimento não substitui aprovação da orientadora. Corpus separado e fora do Git; aprovação/coleta não comprovadas pelo anexo |
| R12 | Fases oficiais: [P085–P100](./fontes/tap-aferi-v1.0.md#p085); marcos e decisão até 06/10 **sem revisão posterior**: [P103](./fontes/tap-aferi-v1.0.md#p103) | Fotografia §6.3; voz §7.3; controle do plano; TASK-06/19/22 | Datas operacionais não mudam fases oficiais. Git em 26/10 e PoCs posteriores não provam cumprimento em 06/10; P02 exige encaminhamento, sem retrodatar ou trocar stack |
| R13 | PDF/texto até 24/11, avaliação 08/12 e encerramento 15/12: [P096–P103](./fontes/tap-aferi-v1.0.md#p096) | PDF §7.4; fotografia §7; voz §6; TASK-29–34 | Prazos conferidos; não prorrogação em [P110](./fontes/tap-aferi-v1.0.md#p110). Revisão não concede prazo novo nem comprova entrega |
| R14 | Cortes, fotografia prioritária, voz parcial e núcleo irredutível: [P025–P029](./fontes/tap-aferi-v1.0.md#p025) e [P116–P117](./fontes/tap-aferi-v1.0.md#p116) | Fotografia §§6.3/7; voz §§6/7.1; PDF §6; controle de escopo | Ordem: extras de modelo/regras/testes → indicadores → serviço próprio → observabilidade. Núcleo expressamente irredutível: fotografia, confirmação e relatório técnico com decisão/comparação. PDF continua entrega principal, sem corte autorizado aqui. P106 admite análise de limites de modalidade, não aceite fictício de funcionamento |
| R15 | Relatório com seções, decisão e comparação: [P024](./fontes/tap-aferi-v1.0.md#p024); delimitação do legado [P044](./fontes/tap-aferi-v1.0.md#p044); exclusões [P038–P043](./fontes/tap-aferi-v1.0.md#p038) | Fotografia §§6.3/7; voz §§6/7.3; PDF §§6/7.3; TASK-27/30 | Separar legado/incremento/escolha/medida. Sem estudo de usabilidade com participantes, artigo SBC, iOS, loja, Bluetooth ou diagnóstico. PDF não cria outra comparação de IA |

`source`, motores por plataforma, worker, fontes locais, A4, precisão das médias, detalhes de sessão e gramática exata são decisões das specs. Foram separados do que o TAP efetivamente exige. Inspeção de acessibilidade/regressão do artefato não autoriza estudo de usabilidade com participantes, excluído em P038.

## 3. Escolhas fechadas e fontes técnicas

### Estado das decisões

| Área | Escolha fechada preservada | Parâmetros ainda não definidos/comprovados |
|---|---|---|
| Fotografia Android | ML Kit Text Recognition v2 latino embarcado; quadro em memória; PoC selecionou artefato 16.0.1, CameraX 1.5.1 e módulo Expo local | Build Kotlin bloqueado antes do módulo por download de RN 0.86.0 (HTTP 403); câmera, temporários, sete segmentos, recursos, memória e latência reais pendentes |
| Fotografia Web | Tesseract.js/core 7.0.0, modelo LSTM eng 1.0.0, worker/asset local e quadro em memória na PoC | OCR real sobre canvas sintético passou; câmera/display, inspeção completa e desempenho real pendentes. Hashes dos assets são gerados por `prepare:ocr` |
| Voz Android | `createOnDeviceSpeechRecognizer` e pt-BR; módulo Expo local implementado, verificação de idioma instalada exige API 33+ na PoC | Sem build/execução nativa, serviço/modelo de aparelho e transcrição local não comprovados. Parser compartilhado pertence à TASK-14 |
| Voz Web | Web Speech somente com `processLocally` e pt-BR; adaptador implementado | Chromium 154 consultou idioma como `downloadable`, não `available`; instalação solicitada não o disponibilizou. Nenhuma transcrição local real comprovada |
| Comparação de voz | Whisper.cpp multilíngue como comparador, fora do fluxo escolhido | Commit/versão, modelo/quantização/hash, adaptação e viabilidade do experimento. Não há aprovação implícita para torná-lo motor do produto |
| Persistência assistida | `source: 'photo'`/`'voice'` somente após confirmação; mesmos campos clínicos, sem mídia/texto/confiança persistidos | Alteração coordenada em tipos, Zod, hooks e rules; P01 sobre edição/sessões ainda sem decisão; índices precisam de revisão, não necessariamente de índice novo |
| PDF Android | Expo Print com HTML/CSS, gráfico SVG e fontes locais; compartilhamento pelo sistema | Versão exata a adotar, fonte/licença, layout/paginação, pré-visualização e ciclo de limpeza validado no Android |
| PDF Web | jsPDF + AutoTable, desenho vetorial e modelo de cálculo compartilhado | Versões compatíveis entre si, fonte/licença, cobertura de acentos, paginação, memória, pré-visualização e ciclo do Blob |

As escolhas de motores/bibliotecas constam em `e62181a`; versões concretas da PoC foram fixadas em `7fbe137`. O produto permanece em Expo **57.0.8**, RN **0.86.0**, React **19.2.3**, Firebase JS **12.17.0** resolvido, Zod **4.4.3** e TS **6.0.3**. `pocs/package.json`/lock têm dependências próprias e não integram o bootstrap Firebase. OCR/STT não foram adicionados ao produto; PDF continua sem implementação. Esta retomada não instalou pacotes nem tratou fontes atuais como prova de execução.

### Fontes públicas consultadas em 26/10/2026

O quadro abaixo preserva o estado documental da consulta inicial em 26/10, anterior à adoção de versões na PoC. A situação de implementação atual é a tabela anterior e o relatório das TASK-04/05; não se redata a consulta pública ou a execução.

| Fonte primária | O que sustenta nesta revisão | Versão conhecida e limite |
|---|---|---|
| [ML Kit — Text Recognition Android](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) | Distingue variante embarcada da distribuída por Play Services e documenta entradas `media.Image`/buffer | Guia mostra `com.google.mlkit:text-recognition:16.0.1` para latim embarcado; **observação documental, não versão adotada**. A bridge ainda não foi escolhida/testada e reconhecer displays não está comprovado |
| [Tesseract.js — repositório oficial](https://github.com/naptha/tesseract.js) | Execução via worker/WASM e ciclo de worker; mudanças de versões afetam outputs estruturados | README mutável cita v7 e mudanças da v6 que desabilitam outputs além de texto por padrão. Não fixamos versão a partir disso; a PoC precisa conferir obtenção de posições e assets/modelo LSTM |
| [Android — SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer) | APIs de disponibilidade/on-device e liberação por `destroy()` | `createOnDeviceSpeechRecognizer` e `isOnDeviceRecognitionAvailable` documentadas desde **API 31**. Isso não define o minSdk do app inteiro nem prova pt-BR/privacidade em aparelho concreto |
| [Web Speech API — especificação do grupo](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-processlocally) | Atributo local obrigatório quando verdadeiro; sem ele o agente pode escolher processamento remoto | Draft Community Group Report exibido com data **26/10/2026**, documento mutável; não é suporte implementado de todos os navegadores nem versão de dependência |
| [Expo Print — documentação SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/print/) | Geração HTML→PDF em cache nativo e comportamento Web de diálogo de impressão, coerente com adaptadores distintos | Página SDK 57 indica `~57.0.2`. **Não instalado, adotado ou validado**. Não usar `latest` para inferir compatibilidade: na consulta, [latest](https://docs.expo.dev/versions/latest/sdk/print/) já indicava `~58.0.7` |
| [jsPDF — repositório oficial](https://github.com/parallax/jsPDF) | Geração client-side e necessidade de fonte adequada aos glifos para Unicode | Sem versão exata adotada. README mutável; não comprova português, PDF acessível ou desenho correto do app |
| [AutoTable — repositório oficial](https://github.com/simonbengtsson/jsPDF-AutoTable) | Recursos de cabeçalho repetido e quebras de tabela | Sem versão exata adotada. Opções documentadas não comprovam paginação/legibilidade real |
| [Whisper.cpp — repositório oficial](https://github.com/ggml-org/whisper.cpp) | Identifica a implementação e artefatos de modelo do comparador | Sem commit/modelo adotado ou executado; exemplos que usam arquivo não autorizam persistir áudio no produto |

As páginas externas foram consultadas por leitura. Não se usaram exemplos que enviem mídia, registrem texto clínico no console ou baixem conteúdo remoto dentro do template como implementação autorizada. Guardar versão/commit/hash e licença dos componentes efetivamente selecionados nas TASK-04–TASK-06/TASK-20–TASK-21/TASK-24–TASK-26; fonte atual não retrovalida compatibilidade histórica nem fecha uma PoC.

## 4. Confrontação com o código e a TASK-01

| Contrato constatado no código | Impacto nas specs e tratamento |
|---|---|
| `Reading.source`, `z.literal('manual')`, rules e hooks `useAddReading`/`useUpdateReading` aceitam/geram somente manual | Decisão de adicionar photo/voice permanece; nenhuma modalidade nova está integrada ao produto. A seção 4 de fotografia/voz explicita os hooks e P01; TASK-11 deve coordenar todas as camadas. PoC isolada não altera esses contratos |
| `useSecondMeasurementFlow` atualiza a primeira medição com média `Math.round` e duas entradas; pulso médio nulo se faltar em um lado | Preservar um único documento e detalhes; não contar sessão duas vezes no PDF. Entrada assistida para a segunda leitura não se torna escopo obrigatório por esta revisão; se futuramente existir, também exige confirmação |
| `useReadingForm` conserva detalhes ao editar nota/data e os remove ao alterar números/pulso | Comportamento agora descrito nas specs de entrada e na proposta P01; não substituir por reinterpretação de mídia ou reconstrução dos valores antigos |
| Schema usa faixas 50–300/30–200/20–250, inteiros, sistólica > diastólica, nota até 280; futuro tolerado 60 s no Zod e 5 min nas rules | Faixas já coerentes; adicionada explicitação das regras de data/nota, sem mudar código nem harmonizar tolerâncias silenciosamente |
| `getAllReadings` retorna `Reading[]`, sem ID/metadados/relato de omissões; invalidados são descartados individualmente | Reuso direto não satisfaz o desempate por ID, aviso de cache, escritas pendentes e cobertura do PDF. Spec §4 agora explicita o contrato a adaptar, sem alterar retorno do CSV nesta tarefa |
| CSV usa períodos corridos N×24 h, limites inclusivos e data final personalizada até 23:59:59.999; gráfico usa dias locais 7/30 e inteiros | PDF tem contrato próprio de dias civis/fuso congelado, precisão final de uma casa e intervalo adaptável. Esclarecido que reuso do padrão não autoriza mudar CSV ou reaproveitar médias arredondadas do gráfico |
| CSV nativo escreve `documentDirectory` sem rotina de limpeza explícita | Não replicar retenção no PDF; a spec já exige cache privado e ciclo seguro. Capturas OCR/STT continuam proibidas em disco |
| Logger filtra chaves do contexto, não o conteúdo de `error` | Critérios de exceção sensível das três specs são necessários; não tratar logger atual como garantia automática de privacidade dos motores/renderizadores |
| Cache persistente Web; Android JS SDK com `getFirestore` sem persistência em disco explicitamente configurada | Mantida a ressalva das specs e de PDF-19: geração/inferência local não garante histórico completo offline |
| Gates Auth/consentimento e tratamento de push legados; rules de medições não exigem aceite | Novos fluxos devem preservar gates e invalidar operações por UID; nenhum requisito de prova de consentimento no backend foi declarado já implementado ou adicionado silenciosamente |
| Functions declara Node 20/CI 20, mas Admin travado exige >=22; execução de regras e dispositivo ainda pendente | Riscos prévios herdados da TASK-01; não são regressões provadas das novas funções nem correções funcionais autorizadas pela TASK-02 |

## 5. Problemas encontrados e resolução documental

| ID | Problema objetivo / ambiguidade | Resolução e estado |
|---|---|---|
| C01 | Fotografia §3.1, FOT-09 e FOT-12 ainda admitiam provedor externo, embora §6 feche OCR local | **Corrigido:** fluxo explica processamento local, falha não ativa nuvem e FOT-12 inspeciona ausência de envio de imagem/texto/candidatos. Mantidos IDs e motores aprovados |
| C02 | Voz §2/§3.1, VOZ-15 e ressalva de cancelamento remoto deixavam aberta alternativa de nuvem consentida, enquanto §7 a exclui | **Corrigido:** alinhamento com modo local comprovado e retorno ao manual. Consentimento para envio não se torna autorização para trocar arquitetura |
| C03 | VOZ-12 agrupava falta de rede e falta de pacote, podendo sugerir que a rede é requisito mesmo no caminho local disponível | **Corrigido:** distingue teste offline com recursos locais e indisponibilidade sem suporte/pacote; não exige fallback remoto |
| C04 | “O fluxo atende Android e Web” podia ser lido como suporte universal, em conflito com a habilitação condicional de voz | **Esclarecido:** são plataformas alvo; habilitação depende de prova por ambiente. Não se reduziu o alvo para uma plataforma nem se marcou voz completa apenas por oferecer manual |
| C05 | Frase sobre Whisper.cpp sugeria esforço ampliado “para aproximadamente 100 horas totais”, confundindo capacidade do ciclo com estimativa do comparador | **Corrigido:** 100 h são planejamento global; esforço adicional/real não medido, sem inventar consumo |
| C06 | “R$ 0,00” nas decisões podia ser interpretado como despesa real zero ou saldo integral | **Esclarecido nas três specs:** ausência planejada de tarifa de API; despesas e horas reais **não informado**, orçamento de R$ 300,00 mantido |
| C07 | Integração de origem mencionava tipos/schema/rules, mas omitia que os hooks também forçam manual; origem após edição/sessão não definida | **Parte factual corrigida** nas specs de entrada; **decisão pendente P01**, não adotada como contrato |
| C08 | Reuso do CSV no PDF podia induzir mesmo intervalo e retorno suficiente para todos os requisitos | **Esclarecido no PDF §4:** períodos diferentes, necessidade de ID/metadados/omissões e preservação do CSV. Sem escolha de nova biblioteca ou API de persistência |
| C09 | Fontes/versões das escolhas não estavam rastreadas e podiam ser confundidas com compatibilidade executada | **Corrigido documentalmente:** seção 3 registra origem no Git, fontes e versões observadas versus ainda não adotadas; links da revisão adicionados às três specs |
| C10 | TAP original indisponível na revisão inicial | **Resolvido em 27/10:** DOCX integral arquivado com SHA-256 e transcrição; R01–R15 têm localizadores primários. Arquivo não comprova aprovação |
| C11 | Consentimento de locutor podia ser interpretado como suficiente, omitindo aprovação prévia para procedimentos com terceiros | **Corrigido:** constituição/Aplicação e fotografia/voz distinguem aprovação da orientadora (P048) de consentimento escrito/anonimização (P107). Nenhuma aprovação foi presumida; coleta com terceiros segue condicionada |
| C12 | Propostas de troca de motor mencionavam revisão explícita sem reconhecer a decisão até 06/10 “sem revisão posterior” | **Parte documental corrigida:** congelamento e bloqueio de alteração automática explicitados. **P02 pendente:** registrar artefato tempestivo, se existir, e encaminhamento à orientadora, sem trocar stack, retroagir aprovação ou prorrogar cronograma |
| C13 | Dois modelos de aparelho eram tratados como escolha operacional sem comprovação primária | **Corrigido:** P107 exige expressamente ao menos dois modelos; matriz e fotografia §6.3 atualizadas |
| C14 | Possível confusão entre PDF como entrega principal e a lista expressa de itens irredutíveis | **Esclarecido:** P023/P103 exigem PDF; P117 lista fotografia, confirmação e relatório técnico. Não se acrescentou PDF à citação de P117 e não se autorizou cortá-lo |
| C15 | P106 admite análise de limites se nenhuma abordagem viável existir; P117 mantém fotografia irredutível | **Limite registrado:** não interpretar P106 como autorização de corte automático. Se houver inviabilidade demonstrada, apresentar alcance e evidências à orientadora conforme P048, preservando confirmação/privacidade. Não foi demonstrada inviabilidade de todas as abordagens nem aplicado corte nesta revisão |

Na revisão inicial, os quatro eixos da constituição não precisaram de correção. Na retomada, foram explicitadas em Aplicação as condições do original sobre aprovação prévia e congelamento da decisão. Teto, memória, confirmação e legado continuam preservados. A cláusula genérica de serviços externos não reabre motores locais; estrutura, IDs dos critérios e escolhas foram mantidos. Baseline e anotações da TASK-01 não foram reescritas.

## 6. Critérios de aceite: consistência e evidência futura

Permanecem **16 critérios FOT, 19 VOZ e 22 PDF (57 no total)**, sem renumeração. Essa contagem é documental, não de testes aprovados. Não se fixou meta quantitativa de acurácia/latência sem PoC; parâmetros devem ser definidos antes da avaliação final e não escolhidos depois de ver resultados para declarar sucesso.

| Eixo | Critérios rastreáveis | Evidência proporcional exigida, ainda não produzida nesta tarefa |
|---|---|---|
| Campos, revisão e confirmação | FOT-03–FOT-08, VOZ-03–VOZ-10; PDF §3.4 | Testes de interpretação/validação e integração que mostrem nenhuma escrita/fila antes de confirmar, correção persistida uma vez, cancelamento e resultados tardios |
| Privacidade/localidade | FOT-10–FOT-12, VOZ-13–VOZ-15, PDF-11–PDF-13/PDF-17 | Inspeção de captura, bridges, armazenamento, rede, logs/exceções e temporários em runtime; mocks ou modo avião isoladamente não provam não retenção |
| Falha e indisponibilidade | FOT-02/FOT-09, VOZ-02/VOZ-11/VOZ-12/VOZ-15, PDF-07/PDF-16/PDF-19 | Ambiente sem suporte/permissão/modelo/rede; mensagem acessível, saída manual e nenhum salvamento reconhecido automático |
| Ciclo de vida e conta | FOT-07/FOT-08/FOT-16, VOZ-09/VOZ-10/VOZ-19, PDF-14–PDF-18 | Cancelar/substituir operação, background, troca de UID, retry e consumidor externo; não entregar nem gravar resultado tardio de outra conta |
| Legado, acesso e desempenho | FOT-01/FOT-13–FOT-15, VOZ-01/VOZ-16–VOZ-18, PDF-01/PDF-21/PDF-22 | Casos da baseline, teclado/leitor de tela/fonte ampliada e comparação sob mesmas condições; desempenho de referência ainda precisa ser medido |
| Conteúdo e cobertura do PDF | PDF-02–PDF-10/PDF-19/PDF-20 | Dataset sintético com conferência independente de período/fuso, contagens, pulso nulo, sessões, snapshot e omissões; inspeção visual/multipágina/A4/escala de cinza, sem presumir PDF/UA |

O exemplo do PDF §3.3 é aritmeticamente coerente: 120/80, 130/90 e 140/100 geram **130,0/90,0 (N=3)**; pulsos 60, nulo e 80 geram **70,0 (N=2)**. Se os primeiros dois registros estão no mesmo dia, os pontos diários são 125/85 e 140/100: sua média seria 132,5/92,5, portanto não substitui a média por registro. Isso foi conferido por cálculo independente nesta revisão, **sem executar renderizador ou gerar PDF**.

## 7. Questão que exige definição antes de alterar a decisão

<a id="p01-origem"></a>

### P01 — Origem após edição e em sessões

**Estado: proposta, não aprovada nem implementada.** A inclusão de photo/voice está fechada; falta definir o significado do único `source` de um documento quando a edição é manual ou a segunda leitura usa outro caminho. Hoje todo registro é manual, e os hooks sobrescrevem `source` com esse valor. As specs não autorizam inferir automaticamente a semântica das combinações futuras.

**Proposta para revisão:** definir `source` como o caminho de entrada da **primeira gravação confirmada** do registro. Preservá-lo em edição de nota/data, correção manual de números e cálculo da média da sessão, documentando que o campo não afirma origem individual de cada número nem constitui trilha de auditoria. Segunda leitura manual de registro iniciado por fotografia manteria `source: 'photo'`. Documentos antigos seguem manual; não acrescentar origem por leitura ou campos de mídia. A regra legada de remover `sessionReadings` ao alterar números/pulso continua independente da origem.

| Situação sintética | Resultado proposto, ainda não contratado |
|---|---|
| Primeira criação por formulário / fotografia / voz | `manual` / `photo` / `voice`, respectivamente, após confirmação |
| Nota/data editadas em registro photo | Mantém photo e detalhes de sessão |
| Números/pulso corrigidos manualmente em registro voice | Mantém voice como origem de criação; remove detalhes de sessão conforme o legado |
| Primeira leitura photo + segunda manual | Um documento photo, média nos campos principais, duas leituras nos detalhes |

Alternativa seria redefinir origem após correção numérica ou manter proveniência individual de leituras; isso mudaria o contrato e possivelmente o modelo, ampliando casos de migração/regras. A recomendação acima minimiza campos novos, mas requer aceite explícito da semântica antes da TASK-11. Nenhuma das alternativas foi aplicada aos tipos, rules ou specs como decisão definitiva nesta tarefa.

Não há evidência nova que justifique trocar ML Kit, Tesseract.js, reconhecedores locais ou bibliotecas PDF. Se uma PoC demonstrar inviabilidade, registrar versão/ambiente e critério eliminatório, apresentar alternativa e impacto em privacidade, cobertura, prazo e orçamento. Isso não autoriza mudar motor ou reduzir escopo: observar P02 e as condições do TAP. Não habilitar caminho incompatível enquanto o encaminhamento estiver pendente.

<a id="p02-marco-decisao"></a>

### P02 — Marco da decisão e congelamento previstos no TAP

**Estado: encaminhamento proposto; nenhuma exceção aprovada.** Em Cronograma, [P103](./fontes/tap-aferi-v1.0.md#p103) prevê “06/10 — provas de conceito realizadas e decisão técnica formalizada em documento próprio, sem revisão posterior”. As specs registram escolhas em `e62181a` de 26/10; a PoC isolada está em `7fbe137`, posterior ao marco. Isso não prova inexistência de artefato anterior fora do Git, mas não há evidência de cumprimento até 06/10 nesta entrega. Em 27/10, o produto tampouco tem as duas modalidades integradas, como previsto no mesmo parágrafo; não apresentar PoCs como integração.

**Proposta concreta:** preservar integralmente a stack das specs e suas datas reais; manter resultados posteriores como validação da escolha, não revisão tácita. Se existir documento próprio ou registro de decisão/PoC anterior a 06/10, disponibilizá-lo com versão/data verificáveis para confrontação. Se não existir, registrar a lacuna de cumprimento e obter orientação formal da professora sobre o tratamento acadêmico desse marco e o alcance entregue. Não solicitar nem presumir prorrogação; [P110](./fontes/tap-aferi-v1.0.md#p110) mantém o prazo prioritário sem extensão. Qualquer proposta de mudança de escolha ou de escopo terá de ser apresentada antes de implementação, sem pressupor que a aprovação para outra matéria já a autoriza.

Alterações de escopo, procedimentos com terceiros e prazos dependem de aprovação prévia conforme Designação [P048](./fontes/tap-aferi-v1.0.md#p048). O original tem campos de aprovação/data em branco no texto e não contém assinatura digital identificada; não certifica aprovação do aproveitamento do legado (premissa P105), coleta com terceiros ou exceção a P103. Não se afirma que essas aprovações não existam em outro meio: sua evidência ainda não foi fornecida.

Para encaminhar, basta fornecer o artefato anterior, se existir, e a referência ou síntese sanitizada da orientação aplicável. Não versionar consentimentos identificáveis, assinaturas pessoais adicionais ou comunicações privadas completas. Consentimento de locutor e autorização da orientadora são condições distintas; enquanto ausentes, as PoCs seguem com o próprio autor e dados sintéticos, sem coleta de terceiros.

P01 é uma definição de contrato de dados, não uma troca automática de motor. Seu encaminhamento ao responsável pelo produto continua necessário antes da TASK-11. P02 não altera as escolhas já fechadas nem converte a arquitetura em modalidade aprovada. A decisão final não será inventada pelo executor desta revisão.

## 8. Verificações documentais e fechamento

Foram revisados constituição e três specs e reconferidos os contratos da seção 4. As fontes públicas da seção 3 foram consultadas na rodada inicial. Em 27/10, o original do TAP foi extraído integralmente e confrontado; fontes públicas não foram tratadas como evidência de compatibilidade executada. A checagem documental verifica original/transcrição, links/âncoras, 57 IDs, orçamento planejado, preservação de código/locks/baseline e `git diff --check`. Nenhum motor, serviço clínico ou configuração remota foi executado/alterado para obter a rastreabilidade.

Resultados das checagens locais da rodada inicial (26/10), preservados como histórico:

- Links locais e âncora P01 resolvidos; 16 IDs FOT, 19 VOZ e 22 PDF únicos e consecutivos.
- 34 tarefas mantêm **100 h estimadas**: 18/38/28/16 h nas quatro fases. Esse cálculo confere o planejamento, não horas realizadas.
- SHA-256 da baseline, constituição e dois locks iguais aos recebidos no início da TASK-02; diff sem alterações em código funcional/configuração. `git diff --check` sem erros; arquivo novo conferido quanto a whitespace e newline final.
- Exemplo numérico do PDF conferido por aritmética independente: 130,0/90,0 e pulso 70,0; nenhum motor de PDF foi executado.

Resultados da retomada (27/10/2026):

- DOCX arquivado idêntico ao anexo e SHA-256 conferido. Os 123 parágrafos não vazios da transcrição foram comparados ao texto dos 130 elementos `w:p` do original; conteúdo e ordem coincidem. A conferência foi textual, não renderização visual de Word/PDF ou certificação de assinatura.
- 77 links locais/âncoras conferidos nos documentos desta atualização; 57 IDs de aceite preservados; 34 tasks continuam somando 100 h de planejamento. TASK-01/02/04/05 continuam abertas e TASK-03 concluída somente como desenho.
- Baseline, arquitetura, relatório das PoCs, código funcional e locks comparados à base `7fbe137`, sem alteração. Mudanças limitadas ao original/transcrição, revisão, constituição, três specs e registro no plano; nenhum dado clínico, credencial ou corpus identificável incluído. Inspeção das partes XML do DOCX não identificou credenciais, e-mails, macros, comentários ou revisões rastreadas; os nomes de autoria e partes interessadas do documento fornecido foram preservados.
- `npm run lint`, `npm run typecheck` e `npm test -- --ci --runInBand`: código 0, **45 suítes/384 testes aprovados**. Essa execução de regressão automatizada não valida câmera, voz, PDF, Firebase remoto ou critérios de aparelho. `git diff --check` sem erros; nenhuma instalação, operação contra produção ou configuração remota nesta retomada.

| Critério da TASK-02 | Situação |
|---|---|
| Revisar constituição/specs contra código e baseline | Realizado, com limitações anteriores preservadas |
| Corrigir contradições objetivas sem trocar stack/escopo | Tratamentos registrados em C01–C15; correções factuais realizadas e decisões P01/P02 explicitamente pendentes |
| Rastrear TAP com fonte identificada e verificável | **Realizado em 27/10:** original íntegro, SHA-256, versão/data do corpo e matriz R01–R15 com localizadores primários |
| Separar decisões fechadas de resultados medidos e registrar fontes/versões | Realizado nas seções 1/3/6; distingue versões da PoC de documentação pública e de integração não executada |
| Resolver questões que dependem de escolha técnica/contrato aprovado | **Pendente:** P01 não aprovada; P02 registra o conflito do marco/congelamento e proposta de encaminhamento, sem alterar stack/escopo |
| Registrar esforço e despesas reais | **não informado**; estimativa de 3 h de planejamento da TASK-02 mantida sem converter em realização; saldo global continua desconhecido |

**TASK-02 permanece aberta.** A falta do TAP e a confrontação direta foram resolvidas. Para fechamento, registrar a decisão ou o encaminhamento formal de P01 e o tratamento de P02 com as evidências disponíveis, sem presumir autorização acadêmica. As PoCs, medições e verificações Android/Web têm suas próprias pendências; não são requisitos novos de execução desta revisão nem foram aprovadas pelo recebimento do documento. Horas/despesas realizadas e saldos seguem **não informado**.
