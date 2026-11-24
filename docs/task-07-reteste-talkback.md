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
que confirme valores automaticamente. O reteste abaixo acrescenta observação
real de navegação, sem anúncio automático percebido. Região viva pede anúncio,
mas não comprova como o SO o executará.

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

## Reteste curto proposto no Samsung

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

## Retorno recebido em 23/11/2026

Fonte: relato do autor, comandos Git e inventário transcritos, sem acesso do
Codex ao Windows/aparelho. Worktree criada com HEAD
`f057283876ea2126b485abd762e2886012b4c7ca`; git status sem saída. Não há informação
de reinstalação nessa mensagem; não se presume nova verificação do APK base.

| Verificação | Resultado relatado |
|---|---|
| Confirmação indisponível identificável | Sim, após selecionar o botão indisponível |
| Motivo compreensível | Sim: Confirmação indisponível. Sistólica: A sistólica deve ser maior que a diastólica. |
| Anúncio | Após navegação; anúncio automático não observado/aprovado |
| Botão alcançável / estado desabilitado | Sim ao rolar a tela / sim ao selecionar o botão |
| Inválido permaneceu bloqueado | Sim |
| Correção e confirmação em memória | Funcionaram, sem nova transcrição de números/mensagem final |
| Texto novo com fonte ampliada | Legível |

**A dificuldade de identificar bloqueio/motivo melhorou no percurso relatado.**
Não descrever como anúncio automático corrigido nem acessibilidade integral
homologada. O retorno não detalha separadamente descarte do texto após cancelar.
Anúncio por navegação não autoriza enfraquecer o bloqueio ou forçar anúncios de
dados; nenhuma alteração adicional de código é feita a partir deste retorno.

Inventário: autor declara textos antes/depois idênticos, mas fornece uma única
transcrição de find/ls/hash. Comparação antes/depois é relatada, não recalculada
de dois snapshots independentes. Há os mesmos 16 nomes previamente registrados,
incluindo DataTransport, preferências e cookies. Metadados selecionados, sem
prompt pessoal, UID/GID ou identificadores internos:

| Entrada | Bytes exibidos | Modificação exibida |
|---|---:|---|
| files/. | 3452 | 2026-11-23 17:35 |
| files/DevLauncherApp-BridgelessReactNativeDevBundle.js | 7339688 | 2026-11-23 17:35 |
| files/profileInstalled | 24 | 2026-11-20 14:49 |
| no_backup/expo-dev-launcher-installation-id.txt | 36 | 2026-11-10 21:08 |

`cache/.expo-dev-launcher` e `cache/WebView` mantêm os metadados anteriormente
relatados. Horários sem fuso informado: não convertidos em hora ou duração do
teste. SHA-256 recebido do arquivo JS no sandbox:

```text
860174567097a3b5501ecf158c8aef2a32edeb44b112ac2b3f94e68e0ca81388
```

É diferente do hash antigo a7b2efd2… recebido em G/H/I/J/K antes da mudança JS; não é comparado como se ambos representassem a mesma versão. O novo
hash e 7339688 bytes não comprovam sozinhos qual código foi executado, igualdade
de conteúdos internos, ausência de temporários ou de tráfego. Não foi fornecido
um par separado de hashes dessa rodada para comparação independente.

K1 tem evidência positiva de identificação por navegação e preservação da trava;
anúncio automático, demais limites de S09 e auditoria de privacidade permanecem
explicitados. TASK-07 não é marcada concluída. Próxima coleta: dependências
Gradle resolvidas no projeto que gerou o APK, sem mídia, bancos ou credenciais,
conforme [protocolo técnico](task-07-auditoria-dependencias.md).
