# V2 — Registro por voz no produto Web

## Decisões

- `EXPO_PUBLIC_WEB_VOICE_ENABLED` fica desligada por padrão. `app.config.ts` expõe o booleano no manifesto Expo e o Metro resolve a entrada para um componente vazio no build padrão. O formulário manual permanece no início da tela. [Spec de voz, §3–§5](../specs/spec-voz.md)
- A entrada **Registrar por voz** exige sessão autenticada, aceite vigente confirmado pelo servidor e a consulta passiva `SpeechRecognition.available({ langs: ['pt-BR'], processLocally: true })` retornando `available` em contexto seguro com suporte a `processLocally`. A consulta apenas verifica capacidade. A tela de voz é importada ao tocar na entrada. **Começar a falar** inicia nova verificação do pacote e da configuração da instância antes do reconhecimento e da possível solicitação de microfone. [Decisão D-005](relatorio/decisoes-e-evidencias.md#d-005--26112026--pontos-de-entrada-assistidos-atrás-de-flag-e-sob-demanda)
- A V2 do produto exige um pacote pt-BR já disponível. A instalação explícita continua no cliente de avaliação da V1. O fluxo clínico usa o reconhecedor local do navegador e aguarda o encerramento da captura para interpretar o resultado final com o parser existente. [TASK-13 V1](task-13-voz-web.md)
- A revisão edita pressão, pulso, observação e horário, iniciado com o instante da captura. **Confirmar e salvar medição** aciona uma única criação pelo repositório enquanto aguarda o ACK, com `source: 'voice'`. O documento contém somente os campos revisados, o marcador de origem e os campos de controle já previstos. O ACK libera a oferta legada de segunda medição, que pode atualizar o documento se o usuário confirmar uma segunda leitura manual.
- O epoch muda a cada nova identidade de login, inclusive no mesmo UID. A troca invalida a revisão, libera a captura e exige nova leitura, no servidor, do aceite vigente. Cancelar antes da confirmação, navegar para outra tela, ocultar a página e trocar de conta descartam o rascunho e ignoram respostas tardias. Durante o ACK, a confirmação e o cancelamento da revisão ficam indisponíveis. Uma escrita explícita já entregue ao SDK segue a semântica offline do Firestore. A interface descarta seu ACK caso a sessão ou a tela já tenha mudado.

## Testes

Lint e typecheck passaram. A suíte geral passou com 1.021 testes em 86 suítes, incluindo o formulário manual. Os testes de tela fornecem o valor da flag via manifesto simulado.

| Verificação | Evidência |
|---|---|
| Guarda de bundle (VOZ-01) | Export Web de produção com a variável ausente e configuração fictícia. Inspeciona o código e os mapas de origem de todos os chunks do Metro. O formulário manual está presente e os módulos de voz, revisão e escrita assistida estão ausentes. O CI executa a mesma guarda. |
| Tela e hooks | Reconhecedor do navegador **SIMULADO**, com o adaptador, parser, revisão e porta de escrita reais. Cobre flag, capacidade local, carregamento sob demanda, cancelamento na escuta e na revisão, resposta tardia, toques repetidos, silêncio, parcial, falha, comando falado, troca de conta e relogin no mesmo UID. O repositório é simulado nessa suíte. |
| Rules do Firestore | `@firebase/rules-unit-testing`, repositório real e rascunho de reconhecimento **SIMULADO**. Exercita criação única, documento sem metadados de reconhecimento, fila offline vazia antes da confirmação, descarte por epoch e rejeição de cliente anônimo, de outra conta ou de documento com transcrição ou confiança. A execução local parou no download do JAR oficial da versão 1.21.0. O CLI e a consulta ao endpoint alternativo do Cloud Storage receberam HTTP 403. |

Reprodução a partir da raiz, com dependências instaladas. O emulador requer Java 21.

```sh
npm run lint
npm run typecheck
npm test -- --runInBand
node tools/voz-produto/bundle-off.check.cjs
npm run test:rules
```

## Limites

- A evidência de voz real vem da demo V1, no Chrome oficial do autor no Windows, com o pacote local instalado. A V2 ainda aguarda ensaio Web logado, inspeção de retenção e tráfego do navegador (VOZ-13 e VOZ-15) e validação com teclado e leitor de tela. [Resultado V1](task-13-voz-web.md#resultado-da-v1-no-chrome) · [Pendência Q-019](relatorio/decisoes-e-evidencias.md#pendências-abertas-em-27112026)
- A confirmação aguarda o ACK do repositório. Testar o reconhecedor offline é uma verificação distinta da sincronização de uma medição confirmada. A integração foi entregue com a flag desligada em todos os ambientes.

## Registro para o relatório final

- **Decisão.** A V2 acrescenta voz local em pt-BR à tela de registro Web por uma flag de build desligada por padrão. A revisão exige confirmação explícita e persiste `source: 'voice'` pelo repositório existente.
- **Evidências.** A guarda inspeciona o bundle padrão. Testes de tela com reconhecedor **SIMULADO** exercitam o ciclo até a escrita e cobrem descarte por cancelamento, navegação e identidade de login. A suíte de regras foi escrita para o emulador e ficou pendente de execução local por HTTP 403 no download oficial.
- **Validação pendente.** Uma medição confirmada no fluxo real da V2 e evidências sobre privacidade do navegador. Os resultados da demo V1 e as simulações da V2 cobrem etapas diferentes.
