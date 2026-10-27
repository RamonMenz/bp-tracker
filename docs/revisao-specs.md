# Revisão da constituição e das especificações — TASK-02

**Data:** 26/10/2026. **Base:** `7d72cb3347dca04bde9b8a706f523a6da245dea2` (`staging` trazida à branch local `work` na TASK-01), com os documentos ainda não commitados da TASK-01 preservados. **Resultado:** revisão documental parcial, com correções aplicadas e pendências explícitas. Nenhuma funcionalidade foi implementada, dependência instalada ou decisão de motor substituída nesta etapa.

## 1. Fontes, versões e limites da revisão

| Fonte | Identificação conhecida e acesso | Uso e limite |
|---|---|---|
| TAP anexado | Referido nos documentos como TAP v1.0, de 22/09/2026; **original não disponível nesta sessão** | Não foi localizado no repositório nem em `/workspace/library-files`, `/workspace/shared/downloads` ou `/workspace/scratch`; não há referência de arquivo anexado utilizável nas mensagens disponíveis. Caminho/link solicitado ao usuário. Versão/data são as declaradas pelas fontes secundárias; autoria, páginas, redação e aprovações do original não foram conferidas |
| [Constituição](../constitution.md) | Conteúdo da base acima; histórico de inclusão em `ebf7fa6`, 26/10/2026; sem número próprio de versão | Fonte normativa versionada revisada integralmente; mantida sem alteração. Não substitui o original do TAP |
| [Fotografia](../specs/spec-fotografia.md), [voz](../specs/spec-voz.md) e [PDF](../specs/spec-relatorio-pdf.md) | Decisões consolidadas no commit `e62181a`, 26/10/2026; sem versões semânticas individuais | Fontes acessíveis das escolhas fechadas, com correções documentais desta revisão. A data de registro não demonstra decisão ou PoC em 06/10 |
| [Plano de tarefas](../tasks.md) | Inclusão em `c540bae`, 26/10/2026; atualização local da TASK-01 anterior a esta revisão | Fonte secundária de cronograma, capacidade, prioridade e tarefas; não prova execução ou autorização que só conste no TAP |
| [Baseline da TASK-01](./baseline-legado.md) | Levantamento de 26/10/2026; SHA-256 do arquivo recebido nesta etapa: `20be1330f7eaed52194eec344337edea942b697782edd76bf45775fb99bcd43f` | Separa leitura de código, comandos executados e dependências de ambiente. Preservada sem alterações nesta tarefa |
| Código/configuração | `package.json`, locks, `app.config.ts`, `firestore.rules`, `src/` e `functions/` da base | Contratos existentes reconferidos estaticamente; não é implementação das novas modalidades |
| Chat disponível | Solicitações de TASK-01/TASK-02 e indicação de procurar `tasks.md` em `staging` | As escolhas técnicas são preservadas conforme o registro consolidado das specs. A discussão original que as fechou não está reproduzida no histórico acessível; não se inventam citações, datas de aprovação ou justificativas adicionais atribuídas ao usuário |
| Documentação técnica pública | Fontes primárias listadas na seção 3, consultadas em 26/10/2026 | Apoiam a análise documental das APIs, sem instalar ou executar os componentes; páginas mutáveis não são prova de compatibilidade com o app |

**Consequência da ausência do TAP:** a matriz da seção 2 é uma rastreabilidade **indireta e provisória**, baseada nos requisitos atribuídos ao TAP pela constituição, specs e plano. Não contém citações literais nem números de seção/página do TAP inventados. Para fechar a TASK-02 é necessário confrontar cada vínculo com o original, registrar sua identificação e localizadores, e resolver diferenças encontradas. As correções que independem desse anexo foram concluídas.

Não houve novos testes funcionais, builds, PoCs, downloads de modelos, instalações, consultas a produção, commit ou push. Os resultados de 384 testes do app, 16 das Functions e export Web registrados na TASK-01 são **evidência anterior do legado**, não validação de fotografia, voz ou PDF. Regras Firestore, execução real Android/Web, atestação/push e desempenho continuam com as limitações da baseline.

## 2. Rastreabilidade provisória dos principais requisitos atribuídos ao TAP

Os identificadores `R01`–`R15` são desta revisão; **não são códigos do TAP**. Em todas as linhas, a coluna de origem é fonte secundária acessível e a conferência da fonte primária permanece pendente. “Coberto” aqui significa especificado, não implementado ou aceito.

| ID | Requisito atribuído ao TAP e fonte secundária | Constituição e specs que o detalham | Critérios/tarefas de verificação e situação |
|---|---|---|---|
| R01 | Evoluir o BP Tracker para Android e Web; `tasks.md`, apresentação e limites finais | Constituição §4; fotografia §1/§6.1; voz §1/§7.1; PDF §1/§7.1 | Plataformas alvo presentes nos três documentos; habilitação de voz depende de localidade/pt-BR. TASK-04–TASK-06, TASK-18 e TASK-26 ainda devem comprovar cobertura |
| R02 | Registro por fotografia de display, com campos revisáveis; fotografia §§1/3 | Fotografia §§3.1–3.5/6.2; constituição §3 | FOT-02–FOT-09; campos SYS/DIA, pulso opcional, ambiguidades, validação e confirmação especificados; não implementados |
| R03 | Registro por voz pt-BR, incluindo “doze por oito”; voz §§1/3 | Voz §§3.2–3.5/7.2; constituição §3 | VOZ-03–VOZ-12; parser determinístico separa escalas, pulso e ambiguidade; suporte real ainda não medido |
| R04 | Relatório com gráfico, tabela e médias; PDF §1 | PDF §§3.2–3.5/7.2 | PDF-02–PDF-10/PDF-19/PDF-20; três médias com denominadores, sessões sem dupla contagem, tabela completa e gráfico temporal; conteúdo especificado, sem artefato PDF gerado |
| R05 | Confirmação explícita antes de qualquer gravação reconhecida; constituição §3 | Fotografia §3.4/§6.4; voz §3.4/§7.4; PDF §2/§3.4 | FOT-03/FOT-06–FOT-08, VOZ-03/VOZ-08–VOZ-10; fila offline também protegida. PDF nunca confirma candidato nem altera medição |
| R06 | Privacidade: mídia de uso estritamente em memória e sem logs clínicos; constituição §2 | Fotografia §2/§6.2; voz §2/§7.2; PDF §2/§3.5 | FOT-10–FOT-12, VOZ-13–VOZ-15, PDF-11–PDF-13/PDF-17. PDF exportado é artefato permitido por ação do usuário; não é autorização de persistência da captura |
| R07 | Preservar autenticação, manual, edição, consulta e desempenho; constituição §4 | §4 das três specs; fotografia/voz sob demanda; PDF independente do CSV | FOT-01/FOT-13–FOT-15, VOZ-01/VOZ-16–VOZ-18, PDF-01/PDF-21/PDF-22; roteiro L01–L18 da baseline. Ausência de degradação ainda não comprovada |
| R08 | Orçamento global de R$ 300,00; constituição §1 | §2 e seção de decisão de cada spec | Mesmo teto, sem franquia por modalidade/mês. Sem tarifa por chamada na arquitetura local não equivale a gasto total zero; despesas/saldo **não informado** |
| R09 | Trabalho individual dentro de 100 h estimadas do ciclo; `tasks.md`, Controle do plano | Fotografia §6.1; voz §7.1; PDF §7.4; TASK-28 e controle do plano | 100 h são capacidade de planejamento, não execução. As 3 h de TASK-01 e 3 h de TASK-02 também não são horas realizadas. Consumo/saldo **não informado** |
| R10 | Modelos pré-treinados e comparação de abordagens; fotografia §6.3, voz §7.3, plano TASK-20–TASK-22 | Fotografia §6.1/§6.3; voz §7.1/§7.3 | ML Kit × Tesseract.js e reconhecedor local × Whisper.cpp, com conjunto rotulado comum e contexto de hardware. Comparação futura, sem métricas fabricadas e sem obrigar dois motores no produto |
| R11 | Corpus próprio, variação de aparelhos e consentimento de locutores externos; constituição §2 e TASK-16/TASK-17 | Fotografia §6.3; voz §7.3 | Pelo menos dois modelos de aparelho é operacionalização registrada na spec, não citação confirmada do TAP. Separar ajuste/avaliação, corpus acadêmico e dados de usuários; aprovação aplicável para terceiros ainda precisa ser conferida no original |
| R12 | Marcos de 22/09, 06/10, 13/10, 27/10 e comparação em 10/11; `tasks.md`, Controle/Fases 1–3 | Fotografia §6.3; voz §7.3; TASK-06/TASK-19/TASK-22 | Datas preservadas como planejamento registrado; não retroagir decisão ou aprovação. Nenhuma conclusão desses marcos é presumida |
| R13 | PDF e texto técnico até 24/11; avaliação em 08/12 e ajustes até 15/12; `tasks.md`, Fases 3–4 | PDF §7.4; fotografia §7; voz §6 | TASK-29–TASK-34; confrontação de prazos e entregáveis com TAP original pendente. Revisão não prorroga cronograma |
| R14 | Prioridade de fotografia completa/comparada, voz eventualmente parcial e ordem de corte de complementos; fim de `tasks.md` e voz §6 | Fotografia §6.3/§7; voz §6/§7.1; PDF §6 | Indisponibilidade de voz não pode ser descrita como modalidade totalmente entregue. Não cortar fotografia, confirmação, relatório técnico ou PDF silenciosamente; qualquer alteração formal depende da fonte/decisão aplicável |
| R15 | Relatório Técnico Final com método, decisões, comparação e limitações; `tasks.md` TASK-27/TASK-30 | Fotografia §6.3/§7; voz §6/§7.3; PDF §6/§7.3 | Relatório e demonstração devem separar legado, incremento, escolha de arquitetura e medida. Não transformar validação de PDF em novo estudo comparativo de IA obrigatório |

Escolhas operacionais como `source: 'photo'/'voice'`, motores por plataforma, worker, fontes locais, A4, precisão de médias e detalhes de sessão são **decisões de especificação** que concretizam esses requisitos. Não foram atribuídas ao texto do TAP sem acesso a ele.

## 3. Escolhas fechadas e fontes técnicas

### Estado das decisões

| Área | Escolha fechada preservada | Parâmetros ainda não definidos/comprovados |
|---|---|---|
| Fotografia Android | ML Kit Text Recognition v2, modelo latino embarcado; captura de quadro em memória; sem OpenCV operacional | Binding/câmera concretos, versão do artefato/modelo, build Expo 57/RN 0.86, ausência de temporários, acerto em sete segmentos, timeout, memória e latência |
| Fotografia Web | Tesseract.js, modelo LSTM em Web Worker; `getUserMedia` e quadro em memória; carregamento sob demanda | Versão exata de Tesseract.js/core/modelo e hashes/licenças, configuração de assets/outputs, navegadores/limites e métricas |
| Voz Android | `SpeechRecognizer.createOnDeviceSpeechRecognizer` e disponibilidade local/pt-BR; parser compartilhado | Bridge, serviço/modelo de cada aparelho, suporte pt-BR, provas de não retenção/envio e parâmetros de duração/timeout |
| Voz Web | Web Speech **somente** com modo local comprovado (`processLocally = true`) e pt-BR | Navegadores/versões e pacotes realmente elegíveis; possuir microfone ou reconhecer o nome da propriedade não comprova execução local |
| Comparação de voz | Whisper.cpp multilíngue como comparador, fora do fluxo escolhido | Commit/versão, modelo/quantização/hash, adaptação e viabilidade do experimento. Não há aprovação implícita para torná-lo motor do produto |
| Persistência assistida | `source: 'photo'`/`'voice'` somente após confirmação; mesmos campos clínicos, sem mídia/texto/confiança persistidos | Alteração coordenada em tipos, Zod, hooks e rules; P01 sobre edição/sessões ainda sem decisão; índices precisam de revisão, não necessariamente de índice novo |
| PDF Android | Expo Print com HTML/CSS, gráfico SVG e fontes locais; compartilhamento pelo sistema | Versão exata a adotar, fonte/licença, layout/paginação, pré-visualização e ciclo de limpeza validado no Android |
| PDF Web | jsPDF + AutoTable, desenho vetorial e modelo de cálculo compartilhado | Versões compatíveis entre si, fonte/licença, cobertura de acentos, paginação, memória, pré-visualização e ciclo do Blob |

Essas escolhas constam em `e62181a`; não são resultados experimentais desta revisão. O app permanece em Expo **57.0.8**, React Native **0.86.0**, React **19.2.3**, Firebase JS **12.17.0** resolvido, Zod **4.4.3**, TypeScript **6.0.3**. As bibliotecas novas de OCR/PDF/voz e bindings não constam no `package.json`/locks da base. Não foi executado qualquer comando de instalação nesta TASK-02.

### Fontes públicas consultadas em 26/10/2026

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
| `Reading.source`, `z.literal('manual')`, rules e hooks `useAddReading`/`useUpdateReading` aceitam/geram somente manual | Decisão de adicionar photo/voice permanece; nenhuma modalidade nova já funciona. A seção 4 de fotografia/voz agora explicita os hooks e a lacuna de semântica P01; TASK-11 deve coordenar todas as camadas |
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
| C10 | Não há TAP original acessível para confirmar atribuições de requisitos/marcos e aprovação de terceiros | **Pendente:** matriz provisória, limitação exposta aqui, nos cabeçalhos das specs e na TASK-02; não se presume conformidade integral com TAP |

A constituição foi revisada nos quatro eixos e **não precisou de correção normativa**: teto global, proibição de persistência de capturas, confirmação e legado são coerentes. A cláusula genérica sobre eventuais serviços externos permanece válida como restrição geral, mas não reabre motores locais já escolhidos. Os arquivos das specs foram editados pontualmente, mantendo estrutura, IDs dos critérios e escolhas. A baseline e as anotações da TASK-01 foram preservadas.

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

Não há evidência nova que justifique trocar ML Kit, Tesseract.js, reconhecedores locais ou bibliotecas PDF. Se uma PoC demonstrar inviabilidade, registrar versão/ambiente e critério eliminatório, apresentar alternativa e impacto em privacidade, cobertura, prazo e orçamento antes de mudar o motor ou reduzir escopo. Não habilitar um caminho incompatível enquanto essa revisão estiver pendente.

## 8. Verificações documentais e fechamento

Foram revisados integralmente constituição e três specs, reconferidos os contratos de código da seção 4, consultadas as fontes da seção 3 e revisadas as alterações no Git. A checagem documental final verifica links locais, unicidade/continuidade dos 57 IDs, preservação da baseline, integridade dos locks e ausência de mudanças funcionais, além de `git diff --check`. Não se executaram os comandos de instalação, testes ou PoC citados pelas fontes públicas.

Resultados das checagens locais desta revisão:

- Links locais e âncora P01 resolvidos; 16 IDs FOT, 19 VOZ e 22 PDF únicos e consecutivos.
- 34 tarefas mantêm **100 h estimadas**: 18/38/28/16 h nas quatro fases. Esse cálculo confere o planejamento, não horas realizadas.
- SHA-256 da baseline, constituição e dois locks iguais aos recebidos no início da TASK-02; diff sem alterações em código funcional/configuração. `git diff --check` sem erros; arquivo novo conferido quanto a whitespace e newline final.
- Exemplo numérico do PDF conferido por aritmética independente: 130,0/90,0 e pulso 70,0; nenhum motor de PDF foi executado.

| Critério da TASK-02 | Situação |
|---|---|
| Revisar constituição/specs contra código e baseline | Realizado, com limitações anteriores preservadas |
| Corrigir contradições objetivas sem trocar stack/escopo | Realizado conforme C01–C09; P01 só proposto |
| Rastrear TAP com fonte identificada e verificável | **Parcial:** referências secundárias mapeadas; original não acessível |
| Separar decisões fechadas de resultados medidos e registrar fontes/versões | Realizado nas seções 1/3/6; versões novas não adotadas e métricas não medidas identificadas |
| Resolver questões que dependem de escolha técnica/contrato aprovado | **Pendente:** P01 registrada para decisão, sem alteração silenciosa |
| Registrar esforço e despesas reais | **não informado**; estimativa de 3 h de planejamento da TASK-02 mantida sem converter em realização; saldo global continua desconhecido |

**TASK-02 permanece aberta.** Para fechamento: disponibilizar e confrontar TAP original, registrar localizadores dos requisitos e eventuais aprovações; resolver P01 ou registrar seu encaminhamento formal antes da integração que depende dela. As PoCs, medições e verificações Android/Web pertencem às tarefas seguintes e continuam pendentes; sua ausência não invalida a revisão documental realizada, mas impede afirmar aceitação funcional das specs.
