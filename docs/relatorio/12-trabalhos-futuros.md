# 12. Trabalhos futuros

[← 11. Referências](11-referencias.md) · [Índice](README.md)

> **Resumo.** Antes de 08/12, a prioridade é validar em aparelho o que já está no produto: a correção da voz, a V2, a V3 e o PDF Android. Depois vêm a decisão sobre a fotografia, o corpus e as comparações.

Itens derivados das pendências registradas, sem prazo nem compromisso. Os que dependem de decisão da orientadora estão marcados como tal. Nenhum deles foi autorizado por este documento.

## 12.1 Para fechar as entregas deste ciclo, se o prazo e a orientadora permitirem

1. **Voz Android:** gerar o APK a partir de um commit publicado, registrar o commit e o SHA-256 (Q-016, Q-023) e repetir o reteste de 10 tentativas sem pulso e 6 com pulso, inclusive offline, para medir o efeito do consenso (#102).
2. **Voz no produto:** com o Dev Client novo (PR #104, se aprovado), executar o roteiro da V3 ([voz-android-produto](../voz-android-produto.md#roteiro-no-aparelho-após-o-novo-build)) com a conta de teste; executar a V2 num Chrome com pacote local e login. Antes de habilitar a flag para uso, definir com a orientadora o critério de privacidade do serviço (Q-019) e o aceite de P01 (Q-004).
3. **PDF Android:** build EAS e roteiro de [pdf-android §9](../pdf-android.md#9-o-que-o-autor-precisa-conferir-no-aparelho-samsung): leitor externo, A4, paginação, cinza, temporários, tempo com 1.095 e 3.000 registros e TalkBack.
4. **PDF Web:** registrar ambiente e data da validação do autor (E-045); testar leitor de tela real, navegador móvel e prévia com visualizador de PDF (Q-011).
5. **Privacidade nativa:** decidir sobre os handlers globais do Crashlytics (Q-022) e conferir a chegada real ao Sentry e ao Crashlytics.
6. **Produção:** verificar a publicação das rules com `photo`/`voice`, a Function `onUserDelete` e a ausência das flags de voz na Vercel, sempre por ação expressa do autor (Q-021, Q-025).

## 12.2 Fotografia (depende da orientadora, Q-001/Q-002)

- Primeira ação já prevista: aplicar o **Tesseract.js aos cartões sintéticos existentes** (spec de fotografia §6.3), o que é comparação e não troca de motor, **somente com autorização expressa do autor** (D-001).
- Reensaiar o visor real (G-Tech BSPII) com diagnóstico, num segundo modelo de aparelho.
- Avaliar, como mudança de decisão sujeita à governança (P02), um reconhecedor específico de sete segmentos ou ajuste fino. Os correlatos [R7]–[R9] indicam que é aí que estão os bons resultados. O TAP exclui treino do zero e admite ajuste fino só se o cronograma permitir (P041).
- Investigar a telemetria e o ID de instância do ML Kit e do DataTransport com ferramenta qualificada antes de qualquer habilitação clínica.

## 12.3 Comparação e corpus (TASK-16, 17, 20, 21)

- Construir corpus rotulado próprio com pelo menos dois modelos de aparelho e, para voz, locutores com consentimento escrito e aprovação prévia da orientadora (P048, P107; Q-007), separando ajuste de avaliação e mantendo o corpus fora do Git.
- Executar ML Kit × Tesseract.js e STT local × Whisper.cpp com as métricas das specs (acerto por campo e por par, trocas, falsos válidos, ausência de resultado, latência p50/p95, memória).

## 12.4 Para o TCC e além (exclusões do TAP, P038–P043)

- Avaliação de usabilidade com participantes, sobretudo pessoas idosas e com baixa acuidade visual ou limitação motora.
- Conversão deste relatório em artigo no formato SBC (P039).
- Indicadores agregados de adesão sobre os lembretes configurados (P028) e telemetria anônima e agregada das novas modalidades (P026).
- Acessibilidade do próprio PDF (marcação, PDF/UA) e navegação por teclado completa nos rádios da Web.
- Refatorar o renderizador jsPDF para usar as funções de geometria compartilhadas com o template Android ([pdf-android §2](../pdf-android.md#2-decisões)).
- Instalação explícita do modelo pt-BR no Android (`triggerModelDownload`, D-004), hoje ausente.
