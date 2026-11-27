# 7. Resultados

[← 6. Decisão técnica](06-decisao-tecnica-comparacao.md) · [Índice](README.md) · [Próximo: 8. Dificuldades →](08-dificuldades.md)

Os níveis de evidência (implementado, testado com dublês, demonstrado, validado) estão definidos no [capítulo 4, §4.4](04-metodologia.md#níveis-de-evidência-usados-no-capítulo-7). Em resumo, **nenhuma funcionalidade nova está validada**. Nenhum valor de medição real aparece neste capítulo: os números citados (120/80/72 e outros) são estímulos sintéticos.

## 7.1 Quadro-resumo por modalidade

| Componente | Implementado | Testado com dublês | Demonstrado | Validado | No produto |
|---|---|---|---|---|---|
| Fotografia: captura e OCR no Android (ML Kit) | Sim | Sim | Parcial: cartão A sim; cartão B (sete segmentos) não; visor real G-Tech BSPII não | Não | Não |
| Fotografia: captura e OCR na Web (Tesseract.js) | Sim | Sim (Chromium 154, câmera virtual) | Não, em câmera física e visor | Não | Não |
| Fotografia: interpretação e revisão | Sim | Sim | Sim, em memória, nos clientes isolados | Não | Não |
| Persistência assistida (`photo`/`voice`, porta de confirmação) | Sim | Sim (emulador e escritor isolado) | Não | Não | Não (rules sem registro de publicação) |
| Voz: parser pt-BR | Sim | Sim (lógica pura) | Sim, a partir de transcrições reais da V1 | Não | Não |
| Voz: STT no Android | Sim | Sim | Sim (V1, relato do autor) | Não | Não |
| Voz: STT na Web | Sim | Sim (construtor falso) | Sim (V1, relato do autor) | Não | Não |
| PDF na Web | Sim | Sim (19 de 22 critérios com evidência automatizada; 3 parciais) | Só em Chromium headless sem login, pelo agente | Não (0 de 22 em fluxo logado ou aparelho) | Sim, no Histórico da Web |
| PDF no Android | **Não** | Não | Não | Não | Não |
| Correção de privacidade do Sentry Web | Sim | Sim (SDK real com transporte espião) | Não (chegada ao Sentry real não verificada) | Não | Sim |
| Comparação de fotografia (TASK-20) | — | — | — | — | **Não executada** |
| Comparação de voz (TASK-21) | — | — | — | — | **Não executada** |

## 7.2 Fotografia

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

## 7.3 Voz

**Capacidade demonstrada nas demos isoladas, não integrada ao produto.**

| Plataforma | Ambiente | Observado (relato do autor) | Não observado ou não verificado | Fonte |
|---|---|---|---|---|
| Android | Samsung Galaxy, Android 17/API 37 [PENDENTE: confirmar o modelo; não se presume que seja o SM-S731B da fotografia]; APK do cliente isolado compilado no Windows | Candidatos corretos em pt-BR, com e sem pulso, **também em modo avião**; variabilidade entre tentativas (`ambiguous-result`, tentativas sem candidato, revisão vazia); manual acessível antes do microfone e depois da recusa; silêncio sem candidato; fim automático; cancelamento em escuta; Home; confirmação só em memória, descartada ao sair | Decimal, escala mista, dois pares, ruído, pulso isolado; variantes sem serviço, com API inferior ou sem pt-BR; tela bloqueada, rotação, ligação; TalkBack; tráfego e retenção do serviço do SO; **número de tentativas não tabulado** | E-027; [task-12](../task-12-voz-android.md#resultado-da-v1-no-samsung) |
| Web | Chrome 158.0.8127.89, Windows, demo em `127.0.0.1:8100` | `downloadable`, depois instalação por toque explícito, depois `available`; candidatos 120/80/72 esperados; repetição com o PC sem rede externa | Negativa de permissão; cancelamento real; decimal, escala mista, dois pares; leitor de tela; rede e retenção do navegador; tentativas não tabuladas | E-028; [task-13](../task-13-voz-web.md#resultado-da-v1-no-chrome) |

**Limites:**

- **Reprodutibilidade (Q-016).** O APK registrado (`ddf7cb77…`) vem do commit local `66cc97c`, que **não existe no GitHub**. O APK recompilado depois da correção de permissão não tem SHA-256 registrado. O ensaio Web não registra commit.
- **Privacidade (Q-019).** VOZ-13 e VOZ-15 exigem evidência de que o serviço do SO ou do navegador não armazena nem envia áudio, e a V1 não fez essa inspeção. "Funcionou em modo avião" mostra capacidade offline naquelas condições, não ausência de retenção.
- **Produto.** Nenhuma rota de `app/` usa voz. As etapas V2 (Web atrás de flag) e V3 (Android com rebuild do Dev Client) não foram iniciadas. [PENDENTE: resultado de V2/V3, se executadas até 08/12.]

## 7.4 Relatório PDF

**Web implementada e testada; Android inexistente; nada validado em fluxo logado.** A matriz completa está em [pdf-relatorio §10](../pdf-relatorio.md):

- **Evidência automatizada em 19 critérios** (PDF-01 a 09, 11 a 15, 17 a 20 e 22): Jest, emulador do Firestore (retrato congelado com escrita concorrente; isolamento entre contas), `pdftotext`/`pdftoppm` sobre o PDF gerado e Chromium headless com rede externa bloqueada. Nenhuma requisição externa durante a geração; o único host externo na abertura é o reCAPTCHA do App Check, que não vem do relatório (E-021).
- **Três parciais:**
  - PDF-10: A4 e cinza só por PNG e `pdfinfo`, sem impressão física;
  - PDF-16: compartilhamento só na Web;
  - PDF-21: Chromium e testing-library, sem leitor de tela real.
- **Zero critérios validados em aparelho ou fluxo logado.** O app não passou pelo login nas verificações; o clique no Histórico foi coberto por teste de componente.
- **Volume** (Jest, ambiente node, CPU de servidor, **não é celular**): com gráfico, 3.000 registros geraram 99 páginas e 500 KB em cerca de 1,48 s ([§8.3](../pdf-relatorio.md)).
- **Defeitos achados pela própria verificação:** vazamento A → B → A entre contas e ausência de `aria-checked`, ambos corrigidos com teste que falhava antes (E-020).
- **Divergência conhecida (Q-017):** o prazo de 30 s não cobre o import das bibliotecas, ao contrário do que D-008 e um comentário do código sugerem. Nem o código nem a documentação foram corrigidos.

**PDF no Android:** não iniciado (TASK-24). Depende de um Dev Client do produto com `expo-print`, cuja existência não foi confirmada (Q-010).

## 7.5 Qualidade, testes e preservação do legado

| Momento | Testes do app | Fonte |
|---|---|---|
| Baseline do legado, 26/10/2026 | 45 suítes, 384 testes (execução local) | TASK-01 |
| Unificação, 27/10/2026 | 64 suítes, 691 testes (execução local) | `tasks.md` |
| CI do PR [#95](https://github.com/RamonMenz/bp-tracker/pull/95), árvore idêntica à de `staging @ 9de7d90` | **85 suítes, 1.001 testes, 1.001 aprovados, nenhum pulado**; Functions, Rules (emulador) e Bridge OCR verdes | Log do job *App* (run `45928245875`), conferido nesta redação |

O CI do #93 tinha 8 testes pulados: a conferência do conteúdo do PDF com poppler (E-031, E-032, Q-015). O PR #95 passou a instalar `poppler-utils` no runner e faz o teste **falhar** no CI se o poppler faltar. No #95 nenhum teste foi pulado, o que **supera Q-015 no CI**. A suíte de rules no emulador tinha 86 testes no CI do #93 (E-031).

Preservação do legado: o CSV e `getAllReadings` não mudaram, os 129 testes do legado continuam verdes no PDF-01 e a abertura do app ficou igual antes e depois do PDF, medida no app sem login ([pdf-relatorio §9.6](../pdf-relatorio.md)). **Não houve** comparação de desempenho do registro manual antes e depois em aparelho (FOT-15, VOZ-18).

## 7.6 Marcos do TAP × realizado (sem retrodatação)

| Marco ([P103](../fontes/tap-aferi-v1.0.md#p103)) | Previsto | Realizado |
|---|---|---|
| Levantamento das alternativas | 22/09/2026 | Alternativas e descartes registrados nas specs em **26/10/2026** (`e62181a`). [PENDENTE: entrega da atividade avaliativa 01 (TAP) em 22/09 e seu resultado.] |
| PoCs e decisão técnica formalizada | 06/10/2026 | **Não atendido no prazo.** Decisão registrada em 26/10; PoCs isoladas em 27/10 (`7fbe137`). P02 aberta |
| Apresentação | 13/10/2026 | **Sem registro** de material ou resultado (TASK-19). [PENDENTE: informar se ocorreu] |
| Modalidades integradas e casos coletados | 27/10/2026 | **Não atendido.** Em 27/10 havia clientes isolados (PR #62); nenhuma integração ao produto até hoje; nenhum corpus. Acompanhamento consolidado em 27/10 (TASK-19); demonstração prevista para 28/10 [PENDENTE: realização e resultado] |
| Comparação concluída; apresentação e ajustes ([P096](../fontes/tap-aferi-v1.0.md#p096)) | 10/11/2026 | **Não atendido.** Nenhuma comparação executada até 27/11. [PENDENTE: realização e resultado da apresentação de 10/11] |
| PDF operante; referencial, método e desenvolvimento redigidos | 24/11/2026 | **Não atendido.** Primeiro código de PDF mesclado em 26/11 (#87); PDF Web operante e testado desde 26/11, sem Android. Estas seções foram redigidas em 27/11 (este rascunho). [PENDENTE: entrega da atividade avaliativa 02 em 24/11 e seu resultado] |
| Atividade avaliativa 03 | 08/12/2026 | A realizar |
| Encerramento | 15/12/2026 | A realizar |

Não se presume prorrogação de nenhum marco (TAP [P110](../fontes/tap-aferi-v1.0.md#p110); Q-003).

## 7.7 Esforço e custo

Horas realizadas: **não informado**. Despesas realizadas: **não informado**. Saldo do teto de R$ 300,00: **não informado** (Q-009). Nenhum serviço pago de reconhecimento ou de geração foi contratado na arquitetura escolhida; isso é fato de arquitetura, não um levantamento de despesas.
