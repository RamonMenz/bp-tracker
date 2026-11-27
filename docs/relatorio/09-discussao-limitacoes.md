# 9. Discussão crítica e limitações

[← 8. Dificuldades](08-dificuldades.md) · [Índice](README.md) · [Próximo: 10. Conclusão →](10-conclusao.md)

## 9.1 Fotografia: o que o resultado negativo permite dizer

O resultado mais informativo do ciclo é negativo. Com um OCR genérico pré-treinado (ML Kit latino embarcado), a cadeia completa funcionou com texto tipográfico (cartão A) e falhou no estímulo de sete segmentos (cartão B), antes e depois de um pré-processamento conservador em memória. Ausência de dígitos já na saída do SDK (Text, Block, Line) indica que o problema **não** está nos filtros de associação do projeto. Isso, porém, não identifica a causa: o OCR bruto não foi inspecionado, a forma e o espaçamento dos segmentos variam e o OCR pode ter confundido segmentos com letras.

Esse resultado é coerente com o que os correlatos relatam. Shenoy e Aalami [R7] e Timofeev et al. [R8] dizem que o OCR genérico (Tesseract, SSOCR) tem dificuldade com sete segmentos, e os bons resultados vêm de modelos próprios. Isso sugere uma **tensão de escopo** que o planejamento não antecipou: a decisão de usar só modelos pré-treinados (TAP [P041](../fontes/tap-aferi-v1.0.md#p041)) talvez seja incompatível com o estímulo-alvo, mesmo que o TAP admita ajuste fino "se o cronograma permitir". Esta é uma **hipótese**, não uma conclusão, porque:

- só um motor foi aplicado ao estímulo segmentado (o Tesseract.js, previsto pela própria spec como comparador, nunca foi);
- só um aparelho, um tipo de estímulo sintético e uma tentativa por condição;
- só uma variante de pré-processamento (`roi-1`);
- o visor real foi tentado uma vez, sem diagnóstico.

Portanto, **não se conclui inviabilidade universal**. A conclusão é que a viabilidade não foi demonstrada nas condições investigadas.

## 9.2 Voz: capacidade × produto

A V1 trocou a incerteza principal da voz, que era a existência de reconhecimento local em pt-BR, por um fato observado em dois ambientes do autor. Isso é necessário, mas não suficiente:

- **Capacidade não é funcionalidade.** O caminho que grava uma leitura com `source: 'voice'` depois da confirmação nunca foi composto com um reconhecedor real (o modo `recognition` só existe em testes). Confirmação, cancelamento e troca de conta no produto não foram exercitados.
- **Localidade não é privacidade.** Funcionar offline não prova ausência de retenção ou de envio posterior pelo serviço do SO ou do navegador. A spec exige essa evidência (VOZ-13, VOZ-15) e a deixa sem critério de suficiência definido (Q-019). Talvez a evidência exigida não possa ser obtida com as ferramentas disponíveis sem acesso privilegiado ao aparelho. Nesse caso, a habilitação dependeria de uma decisão explícita de aceitar um limite declarado.
- **Variabilidade sem medida.** Houve tentativas sem candidato e resultados ambíguos, mas, sem tabulação, não se sabe a taxa. A comparação Android × Web é qualitativa.

## 9.3 PDF: testado não é validado

O PDF Web é a entrega com evidência automatizada mais densa do ciclo: emulador, conferência do conteúdo com poppler (agora também no CI, PR #95), rede bloqueada, troca de conta e acessibilidade da interface. Mesmo assim, a spec exige verificação em Android real, em fluxo logado e em impressão. Testes de texto e snapshots, diz a própria spec, "não comprovam qualidade visual ou ausência de envio externo". A geração foi validada com dados sintéticos e sem login. Também falta medir em celular o tempo de 3.000 registros, que no servidor ficou em cerca de 1,5 s, e o prazo de 30 s não cobre o import das bibliotecas (Q-017). Ou seja, o PDF Web está **pronto para validação**, não validado, e o PDF Android não existe.

## 9.4 Desenvolvimento assistido por agentes: ganhos e custos observados

- **Ganhos observáveis:**
  - Volume de verificação automatizada, de 384 para 1.001 testes entre 26/10 e 26/11.
  - Ferramentas de campo com checks no CI.
  - Rastreabilidade documental fina: ledger e notas datadas sem reescrita.
  - Defeitos reais achados pela própria verificação: vazamento entre contas no PDF e breadcrumbs do Sentry.
- **Custos observáveis:**
  - Volume documental grande e às vezes redundante (o `tasks.md` tem 329 linhas), com divergências entre documentos que precisaram de consolidação.
  - Investigações longas antes de uma decisão de pausa (fotografia).
  - Os agentes não alcançam o mundo físico, o que concentrou no autor a parte mais lenta do ciclo.
  - A autoria no Git não distingue os agentes.
- **Limite desta análise:** sem horas registradas, não dá para dizer se a assistência reduziu ou aumentou o esforço total. Também não houve grupo de controle. Esta seção descreve, não mede.

## 9.5 Limitações declaradas

1. **Homologação no ambiente de produção, com conta de teste e sem ambiente isolado** (D-003). Riscos: leituras de teste no histórico real se a conta de teste não for usada; caminho de escrita experimental em produção; publicação de rules em produção. A compatibilidade das rules novas com os dados reais não foi verificada (E-014). A implantação da Function `onUserDelete`, que apaga os dados de uma conta excluída, não foi verificada (E-035). Também não se sabe qual branch alimenta a Vercel de produção (Q-020).
2. **Nenhum critério de aceite FOT, VOZ ou PDF validado** no produto, em aparelho ou em fluxo logado.
3. **Comparação entre abordagens não executada** e sem corpus rotulado (capítulo 6).
4. **Um aparelho Android por frente**, contra os dois modelos exigidos (P107).
5. **Ensaios físicos são relatos do autor**, sanitizados e não reproduzidos por terceiros; parte deles não é reproduzível a partir de commits publicados (Q-016).
6. **Privacidade interna de SDKs e serviços** (ML Kit, DataTransport, serviço de voz do SO, Chrome) não demonstrada; o coletor nativo repassa mensagens de erro ao Crashlytics (Q-013).
7. **Acessibilidade:** TalkBack só na fotografia (K1 retestado); sem leitor de tela real no PDF e na voz; o PDF não é marcado (não é PDF/UA); rádios da Web sem Espaço e setas (react-native-web 0.21). Não se declara conformidade WCAG AA completa.
8. **Desempenho:** nenhuma medição em celular de latência de OCR, STT ou PDF, nem do registro manual antes e depois.
9. **Marcos do TAP vencidos** (06/10, 27/10, 10/11, 24/11), declarados com as datas reais (capítulo 7, §7.6).
10. **Horas, despesas e saldo: não informado.**
11. **Governança:** TAP sem aprovação evidenciada no arquivo (Q-008); P01 e P02 sem tratamento formal registrado.
