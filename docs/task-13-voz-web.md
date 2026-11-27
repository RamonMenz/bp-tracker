# TASK-13 V1 — pacote local pt-BR no Chrome

Na demo `demos/web-voice`, **Verificar e começar fala local** consulta a API
em contexto seguro. Se o estado for `downloadable` e o navegador oferecer
`install()`, a tela disponibiliza **Instalar pacote pt-BR local**. O toque
chama `install({ langs: ['pt-BR'], processLocally: true })`. A instalação
mantém o manual acessível e apresenta mensagens fixas de andamento, sucesso,
falha, timeout ou cancelamento.

A espera é de até 120 s, incluindo a nova consulta de disponibilidade após
`install()` retornar `true`. Só `available` confirma o pacote. O usuário
precisa tocar novamente para falar, e a captura exige nova consulta
`available` e `processLocally=true` confirmado na instância. `downloading`,
`unavailable`, ausência da API e bloqueio por política são limites observáveis.

**Cancelar instalação**, sair para o manual e sair da página descartam a
espera e o resultado tardio. A API não oferece cancelamento do download ao
cliente. O Chrome pode continuar o download do modelo estático. Toques
repetidos não duplicam a solicitação pendente. O fluxo usa o [contrato Web Speech](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-install).

## Teste no Chrome do autor

Na raiz com dependências do lock já instaladas:

```powershell
Push-Location .\demos\web-voice
$env:EXPO_NO_TELEMETRY = '1'
node ..\..\node_modules\expo\bin\cli export --platform web
Pop-Location
```

```powershell
node .\demos\web-voice\serve.mjs
```

Abra [localhost:8100](http://localhost:8100) no Chrome. Verifique manual e
capacidade de voz antes de conceder microfone. Se **Instalar pacote pt-BR
local** aparecer, toque uma vez e registre o código/mensagem fixa. Exercite
cancelamento e tentativa repetida se houver uma instalação pendente. Se o
pacote ficar disponível, inicie uma nova tentativa explícita. Use apenas
frases sintéticas do próprio autor, confira os candidatos e repita sem acesso
externo mantendo o servidor local. Registre a liberação observável do
microfone ao terminar e cancelar.

```text
Commit=<hash> | SO=<versão> | Chrome=<versão> | Modelo genérico=<tipo>
Caso=<probe/instalação/cancelamento/fala/silêncio/repetição sem rede/manual> | Estado=<passou/falhou/limite/não verificado> | Disponibilidade=<downloadable/downloading/available/unavailable/não verificada> | Código ou mensagem fixa=<texto/—> | Candidatos=<conferem/divergem/ausentes/não verificado> | Microfone=<liberado/não liberado/não verificado>
```

Compartilhe apenas esse quadro. Áudio, transcrição, dados clínicos, conta,
caminhos pessoais e logs completos ficam fora do relato.

## Resultado da V1 no Chrome

**Veredito de capacidade.** A demo reconheceu fala em pt-BR no modo local
explícito do Chrome `158.0.8127.89` oficial, 64 bits, no Windows do autor, em
`http://127.0.0.1:8100`. O reconhecimento também funcionou após desconectar
o PC da rede externa, mantendo o servidor da demo no loopback. O indicador
de microfone apagou após a escuta nas duas condições.

| Etapa | Resultado sanitizado |
|---|---|
| Manual | Acessível antes da primeira ação de voz. |
| Disponibilidade | A demo ofereceu **Instalar pacote pt-BR local**, condição do estado `downloadable`. |
| Instalação explícita | Um toque iniciou a instalação. A mensagem “Pacote pt-BR local pronto. Toque para verificar e começar a fala.” confirmou a nova consulta com estado `available`. |
| Fala após a instalação | Uma nova ação explícita produziu os candidatos sintéticos esperados, 120/80 mmHg e pulso 72. O indicador de microfone apagou. |
| Fala offline | Com o modelo já instalado, o PC desconectado da rede externa e a mesma página servida por loopback, a demo entrou em **Ouvindo**, os candidatos conferiram e o indicador apagou. |
| Tentativas adicionais | O autor percebeu mais consistência que no Samsung e relatou candidatos fiéis também para valores sintéticos rejeitados pela validação da medição. O total de tentativas e os resultados por frase não foram tabulados. |
| Ensaios pendentes | Cancelamento no Chrome real e inspeção de rede e retenção pelo navegador. |

A comparação com o [ensaio Android](task-12-voz-android.md#resultado-da-v1-no-samsung)
é qualitativa. Sistemas, microfones e condições variaram. Para comparar taxas
de acerto, seria necessário usar o mesmo conjunto de frases, controlar as
condições e registrar separadamente par correto, pulso correto, ambiguidade
e ausência de candidato. O reconhecimento de candidatos e a validação para
confirmar a revisão são etapas distintas. Por exemplo, um par sintético
40/50 pode aparecer como candidato. O schema exige sistólica mínima de 50
e maior que a diastólica, e a revisão desabilita a confirmação de valores
inválidos. Esse bloqueio foi conferido no código e por testes de validação.

## Registro para o relatório final

- **Fatos e decisões.** O download do modelo depende de ação explícita após
  `downloadable`. A captura só começa com disponibilidade local confirmada.
  A revisão e a confirmação são demonstrações voláteis.
- **Limitações.** O autor observou a instalação e a fala real com e sem rede
  externa. Cancelamento, timeout e resultados tardios têm cobertura por
  construtor falso. A privacidade interna do Chrome e a taxa comparativa de
  acerto permanecem sem verificação. O resultado vale para o ambiente e a
  rodada observados.
- **Reprodução.** Use os comandos de exportação e servidor acima. Para repetir
  as simulações, rode `npm test -- --runInBand src/services/recognition/web-voice.test.ts`.
