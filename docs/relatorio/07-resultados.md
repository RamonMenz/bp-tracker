# 7. Resultados

[← 6. Decisão técnica](06-decisao-tecnica-comparacao.md) · [Índice](README.md) · [Próximo: 8. Dificuldades →](08-dificuldades.md)

> **Resumo (28/11/2026).** O PDF Web está no produto e foi **validado pelo autor** em fluxo logado com 53 registros (relato, E-045). O PDF Android e a voz no produto (Web e Android) estão implementados e testados **só com dublês**. A voz real foi demonstrada apenas nas demos isoladas. Uma rodada real no Android revelou falha em frases curtas (0 de 10), com correção ainda não validada. A fotografia tem resultado negativo nas condições observadas. Nenhuma comparação entre abordagens foi executada. Os marcos de 06/10, 27/10, 10/11 e 24/11 não foram cumpridos no prazo.

Os níveis de evidência (implementado, testado com dublês, demonstrado, validado pelo autor, validado) estão definidos no [capítulo 4, §4.4](04-metodologia.md#níveis-de-evidência-usados-no-capítulo-7). Nenhum valor de medição real aparece neste capítulo: os números citados (120/80/72 e outros) são estímulos sintéticos.

## 7.1 Quadro-resumo por modalidade

| Componente | Implementado | Testado com dublês | Demonstrado | Validado | No produto |
|---|---|---|---|---|---|
| Fotografia: captura e OCR no Android (ML Kit) | Sim | Sim | Parcial: cartão A sim; cartão B (sete segmentos) não; visor real G-Tech BSPII não | Não | Não |
| Fotografia: captura e OCR na Web (Tesseract.js) | Sim | Sim (Chromium 154, câmera virtual) | Não, em câmera física e visor | Não | Não |
| Fotografia: interpretação e revisão | Sim | Sim | Sim, em memória, nos clientes isolados | Não | Não |
| Persistência assistida (`photo`/`voice`, porta de confirmação) | Sim | Sim (emulador no CI: 94 testes de rules) | Não | Não | Sim, só pela voz atrás de flag (rules sem registro de publicação) |
| Voz: parser pt-BR | Sim | Sim (lógica pura) | Sim, a partir de transcrições reais da V1 | Não | Sim, atrás de flag |
| Voz: STT no Android, demo | Sim | Sim | Sim (V1; rodada de 27/11 com falha nas formas curtas) | Não | — |
| Voz: STT na Web, demo | Sim | Sim (construtor falso) | Sim (V1, relato do autor) | Não | — |
| Voz no produto Web (V2, #99) | Sim | Sim (reconhecedor **SIMULADO**) | **Não** | Não | Sim, **flag desligada** |
| Voz no produto Android (V3, #101) | Sim (Kotlin do produto não compilado) | Sim (reconhecedor **SIMULADO**) | **Não** | Não | Sim, **flag desligada** |
| Consenso de hipóteses (#102) | Sim (Kotlin não compilado) | Sim (porta nativa simulada) | **Não** | Não | Só na demo |
| PDF na Web | Sim | Sim (19 de 22 critérios; conteúdo conferido com poppler no CI) | Sim | **Validado pelo autor** em fluxo logado (E-045); critérios de leitor de tela e navegador móvel pendentes | Sim, no Histórico |
| PDF no Android (P3, #100) | Sim | Sim (`expo-print` e `expo-sharing` simulados; aproximação em Chromium) | **Não** | **Não** (exige build EAS novo) | No código; sem build |
| Privacidade do Sentry Web (#91) | Sim | Sim (SDK real com transporte espião) | Não (chegada ao Sentry real não verificada) | Não | Sim |
| Privacidade do Crashlytics (#98) | Sim, no adapter | Sim (sentinelas) | Não (sem build nativo) | Não | Sim, no código |
| Comparação de fotografia (TASK-20) | — | — | — | — | **Não executada** |
| Comparação de voz (TASK-21) | — | — | — | — | **Não executada** |

## 7.2 O que NÃO está validado

Lista direta, para leitura rápida. "Não validado" quer dizer que falta a evidência que a spec exige; não quer dizer que falhou.

| Item | O que existe | O que falta | Ref. |
|---|---|---|---|
| Voz no produto Web | Código atrás de flag; testes com reconhecedor simulado | Uma medição real ditada, revisada e confirmada no fluxo logado; teclado e leitor de tela; inspeção de rede e retenção do navegador (VOZ-13, VOZ-15) | E-039, Q-019, Q-024 |
| Voz no produto Android | Código atrás de flag; prebuild e autolinking conferidos | Compilar o Kotlin do produto; Dev Client novo; ensaio no Samsung; TalkBack; privacidade do serviço do SO | E-041, Q-024 |
| Correção por consenso (#102) | Testes com porta simulada | Reteste no Samsung (10 tentativas sem pulso, 6 com pulso), inclusive offline | E-043, Q-024 |
| Rastreabilidade das rodadas Android | Hash do APK da V1 (de commit local inexistente no GitHub) | Commit e SHA-256 do APK da rodada de 27/11 e da rodada refeita a partir de `staging` | Q-016, Q-023 |
| PDF Android | Código, testes simulados, aproximação em Chromium | Build EAS; abrir em leitor externo; A4, paginação e cinza no WebView; temporários (`run-as`); tempo com 1.095 e 3.000 registros; TalkBack | E-040, [pdf-android §9](../pdf-android.md#9-o-que-o-autor-precisa-conferir-no-aparelho-samsung) |
| PDF Web, critérios restantes | Validação do autor (E-045) | Leitor de tela real (PDF-21); navegador móvel; prévia num Chrome com visualizador de PDF (D-009) | Q-011 |
| Fotografia | Cadeia completa com texto tipográfico | Leitura de sete segmentos; visor real; segundo aparelho; Tesseract.js no cartão B | §7.3 |
| Privacidade de SDKs e serviços | Correções no Sentry Web e no adapter do Crashlytics | Chegada real ao Sentry e ao Crashlytics; handlers globais do Crashlytics (Q-022); ML Kit e DataTransport; serviços de voz do SO e do navegador | Q-019, Q-022 |
| Produção | Rules e Function no repositório | Publicação das rules com `photo`/`voice`; implantação de `onUserDelete`; ausência das flags de voz na Vercel | Q-021, Q-025 |
| Comparação entre abordagens | — | Corpus rotulado e execução (TASK-16, 17, 20, 21) | Cap. 6 |

## 7.3 Fotografia

**Resultado negativo, nas condições observadas.** Ensaios do autor no Samsung SM-S731B (Android 17/API 37), com cartões sintéticos exibidos num monitor:

| Ensaio | Cartão A (fonte Arial) | Cartão B (sete segmentos) | Fonte |
|---|---|---|---|
| A/B com `associacao-2` (APK259) | Três campos corretos (120/80/72) | Três campos ausentes; rótulos presentes; **nenhum dígito ASCII** nos tokens | [diagnóstico do visor real](../task-09-diagnostico-visor-real.md) |
| A/B original × processado com ROI591 (protocolo congelado) | Três campos corretos nas duas passagens | Original: três ausentes. Processado: três incertos; rótulos recuperados; sem ASCII em Text, Block ou Line do SDK | [etapa 4](../task-09-etapa-4-resultado-roi591.md) |
| Visor real G-Tech BSPII | Tentativa sem identificação dos três campos, sem diagnóstico correspondente recuperado | | [diagnóstico do visor real](../task-09-diagnostico-visor-real.md) |

**Condições e limites do resultado:**

- um único aparelho Android;
- estímulos sintéticos em CSS;
- **uma tentativa por cartão e passagem**, sem taxa de acerto;
- sem medição de latência, memória ou heap;
- sem OCR bruto (retornos sanitizados);
- só uma variante de pré-processamento testada (`roi-1`);
- o Tesseract.js não foi aplicado ao cartão de sete segmentos;
- causa não demonstrada.

O resultado **não prova** incapacidade universal do ML Kit, nem inviabilidade de todas as abordagens, nem diz nada sobre outros aparelhos ou visores ([etapa 6](../task-09-etapa-6-viabilidade-roi591.md)). Prova apenas que, **nesta configuração**, a cadeia câmera → OCR → interpretação → revisão funciona com texto tipográfico e **não lê** o estímulo segmentado.

**Outras evidências da fotografia (TASK-07, relatos do autor):**

- **Ciclo de vida no Android**, no alcance relatado: permissões, cancelamento no preview e na revisão, Home, bloqueio do telefone, rotação, troca rápida de app, toques repetidos e cartões com e sem pulso, com sistólica ambígua.
- **Acessibilidade:** TalkBack parcial no K1, corrigido e retestado em 23/11; fonte máxima e claro/escuro positivos.
- **Captura offline**, com Wi-Fi e dados desligados.

Os cenários S03, S04, S05 e S09 ficaram parciais ([resultados no Samsung](../task-07-resultados-samsung.md), [rodada consolidada](../task-07-rodada-tecnica-consolidada.md)).

**Privacidade da fotografia, não comprovada:**

- inventários de armazenamento só com metadados;
- entradas do DataTransport mudaram de tamanho ou mtime em vários pares, com conteúdo e causa não determinados;
- a análise estática do ML Kit common encontrou rota de telemetria (`Event.ofTelemetry`, `Transport.send`) e ID de instância persistido, **sem prova** de payload nem de envio no aparelho ([auditoria de dependências](../task-07-auditoria-dependencias.md)).

FOT-10 e FOT-12 continuam sem aceite.

## 7.4 Voz

**Capacidade demonstrada nas demos isoladas; integração ao produto feita atrás de flags e testada só com reconhecedor simulado.**

### V1 nas demos (relato do autor)

| Plataforma | Ambiente | Observado | Não observado ou não verificado | Fonte |
|---|---|---|---|---|
| Android | Samsung Galaxy S25 FE, Android 17/API 37 (modelo informado pelo autor em 28/11, E-046); APK do cliente isolado compilado no Windows | Candidatos corretos em pt-BR, com e sem pulso, **também em modo avião**; variabilidade entre tentativas (`ambiguous-result`, tentativas sem candidato, revisão vazia); manual acessível antes do microfone e depois da recusa; silêncio sem candidato; fim automático; cancelamento em escuta; Home; confirmação só em memória, descartada ao sair | Decimal, escala mista, dois pares, ruído, pulso isolado; variantes sem serviço, com API inferior ou sem pt-BR; tela bloqueada, rotação, ligação; TalkBack; tráfego e retenção do serviço do SO | E-027; [task-12](../task-12-voz-android.md#resultado-da-v1-no-samsung) |
| Web | Chrome 158.0.8127.89, Windows, demo em `127.0.0.1:8100` | `downloadable`, depois instalação por toque explícito, depois `available`; candidatos 120/80/72 esperados; repetição com o PC sem rede externa | Negativa de permissão; cancelamento real; decimal, escala mista, dois pares; leitor de tela; rede e retenção do navegador; tentativas não tabuladas | E-028; [task-13](../task-13-voz-web.md#resultado-da-v1-no-chrome) |

[PENDENTE: o autor deve confirmar se o S25 FE da voz é o mesmo aparelho `SM-S731B` da fotografia.]

### Rodada Android de 27/11 (relato do autor)

| Grupo de frases sintéticas | Tentativas | Revisões corretas | Observação |
|---|---|---|---|
| Formas curtas sem pulso ("cento e vinte por oitenta"; "sistólica cento e vinte, diastólica oitenta") | 10 | **0** | Maioria `ambiguous-result` (hipóteses de texto diferentes); algumas revisões vazias |
| As mesmas formas seguidas de "pulso setenta e dois" | 6 | **6** | — |

A causa provável, confirmada no código, é que duas hipóteses de grafia diferente bastavam para recusar o resultado antes do parser. A correção (#102) passa a exigir **concordância das interpretações**, não do texto. **Ela não foi testada no aparelho** (E-042, E-043). O commit e o hash do APK dessa rodada não estão registrados (Q-023).

### No produto (V2 e V3)

- **V2 Web (#99)** e **V3 Android (#101)** estão em `staging` e `main` atrás de flags **desligadas por padrão**. Uma guarda no CI confirma que, sem a flag, o bundle não contém o código de voz e mantém o formulário manual (VOZ-01).
- Os testes exercitam adaptador, parser, revisão e porta de escrita reais com reconhecedor **SIMULADO**: cancelamento, silêncio, resposta tardia, toques repetidos, troca de conta e relogin no mesmo UID.
- **Nenhuma medição foi ditada, revisada e confirmada no produto** em navegador ou aparelho reais.

**Limites:**

- **Reprodutibilidade (Q-016, Q-023).** O APK da V1 (`ddf7cb77…`) vem do commit local `66cc97c`, que **não existe no GitHub**. O APK recompilado depois da correção de permissão não tem SHA-256 registrado. O ensaio Web não registra commit. [PENDENTE: commit de `staging` e SHA-256 do APK da rodada refeita.]
- **Privacidade (Q-019).** VOZ-13 e VOZ-15 exigem evidência de que o serviço do SO ou do navegador não armazena nem envia áudio, e nenhuma rodada fez essa inspeção. "Funcionou em modo avião" mostra capacidade offline naquelas condições, não ausência de retenção.

## 7.5 Relatório PDF

**Web no produto e validada pelo autor em fluxo logado; Android implementado e testado só com dublês.**

### Web: validação do autor (relato, E-045)

| Verificação | Resultado relatado |
|---|---|
| Período "Tudo" | 53 registros; os 5 primeiros e os 5 últimos conferidos |
| Período "Personalizado" | Conferido |
| 7 e 30 dias | Com 8 registros de teste, os números esperados conferiram |
| Impressão | Colorida e em escala de cinza, legível |
| Limpeza | Registros de teste removidos; o total voltou a 53 |

[PENDENTE: navegador e versão, conta usada (principal ou de teste), ambiente (frontend local ou produção) e data da validação.] Como a homologação é em produção (D-003), os registros de teste passaram pelo histórico real e foram removidos depois.

### Web: evidência automatizada

- **19 critérios** (PDF-01 a 09, 11 a 15, 17 a 20 e 22) com Jest, emulador do Firestore, `pdftotext`/`pdftoppm` (no CI desde o #95, E-036) e Chromium headless com rede externa bloqueada. Nenhuma requisição externa durante a geração (E-021).
- **Parciais:** PDF-10 (impressão física em cinza agora relatada pelo autor; A4 conferido por `pdfinfo`), PDF-16 (compartilhamento só na Web) e PDF-21 (sem leitor de tela real).
- **Volume** (Jest, CPU de servidor, **não é celular**): 3.000 registros geraram 99 páginas e 500 KB em cerca de 1,48 s ([pdf-relatorio §8.3](../pdf-relatorio.md)).
- **Defeitos achados pela verificação:** vazamento A → B → A e falta de `aria-checked` (E-020); prazo que não cobria o import do jsPDF, corrigido no #97 (E-037).

### Android (P3, #100)

- Implementado com `expo-print`; testes com `expo-print`, `expo-sharing` e sistema de arquivos **simulados** (1.094 aprovados e 3 pulados, reportado) e aproximação em Chromium, que **não equivale** ao WebView do aparelho.
- Na aproximação: exemplo da spec correto, 400 de 400 linhas, cabeçalho repetido, zero requisições, PNG em cinza distinguível; 3.000 registros em 0,75 s no servidor.
- **Nenhum critério validado em aparelho.** Falta um build EAS novo, porque `expo-print` é nativo ([pdf-android §9](../pdf-android.md#9-o-que-o-autor-precisa-conferir-no-aparelho-samsung)).

## 7.6 Qualidade, testes e preservação do legado

| Momento | Testes do app | Fonte |
|---|---|---|
| Baseline do legado, 26/10/2026 | 45 suítes, 384 testes (execução local) | TASK-01 |
| Unificação, 27/10/2026 | 64 suítes, 691 testes (execução local) | `tasks.md` |
| CI do PR [#95](https://github.com/RamonMenz/bp-tracker/pull/95), árvore idêntica à de `staging @ 9de7d90` | **85 suítes, 1.001 testes, 1.001 aprovados, nenhum pulado**; Functions, Rules (emulador) e Bridge OCR verdes | Log do job *App* (run `45928245875`) |
| CI do PR [#103](https://github.com/RamonMenz/bp-tracker/pull/103) (`staging` → `main`), árvore idêntica à de `staging @ f8cfdee` | **91 suítes (90 aprovadas, 1 pulada) e 1.134 testes (1.131 aprovados, 3 pulados)**; os 3 pulados são, por inferência, a aproximação opt-in em Chromium do PDF Android; Rules 94/94 em 3 suítes; Functions e Bridge OCR verdes | Logs dos jobs *App* e *Rules* (run `46077186975`), conferidos nesta redação (E-044) |

O CI do #93 tinha 8 testes pulados: a conferência do conteúdo do PDF com poppler (E-031, E-032, Q-015). O PR #95 passou a instalar `poppler-utils` no runner e faz o teste **falhar** no CI se o poppler faltar. No #95 nenhum teste foi pulado, o que **supera Q-015 no CI**. A suíte de rules no emulador passou de 86 testes no CI do #93 (E-031) para 94 no do #103, com os casos de escrita por voz (E-044). Testes e lint **não foram reexecutados** nesta redação: os números vêm dos logs do CI e dos documentos.

Preservação do legado: o CSV e `getAllReadings` não mudaram, os 129 testes do legado continuam verdes no PDF-01 e a abertura do app ficou igual antes e depois do PDF, medida no app sem login ([pdf-relatorio §9.6](../pdf-relatorio.md)). **Não houve** comparação de desempenho do registro manual antes e depois em aparelho (FOT-15, VOZ-18).

## 7.7 Marcos do TAP × realizado (sem retrodatação)

| Marco ([P103](../fontes/tap-aferi-v1.0.md#p103)) | Previsto | Realizado |
|---|---|---|
| Levantamento das alternativas | 22/09/2026 | Alternativas e descartes registrados nas specs em **26/10/2026** (`e62181a`). [PENDENTE: entrega da atividade avaliativa 01 (TAP) em 22/09 e seu resultado.] |
| PoCs e decisão técnica formalizada | 06/10/2026 | **Não atendido no prazo.** Decisão registrada em 26/10; PoCs isoladas em 27/10 (`7fbe137`). P02 aberta |
| Apresentação | 13/10/2026 | **Sem registro** de material ou resultado (TASK-19). [PENDENTE: informar se ocorreu] |
| Modalidades integradas e casos coletados | 27/10/2026 | **Não atendido no prazo.** Em 27/10 havia clientes isolados (PR #62). A voz entrou no produto em **27/11/2026** (#99, #101), atrás de flags desligadas e sem validação; a fotografia continua fora; nenhum corpus. Acompanhamento consolidado em 27/10 (TASK-19); demonstração prevista para 28/10 [PENDENTE: realização e resultado] |
| Comparação concluída; apresentação e ajustes ([P096](../fontes/tap-aferi-v1.0.md#p096)) | 10/11/2026 | **Não atendido.** Nenhuma comparação executada até 28/11. [PENDENTE: realização e resultado da apresentação de 10/11] |
| PDF operante; referencial, método e desenvolvimento redigidos | 24/11/2026 | **Não atendido no prazo.** PDF Web no produto em **26/11** (#87) e validado pelo autor depois (E-045, data não registrada); PDF Android implementado em **27/11** (#100), sem validação. Referencial, método e desenvolvimento redigidos em **27/11** (#96) e atualizados em 28/11. [PENDENTE: entrega da atividade avaliativa 02 em 24/11 e seu resultado] |
| Atividade avaliativa 03 | 08/12/2026 | A realizar |
| Encerramento | 15/12/2026 | A realizar |

Não se presume prorrogação de nenhum marco (TAP [P110](../fontes/tap-aferi-v1.0.md#p110); Q-003).

## 7.8 Esforço e custo

Horas realizadas: **não informado**. Despesas realizadas: **não informado**. Saldo do teto de R$ 300,00: **não informado** (Q-009). Nenhum serviço pago de reconhecimento ou de geração foi contratado na arquitetura escolhida; isso é fato de arquitetura, não um levantamento de despesas.
