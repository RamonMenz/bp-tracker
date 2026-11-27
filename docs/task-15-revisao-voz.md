# TASK-15 — revisão de voz e integração local

Atualização posterior: a [TASK-12](task-12-voz-android.md) conecta o adaptador
Android ao contrato final em cliente isolado de avaliação. Há agora modo `preview`
fixo, aceitando proveniência recognition com confirmação somente em memória,
sem porta clínica. As referências abaixo ao STT não conectado descrevem o alcance
original da TASK-15; homologação Android/Web e persistência clínica seguem pendentes.

27/10/2026. Branch `feature/task-15-voice-review`, mantendo a base `staging`
`7d72cb3` e todo o trabalho local não commitado das TASK-14, TASK-10 e TASK-11.
**Entrega parcial: reconhecedores e gravação clínica real não estão habilitados.**

## O que foi implementado

- `decodeFinalTranscript` valida saída desconhecida contra o contrato `FinalTranscript`
  da TASK-03: `kind: transcript`, `final: true`, `locale: pt-BR`, texto de até 2000
  caracteres e instante de início finito, não negativo e representável como data.
  Projeta somente esses campos; não retém objeto do motor, alternativas, áudio
  ou confiança. Resultado parcial ou malformado não entra na revisão/parser.
- `useVoiceReview.receiveFinal(attemptId, result, provenance)` só aceita a tentativa
  atual ainda aguardando resultado. Chama o parser determinístico da TASK-14 e
  entrega `CandidateSet` à revisão. Respostas tardias/repetidas não sobrescrevem
  correções. A data inicial vem de `capturedAtMs`, não do horário de chegada.
- `VoiceReadingReview` apresenta campos editáveis em mmHg/bpm, indicação textual
  de incerteza, pulso opcional, observação digitada e data/hora editáveis. Validações
  reutilizam o schema existente, sem ajustar/trocar valores inválidos silenciosamente.
- `CandidateReadingReview` e `useCandidateReview` concentram o formulário e seu
  ciclo de vida compartilhados com fotografia. Entradas `PhotoReadingReview` e
  `usePhotoReview` foram preservadas como wrappers; não se refatorou o caminho manual.
- Cancelar, falar novamente, background e desmontagem descartam candidatos e
  invalidam operações. Toques repetidos em confirmar são bloqueados antes do primeiro
  await. Mensagens de erro são fixas, sem expor transcrição/exceção bruta.
- O seletor de data/hora fica associado à tentativa; não reabre por estado da
  revisão anterior após nova tentativa. Trocar fotografia/voz desmonta a tela anterior.

Texto do resultado final é transitório durante validação/interpretação, sem estado
React, nota, arquivo, log ou payload clínico. O campo de texto da demonstração contém
apenas entrada sintética, identificada como tal, e é limpo ao interpretar, cancelar,
falar novamente, trocar modalidade ou colocar a demonstração em segundo plano.

## Confirmação e preparação da TASK-11

Há dois modos distintos, fixados na montagem. Para mudar modo/porta, deve-se
desmontar a revisão anterior; trocar props não promove uma simulação a fluxo clínico.

| Modo | Entrada permitida | Resultado da confirmação |
|---|---|---|
| `simulation` (padrão e único montado na demonstração) | Proveniência `synthetic` | Valores revisados apenas em memória; nenhum writer é importado ou chamado |
| `recognition` (preparação local, não montada no app) | Proveniência `recognition`, transcrição final válida | Snapshot dos campos passa por `revise` e `confirmAndSave` da porta TASK-11 **somente no handler explícito**; feedback de sucesso somente após ACK |

O modo `recognition` exige injeção explícita da porta da TASK-11. O hook não abre
microfone, não importa Firebase e não cria uma instância de writer por conta própria.
A porta revalida UID/epoch/consentimento/habilitação e payload, usa `source: voice`
e seleciona somente campos clínicos permitidos. Cancelamento/nova tentativa também
cancelam o ticket correspondente da porta. A tentativa da UI é conferida antes
de preparar o ticket de persistência. As observações e a transcrição não entram nele.

Essa ligação foi exercitada com **contratos e writers isolados nos testes**, usando
textos sintéticos para representar a saída esperada de um adaptador. Não é prova
de reconhecimento real ou de escrita autorizada em Firebase. A proveniência é
um contrato entre features, não atestação criptográfica de áudio ou de gesto.
O futuro adaptador não pode rotular fixtures como reconhecimento real.

Resultado final, texto válido, silêncio, comando “salvar” ou alta confiança não
chamam confirmação. Silêncio/texto não identificável deixam campos vazios; escalas
mistas/autocorreções deixam campos incertos. O usuário pode corrigir manualmente
e então confirmar pelo botão. Resultado parcial não preenche nem confirma.

Não há retry automático. Em falha da confirmação, valores numéricos ficam revisáveis
para nova ação explícita, sem reabrir microfone. Cancelar depois de uma escrita já
enviada não significa rollback; a limitação e a supressão de ACK obsoleto continuam
sendo as da [TASK-11](./task-11-persistencia-local.md).

## Executar e demonstrar sem gravação clínica

Usa a mesma entrada isolada da fotografia, sem nova dependência ou configuração
Firebase. Na raiz, após instalar as dependências pelo lock existente:

```bash
cd demos/photo-review
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 ../../node_modules/.bin/expo export --platform web
node serve.mjs
```

Abra **http://localhost:8096 no mesmo computador** e escolha **“Demonstração de voz”**.
O prefixo de variáveis usa sintaxe Linux/macOS; no PowerShell, defina as variáveis
com `$env:` antes do comando Expo. Não use a raiz autenticada do aplicativo.

1. **“Simular doze por oito”**: campos 120 e 80, pulso vazio. Não aparece confirmação
   final até clicar **“Confirmar simulação”**. Corrija um campo antes para demonstrar
   que o resultado final usa os valores revisados.
2. **“Simular decimais e pulso”**: 135/85, pulso 72. Edite data/hora e observação
   se desejar. O resultado fica apenas em memória.
3. **“Simular escala mista”** e **“Simular correção ambígua”**: campos obrigatórios
   vazios com motivos; botão desabilitado até correção válida.
4. **“Simular silêncio”**: sem candidato. **“Simular resultado parcial”**: recusado
   antes do parser, com mensagem acessível e sem campos preenchidos.
5. Digite `salvar` ou `120 por 80 salvar` em **“Texto sintético para interpretação”**
   e clique **“Interpretar texto sintético”**: não confirma nem grava por comando.
6. **“Falar novamente (simulação)”** e **“Cancelar”** descartam o fluxo. Alternar
   para fotografia e voltar não restaura valores. Atualizar a página descarta tudo.

O servidor local só fornece arquivos estáticos, com cache desativado e CSP
`connect-src 'none'`; não recebe medição nem usa serviços de reconhecimento remoto.
Os cenários e o texto digitado são simulações identificadas, não mocks apresentados
como demonstração de STT.

## Verificações

```bash
npm run lint
npm run typecheck
node node_modules/typescript/bin/tsc --noEmit -p demos/photo-review/tsconfig.json
npm test -- --runInBand
```

- Suíte completa: **531 testes em 53 suítes aprovados**, incluindo 33 novos testes
  de voz. Após os ajustes finais de correlação da tentativa, os 57 testes das
  revisões compartilhadas também passaram. Lint e TypeScript raiz/demo aprovados.
- Casos: final válido, par coloquial/decimal/pulso, ausentes, escala mista e correção,
  silêncio/comandos, parcial/malformado/idioma/data inválidos, limites de texto,
  validação de faixa, edição, confirmação duplicada, nova tentativa/cancelamento,
  respostas antigas/repetidas, background/desmontagem e troca de modalidade.
- Integração local TASK-11: writer não carregado ao receber transcrição; clique
  explícito envia só snapshot revisado com `source: voice`; fixtures são recusadas
  no modo clínico; mudança de epoch e cancelamento durante carga impedem escrita.
- Testes de demonstração falham caso auth, repositório ou writer assistido sejam
  importados; não simulam um salvamento no Firestore. Export Web offline aprovado.
- Chromium 154 headless: cenários completo, decimal/pulso, misto, correção, silêncio
  e parcial; edição, confirmação em memória, nova tentativa, cancelar e retorno à
  fotografia exercitados. Inspeção visual em 1280×1000 e viewport 390×844, sem
  overflow horizontal. No percurso observado: quatro requisições locais, zero
  externas e zero exceções JavaScript. Isso não é teste de microfone/dispositivo.

## Dependências pendentes — TASK-15 permanece aberta

| Dependência | O que falta comprovar/integrar |
|---|---|
| **TASK-12 / Android** | Adaptador STT explicitamente local, disponibilidade e pt-BR, captura sem arquivo, resultado final, terminar/cancelar/background e liberação em dispositivo real |
| **TASK-13 / Web** | Modo local comprovado com `processLocally`, pacote pt-BR disponível, permissões e ciclo de microfone; indisponibilidade acessível nos demais navegadores, sem fallback remoto |
| TASK-05/06 | Cobertura/viabilidade comprovada, limites de duração/timeout e condições de habilitação |
| TASK-11 | Emulador de rules ainda bloqueado pelo download do JAR, contexto autenticado/epoch/consentimento reais e homologação segura antes de habilitar persistência |
| Dispositivos/acessibilidade | TalkBack, teclado/leitor de tela e fonte ampliada nas plataformas declaradas; não presumir esses aceites por testes de composição |

Nenhuma permissão de microfone é solicitada aqui. SDK de reconhecimento não é
inicializado. Não houve operação contra Firebase de produção, publicação de rules,
nova dependência, serviço/build pago, commit, push ou deploy. Saldo real de horas
e despesas do teto global de R$300 continua não informado.

Próxima tarefa recomendada: concluir as verificações das TASK-05/06/12/13 em ambiente
elegível antes de conectar STT real; para apresentação, usar o roteiro sintético
acima e declarar a cobertura ainda não comprovada.
