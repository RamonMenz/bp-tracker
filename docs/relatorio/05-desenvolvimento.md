# 5. Desenvolvimento

[← 4-A. Agentes de IA](04a-desenvolvimento-assistido-por-agentes.md) · [Índice](README.md) · [Próximo: 6. Decisão técnica →](06-decisao-tecnica-comparacao.md)

> **Resumo.** Sobre o legado preservado, o ciclo construiu: a fotografia (fora do produto, pausada), a voz (demos isoladas e, desde 27/11, integração ao produto Web e Android atrás de flags desligadas), o relatório PDF (Web no produto; Android implementado com `expo-print`) e correções de privacidade (Sentry Web, Crashlytics). Em 27/11 `staging` foi levada a `main` (#103).

## 5.1 Legado × produzido neste ciclo

**Legado.** O TAP lista como preexistentes, e fora da avaliação do ciclo: autenticação, registro e edição de medições, classificação, histórico, gráfico de tendência, exportação em CSV, lembretes, tema e acessibilidade ([P044](../fontes/tap-aferi-v1.0.md#p044)). A [baseline do legado](../baseline-legado.md) (TASK-01, 26/10/2026) documenta esse produto sobre `staging @ 7d72cb3`:

- Expo SDK 57.0.8, React Native 0.86.0, React 19.2.3, Firebase JS 12.17.0, Zod 4.4.3, TypeScript 6.0.3.
- Login Google, consentimento versionado e onboarding.
- Firestore com rules por UID.
- Sessões de duas leituras.
- Cloud Functions v2 com Scheduler e FCM para lembretes.
- App Check, Crashlytics (nativo) e Sentry (Web).
- Na data da baseline, 45 suítes e 384 testes do app e 16 testes das Functions, aprovados localmente.

**Delimitação operacional.** O código funcional de `7d72cb3` (26/10/2026) é idêntico ao de `main @ 3f8220f` (merge do PR #60, 08/10/2026). Entre as duas, só entraram constituição, specs e `tasks.md`, o que foi conferido por `git diff` em `src`, `app`, `functions`, `firestore.rules` e `package.json`. Este relatório trata como **produzido no ciclo** o que entrou em `staging` depois de `3f8220f`. De `3f8220f` a `f8cfdee`, `src/`, `app/`, `functions/` e `firestore.rules` mudaram em 139 arquivos (+15.069/−74 linhas) (E-048; em 27/11, na base `9de7d90`, eram 113 arquivos, +11.114/−40). Fora disso ficam os módulos nativos, os clientes `demos/`, a PoC `pocs/`, as ferramentas `tools/`, os documentos e o CI.

**Pendência de delimitação (Q-005).** O PR #1 é de 28/07/2026, uma semana antes do início da Fase 1 (04/08), e os PRs #4–#60 foram mesclados entre 13/08 e 08/10, já dentro das Fases 1 e 2. O histórico tem 41 commits antes de 04/08/2026; o total em `staging` é de 430 commits (E-048). [PENDENTE: data de corte do legado e aprovação do aproveitamento pela orientadora (TAP [P105](../fontes/tap-aferi-v1.0.md#p105)).] Aqui não se atribui ao ciclo nenhuma das funcionalidades da lista de P044.

## 5.2 Arquitetura

A arquitetura do legado foi preservada: o cliente fala direto com o Firestore, protegido por Security Rules, e o backend serverless existe só para os lembretes. As modalidades novas seguem o desenho da TASK-03 ([arquitetura de IA](../arquitetura-ia.md)), a única tarefa de desenho marcada como concluída:

```text
captura em memória → reconhecimento local → interpretação pura → validação → revisão editável
      (adaptador por plataforma)        (src/domain)                 (CandidateReadingReview)
                                                                            │
                                     somente "Confirmar e salvar medição" ──┘→ porta de confirmação → repositório
```

Princípios materializados:

- **Adaptadores por plataforma** (`.native.ts` / `.web.ts`) em `src/services/recognition/`. Os adaptadores não recebem UID, repositório nem cliente Firebase.
- **Interpretação determinística pura** em `src/domain/` (`interpret-photo.ts`, `interpret-voice-pt-br.ts`, `assisted-entry.ts`, `final-transcript.ts`). Não completa campos pelo histórico, não troca sistólica com diastólica e não escolhe por confiança.
- **Revisão compartilhada** entre fotografia e voz (`CandidateReadingReview` e `useCandidateReview`). Há identidade de tentativa e de revisão, trava síncrona contra toques duplicados e descarte de respostas tardias, de background e de troca de conta.
- **Porta de confirmação** (`confirmed-assisted-reading.ts`). Só uma ação explícita prepara o snapshot e chama o repositório, depois de conferir de novo UID, *epoch* e consentimento. O snapshot não inclui mídia, texto bruto nem confiança.
- **Modelo de dados** (TASK-11, PR #62). `source` aceita `manual`, `photo` e `voice` em tipos, Zod e rules (`firestore.rules:114`) e é imutável no update. Documentos antigos e `sessionReadings` continuam válidos. A semântica de `source` após edição ou sessão segue a opção conservadora P01, **sem aceite formal** (Q-004). **Não há registro de publicação dessas rules em produção** (E-014, E-035).
- **Carregamento sob demanda.** O caminho manual não inicializa câmera, microfone, motores nem bibliotecas de PDF.

**Estado da integração (atualizado em 28/11):**

| Funcionalidade | No produto? | Como |
|---|---|---|
| Fotografia | Não | Só nos clientes isolados (`demos/`); o produto não autolinka `aferi-photo-capture` |
| Voz Web (V2) | Sim, **desligada por padrão** | Flag `EXPO_PUBLIC_WEB_VOICE_ENABLED`; sem ela, o código de voz fica fora do bundle (E-039) |
| Voz Android (V3) | Sim, **desligada por padrão** | Flag `EXPO_PUBLIC_ANDROID_VOICE_ENABLED`; o produto autolinka `aferi-local-voice` e declara `RECORD_AUDIO` (D-010, E-041) |
| PDF Web | Sim | Histórico (`app/(app)/history.tsx`) |
| PDF Android | Sim, no código | Exige Dev Client novo com `expo-print`, ainda não gerado (E-040) |

*Nota:* até 27/11 (base `9de7d90`), nenhuma rota de `app/` usava fotografia ou voz.

## 5.3 Fotografia do visor

| Etapa | O que foi construído | Fonte |
|---|---|---|
| PoC (TASK-04, 27/10) | `pocs/` isolado: CameraX com ML Kit latino embarcado 16.0.1 (Android); `getUserMedia`, canvas e Tesseract.js/core 7.0.0 com modelo LSTM em worker (Web) | [PoCs](../pocs-fotografia-voz.md) |
| Captura Android (TASK-07) | Módulo `native-modules/aferi-photo-capture`: quadro `ImageAnalysis` copiado de YUV para NV21 em RAM, `ImageProxy` fechado antes do processamento, *lease* até o fim do ML Kit, sem API de foto em arquivo ou URI. Cliente isolado `demos/android-capture` | [captura Android](../task-07-captura-android.md), [integração](../task-07-integracao-android.md) |
| Captura Web (TASK-08) | `demos/web-capture`: um quadro em canvas, buffer transferido ao worker, tracks e worker encerrados, assets auto-hospedados e `cacheMethod: none` | [captura Web](../task-08-captura-web.md) |
| Interpretação (TASK-09) | `interpretPhoto`: rótulos SYS/DIA/PUL (inclusive SIS/PULSO), geometria ancorada, números acessórios identificados, campos incertos explícitos | [interpretação](../task-09-interpretacao-fotografia.md) |
| Revisão (TASK-10) | Campos editáveis, data e hora da captura, cancelar, recapturar, confirmar só em memória | [revisão](../task-10-revisao-fotografia.md) |
| Endurecimento | Cliente com `allowBackup: false`, regras de backup e extração e *network inspector* desligado (PRs #75 e #76); diagnósticos `associacao-1/2` com literais fixos, sem valores | [inspeção de privacidade](../task-07-inspecao-privacidade-localidade.md) |
| Investigação de sete segmentos (TASK-09, etapas 1 a 6) | Comparação de um cartão com fonte comum (A) e outro com sete segmentos (B); candidato ROI591 (recorte, orientação e escala em memória); protocolo congelado; resultado A/B | [diagnóstico do visor real](../task-09-diagnostico-visor-real.md), [etapa 4](../task-09-etapa-4-resultado-roi591.md), [etapa 6](../task-09-etapa-6-viabilidade-roi591.md) |

A investigação ocupou os PRs #64 a #85, de 11/11 a 26/11/2026, no Samsung SM-S731B (Android 17/API 37). Em 26/11/2026 o autor **pausou** a frente de fotografia (D-001). Código, APKs e checks foram preservados. A pausa não conclui nem substitui a modalidade, e o estado final depende da orientadora (Q-001, Q-002).

## 5.4 Voz em pt-BR

| Etapa | O que foi construído | Fonte |
|---|---|---|
| Parser (TASK-14, concluída) | `interpretVoice`: "doze por oito" e "cento e vinte por oitenta" viram 120/80; decimal coloquial sem arredondar; pulso só com rótulo; escala mista, dois pares e autocorreção marcados como ambíguos | [parser](../task-14-parser-pt-br.md) |
| Android (TASK-12) | Módulo `native-modules/aferi-local-voice`: só `createOnDeviceSpeechRecognizer`, `isOnDeviceRecognitionAvailable` e pt-BR instalado; sem `EXTRA_PREFER_OFFLINE`, gravador ou fallback remoto; só o resultado final chega ao JS. Cliente `demos/android-voice` | [voz Android](../task-12-voz-android.md), [revisão estática](../task-12-revisao-estatica.md) |
| Web (TASK-13) | `web-voice.web.ts`: `processLocally = true` e pt-BR com `available()`; instalação do pacote local **só por toque do usuário**, depois de `downloadable` (D-004); nunca usa o reconhecedor remoto padrão | [voz Web](../task-13-voz-web.md) |
| Revisão (TASK-15) | Revisão de voz sobre a mesma base da fotografia; o modo `recognition` com escritor só é instanciado em testes (E-008) | [revisão de voz](../task-15-revisao-voz.md) |
| V1 de capacidade (PR #93, 26/11) | Listener registrado antes de `checkRecognitionSupport`; endurecimento do cliente de voz no mesmo nível do de fotografia; ferramentas de build e identidade para Windows (`tools/task12/`) com checks no CI; reaproveitamento da permissão já concedida | E-026 |
| V2 no produto Web (PR #99, 27/11) | "Registrar por voz" abaixo do formulário manual, atrás de flag desligada; exige login, aceite vigente e `available()` local; revisão editável; `source: 'voice'` só após "Confirmar e salvar medição" e ACK; *epoch* por login invalida a revisão; guarda VOZ-01 no CI | [voz-produto](../voz-produto.md), E-039 |
| V3 no produto Android (PR #101, 27/11) | "Verificar voz local" (API 33+, pt-BR em `installedOnDeviceLanguages`) antes de oferecer a voz; permissão só ao começar a falar; mesma revisão e porta de escrita da V2; cancelamento por background, foco e troca de *epoch* | [voz-android-produto](../voz-android-produto.md), E-041 |
| Consenso de hipóteses (PR #102, 27/11) | Até cinco hipóteses finais; o parser interpreta todas; revisão só com interpretação unânime; senão, `ambiguous-result` (D-011). Aplicado ao cliente de avaliação; o modo `recognition` do produto mantém a transcrição única | [task-12 §27/11](../task-12-voz-android.md#27112026--concordância-das-hipóteses-finais), E-043 |

Nos testes da V2, da V3 e do consenso, o reconhecedor é **SIMULADO**. Pendente (D-004): no Android, `triggerModelDownload` não existe no módulo, e o produto não pede download de modelo.

## 5.5 Relatório PDF

Feito em três etapas na Web, mescladas em 26/11/2026: P1 ([#87](https://github.com/RamonMenz/bp-tracker/pull/87)), P2 ([#88](https://github.com/RamonMenz/bp-tracker/pull/88)) e P4 ([#89](https://github.com/RamonMenz/bp-tracker/pull/89)), mais a correção do prazo ([#97](https://github.com/RamonMenz/bp-tracker/pull/97), 27/11). O Android veio na P3 ([#100](https://github.com/RamonMenz/bp-tracker/pull/100), 27/11). Detalhes em [docs/pdf-relatorio.md](../pdf-relatorio.md) e [docs/pdf-android.md](../pdf-android.md).

- **Modelo puro** (`src/lib/report/`). Período em dias civis no fuso fixado, com início inclusivo e fim exclusivo; horário de verão tratado com luxon. Médias por registro, com pulso ausente fora do denominador e sessão de duas leituras contada uma vez. Cobertura e avisos. O exemplo da spec dá 130,0/90,0 mmHg (N=3) e pulso 70,0 bpm (N=2).
- **Leitura própria** `getReadingsForReport`. Devolve id, `fromCache`, `hasPendingWrites` e a contagem de omitidos. O `getAllReadings` do CSV **não mudou**.
- **Renderização** com jsPDF 4.2.1 e AutoTable 5.0.9 (fixados, MIT), carregados sob demanda. A4 retrato, cabeçalho repetido, "Página X de Y", gráfico vetorial com datas reais, Helvetica padrão (WinAnsi). Caracteres fora do CP1252 viram "?" e o documento declara quantos foram trocados. Observação de usuário é renderizada como texto literal.
- **Fluxo.** Botão "Gerar relatório PDF" no Histórico, diálogo de período, revisão e prévia (embutida só com `navigator.pdfViewerEnabled`, D-009) e "Salvar PDF" por `Blob` com revogação da URL depois de 60 s.
- **Limites de operação.** Até 3.000 registros: acima disso o relatório é recusado, sem truncar. Prazo único de 30 s, que desde o #97 cobre também o import do jsPDF/AutoTable (E-037; antes não cobria, E-033). Geração na thread principal, porque um worker levaria 567 KB à abertura do app (D-008).
- **Bundle Web (P1).** Entrada +12.101 B (+3.136 B gzip); chunks sob demanda +571.110 B (+179.705 B gzip). Valores medidos pelo agente e não reexecutados (E-018).
- **Android (P3, #100).** Mesmo hook e mesmo modelo da Web. Template HTML/CSS autocontido (A4, `thead` repetido, SVG com a mesma geometria, escape de todo texto variável, CSP `default-src 'none'`) convertido por `expo-print` ~57.0.1. Revisão **sem prévia embutida** (declarado na interface). Entrega pela folha de compartilhamento do sistema. Temporários no cache, apagados na hora ou 5 min depois de a folha fechar, com varredura de resíduos; nunca em `documentDirectory`. O bundle `.hbc` cresceu 214 KB (sobretudo luxon) e não contém jsPDF. O jsPDF não serve no runtime nativo porque o `TextDecoder` do Expo só aceita UTF-8 (E-022). **Exige build EAS novo** (E-040).

## 5.6 Privacidade

- **Em projeto:** processamento local como regra (sem nuvem para OCR, STT ou PDF), mídia só em memória e revisão sem texto bruto nem confiança no documento clínico.
- **Mensagens de erro seguras:** o repositório lança `ReadingsQueryError(reason)`, e o hook escolhe a mensagem pelo motivo. Nenhum `error.message` cru vai ao usuário ou ao logger no PDF.
- **Sentry Web (PR [#91](https://github.com/RamonMenz/bp-tracker/pull/91), 26/11/2026).** Os breadcrumbs padrão do `@sentry/browser` 10.70.0 (`dom`, `console`, `fetch`, `xhr`, `history`) podiam levar `aria-label`s do Histórico no formato "N por N" (valores de pressão). A correção desliga a integração `Breadcrumbs`, descarta qualquer breadcrumb em `beforeBreadcrumb` e reduz o evento em `beforeSend` (sem `request`, `user` ou `message`, e com a mensagem da exceção trocada por um texto fixo). Dez testes com o SDK real: 9 falhavam antes da correção e todos passam depois ([sentry-privacidade.md](../sentry-privacidade.md), E-024).
- **Crashlytics (PR [#98](https://github.com/RamonMenz/bp-tracker/pull/98), 27/11/2026).** O adapter nativo repassava a mensagem original do erro (E-034). Agora entrega uma cópia com a mensagem fixa `[mensagem removida por privacidade]`, sem `cause` nem propriedades extras, preservando tipo, stack e `scope` (E-038). **Resíduo:** os handlers globais do próprio `@react-native-firebase/crashlytics` ainda enviam a mensagem crua de erros fatais e promises não tratadas (Q-022).
- **Voz no produto:** transcrição e confiança ficam fora do documento, da observação, dos logs e dos coletores; a suíte de rules rejeita documentos com esses metadados (E-039).

## 5.7 Correções de segurança e de isolamento

| Correção | Onde | Evidência |
|---|---|---|
| Perfil ou auth atrasado restaurava a conta anterior; histórico e callbacks da conta anterior; exceções brutas em logs de leitura, export e exclusão; controles editáveis durante a confirmação; callback antigo do seletor de data | Legado, na TASK-18 (27/10) | [guardrails](../task-18-guardrails.md); 12 testes novos |
| Troca de conta A → B → A reexibia a revisão do PDF da conta A com URL já revogada (vazamento entre contas) | PDF, P4 | Teste que falhava antes (E-020) |
| Rádios do diálogo do PDF sem `aria-checked` na Web | PDF, P4 | E-020 |
| Breadcrumbs e mensagens do Sentry Web com dado de saúde | Legado (#91) | E-024 |
| Clientes de avaliação com `allowBackup` ligado e *network inspector* ativo | Demos (#75, #76, #93) | E-026, E-029 |
| Suítes de rules que se apagavam em paralelo no emulador | Testes, P4 | [pdf-relatorio §12](../pdf-relatorio.md) |
| Conteúdo do PDF pulado no CI por falta de poppler | CI (#95) | `.github/workflows/ci.yml` instala `poppler-utils`, e o teste falha no CI se ele faltar (`9f85807`, `6fb1f57`; E-036) |
| Prazo de 30 s sem cobrir o import do jsPDF | PDF (#97) | E-037 |
| Mensagem de exceção crua ao Crashlytics | Legado (#98) | E-038 |
| Descarte tardio apagava o PDF Android adotado antes do compartilhamento | PDF, P3 (#100) | Teste que falhava antes (E-040) |
| Hipóteses de grafia diferente recusadas antes do parser | Voz Android (#102) | E-042, E-043; sem validação em aparelho |

## 5.8 Integração em `main` e builds

- **Release (PR [#103](https://github.com/RamonMenz/bp-tracker/pull/103), 27/11/2026, D-012).** `staging` foi levada a `main` pelo autor. Segundo o PR, a Vercel de produção é alimentada por `main`; o efeito visível na Web é o PDF e a correção do Sentry, com a voz desligada. O merge não publica rules nem Functions.
- **Build EAS de teste (PR [#104](https://github.com/RamonMenz/bp-tracker/pull/104)).** Perfil `standalone-teste` com a voz Android ligada só nele. **Aberto, não mesclado** em 28/11 (E-047).
