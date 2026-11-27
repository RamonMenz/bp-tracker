# TASK-08 — captura e OCR Web em avaliação

Atualização posterior: a [TASK-09](task-09-interpretacao-fotografia.md) ampliou a
interpretação compartilhada por rótulos/layout. As referências à interpretação
mínima abaixo descrevem o alcance original da TASK-08; suas pendências de
navegadores/câmera física permanecem válidas.

27/10/2026. Branch `feature/task-08-web-photo-capture`, base staging `7d72cb3`,
preservando as alterações locais anteriores. **TASK-08 permanece aberta:** houve
execução real do Tesseract no Chromium, mas nenhuma câmera física foi validada.

## Implementação

Reaproveitamento da PoC TASK-04, branch `feature/pocs-fotografia-voz`, commit
`7fbe137`: protocolo do worker, preparação dos assets e contratos. A PoC original
não foi alterada. A integração está em:

- `src/services/recognition/web-photo-session.web.ts`: sessão por tentativa,
  `getUserMedia` somente por botão, vídeo sem áudio, câmera traseira preferida,
  captura explícita para canvas limitado a 1.920.000 pixels/1600 no maior lado.
- `web-photo-resources.ts`: descarte de recursos e exclusão global entre sessões.
  Cancela resultados antigos e fecha também streams concedidos depois de cancelar.
  Como a API não permite abortar o diálogo de permissão, o lease permanece ocupado
  até sua resolução; timeout de fechamento bloqueia novas tentativas nessa sessão.
- `tesseract-worker.web.ts`: PNG codificado apenas em RAM, canvas zerado, buffer
  transferido ao worker. Tesseract.js **7.0.0**, core **7.0.0**, OEM **1/LSTM**, PSM
  **6**, modelo `eng` **1.0.0 / 4.0.0_best_int**, `cacheMethod: 'none'`. Worker só é
  criado depois do quadro; core/modelo são carregados sob demanda da mesma origem.
  Handle registrado antes da inicialização permite encerrá-lo inclusive nessa fase.
- `useWebPhotoReview.web.ts` e `WebPhotoCaptureScreen.web.tsx`: ciclo de vida,
  permissão, captura, cancelar, recapturar, falhas e revisão compartilhada. Ocultar
  página, `pagehide` e desmontar invalidam tentativa/revisão, sem retomada automática.
- `demos/web-capture`: cliente Web isolado de avaliação, sem inicializar Firebase,
  autenticação ou writer clínico. Nenhuma rota do aplicativo principal foi habilitada.

Tracks são encerradas e `video.srcObject` limpo logo após obter o quadro, antes
de inicializar OCR. Worker, handlers, canvas e referências da tentativa são
liberados antes de entregar candidatos. Concorrência é limitada a uma tentativa
global; cliques repetidos não abrem outra câmera/worker. Erros exibem códigos e
mensagens fixos, sem texto de exceções ou OCR nos logs. O bootstrap do worker
suprime console de terceiros e traduz falhas não tratadas para código seguro.

Limites experimentais: permissão 30 s, play 10 s, enquadramento 60 s, cada job do
worker 45 s, drenagem da permissão no fechamento 10 s. Não são metas aprovadas da
TASK-06. Falha de limpeza impede liberar o lease; não há botão que force reutilizar
um recurso cujo fechamento falhou. Não se promete sobrescrita física da RAM.

Saída adaptada para `OcrObservation` da TASK-03, com caixas normalizadas no quadro,
depois `CandidateSet`. A interpretação disponível continua a mínima da PoC:
**SYS/DIA/PUL e número na mesma linha**. Ausências/ambiguidades não são preenchidas
por histórico ou faixas. A TASK-09 (posição, displays e sete segmentos) não foi
implementada por antecipação.

A revisão permite correções, data/hora, validação e confirmação explícita. Neste
cliente, **confirmar termina somente em memória**. Captura real em avaliação e
cartão sintético são identificados de forma diferente. O cartão contém SYS 120,
DIA 80 e PUL 72 e passa pelo **Tesseract real**, sem fornecer candidatos prontos.
Ele comprova apenas esse percurso sintético, não leitura de aparelho clínico.

## Armazenamento, rede e dependências

Não há API de foto em arquivo, upload, download de captura, local/sessionStorage,
IndexedDB, Cache API, service worker ou OPFS no fluxo de captura. Imagem e OCR são
transitórios; confirmação não persiste mídia, texto, confiança ou medição clínica.
O filesystem virtual usado pelo Tesseract é memória do worker, encerrado ao final.
Não existe fallback remoto.

Programa/modelo estáticos são diferentes de dados de uso. O script
`demos/web-capture/scripts/prepare-ocr.mjs` copia somente assets instalados, confere
versões e gera manifesto com tamanho/SHA-256. A saída ignorada pelo Git ocupa
aproximadamente **23 MiB** (variantes LSTM normal/SIMD/relaxed SIMD, não todas usadas
por tentativa). Não recebe imagens ou resultados. O servidor local só aceita
GET/HEAD, aplica `Cache-Control: no-store`, CSP de mesma origem, bloqueio de
microfone e não registra requisições. Não foi adicionado cache persistente de modelo.

As dependências estão isoladas em `demos/web-capture/ocr-assets/package-lock.json`
(14 pacotes instalados). Mesmas versões da PoC, justificadas pela execução LSTM
local com worker cancelável e modelo auto-hospedado, sem CDN no runtime. Nenhuma
dependência/lock da raiz mudou nesta tarefa. Licenças do Tesseract/core acompanham
os assets; pacote de dados declara MIT. Nenhum serviço ou build pago contratado.
Horas/despesas reais e saldo acumulado do teto R$ 300 não foram informados.

Inferência local não garante primeira abertura offline: os assets precisam estar
acessíveis na origem local; com `no-store` não se promete reutilização offline.
Caches internos/armazenamento do navegador/SO exigem inspeção real complementar;
as observações abaixo não são prova universal de ausência de persistência.

## Verificações efetivas neste ambiente

- **565 testes, 57 suítes aprovados**, incluindo 12 testes novos da sessão Web:
  permissões, indisponibilidade, carregamento tardio, captura explícita, protocolo
  local/cache desabilitado, encerramento, concorrência, cancelamento durante
  inicialização/permissão, permissão tardia, desmontagem, timeouts e erros seguros.
  Esses testes usam portas simuladas para comportamento; não comprovam OCR.
- Lint, TypeScript raiz/demo e `git diff --check` aprovados. Assets preparados e
  export Web offline aprovado: CSS 12 KB, bundle JS aproximadamente 1 MB. Tamanho
  não é benchmark de latência/memória nem confirmação de viabilidade da TASK-06.
- **Chromium 154 headless, engine WASM real**: cartão sintético reconhecido como
  120/80 e pulso 72; revisão e confirmação em memória, cancelamento durante
  inicialização sem resultado tardio. Duas criações/dois encerramentos de worker,
  um buffer transferido/destacado, canvas zerado antes de apresentar candidatos.
  Sem câmera física: retorno seguro `device-unavailable`.
- **Chromium com câmera virtual**: `getUserMedia` real com dispositivo emulado,
  sem faixa de áudio; preview → quadro → worker → revisão. Tracks encerradas e
  `srcObject` nulo. Nova abertura encerrada ao disparar evento `pagehide` simulado.
  Três workers criados/encerrados, dois buffers destacados. Não houve validação
  de hardware, permissão de dispositivo real ou background real do navegador.
- Nos dois percursos instrumentados, página **e workers**: zero requisições
  externas, zero métodos de escrita HTTP e zero exceções de runtime. Ao final,
  zero bancos IndexedDB, entradas Cache API, service workers e chaves de
  localStorage/sessionStorage na origem limpa. Não foi medida OPFS nem armazenamento
  interno do navegador/SO. Somente dados sintéticos usados; nenhuma mídia de uso
  salva em arquivo, screenshot ou log.

O verificador reproduzível é `demos/web-capture/checks/browser-runtime.mjs`.
Ele observa metadados de rede/recursos e publica apenas contagens/estados, sem
registrar pixels ou conteúdo bruto. O resultado de câmera virtual é explicitamente
marcado `virtual-device-pipeline-passed-pagehide-event-simulated` e
`physicalCamera: not-tested`.

## Executar e demonstrar

Requer Node 24 e dependências npm disponíveis. A partir da raiz:

```bash
npm ci --ignore-scripts
npm --prefix demos/web-capture/ocr-assets ci --ignore-scripts
cd demos/web-capture
node scripts/prepare-ocr.mjs
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web
node serve.mjs
```

Abra **http://localhost:8098**. O servidor fica em loopback. No PowerShell, defina
`$env:EXPO_OFFLINE='1'` e `$env:EXPO_NO_TELEMETRY='1'` antes de executar o Expo.

1. Clique em **Testar OCR real com cartão sintético (sem câmera)**; confira os rótulos de simulação.
2. Revise 120/80/72, edite campos/data/hora, teste erros de validação e confirme.
   O estado final deve dizer que ficou em memória. Recarregar o descarta.
3. Para câmera, use **Iniciar câmera Web**, permita, enquadre um cartão sintético e
   capture explicitamente. Capture não é salvar; revise/cancele/recapture.
4. Teste cancelamento e indisponibilidade, sem inserir dados de paciente.

Em Android físico com ADB, `adb reverse tcp:8098 tcp:8098` permite abrir o localhost
do servidor no telefone conectado. Não foi executado aqui. Em outros aparelhos,
prepare HTTPS confiável de forma local; IP da LAN em HTTP normalmente não oferece
contexto seguro. Não publique esta demonstração em origem clínica compartilhada.

Checks locais, na raiz:

```bash
npm test -- --runInBand
npm run lint
npm run typecheck
node node_modules/typescript/bin/tsc --noEmit -p demos/web-capture/tsconfig.json
```

Para repetir a instrumentação, inicie Chromium com perfil descartável, servidor
8098 ativo e CDP local na porta 9224, depois execute o script. Node 24 fornece
WebSocket/fetch. O perfil deve estar limpo e exclusivo desse teste sintético.

```bash
chromium --headless --disable-gpu --no-first-run --remote-debugging-port=9224 --user-data-dir=/tmp/aferi-web-check about:blank
node demos/web-capture/checks/browser-runtime.mjs
```

O container exigiu `--no-sandbox` para executar seu Chromium; não é requisito da
aplicação. Para o percurso emulado, use outra instância, perfil/porta **9225**,
flags `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`, e rode o
script com `--virtual-camera`. Nunca registre esse resultado como câmera física.

## Roteiro restante nos navegadores reais

Registrar navegador/versão, SO e aparelho em Chrome/Edge/Firefox desktop,
Chrome Android e Safari iOS suportados. Usar origem isolada, contexto seguro e
cartões sintéticos; não coletar heap dumps, screenshots ou logs de dados clínicos.

1. Antes do primeiro botão: nenhuma solicitação de câmera, worker ou asset OCR.
   Negar/revogar permissão, ausência de câmera e contexto inseguro devem apresentar
   erro seguro, sem repetição automática nem chamada remota.
2. Abrir câmera, conferir ausência de microfone, preview e enquadramento. Capturar:
   indicador/tracks devem desligar e `srcObject` limpar antes do OCR/revisão.
   Conferir worker encerrado, canvas zerado e buffer destacado ao final.
3. Repetir clique e cancelar durante permissão, play, preview, carga WASM/modelo e
   reconhecimento. Conceder permissão depois de cancelar: tracks encerram, nenhum
   resultado reaparece. Permissão pendente bloqueia concorrência; eventual falha
   de fechamento bloqueia nova tentativa, sem alegar liberação bem-sucedida.
4. Trocar de aba, bloquear tela, colocar navegador em segundo plano, navegar e
   voltar. Verificar eventos reais de visibilidade/pagehide/desmontagem, inclusive
   BFCache, recursos encerrados e nenhuma retomada/resultado antigo automático.
5. Recapturar após revisão: novos campos/instante, sem reaproveitar valores antigos.
   Editar, validar, cancelar e confirmar repetidamente: apenas estado em memória.
   Confirmar OCR/transcrição/comando/espera nunca autoriza gravação clínica.
6. Bloquear assets ou interromper rede: erro seguro sem CDN/fallback. Em perfil
   limpo, inspecionar Network da página **e workers**: apenas GET dos assets locais,
   nenhum envio de imagem/texto. Inspecionar metadados sem exportar conteúdo de uso.
7. Comparar armazenamento antes/depois de sucesso, falha, cancelamento e background:
   IndexedDB, Cache API, service workers, local/sessionStorage e OPFS. Confirmar
   ausência de mídia/resultados persistidos; avaliar limites dos instrumentos e
   caches internos/SO. Origem com service worker prévio invalida este isolamento.
8. Medir carga fria/quente, memória e latência em aparelho de menor capacidade;
   testar teclado, leitor de tela, zoom/fonte e viewport móvel. Não há percentis
   ou aprovação de acessibilidade/performance nesta entrega.
9. Avaliar displays reais separadamente (sete segmentos, reflexos, ângulo,
   orientação, rótulos separados e números acessórios), sem inferir acurácia do
   cartão impresso. Esse trabalho depende das TASK-04/06/09 e do plano TASK-18.

## Pendências e integração remota

Câmera física, navegadores reais, privacidade no dispositivo e aprovação de
viabilidade TASK-04/06 pendentes. TASK-09 continua pendente; revisão completa e
persistência clínica dependem também de TASK-10/11 e da validação de sessão,
isolamento entre contas e regras/emulador. Nenhuma integração remota foi validada
ou habilitada por esta tarefa. Caminho manual preservado; sem Firebase de produção,
publicação de regras, commit, push ou deploy.

Próxima ação recomendada: executar o roteiro físico com cartão sintético e registrar
evidências por navegador, antes de habilitar o caminho no produto principal.
