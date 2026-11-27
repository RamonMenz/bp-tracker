# 3. Referencial teórico e trabalhos correlatos

[← 2. Contextualização](02-contextualizacao-justificativa.md) · [Índice](README.md) · [Próximo: 4. Metodologia →](04-metodologia.md)

> **Situação deste capítulo:** é um esqueleto com fontes verificadas por busca em 27/11/2026, não uma revisão de literatura sistemática. A revisão de literatura da Fase 1 prevista no TAP ([P086](../fontes/tap-aferi-v1.0.md#p086)) **não tem registro no repositório**. [PENDENTE: o autor deve informar se essa revisão foi feita e onde está, ou ampliar este capítulo.] Os códigos [Rn] remetem ao [capítulo 11](11-referencias.md).

## 3.1 Automonitoramento da pressão arterial

A pressão arterial medida fora do consultório (MRPA, AMPA e MAPA) é tratada nas diretrizes brasileiras de hipertensão de 2020 [R1] e na diretriz de 2025 [R2]. Para este projeto, o ponto relevante é de engenharia, não clínico: o valor registrado pelo paciente só serve ao acompanhamento se for **transcrito sem erro** e se o histórico chegar **legível** ao profissional. Por isso o produto preserva a classificação informativa já existente e não acrescenta interpretação clínica (TAP [P043](../fontes/tap-aferi-v1.0.md#p043)). [PENDENTE: o autor deve conferir em [R1]/[R2] os trechos sobre MRPA que quiser citar textualmente.]

## 3.2 Reconhecimento óptico de caracteres (OCR)

**Tesseract.** Motor de OCR de código aberto, descrito por Smith [R5]: localização de linhas, extração de características e classificador adaptativo. As versões recentes trazem um reconhecedor neural LSTM. O projeto usa o Tesseract.js [R12], que compila o motor para WebAssembly e o executa num Web Worker no navegador. Na prova de conceito, o modelo LSTM `eng` foi servido localmente.

**Google ML Kit Text Recognition v2.** SDK de reconhecimento de texto no dispositivo. Tem uma variante com modelo embarcado no APK e outra distribuída pelo Google Play Services, e aceita quadros em memória (`media.Image`/buffer) [R11]. O projeto usa o modelo latino embarcado (`text-recognition` 16.0.1) por um módulo Expo próprio, com CameraX.

**Visores de sete segmentos.** Os medidores de pressão domésticos costumam usar LCD de sete segmentos. OCR de propósito geral é treinado sobretudo em texto tipográfico, e a literatura correlata (seção 3.6) relata dificuldade desses motores com dígitos segmentados. Isso motivou a comparação, no projeto, entre um cartão sintético em fonte comum e outro com dígitos de sete segmentos ([capítulo 5](05-desenvolvimento.md)).

## 3.3 Reconhecimento de fala (STT)

**Android `SpeechRecognizer`.** A partir da API 31, a plataforma oferece `createOnDeviceSpeechRecognizer` e `isOnDeviceRecognitionAvailable`, que pedem explicitamente o reconhecimento no dispositivo [R13]. A preferência por modo offline (`EXTRA_PREFER_OFFLINE`) não garante processamento local. O download do modelo (`triggerModelDownload`) existe a partir da API 33. Usar a API do sistema **não prova** o que o serviço do fabricante faz internamente com o áudio. Por isso a spec de voz exige inspeção (VOZ-13 e VOZ-15).

**Web Speech API.** A especificação do grupo comunitário do W3C define `SpeechRecognition` e o atributo `processLocally`. Quando verdadeiro, ele exige processamento local; sem ele, o agente de usuário pode usar reconhecimento remoto [R14]. O documento é um rascunho mutável, consultado pelo projeto em 26/10/2026 ([revisão das specs §3](../revisao-specs.md)), e o suporte varia por navegador.

**Whisper.** Modelo de reconhecimento de fala treinado com supervisão fraca em larga escala (680 mil horas, multilíngue) [R6]. O Whisper.cpp [R18] é uma implementação em C/C++ para execução local e foi escolhido como **comparador acadêmico**, fora do fluxo do produto (spec de voz §7.1). A comparação não foi executada ([capítulo 6](06-decisao-tecnica-comparacao.md)).

## 3.4 Interpretação determinística em pt-BR

O reconhecedor produz texto, e uma etapa separada e determinística o transforma em candidatos de sistólica, diastólica e pulso (spec de voz §3.3). A spec documenta a convenção coloquial brasileira de dizer a pressão "por dez": "doze por oito" quer dizer 120/80 mmHg. Ela também define o tratamento de escala mista ("doze por oitenta"), de decimais ("treze vírgula cinco") e de autocorreção. [PENDENTE: fonte bibliográfica sobre essa convenção coloquial, se o autor quiser fundamentá-la além da spec.] A escolha de regras explícitas, sem modelo generativo, segue a restrição de não completar nem corrigir valores clínicos em silêncio.

## 3.5 Geração local de documentos, privacidade e acessibilidade

- **PDF.** A Web usa jsPDF [R16] com o plugin AutoTable [R17], que desenha diretamente no PDF (texto selecionável, tabela com várias páginas). O Android usaria Expo Print [R15], que converte HTML/CSS em PDF pelo motor de impressão do sistema.
- **LGPD.** Dados de saúde são dados pessoais sensíveis (Lei 13.709/2018, art. 5º, II) [R3]. Daí vêm, na constituição, a minimização, a ausência de logs clínicos e o processamento em memória.
- **Acessibilidade.** O critério de contraste AA (4,5:1) e as exigências de operação por teclado e leitor de tela seguem a WCAG 2.2 [R4]. O projeto não declara conformidade WCAG completa ([capítulo 9](09-discussao-limitacoes.md)).

## 3.6 Trabalhos correlatos

Os números abaixo vêm dos resumos e dos trechos dos trabalhos localizados por busca. Não foram reproduzidos e **não são comparáveis** com os resultados deste projeto, porque conjuntos, aparelhos e métricas são outros.

| Trabalho | Abordagem | O que relatam (segundo os autores) | Relação com o Aferi |
|---|---|---|---|
| Shenoy e Aalami, AMIA 2017 [R7] | App de smartphone com modelo próprio para dígitos de sete segmentos em monitores médicos | Leitura correta em 98,2% dos casos; os autores observam que o Tesseract lê bem texto comum, mas teve dificuldade com sete segmentos | Mesmo problema. Usa modelo treinado para a tarefa, o que o TAP exclui ([P041](../fontes/tap-aferi-v1.0.md#p041)) |
| Timofeev, Paramonov e Mamedov, FRUCT [R8] | 374 fotos de 7 tonômetros com 9 celulares; algoritmo próprio implementado num app de diário de pressão | Tesseract e SSOCR extraíram informação de menos de 5% das fotos | Aponta o mesmo limite do OCR genérico em sete segmentos que o projeto observou nas suas condições |
| Kulkarni et al., Frontiers in AI 2021 [R9] | Rede convolucional para transcrever o LCD de medidores de pressão pela câmera, sem depender de rede | [PENDENTE: conferir os resultados no artigo] | Mesmo cenário, com processamento local; usa modelo treinado para a tarefa |
| Finnegan et al. (Oxford), J. Med. Eng. Technol. 2019 [R10] | Localização e classificação de dígitos treinadas com dígitos sintéticos | [PENDENTE: referência a confirmar pelo autor; o DOI não foi resolvido na busca] | Uso de estímulos sintéticos |

Nenhum trabalho correlato comparando STT local em pt-BR para enunciação de pressão arterial foi localizado na busca feita para este rascunho. [PENDENTE: o autor deve ampliar a busca, por exemplo em SBC OpenLib, IEEE Xplore e PubMed, se for incluir correlatos de voz.]

**Síntese.** Os correlatos que alcançam bons resultados em sete segmentos usam modelos treinados ou ajustados para a tarefa. O ciclo optou por modelos pré-treinados de OCR genérico, por causa do prazo, do custo e da exclusão de treino do zero (TAP [P041](../fontes/tap-aferi-v1.0.md#p041)). Essa tensão é discutida no [capítulo 9](09-discussao-limitacoes.md).
