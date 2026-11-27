# 6. Decisão técnica documentada e comparação entre abordagens

[← 5. Desenvolvimento](05-desenvolvimento.md) · [Índice](README.md) · [Próximo: 7. Resultados →](07-resultados.md)

## 6.1 O marco da decisão e o que de fato existe

O TAP exige decisão técnica formalizada **até 06/10/2026, em documento próprio, "sem revisão posterior"** ([P021](../fontes/tap-aferi-v1.0.md#p021), [P103](../fontes/tap-aferi-v1.0.md#p103)). O registro verificável da decisão é a seção "Decisões do engenheiro" das três specs, no commit `e62181a`, de **26/10/2026**. Não foi encontrado no repositório artefato anterior a 06/10. Esse registro posterior não comprova o marco, e a lacuna está aberta como **P02** ([revisão das specs](../revisao-specs.md#p02-marco-decisao)). [PENDENTE: se existir documento de decisão anterior a 06/10 fora do repositório, o autor deve anexá-lo; senão, registrar o tratamento formal dado pela orientadora.] As decisões abaixo **não foram trocadas** depois do registro: a constituição proíbe alterar a stack com base em resultados de validação (Aplicação).

## 6.2 Decisões por modalidade e critérios aplicados

Critérios comuns da decisão (constituição; specs §6/§7): primeiro os **eliminatórios** (processamento em memória, sem log clínico, inferência local, confirmação obrigatória, legado preservado, teto de custo e prazo); depois os comparativos (acurácia, latência, memória, tamanho, custo recorrente, esforço dentro de cerca de 100 h).

| Modalidade | Escolha registrada | Alternativas consideradas | Motivo do descarte (como registrado na spec) |
|---|---|---|---|
| Fotografia Android | ML Kit Text Recognition v2, modelo latino **embarcado**, com quadro em memória | Cloud Vision, Gemini e Claude (APIs) | Transmitem imagem, dependem de rede e têm condições de retenção |
| | | LLaVA e Moondream (multimodais locais) | Memória e esforço incompatíveis com o ciclo individual de cerca de 100 h |
| | | Digital Ink | A entrada são traços de escrita, não fotografias |
| Fotografia Web | Tesseract.js, LSTM pré-treinado, em Web Worker | Mesmas APIs de nuvem | Idem |
| Voz Android | `SpeechRecognizer.createOnDeviceSpeechRecognizer` (API 31+), com pt-BR verificado | APIs da OpenAI, do Google e da Azure; hospedagem própria | Transmissão de voz, retenção e manutenção |
| | | Whisper.cpp multilíngue | Mantido como **comparador acadêmico** e contingência documentada, fora do produto |
| Voz Web | Web Speech com `processLocally = true` e pt-BR verificado | Reconhecedor remoto padrão do navegador | Envio de áudio, vedado pela escolha local |
| Interpretação | Parser determinístico compartilhado, sem LLM | Modelo generativo para "corrigir" a fala | Completaria ou corrigiria valores clínicos em silêncio |
| PDF Android | `expo-print` (HTML/CSS para PDF), gráfico SVG | pdfmake, pdf-lib, html2pdf.js, outra bridge HTML→PDF | Outro motor de layout; mais código de tabela; rasterização; duplicação da integração nativa |
| PDF Web | jsPDF com AutoTable, desenho vetorial | Os mesmos | Idem |

O custo de inferência e geração previsto é R$ 0,00 por uso, porque a inferência é local e não há tarifa de API. É uma **previsão**, não uma despesa medida (Q-009).

Decisões posteriores do ciclo, todas registradas no ledger com data real:

- **D-001**, 26/11: pausa da fotografia.
- **D-002**: PDF e voz em paralelo.
- **D-003**: homologação em produção.
- **D-004**: instalação explícita do modelo Web.
- **D-005**: pontos de entrada atrás de flag.
- **D-006**: regras entre agentes.
- **D-007**: PDF Web antes do Android.
- **D-008**: worker de PDF avaliado e não adotado, com medição de 567 KB na abertura.
- **D-009**: prévia embutida só com visualizador de PDF.

D-008 é o único caso deste ciclo em que **duas abordagens foram de fato experimentadas e comparadas por medição** antes de decidir.

## 6.3 Comparação entre abordagens: o que foi e o que **não** foi comparado

O TAP pede comparação entre abordagens alternativas de cada modalidade **sobre casos de teste rotulados** ([P024](../fontes/tap-aferi-v1.0.md#p024)); a fotografia e a comparação são irredutíveis ([P117](../fontes/tap-aferi-v1.0.md#p117)). O estado é:

### Não foi comparado

| Comparação exigida | Spec | Estado | Motivo |
|---|---|---|---|
| ML Kit × Tesseract.js sobre o mesmo conjunto rotulado (acerto por campo e par, trocas, falsos válidos, latência fria e aquecida, memória, tamanho; p50/p95) | Fotografia §6.3; TASK-20 | **Não executada** | Não existe corpus rotulado (TASK-16 não iniciada); o Tesseract.js nunca foi aplicado aos cartões de sete segmentos; a frente foi pausada (D-001) |
| STT local × Whisper.cpp sobre o mesmo corpus de áudio (acerto após parsing, erro de escala por dez, falso preenchimento em ruído e silêncio, latência, memória; WER auxiliar) | Voz §7.3; TASK-21 | **Não executada** | Não existe corpus de áudio (TASK-17 não iniciada; coleta com terceiros depende de aprovação, Q-007); Whisper.cpp sem commit nem modelo adotado; dimensionamento em aberto (Q-006) |
| Pelo menos dois modelos de aparelho | TAP [P107](../fontes/tap-aferi-v1.0.md#p107) | **Não atendida** | Só um aparelho Android foi usado em cada frente |

### O que existe, e por que não equivale à comparação exigida

| Observação | Natureza | Por que não é a comparação do TAP |
|---|---|---|
| Cartão A (fonte comum) × cartão B (sete segmentos), **mesmo motor** (ML Kit), uma tentativa de cada | Contraste de estímulos, não de abordagens | Um motor só, n = 1 por estímulo, cartões sintéticos; não há taxa de acerto |
| Original × processado (ROI591) nos cartões A e B, ML Kit | Avaliação de uma variante de pré-processamento, com protocolo congelado | Compara configurações do mesmo motor, não abordagens alternativas; um par por cartão |
| Tesseract.js no Chromium 154 com cartão sintético em fonte comum (120/80/72) | Execução isolada de outro motor | Ambiente, estímulo e plataforma diferentes dos do ML Kit; sem sete segmentos |
| V1 de voz no Samsung × V1 de voz no Chrome | Duas plataformas da **mesma** escolha (STT local do sistema e do navegador) | Comparação **qualitativa** declarada como tal; tentativas não tabuladas; sistemas e microfones diferentes ([task-13 §resultado](../task-13-voz-web.md#resultado-da-v1-no-chrome)) |
| Worker × thread principal no PDF | Comparação de engenharia, medida | Válida para a decisão D-008, mas não é comparação de reconhecimento |

**Conclusão desta seção:** o ciclo **não produziu** a comparação entre abordagens sobre casos rotulados exigida em P024, para nenhuma das duas modalidades. O que existe é uma análise documentada dos **limites** de uma abordagem (ML Kit no cartão de sete segmentos, nas condições observadas). A premissa [P106](../fontes/tap-aferi-v1.0.md#p106) admite reposicionar a entrega como "análise comparativa dos limites das abordagens investigadas", mas isso **não foi autorizado** e P117 continua valendo. A carta da etapa 6 pedindo definição à orientadora foi preparada, **sem registro de envio ou resposta** (Q-001). [PENDENTE: resposta da orientadora sobre a comparação mínima aceitável (Q-006) e o estado da fotografia (Q-001, Q-002).]

## 6.4 Rastreabilidade

Cada decisão tem localizador: spec e seção, commit ou ID no [registro](decisoes-e-evidencias.md). Cada requisito do TAP está ligado a specs, critérios e tarefas na matriz R01–R15 da [revisão das specs](../revisao-specs.md). As alternativas descartadas e seus motivos estão nas próprias specs (fotografia §6.1, voz §7.1, PDF §7.1). As fontes públicas consultadas para a decisão, com data, estão na revisão §3.
