# TASK-07 — comunicação da confirmação e reteste TalkBack

Preparado em 19/11/2026 sobre staging `8c869c0`, branch
`fix/task-07-confirmacao-acessivel`, em worktree separado para preservar a frente
documental do [PR #69](https://github.com/RamonMenz/bp-tracker/pull/69).

## Problema observado e correção proposta

Em K1 o autor operou captura/cancelamento, identificou campos/unidades/resultado,
mas não identificou a confirmação indisponível. O erro 70/80 só foi ouvido após
selecioná-lo. K2 com fonte máxima e K3 claro/escuro tiveram resultados positivos
no alcance relatado; não constituem medição de contraste ou homologação completa.
O registro detalhado de K e inventários está no PR #69. Dificuldade com o leitor
não é atribuída exclusivamente à primeira experiência do autor.

O Button já declara estado disabled/busy. Não foi determinada a causa interna
da navegação/fala do TalkBack. A revisão passa a expor, antes do botão, texto
acessível e região viva polite com disponibilidade e motivos da validação:

- Inválido: `Confirmação indisponível. Sistólica: A sistólica deve ser maior que a diastólica.`
- Válido: `Confirmação disponível. Confira os valores antes de confirmar.`
- Durante confirmação: `Confirmação em andamento. Aguarde.`

Os motivos incluem os campos que falharam (sistólica, diastólica, pulso, nota e
data/hora). O botão recebe hint contextual e conserva nome, estado, bloqueio e
callback explícito. Mensagem some ao abandonar/terminar a revisão. Não há API de
anúncio imperativo, log de erros/candidatos, coleta de mídia, escrita nova ou
alteração de schema, parser, câmera, permissões, SDK ou dependências.

A composição é compartilhada com revisão de voz e simulações. Button global e
formulário manual não foram alterados. Status é derivado no render, sem efeito
que confirme valores automaticamente. Fala/navegação reais do TalkBack seguem
pendentes; região viva pede anúncio, mas não comprova como o SO o executará.

## Verificação de software

Dois testes de regressão falharam na implementação anterior por ausência da
explicação acessível. Depois da correção, as três suítes focadas de revisão de
foto/voz/guardrails passaram com 17 testes. Cobrem motivo do bloqueio, hint,
tentativa de pressionar botão inválido, liberação após correção, confirmação
somente em memória, descarte ao cancelar e estado de confirmação em andamento.
Suíte global: 720 testes/66 suítes aprovados. Lint, TypeScript da raiz/demo e
export Android/Hermes aprovados. Nenhum desses checks substitui TalkBack físico.

## Carregar a revisão sem sobrescrever a cópia já testada

Não é necessária troca de APK por esta alteração, que é somente JS/TS. Ainda
assim, é necessário carregar o novo bundle e identificar sua fonte. Encerre o
Metro anterior com Ctrl+C, com a câmera desligada. Em PowerShell:

```powershell
cd C:\dev\aferi-task07-integracao
git status --short
git fetch origin fix/task-07-confirmacao-acessivel
git worktree add --detach C:\dev\aferi-task07-talkback FETCH_HEAD
cd C:\dev\aferi-task07-talkback
git rev-parse HEAD
git status --short
npm ci --ignore-scripts
cd demos\android-capture
$aferiTalkbackNodeOptionsAnteriores = $env:NODE_OPTIONS
$env:NODE_OPTIONS = ($env:NODE_OPTIONS + " --dns-result-order=ipv4first").Trim()
npx --no-install expo start --dev-client --localhost --port 8097
```

Escolher pasta nova se o destino já existir; não apagar conteúdo. A variável
temporária preserva opções anteriores; após encerrar Metro, restaurar com
`$env:NODE_OPTIONS = $aferiTalkbackNodeOptionsAnteriores`. Manter o ADB/USB
funcional e `adb reverse tcp:8097 tcp:8097` no segundo terminal, usando o ADB do
SDK já preparado. Primeiro conferir `http://127.0.0.1:8097/status` no computador
e no telefone; depois pressionar a no Metro para abrir a demo. Sem credenciais
Firebase, Expo Go ou build/deploy de produção.

Conferir Fast Refresh desativado e novo status textual junto à confirmação.
Marcadores captura-5/preview-1 continuam iguais; não identificam essa mudança JS.
Registrar HEAD/status da nova cópia, hash do arquivo do bundle no sandbox e eventual
reinstalação separadamente. Não presumir o hash JS antigo como esperado.

## Reteste curto no Samsung — pendente

1. Preparar forma de desligar TalkBack; habilitar e carregar cartão sintético
   120/80/72 por ação explícita. Conferir anúncio/navegação da confirmação disponível.
2. Editar sistólica para 70 mantendo diastólica 80. Conferir se o novo texto de
   confirmação indisponível e seu motivo podem ser alcançados/compreendidos.
   Registrar se foram anunciados automaticamente ou só após navegação.
3. Conferir que não consegue confirmar o inválido; anotar separadamente se o
   botão é alcançável e se TalkBack anuncia seu estado desabilitado.
4. Corrigir para 130. Conferir status disponível e confirmar explicitamente.
   Esperado: confirmação somente em memória e 130 por 80, pulso 72.
5. Em nova captura, cancelar e conferir que mensagem/motivo da revisão antiga
   não permanece. Conferir texto novo com fonte ampliada, sem cortes.
6. Coletar inventários e hash do bundle antes/depois, guardando alcance por
   cenário. Não enviar áudio, capturas do produto, bancos, identificadores ou logs.

Devolver commit/status, se houve reinstalação, novo hash JS, mensagens ouvidas,
se o bloqueio ficou identificável, necessidade de navegar até erro/status e
qualquer falha. Não repetir todo A–J; não marcar K1, S09 ou TASK-07 concluídos
antes de evidência. Sem merge, deploy ou habilitação clínica automática.
