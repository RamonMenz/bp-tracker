# 9. Discussão crítica e limitações

[← 8. Dificuldades](08-dificuldades.md) · [Índice](README.md) · [Próximo: 10. Conclusão →](10-conclusao.md)

> **Resumo.** Fotografia: resultado negativo restrito às condições, sem concluir inviabilidade. Voz: capacidade não é funcionalidade, localidade não é privacidade, e a rodada de 27/11 mostrou que testes com dublês não substituem o ensaio real. PDF: a Web passou de "testado" para "validado pelo autor"; o Android continua só testado. As limitações estão listadas em §9.5.

## 9.1 Fotografia: o que o resultado negativo permite dizer

O resultado mais informativo do ciclo é negativo. Com um OCR genérico pré-treinado (ML Kit latino embarcado), a cadeia completa funcionou com texto tipográfico (cartão A) e falhou no estímulo de sete segmentos (cartão B), antes e depois de um pré-processamento conservador em memória. Ausência de dígitos já na saída do SDK (Text, Block, Line) indica que o problema **não** está nos filtros de associação do projeto. Isso, porém, não identifica a causa: o OCR bruto não foi inspecionado, a forma e o espaçamento dos segmentos variam e o OCR pode ter confundido segmentos com letras.

Esse resultado é coerente com o que os correlatos relatam. Shenoy e Aalami [R7] e Timofeev et al. [R8] dizem que o OCR genérico (Tesseract, SSOCR) tem dificuldade com sete segmentos, e os bons resultados vêm de modelos próprios. Isso sugere uma **tensão de escopo** que o planejamento não antecipou: a decisão de usar só modelos pré-treinados (TAP [P041](../fontes/tap-aferi-v1.0.md#p041)) talvez seja incompatível com o estímulo-alvo, mesmo que o TAP admita ajuste fino "se o cronograma permitir". Esta é uma **hipótese**, não uma conclusão, porque:

- só um motor foi aplicado ao estímulo segmentado (o Tesseract.js, previsto pela própria spec como comparador, nunca foi);
- só um aparelho, um tipo de estímulo sintético e uma tentativa por condição;
- só uma variante de pré-processamento (`roi-1`);
- o visor real foi tentado uma vez, sem diagnóstico.

Portanto, **não se conclui inviabilidade universal**. A conclusão é que a viabilidade não foi demonstrada nas condições investigadas.

## 9.2 Voz: capacidade × produto

A V1 trocou a incerteza principal da voz, que era a existência de reconhecimento local em pt-BR, por um fato observado em dois ambientes do autor. Depois disso, a V2 e a V3 compuseram o caminho completo no produto, mas só com reconhecedor simulado. Isso é necessário, mas não suficiente:

- **Capacidade não é funcionalidade.** O caminho que grava uma leitura com `source: 'voice'` depois da confirmação existe no produto desde 27/11 (#99, #101), mas **nunca rodou com um reconhecedor real**. Confirmação, cancelamento e troca de conta foram exercitados só com dublês.
- **Dublês não revelam o comportamento do serviço.** Os testes simulados passavam, e a rodada real de 27/11 falhou em 10 de 10 frases curtas, porque o serviço devolve hipóteses de grafia diferente (E-042). A correção por consenso é plausível, mas é **hipótese** até o reteste. Pedir até cinco hipóteses também pode aumentar a chance de alguma interpretação divergir; o efeito líquido só a medição dirá.
- **Localidade não é privacidade.** Funcionar offline não prova ausência de retenção ou de envio posterior pelo serviço do SO ou do navegador. A spec exige essa evidência (VOZ-13, VOZ-15) e a deixa sem critério de suficiência definido (Q-019). Talvez a evidência exigida não possa ser obtida com as ferramentas disponíveis sem acesso privilegiado ao aparelho. Nesse caso, a habilitação dependeria de uma decisão explícita de aceitar um limite declarado.
- **Variabilidade pouco medida.** A V1 não tabulou tentativas. A rodada de 27/11 tem as primeiras contagens (10 e 6 tentativas), pequenas demais para estimar taxa. A comparação Android × Web continua qualitativa.

## 9.3 PDF: testado não é validado

O PDF Web é a entrega com evidência automatizada mais densa do ciclo: emulador, conferência do conteúdo com poppler no CI (#95), rede bloqueada, troca de conta e acessibilidade da interface. Testes de texto e snapshots, diz a própria spec, "não comprovam qualidade visual ou ausência de envio externo". Por isso a validação do autor em fluxo logado (E-045) muda o estado: com 53 registros reais, recortes conferidos, dados de teste com números esperados e impressão em cinza legível, o PDF Web passa a **validado pelo autor**. Ainda faltam leitor de tela, navegador móvel e a prévia com visualizador de PDF, e o relato não registra ambiente nem data.

O PDF Android repete o padrão anterior da Web: **implementado e testado, não validado**. O motor real (WebView do sistema) pode divergir da aproximação em Chromium em paginação, fontes e quebras, e o tempo de 3.000 registros no celular não foi medido.

## 9.4 Desenvolvimento assistido por agentes: ganhos e custos observados

- **Ganhos observáveis:**
  - Volume de verificação automatizada, de 384 testes (26/10) para 1.134 no CI do #103 (27/11).
  - Ferramentas de campo com checks no CI.
  - Rastreabilidade documental fina: ledger e notas datadas sem reescrita.
  - Defeitos reais achados pela própria verificação (lista completa no [capítulo 4-A, §4A.5](04a-desenvolvimento-assistido-por-agentes.md#4a5-defeitos-que-a-verificação-encontrou)).
- **Custos observáveis:**
  - Volume documental grande e às vezes redundante (o `tasks.md` tem 329 linhas), com divergências entre documentos que precisaram de consolidação.
  - Investigações longas antes de uma decisão de pausa (fotografia).
  - Os agentes não alcançam o mundo físico, o que concentrou no autor a parte mais lenta do ciclo.
  - Integração rápida sem validação física: o produto recebeu voz e PDF Android em um dia, mas a validação ficou para depois.
  - A autoria no Git não distingue os agentes.
- **Limite desta análise:** sem horas registradas, não dá para dizer se a assistência reduziu ou aumentou o esforço total. Também não houve grupo de controle. Esta seção descreve, não mede.

## 9.5 Limitações declaradas

1. **Homologação no ambiente de produção, com conta de teste e sem ambiente isolado** (D-003). Riscos: leituras de teste no histórico real se a conta de teste não for usada (a validação do PDF inseriu e depois removeu 8 registros de teste, E-045); caminho de escrita experimental em produção; publicação de rules em produção. A compatibilidade das rules novas com os dados reais não foi verificada (E-014). A implantação da Function `onUserDelete` não foi verificada (E-035). Segundo o PR #103, a Vercel de produção é alimentada por `main`, que desde 27/11 tem o mesmo código de `staging` (D-012); a configuração da Vercel e a ausência das flags de voz não foram verificadas (Q-025).
2. **Validação no produto só no PDF Web, feita pelo autor** (E-045). Nenhum critério FOT ou VOZ validado; nenhum critério do PDF Android validado em aparelho.
3. **Comparação entre abordagens não executada** e sem corpus rotulado (capítulo 6).
4. **Um aparelho Android por frente**, contra os dois modelos exigidos (P107).
5. **Ensaios físicos são relatos do autor**, sanitizados e não reproduzidos por terceiros; parte deles não é reproduzível a partir de commits publicados (Q-016).
6. **Privacidade interna de SDKs e serviços** (ML Kit, DataTransport, serviço de voz do SO, Chrome) não demonstrada; os handlers globais do Crashlytics ainda enviam mensagens cruas (Q-022).
7. **Acessibilidade:** TalkBack só na fotografia (K1 retestado); sem leitor de tela real no PDF e na voz; o PDF não é marcado (não é PDF/UA); rádios da Web sem Espaço e setas (react-native-web 0.21). Não se declara conformidade WCAG AA completa.
8. **Desempenho:** nenhuma medição em celular de latência de OCR, STT ou PDF, nem do registro manual antes e depois.
9. **Código integrado sem compilação nativa pelos agentes:** o Kotlin da V3 e do consenso não foi compilado, e o APK do produto com `expo-print` e voz não existe (E-041, E-043, E-047).
10. **Marcos do TAP vencidos** (06/10, 27/10, 10/11, 24/11), declarados com as datas reais (capítulo 7, §7.7).
11. **Horas, despesas e saldo: não informado.**
12. **Governança:** TAP sem aprovação evidenciada no arquivo (Q-008); P01 e P02 sem tratamento formal registrado.
