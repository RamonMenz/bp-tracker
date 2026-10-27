# TASK-19 — acompanhamento e preparação da demonstração

> Atualização de entrega Git em 27/10/2026, posterior à consolidação: o autor
> autorizou commits/envio/PR para staging. O trabalho foi versionado em
> feature/task-19-demo-status; consultar o PR e o registro de entrega em
> [tasks.md](../tasks.md) para CI/merge. As referências abaixo ao workspace sem
> commit descrevem o levantamento original. Isso não encerra tarefas parciais
> nem comprova homologação, apresentação ou persistência real.

Registro em **27/10/2026**. Demonstração solicitada para amanhã, **28/10/2026**;
a apresentação ainda não ocorreu. Esta consolidação documental está concluída
no alcance das fontes disponíveis; não encerra integrações ou validações pendentes.

Branch `feature/task-19-demo-status`, criada a partir do trabalho local da TASK-18.
HEAD/base de staging: `7d72cb3347dca04bde9b8a706f523a6da245dea2`.
**As implementações posteriores estão no workspace, sem commit.** Esse hash
identifica a base, não uma versão contendo todas as funcionalidades demonstradas.
Não há release publicada nem comprovação de integração assistida em produção.

## Fontes e alcance

- Constituição, specs de fotografia/voz/PDF, `tasks.md`, `CLAUDE.md` e `PLAN.md`.
- TASK-01–TASK-05: registros preservados na frente das PoCs, revisão
  `7fbe13784afd6b8aee0fea2aa8122150836f1028`, sem merge ou alteração dessa frente:
  [baseline](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/baseline-legado.md),
  [revisão das specs](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/revisao-specs.md),
  [contratos](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/arquitetura-ia.md),
  [PoCs](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/pocs-fotografia-voz.md).
  Disponíveis também por `git show 7fbe137:docs/<arquivo>.md`, sem internet.
- Relatórios locais TASK-07–TASK-15 e [verificação TASK-18](task-18-guardrails.md).
  O relatório antigo `STATUS_REPORT.md`, de 23/09, descreve o legado e não é
  evidência de conclusão das novas modalidades.

“Implementado” abaixo descreve código existente. “Executado” indica a camada
efetivamente rodada. Doubles de SDK, resultados fornecidos e eventos simulados
não comprovam reconhecimento, privacidade de fornecedor ou integração remota.

## Estado real das tarefas

| Tarefa | Estado e evidência disponível | O que falta para seu alcance integral |
|---|---|---|
| 01 | Levantamento realizado em 26/10; relatório original o declara parcial. Legado e versões inventariados; testes locais aprovados | Legado conectado Android/Web, referência de desempenho, horas/despesas e saldo |
| 02 | Revisão documental realizada em 26/10; relatório original parcial | Confrontar TAP original, não disponível. P01 de origem foi tratada conservadoramente na preparação local da TASK-11; não comprova aceite remoto |
| 03 | Concluída em 26/10 **como desenho técnico**; contratos materializados e reutilizados | Não é homologação de motores ou de persistência |
| 04 | PoC implementada, OCR Web real em cartão sintético | Câmera/display reais, build nativo e inspeções em aparelhos |
| 05 | PoC implementada; indisponibilidade pt-BR observada na Web | **Nenhuma transcrição local real comprovada** em Android/Web |
| 06 | Aberta; resultados parciais conhecidos | Consolidar habilitação por dispositivo, metas e limites antes da avaliação. Esta TASK-19 não executa a TASK-06 |
| 07 | CameraX/RAM/ML Kit conectados ao contrato, parser e revisão no cliente Android isolado; checks Java, prebuild/autolinking e bundle | Kotlin/APK não compilados; câmera/ML Kit/cleanup/privacidade reais não comprovados |
| 08 | getUserMedia/quadro RAM/Tesseract LSTM worker/revisão no cliente Web isolado. OCR real em cartão sintético e pipeline com câmera virtual executados | Câmera física, displays, matriz de navegadores e inspeções internas/SO |
| 09 | Parser de fotografia implementado e ligado à revisão; testes rotulados/sintéticos | Avaliação com caixas/textos de displays reais; acurácia OCR não medida; integração física/clinicamente persistente |
| 10 | Revisão fotográfica editável, validações, confirmação/cancelamento/recaptura e proteção contra resultados tardios implementadas | Integração clínica e validação em dispositivos. Confirmar na demo mantém somente memória |
| 11 | Tipos/Zod/rules/origens e porta confirmada preparados; repositório existente reutilizado localmente | Emulador de rules e auth/consentimento/epoch/writer em homologação. Nenhuma tela monta o writer assistido |
| 12 | Adaptador Android exclusivamente on-device e verificação pt-BR implementados | Build Kotlin/APK e serviço/idioma/microfone/privacidade em aparelho. API 31/32 indisponível por idioma não verificável |
| 13 | Implementação parcial recuperada; gate local e revisão conectados, testes do adaptador aprovados | STT positivo e privacidade reais. Chromium retornou model-missing com zero start; sem fallback remoto |
| 14 | **Concluída: parser puro pt-BR**, com testes de expressões, decimais, pulso, ausências e ambiguidades | Não equivale a STT real. [Gramática e exemplos](task-14-parser-pt-br.md) |
| 15 | Revisão de voz/final/parser integrados em clientes isolados; demonstração sintética e preview sem escrita | Dependências 11–13, dispositivos e integração clínica permanecem abertas |
| 16–17 | Abertas; fixtures de software existem | Nenhum corpus de dois aparelhos ou corpus de voz consentido foi disponibilizado como evidência; não contar fixtures como amostras coletadas |
| 18 | Verificações locais e correções executadas; relatório com testes, inspeção por código e checklist separados | Emulador, hardware, STT positivo, legado conectado e demais itens M1–M6 |
| 19 | Consolidação e roteiro preparados nesta data | Apresentação e resultados posteriores ainda não registrados |
| 20–22 | Comparações planejadas nas specs | Não há comparação ML Kit × Tesseract ou STT local × Whisper.cpp executada, corpus comum ou métricas finais |
| 23–26 | PDF especificado, ainda não implementado | Modelo/cálculos e renderizadores Android/Web, validação e evidências |
| 27–34 | Entregas futuras abertas | Redação, comparação, entrega e aceite finais; esta demo não encerra TASK-32 |

O usuário informou que TASK-01–TASK-03 foram realizadas. O acompanhamento preserva
essa realização e as ressalvas dos relatórios: somente TASK-03 tem conclusão
integral no seu alcance documental; não se converte execução parcial em aceite.

## Legado e produção deste ciclo

**Preexistente:** login Google, consentimento/onboarding, formulário manual,
edição/consulta, classificação informativa, histórico/tendência, sessões de duas
leituras, CSV, lembretes e tema. Há testes de regressão; login, push e CRUD
conectados não foram reensaiados nesta consolidação. Não há medição comparável
antes/depois que permita afirmar ausência de degradação de desempenho.

**Produzido neste ciclo:** contratos, PoCs e adaptadores locais isolados, parsers,
revisão compartilhada, origens e porta de confirmação preparadas, testes e correções
de guardrails. Rotas do produto continuam no caminho manual; não inicializam os
novos reconhecedores/writers. O formulário manual da demo reutiliza o componente
existente, mas sua confirmação é **simulada em memória**, sem Firebase.

## Versões identificadas

| Item | Versão / qualidade da informação |
|---|---|
| App / clientes | Raiz 1.0.0; revisão 1.0.0; Web foto/voz 0.1.0. Versões de package.json, não releases |
| Ambiente observado | Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57 em Linux |
| Pacotes instalados | Expo 57.0.8; React 19.2.3; React Native 0.86.0; RN Web 0.21.2; Firebase JS 12.17.0; Zod 4.4.3; TypeScript 6.0.3; Jest 29.7.0 |
| OCR Web | Tesseract.js/core 7.0.0, LSTM/OEM 1; pacote eng 1.0.0, arquivo 4.0.0_best_int/eng.traineddata.gz; lock e manifesto de hashes isolados |
| OCR Android | CameraX 1.5.1 e ML Kit latino embarcado 16.0.1 **declarados em Gradle**, sem compilação/execução do módulo comprovadas |
| STT | Serviço/modelo Android não identificado em aparelho. APIs Web locais presentes no Chromium observado, pt-BR não disponível; versão interna do modelo não obtida |

## Evidências e impedimentos

As verificações da TASK-18 registram 691 testes/64 suítes, lint/TypeScript, exports,
8 checks Java, autolinking e Chromium. Esta tarefa reexportou os três clientes e
repetiu a suíte e o ensaio Web; resultados da nova rodada estão registrados abaixo.
Os comandos de reprodução ficam no [roteiro](task-19-roteiro-demonstracao.md).

**Executado nesta TASK-19, em 27/10/2026:**

| Verificação | Resultado da nova rodada |
|---|---|
| Jest completo, dados isolados | **691 testes / 64 suítes aprovados**; sem snapshots. Tempo de comando 16,465 s, não horas de trabalho |
| Exports offline | Revisão, fotografia Web e voz Web exportados com sucesso; assets estáticos OCR preparados pelo script existente |
| Parser direto em Node | Seis entradas sintéticas da tabela do roteiro executadas; saídas conferidas: 120/80, 120/80/72, 135/85, mixed-scale, multiple-pairs e pulso isolado 72 |
| Ensaio Chromium real | `passed: true`; revisão sintética, correção/confirmar/cancelar/repetição, OCR real em cartão sintético 120/80/72, manual por Enter e gate Web model-missing com zero start |
| Inspeção no ensaio | Zero requisições externas, escritas HTTP, exceções, sentinela no console ou falhas de instrumentação; seis stores vazios nas três origens. Zero workers perdidos antes da instrumentação nesta rodada |
| Acessibilidade básica no ensaio | Nomes/papéis/alerta, Tab/Enter; 390×844 sem overflow horizontal; altura mínima dos botões observados 48 px |

Saídas temporárias desta sessão: `/tmp/aferi-task19-tests.log`,
`/tmp/aferi-task19-{photo-review,web-capture,web-voice}-export.log` e
`/tmp/aferi-task19-browser.log`. O resumo acima preserva os resultados mesmo se
os arquivos temporários desaparecerem. Os scripts e exemplos permitem repetir;
não se trata de artefato de release ou gravação da apresentação. A rodada de
câmera virtual e os checks Java abaixo são evidências **anteriores da TASK-18**,
não foram repetidos na TASK-19. Lint/TypeScript também pertencem àquela rodada;
esta tarefa só altera documentação e não adicionou testes ou código funcional.

O percurso Web anterior observou OCR real **somente sobre cartão sintético**,
revisão/manual em memória e gate de voz indisponível com zero start. Em origens
instrumentadas: zero envios externos/escritas HTTP/exceções/sentinela no console;
seis stores inspecionados vazios. A câmera virtual executou a API real, com
tracks encerradas e 3/3 workers fechados; pagehide foi **simulado**. Esses limites
não permitem afirmar captura física sem persistência nem acurácia de displays.

Impedimentos conhecidos, sem nova tentativa remota nesta tarefa:

- Emulador Firestore: download do JAR 1.21.0 falhou na TASK-18; rules não foram
  compiladas/executadas. Projeto fictício demo-aferi-task11, sem produção.
- Android: build da PoC bloqueou em repo.reactnative.dev/HTTP 403; integração
  posterior também encontrou impedimento no download do Gradle 9.3.1. Sem
  SDK/ADB/aparelho disponível nos registros; prebuild/Hermes não validam Kotlin.
- Voz Web: pacote local ausente no perfil observado. Não instalar modelos nem
  usar reconhecedor remoto na apresentação para contornar indisponibilidade.
- Privacidade interna de SDK/SO, fonte 200%, leitores de tela, temas completos e
  background/interrupções reais continuam no checklist M1–M6 da TASK-18.
- Comparadores: há escolhas e protocolo nas specs, contratos/fixtures e checks
  locais reutilizáveis. Não há executor comparativo validado, Whisper.cpp integrado,
  conjunto comum rotulado, p50/p95, memória/bateria ou taxa de acerto medida.

## Planejado, realizado e controle conhecido

| Marco/controle | Situação em 27/10, sem retrodatação |
|---|---|
| PoCs/decisão previstas para 06/10 | Registros disponíveis são de 26–27/10; validação física ainda pendente. Não declarar execução em 06/10 |
| Apresentação de 13/10 | Não há ata, material ou resultado fornecido; não é possível afirmar realização nem conteúdo |
| Integração/casos para 27/10 | Avanço parcial em clientes isolados; integração clínica e corpus não demonstrados. Antecipação de parser/revisão solicitada para a demo |
| Demonstração de amanhã | Roteiro e alternativa local preparados; execução/apresentação ainda pendentes |
| Comparação 10/11; PDF/redação 24/11 | Marcos mantidos; esforço restante precisa ser reavaliado após cobertura e corpus, sem promessa automática de cumprimento |
| Avaliação 08/12; encerramento 15/12 | Marcos do plano preservados |
| Capacidade | 100 h **estimadas** no ciclo; TASK-19 2 h **estimadas**. Horas anteriores, reais por tarefa, total e saldo: **não informados** |
| Orçamento | Teto global R$ 300. Despesas anteriores/atuais/acumuladas e saldo: **não informados**; não presumir saldo integral nem custo total zero |

Nenhum serviço/build pago foi contratado por esta execução; não houve nova
dependência, operação em Firebase de produção, publicação de regras, commit,
push ou deploy. Inferência local sem tarifa de API não determina despesas globais.
Não há registro de horas que permita somar tempo de comandos como esforço real.

Prioridade após a apresentação: registrar seus resultados reais; habilitar emulador
e homologação da TASK-11; validar capacidade/ciclo de vida M1–M2 com dados sintéticos
nos dispositivos disponíveis; consolidar TASK-06 e preparar coleta 16–17 antes de
comparar. Sem evidência de localidade/privacidade, manter a modalidade indisponível.
