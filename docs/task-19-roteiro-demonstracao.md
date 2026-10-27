# Roteiro curto — Aferi

Preparado em **27/10/2026** para a demonstração prevista em **28/10/2026**.
Duração sugerida: **5–7 minutos**, não tempo medido. Estado e versões no
[acompanhamento](task-19-acompanhamento.md). Só dados sintéticos; todos os botões
de confirmação usados abaixo terminam em memória, sem Firestore.

## Preparar antes de sair

No computador da apresentação, deixe Node/dependências e exports preparados.
Não dependa de `npm install`, EAS, login Google ou download de modelos no local.
Com dependências já presentes, na raiz do repositório:

```bash
# Apenas programa/modelo estáticos; nenhum arquivo de mídia de uso.
node demos/web-capture/scripts/prepare-ocr.mjs

cd demos/photo-review
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web
cd ../web-capture
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web
cd ../web-voice
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web
```

Se faltarem assets OCR, a preparação inicial é descrita na [TASK-08](task-08-captura-web.md).
Faça-a antes, em rede permitida; o restante da demo não precisa de internet.
Abra três terminais **na raiz**, mantendo cada servidor aberto:

```bash
node demos/photo-review/serve.mjs
```

```bash
node demos/web-capture/serve.mjs
```

```bash
node demos/web-voice/serve.mjs
```

Abra `http://localhost:8096`, `http://localhost:8098`, `http://localhost:8100` no
mesmo computador. São clientes isolados; não abra a rota autenticada do produto
para salvar fixtures. Os servidores aceitam GET/HEAD, usam no-store e não recebem
gravações. Encerrar/recarregar perde os valores. `file://` não substitui o servidor
para os bundles/worker. Para demo em telefone, localhost é o próprio telefone;
HTTPS/rede e dispositivo precisam de preparação específica, ainda não homologada.

## Apresentar

| Tempo sugerido | Ação | O que dizer / resultado esperado |
|---|---|---|
| 0:00–1:00 | Em 8100, **Ir para registro manual**, sem iniciar voz. Digitar 120/80, pulso 72; confirmar manual em memória | “Este formulário é reutilizado do legado. Login, histórico, sessões, gráfico, CSV e lembretes já existiam. Aqui a confirmação é uma simulação isolada; não é CRUD clínico.” Mostrar a mensagem de confirmação. Regressão automatizada cobre o legado, operação conectada ainda pendente |
| 1:00–2:00 | Em 8096, **Demonstração de voz** → **Simular decimais e pulso** | “O texto é sintético, não veio de microfone. O parser determinístico converte 13,5 por 8,5 em 135/85 mmHg e associa pulso 72 pelo rótulo.” Mostrar unidades e campos |
| 2:00–3:00 | **Simular escala mista**; depois **Simular correção ambígua**; cancelar | “Escala mista ou duas medições não são resolvidas silenciosamente.” Campos incertos vazios e motivo textual; cancelar retira revisão. Não completa pelo histórico |
| 3:00–4:00 | **Demonstração de fotografia** → **Simular candidatos completos**. Corrigir sistólica para 125, data/hora se desejado; **Confirmar simulação**. Depois novo cenário e **Cancelar** | “Texto/posições e candidatos deste cenário são sintéticos. Corrigir muda o resultado revisado; só o gesto explícito confirma, em memória. Não houve OCR neste trecho.” Mostrar resultado corrigido e cancelamento |
| 4:00–5:30 | Em 8098, **Testar OCR real com cartão sintético (sem câmera)**. Conferir 120/80/72; **Confirmar revisão em memória** | “Agora o Tesseract/LSTM real lê pixels gerados de um cartão sintético, em worker local. Não é foto de aparelho nem medida de acurácia em sete segmentos.” Mostrar estados de processamento/revisão e confirmação |
| 5:30–6:30 | Opcional em 8100: voltar à voz, **Verificar e começar fala local** | No perfil ensaiado: aviso de pacote pt-BR ausente e manual disponível; nenhuma sessão iniciada. “Voz local ainda não foi comprovada. Não há fallback remoto.” Se o ambiente diferir, não substituir por texto sintético sob o nome de reconhecimento |
| 6:30–7:00 | Mostrar a matriz do acompanhamento e próximos testes | “Integração parcial em clientes de avaliação. Faltam Android/aparelhos, STT real, rules/homologação, corpus e comparação. PDF ainda é especificação.” |

Não é necessário tentar câmera física ou microfone no palco. Só acrescentar um
reconhecimento por aparelho se ele tiver sido previamente verificado e registrado
com versão, suporte local e inspeções pertinentes. Atualmente **não existe essa
evidência** nos materiais disponíveis. Se surgir suporte Web no dia, cancelar e
voltar ao manual até concluir a verificação; não improvisar uma homologação.

## Alternativa segura diante de falhas

- **Câmera negada/ausente:** usar o botão de OCR real com cartão sintético; não
  depende de câmera. Se o worker/modelo também falhar, passar para 8096 e dizer
  “agora são texto/posições sintéticos; não é reconhecimento”.
- **Microfone ou pacote local ausente:** mostrar indisponibilidade e manual em
  8100. Demonstrar o parser em 8096 como **texto sintético**, sem alegar STT.
- **Internet indisponível:** manter os servidores locais e bundles já preparados.
  8096 e manual 8100 não usam serviços remotos; OCR 8098 carrega assets da própria
  máquina. Desligar Wi-Fi antes para conferir recarga/OCR no computador de destino;
  essa verificação física ainda é do apresentador. Não ligar “Offline” no DevTools,
  que também pode bloquear o servidor local.
- **Máquina/bundle indisponível:** abrir estes Markdown previamente baixados ou
  impressos. Usar a tabela abaixo como **exemplos esperados de testes sintéticos**,
  declarando que não há execução ao vivo. Não há vídeo ou gravação pronta; não
  substituir falha por resultado pré-carregado apresentado como reconhecimento.

| Entrada sintética do parser de voz | Candidatos esperados | Motivo/limite |
|---|---|---|
| doze por oito | 120/80; pulso ausente | Par coloquial inequívoco |
| cento e vinte por oitenta, pulso setenta e dois | 120/80; pulso 72 | Pulso rotulado |
| treze vírgula cinco por oito vírgula cinco | 135/85; pulso ausente | Uma casa decimal, sem arredondar |
| doze por oitenta | SYS/DIA incertas, vazias | mixed-scale |
| doze por oito, não, quatorze por nove | SYS/DIA incertas, vazias | multiple-pairs; não escolher a última |
| pulso setenta e dois | SYS/DIA ausentes; pulso 72 | Não completar par |

## Conferir e registrar

Ensaio automatizado disponível, da raiz, com Node 24 e Chromium no PATH:

```bash
npm test -- --runInBand
node tests/guardrails/browser-runtime.mjs
```

O segundo comando abre/fecha seus próprios servidores nas mesmas três portas;
pare os servidores manuais antes. O script é específico ao ambiente Linux
ensaiado e exige voz indisponível para não improvisar captura de áudio. Se houver
modelo local disponível, ele deve falhar com pedido de teste controlado, sem
comprovar STT. [TASK-18](task-18-guardrails.md) documenta limites e checklist M1–M6.

Antes da apresentação: testar as três páginas localmente, conferir avisos de
simulação, confirmar resultado apenas em memória, recarregar e verificar descarte.
Depois: registrar data real, navegador/SO gerais, quais passos executaram,
falhou/indisponível/não testado e observações do professor. Horas e despesas só
quando informadas; não enviar mídia, transcrições clínicas ou logs completos.
