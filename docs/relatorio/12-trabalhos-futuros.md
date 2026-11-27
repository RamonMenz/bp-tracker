# 12. Trabalhos futuros

[← 11. Referências](11-referencias.md) · [Índice](README.md)

Itens derivados das pendências registradas, sem prazo nem compromisso. Os que dependem de decisão da orientadora estão marcados como tal. Nenhum deles foi autorizado por este documento.

## 12.1 Para fechar as entregas deste ciclo, se o prazo e a orientadora permitirem

1. **PDF:** validar a Web em fluxo logado com dados reais (só leitura), num Chrome com visualizador de PDF, com impressão A4 e em cinza e com leitor de tela real (Q-011, Q-014). Decidir entre corrigir o código e corrigir a documentação do prazo de 30 s (Q-017). Implementar o PDF Android com `expo-print` se houver Dev Client do produto (P3, TASK-24, Q-010).
2. **Voz no produto:** V2 (Web atrás de flag desligada por padrão) e V3 (Android com rebuild do Dev Client), com os testes de confirmação, cancelamento e troca de conta previstos na [reavaliação §6](../reavaliacao-2026-11-26.md). Antes de habilitar, definir com a orientadora o critério de privacidade do serviço do sistema (Q-019) e o aceite de P01 (Q-004).
3. **Reprodutibilidade da V1:** repetir o build a partir de um commit publicado (por exemplo, `1140197` ou posterior) e registrar o hash (Q-016). Tabular as tentativas por frase.
4. **Privacidade nativa:** decidir se a mensagem de erro também será redigida antes do Crashlytics (Q-013/Q-018).
5. **Produção:** verificar a publicação das rules com `photo`/`voice`, a Function `onUserDelete` e a branch de produção da Vercel, sempre por ação expressa do autor (Q-020, Q-021).

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
