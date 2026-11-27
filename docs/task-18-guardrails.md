# TASK-18 — verificação local dos guardrails

27/10/2026, branch `feature/task-18-guardrails`, HEAD baseado em staging `7d72cb3`,
preservando as alterações locais das tarefas anteriores e a TASK-13 parcial.
**Execução local concluída no alcance disponível; tarefa permanece aberta para
emulador, integração clínica e aparelhos reais.** Não é homologação para produção.

## Alcance e separação das evidências

Foram avaliados parser/revisão de foto e voz, clientes isolados de avaliação,
coordenadores/adaptadores existentes e porta preparada de confirmação. As telas
do produto não montam o writer assistido. Correção/confirmar nas demonstrações
continuam apenas em memória. Não foram adicionadas dependências ou habilitações
clínicas, nem antecipadas funcionalidades ainda ausentes.

Todos os casos usam valores, contas, textos, buffers e cartões **sintéticos**.
Portas simuladas verificam comportamento, não reconhecimento, câmera ou privacidade
interna de SDK/SO. Abaixo, “executado” identifica exatamente qual camada foi rodada.

## Defeitos encontrados e correções

| Achado | Correção e evidência |
|---|---|
| Perfil de A concluído depois de logout/B podia restaurar A no SessionProvider | Geração por evento de auth, invalidação na desmontagem e retirada da identidade anterior enquanto aguarda perfil. Testes com promessas controladas reproduziram a falha antes da correção |
| Histórico de A permanecia durante consulta de B; callback/erro antigo podia sobrescrever B | Estado vinculado à identidade da sessão, lista vazia já no primeiro render de outra identidade e listener invalidado antes de unsubscribe. Abrange consumidores de histórico/última leitura/tendência sem alterar queries |
| Exceção bruta de parsing/snapshot/exclusão podia chegar ao logger | Erros de leitura, exportação de documento inválido e exclusão agora enviam códigos fixos, preservando mensagens funcionais de permissão/rede e o descarte de registros inválidos. Sem alterar o logger global/coletores |
| Campos/data ainda pareciam editáveis durante confirmação, embora o controller ignorasse mudanças | Campos somente leitura, data desabilitada e seletor fechado enquanto confirma; cancelamento ainda invalida a revisão e ACK tardio não restaura sucesso |
| Callback antigo do seletor de data podia editar outra tentativa | Handlers de edição da revisão agora levam o ID esperado; callback antigo não altera data/campos da tentativa nova |
| Revisão herdava autocomplete ligado do React Native Web | Revisão assistida e texto sintético solicitam autocomplete off; observação/texto também desativam autocorreção/spellcheck. É redução de exposição, não prova de que navegador/extensões nunca retenham dados. Padrões do formulário manual legado preservados |

Os sete testes novos de sessão/histórico/logs falharam antes das correções; os dois
primeiros testes de controles da revisão também falharam antes do ajuste. A
regressão do seletor e os casos adicionais de exportação/exclusão completam
**12 testes novos**. As falhas reproduzidas só envolveram dados sintéticos.

## Testes efetivamente executados

| Camada | Resultado | O que comprova / limite |
|---|---|---|
| Jest, antes das correções | 679 testes / 61 suítes aprovados | Baseline do workspace, incluindo o fragmento da TASK-13 recuperado após a queda do ambiente; ainda não cobria os defeitos novos |
| Jest, depois das correções | **691 testes / 64 suítes aprovados** | Revisão/correção/validação, confirmação explícita, cancelamento, duplicidade, resultados tardios, contexto de conta/epoch/consentimento, background e erros seguros, em testes isolados |
| Regressão do legado | Suítes existentes aprovadas na mesma execução | Formulários manual/edição, leituras/sessões, classificação, histórico/tendência, CSV, auth/regras de perfil, lembretes e tema. Não equivale a login Google, push real ou CRUD conectado executados |
| Qualidade | Lint, TypeScript raiz e cinco clientes, diff check aprovados | Revisão, captura Web, voz Web, captura Android e voz Android. Sem relaxar strict ou trocar dependências |
| Exports Web | Revisão, fotografia e voz Web aprovados | Artefatos locais, não deploy, teste de hardware ou prova de privacidade |
| Java FrameBytes | **8 checks com buffers sintéticos aprovados** | Cópia YUV/NV21; não executa CameraX, ML Kit, Kotlin ou câmera |
| Autolinking Android | Inspecionado por CLI nesta execução | Produto principal sem os dois módulos locais; cliente foto só AferiPhotoModule, cliente voz só AferiVoiceModule; sem Firebase/Google Sign-In nos clientes de avaliação |
| Firestore Rules | **Não executadas nem compiladas pelo emulador** | Projeto explícito demo-aferi-task11, somente Firestore/127.0.0.1; download do JAR 1.21.0 falhou. Nenhum teste de regras chegou a rodar |

A porta `createAssistedConfirmation` foi exercitada somente com writers isolados:
zero chamadas antes de confirmar, snapshot dos campos corrigidos, uma chamada por
ticket, bloqueio de conta/epoch/consentimento alterado durante carga e supressão de
ACK antigo. Isso não comprova integração autenticada real, regras ou fila offline
do SDK. Cancelar depois do envio autorizado não desfaz uma escrita já enviada;
testes não prometem cancelamento retroativo nem idempotência após reiniciar processo.

## Runtime Web executado

**Chromium 154.0.8037.57, Linux headless**, origens locais isoladas 8096/8098/8100,
sem bootstrap Firebase/coletores do produto e sem conta real. Scripts em
`tests/guardrails/browser-runtime.mjs` e `tests/guardrails/virtual-camera.mjs`.

- Revisão sintética: foto completa/incerta, edição, confirmação repetida em memória,
  cancelar, voz decimal/escala mista/parcial e troca de modalidade. Receber/parser
  não confirma; parcial/incerto não cria valores obrigatórios válidos.
- **Tesseract real/WASM** sobre cartão sintético: 120/80 e pulso 72, revisão e
  confirmação em memória, cancelamento durante nova inicialização sem restauração
  tardia. `pagehide` disparado pelo script descartou a revisão; evento **simulado**.
  Esse acerto não mede acurácia do OCR em display/sete segmentos.
- **Voz Web indisponível de verdade neste perfil**: constructor, available e
  processLocally existem, mas o gate retornou **model-missing**. Houve **zero
  chamadas de start**, nenhum candidato de voz e manual acessível. Não houve
  instalação, fallback remoto, injeção de transcript ou simulação para esconder
  ausência de modelo. STT Web positivo continua não comprovado.
- Manual isolado: entrada sintética, validação e confirmação somente em memória,
  inclusive ativação por **Enter**. Não é salvamento clínico nem substitui o ensaio
  autenticado do produto.
- Acessibilidade básica: nomes/papéis na árvore acessível, alerta de indisponibilidade,
  foco por Tab, ativação por Enter; viewport móvel 390×844 sem overflow horizontal,
  alvos observados com altura mínima **48 px** e largura mínima superior a 48 px.
  Não é auditoria AA completa, TalkBack/VoiceOver ou teste de fonte ampliada real.
- Nos três percursos/origens, ao final: **zero** bancos IndexedDB, entradas Cache
  API, service workers, chaves local/sessionStorage e entradas OPFS. Observação
  restrita às APIs do navegador e perfis do teste; não inspeciona todo disco/SO.
- Página e workers instrumentados: **zero** requisições externas/escritas HTTP,
  exceções de runtime ou ocorrência da sentinela no console. Um worker cancelado
  terminou antes de sair do debugger; essa corrida é contabilizada, sem ocultar
  falha de instrumentação de worker em execução.

Rodada separada com **câmera virtual do Chromium**: API real getUserMedia, sem áudio,
quadro → worker → revisão, tracks encerradas e `srcObject` nulo. Três workers
criados/encerrados, dois buffers transferidos/destacados, canvas limpo. Novo preview
cancelado por pagehide simulado; cinco mecanismos de storage inspecionados vazios
(essa rodada não mediu OPFS). Nenhum envio externo/escrita HTTP/exceção observado.
**Dispositivo virtual não comprova câmera física, background real ou SDK Android.**

## Inspeção por código — separada de runtime

- Android foto: CameraX ImageAnalysis, cópia NV21 em RAM, ImageProxy fechado,
  ML Kit embarcado, buffer conservado somente enquanto motor lê; cancelamento e
  fechamento independente. Nenhuma API de foto em arquivo/URI/MediaStore no código
  próprio. SDK/SO interno e compilação Kotlin seguem não verificados.
- Android voz: factory exclusivamente on-device, pt-BR instalado verificável em
  API 33+, sem factory genérica/PREFER_OFFLINE ou gravador. API 31/32 indisponível
  por idioma não comprovável. Ignora áudio/parciais; final limitado e limpeza/foco
  por tentativa. Serviço do fabricante ainda exige comprovação própria.
- Web foto: canvas/PNG/buffer em RAM, transferência ao worker, cacheMethod none,
  assets locais sob demanda, cleanup de streams/worker e barreira de permissão
  tardia. Arquivos de programa/modelo são estáticos, distintos de mídia de uso.
- Web voz parcial: verifica propriedade processLocally/readback e available com
  pt-BR/local; somente available habilita start. Resultado final aguarda onend;
  abort sem ACK bloqueia reutilização. Não usa getUserMedia paralelo, gravador ou
  instalação de modelo. Testes de API simulada não provam localidade do fornecedor.
- Revisão/porta/repositório: candidatos não contêm função de escrita; whitelist
  clínica revalidada e sem mídia/texto/confiança. Fixtures e preview não montam
  writer; modo fixado na montagem. Origem manual/photo/voice e sessionReadings
  preservados; edição omite source e rules definem origem imutável.
- Rules: ownership por request.auth.uid, whitelist, provider e origens revisados
  por leitura e testes preparados. **Inspeção não é compilação/execução de rules.**
- Logs: adaptadores não chamam logger; bootstrap OCR suprime console/erros brutos;
  repositório/leitura corrigidos não encaminham exceção clínica. Logger genérico
  ainda não sanitiza mensagens arbitrárias de outras features; não se declara
  auditoria integral dos coletores/SDKs do produto por este teste isolado.
- Acessibilidade por código: componentes existentes, corpo 16 px, alvos mínimos,
  fonte escalável e incerteza/erro textual. Contraste usa tokens existentes; não
  houve avaliação integral de todos os estados/temas por tecnologia assistiva.

## Reproduzir e demonstrar

Dependências pelo lock da raiz, Node 24/Chromium no PATH; Java 21 para emulador.
Nenhum comando de deploy. Os scripts de navegador executam apenas clientes
isolados, iniciam servidores locais e encerram seus processos ao final.

```bash
npm test -- --runInBand
npm run lint
npm run typecheck

# Em cada pasta demos/photo-review, demos/web-capture e demos/web-voice:
EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 ../../node_modules/.bin/expo export --platform web

# De volta à raiz:
node tests/guardrails/browser-runtime.mjs
node tests/guardrails/virtual-camera.mjs
```

A fotografia requer assets estáticos já preparados, conforme a [TASK-08](task-08-captura-web.md).
Scripts usam portas 8096/8098/8100 e CDP 9234/9235 (AFERI_T18_CDP_PORT troca a porta
do primeiro script). Perfis descartáveis em /tmp. O flag no-sandbox foi necessário
para o Chromium do container; a automação acima foi verificada nesse ambiente Linux.
Não gera screenshots, mídia gravada, HAR, PCAP ou dumps com valores de uso.

Para tentar rules em ambiente com JAR/rede disponíveis, execute `npm run test:rules`
na raiz: projeto fictício demo-aferi-task11 e testes fixados em 127.0.0.1:8080.
Na execução desta tarefa o download do emulador falhou; não omitir esse bloqueio.

## Lista objetiva restante para verificação manual

Somente dados sintéticos e clientes isolados. Para Android, use os builds locais
dos roteiros [TASK-07](task-07-captura-android.md) e [TASK-12](task-12-voz-android.md),
com pacotes distintos do produto. Compilação Kotlin/APK ainda precisa ser validada;
envie erro sanitizado para correção pelo Codex, sem editar integrações por tentativa.

| ID | O que verificar | Condição de aprovação |
|---|---|---|
| M1 — capacidade | Câmera física e ML Kit; voz API 33+/pt-BR instalado; Chrome/Edge/Firefox e Safari/iOS escolhidos | Abrir só por ação; indisponibilidade acessível nos demais casos, manual operável e nenhum fallback remoto/simulação oculta |
| M2 — lifecycle | Negar/revogar permissão; cancelar em cada fase; conceder tardiamente; Home/aba/tela bloqueada; destruir/recriar Activity; voltar | Tracks/microfone/worker encerram; sem retomada automática, campos antigos ou resultado tardio. Rotação sem recriar não inicia sessão extra. Falha de limpeza mantém aviso/bloqueio |
| M3 — revisão | Cartão/frases sintéticas completos, parcial, ambiguidade, valor inválido, pulso ausente; corrigir campos/data; recapturar; duplo toque | Só valores identificados; sem troca/escala silenciosa; inválidos não confirmam; edição bloqueada durante envio e callback de data antigo não muda tentativa nova |
| M4 — áudio/interrupção | Terminar fala, silêncio/ruído, ligação, outro áudio, Bluetooth e TalkBack | Microfone libera efetivamente; não recomeça; fala/TTS da própria interface não produz medição aceita. Alucinação do motor é falha/limitação, não acerto do parser |
| M5 — privacidade | Inspecionar armazenamento/rede/logs em sucesso/falha/cancelamento/background, incluindo serviço de voz do SO | Sem mídia/transcrição/valores clínicos retidos/enviados/logados. Verificar caches internos/SO e fornecedor; modo avião, indicador apagado e inspeção só do UID do app não bastam |
| M6 — acessibilidade | TalkBack/VoiceOver/leitor Web, Tab/Shift+Tab/Enter/Espaço/Escape, foco do seletor, zoom/fonte 200%, claro/escuro | Controles e avisos compreensíveis, sem foco preso/cortes; erro não depende de cor; alvos e contraste permanecem adequados |

**Pendências de ambiente/integração, antes do ensaio clínico:** disponibilizar o
emulador e executar rules; integrar auth/consentimento/epoch e writer somente em
homologação segura. Depois, com contas sintéticas A/B, testar troca/logout durante
captura, revisão, carga do writer e ACK; zero dado de A em B e nenhuma escrita antes
do gesto. Exercitar fila offline e confirmar uma vez; cancelar depois do envio não
é rollback. Sem esse ambiente, manter demonstrações sem persistência, sem ensaio
de escrita contra produção.

Nesse mesmo ambiente isolado, ensaiar legado conectado: login, manual com câmera/
microfone negados, edição/consulta de registros antigos e origens novas, duas
leituras/sessionReadings, CSV, lembretes, tema e permissões. Comparar responsividade
com baseline em condições equivalentes; **não foi medido antes/depois de desempenho**.
Retornar M1–M6 como aprovado/reprovado/não verificado, versões gerais e códigos
fixos; não enviar dados pessoais, mídia de pacientes ou dumps completos.

Sem evidência suficiente de privacidade/localidade, manter modalidade clínica
indisponível. TASK-18 não encerra TASK-04/06/07/08/10/11/12/13/15 ou a comparação.
Próximo passo recomendado: emulador/homologação da TASK-11 e M1–M2 nos dispositivos
disponíveis. Sem commit, push, deploy, publicação de rules, nova dependência ou
serviço/build pago. Despesas/horas reais acumuladas e saldo global R$ 300 não informados.
