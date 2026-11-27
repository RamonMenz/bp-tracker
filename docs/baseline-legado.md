# Baseline do legado — TASK-01

Levantamento realizado em **26/10/2026**, sobre `7d72cb3347dca04bde9b8a706f523a6da245dea2` (branch remota `staging`, obtida com `git fetch --no-tags origin staging`). A base inicial desta sessão era `3f8220f7c89831f917081f4abd84c9b9cacb6bef`; o avanço direto até `staging` acrescentou somente `constitution.md`, as três specs e `tasks.md`. O código funcional é idêntico entre essas bases. Nenhum commit ou push foi realizado nesta etapa.

## 1. Escopo e qualidade da evidência

O aplicativo ainda se identifica como **BP Tracker** na configuração; **Aferi** é o nome do ciclo descrito no planejamento. Este documento registra funcionalidades preexistentes, sem atribuí-las ao trabalho novo do semestre. Fotografia, voz e PDF são especificações de evolução, não funcionalidades implementadas nesta base: seus motores e adaptadores não constam no app nem em suas dependências.

As indicações abaixo têm significados distintos:

- **Código:** constatado por leitura dos arquivos desta base. Descreve o contrato implementado, sem provar operação em ambiente real.
- **Execução local:** comando efetivamente executado nesta sessão, com resultado na seção 5. Testes com mocks comprovam apenas os cenários simulados.
- **Ambiente/dispositivo:** exige navegador, Android, configuração ou serviço de desenvolvimento isolado; não executado nesta sessão. O roteiro da seção 6 descreve o resultado esperado, não um aceite já obtido.

Não foram efetuados login, consultas, escritas, notificações, exclusões ou deploy contra projetos Firebase reais, EAS, Vercel, Sentry ou Crashlytics. Acesso remoto limitou-se à leitura de `staging`, instalação de pacotes e tentativa de download do emulador. O bundle Web foi compilado offline com valores fictícios, sem abrir o aplicativo. Não houve alteração de código funcional, regras, dependências ou configurações versionadas.

## 2. Arquitetura, versões e serviços — código

### Organização e fluxo

| Camada | Implementação constatada | Referências |
|---|---|---|
| Entrada e navegação | React Native/Expo, entrada `expo-router/entry`; rotas de login, consentimento e onboarding; abas Registrar, Histórico e Ajustes; edição fora dos botões das abas | `package.json`, `app/_layout.tsx`, `app/(app)/_layout.tsx` |
| Funcionalidades | Hooks e repositórios em `src/features`; componentes de domínio em `src/components/bp`; funções puras de classificação e média em `src/domain` | `src/features/`, `src/domain/` |
| Persistência | Cliente usa diretamente Firebase JS SDK e Firestore; não há API de CRUD intermediária. Tipos em `models.ts`, validação Zod e caminhos centralizados | `src/types/models.ts`, `src/features/readings/readings.repo.ts`, `src/lib/firestore-paths.ts` |
| Plataformas | Arquivos `.native.ts`/`.web.ts` para Firebase, login, App Check, push e arquivos; Metro escolhe a plataforma. Typecheck usa `moduleSuffixes: ['.native', '']`; não substitui build Web | `src/services/firebase/`, `tsconfig.json`, `metro.config.js` |
| UI e estado | NativeWind/Tailwind, tokens/cores, Lucide, FlashList, Gifted Charts/SVG; estado por hooks/contexto e preferências em AsyncStorage. Não há dependência Zustand instalada | `tailwind.config.js`, `src/theme/`, `src/features/theme/`, `package.json` |
| Backend | Projeto TypeScript separado em `functions/`; triggers Firestore e scheduler v2, exclusão de usuário Auth v1; região declarada `southamerica-east1` | `functions/src/index.ts`, `functions/src/triggers/`, `functions/src/scheduler/` |
| Segurança | Acesso somente ao próprio UID autenticado via Google; whitelist de campos; `users` não enumerável; `schedules` inacessível pelo cliente; negação padrão | `firestore.rules`, `firestore.indexes.json` |
| Distribuição | Android via Expo Dev Client/EAS; Web SPA Metro em `dist`, hospedagem configurada na Vercel. Não há bloco Firebase Hosting | `app.config.ts`, `eas.json`, `vercel.json`, `firebase.json` |

### Versões declaradas e travadas

Valores resolvidos abaixo foram lidos dos dois `package-lock.json` (formato 3). Não significam serviço publicado nessas versões.

| Componente | Declarado | Resolvido no lock |
|---|---|---|
| App | `1.0.0` | `1.0.0` |
| Expo / Expo Router | `~57.0.8` / `~57.0.8` | `57.0.8` / `57.0.8` |
| React / React DOM / React Native | `19.2.3` / `19.2.3` / `0.86.0` | mesmas versões |
| React Native Web | `~0.21.0` | `0.21.2` |
| Firebase JS / `@firebase/auth` | `^12.16.0` / `^1.13.3` | `12.17.0` / `1.13.4` |
| RNFirebase app / App Check / Crashlytics | `^26.2.0` / `26.2.0` / `^26.2.0` | `26.2.0` nos três |
| Google Sign-In | `^16.1.4` | `16.1.4` |
| NativeWind / FlashList / Gifted Charts | `4.2.6` / `2.3.2` / `1.4.77` | mesmas versões |
| Expo Notifications | `~57.0.7` | `57.0.7` |
| Zod / Luxon / Sentry Browser | `^4.4.3` / `^3.7.2` / `^10.70.0` | `4.4.3` / `3.7.2` / `10.70.0` |
| TypeScript / Jest (app) | `6.0.3` / `29.7.0` | mesmas versões |
| Firebase CLI | `^15.24.0` | `15.24.0` |
| Functions Admin / Functions SDK | `^14.2.0` / `^7.3.2` | `14.2.0` / `7.3.2` |
| Functions TypeScript / Jest | `^6.0.3` / `^29.7.0` | `6.0.3` / `29.7.0` |

**Runtime:** o CI configura Node 20; `functions/package.json` também exige Node `20`. Entretanto, `firebase-admin@14.2.0` exige Node `>=22` no lock. É uma incompatibilidade de requisitos já existente; os resultados locais em Node 24 não validam o runtime Node 20. React Native 0.86.0 declara Node `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25.0.0`. A raiz não fixa versão de Node por `engines` ou `.nvmrc`. Java 21 é usado no CI das regras. Versões de Android SDK, Gradle, minSdk/targetSdk efetivamente geradas: **não informado** nesta base, sem diretório `android/`; confirmar no prebuild/build de desenvolvimento.

### Serviços e limites do que se sabe

- **Firebase Auth:** Google como provedor único. Auth e Firestore usam SDK JS em ambas as plataformas. RNFirebase fornece serviços nativos auxiliares, não o CRUD.
- **Firestore:** `users/{uid}` guarda perfil, fuso IANA, preferências e consentimento; subcoleções `readings` e `devices`; `schedules/{uid}` é índice privado das Functions. Região real do banco, regras/índices publicados, quotas e faturamento não foram consultados. `.firebaserc` tem um alias `staging`; esse nome não prova isolamento de produção.
- **Cache:** Web inicializa IndexedDB com `persistentLocalCache` e gerenciador multiaba. Android usa `getFirestore(app)` do SDK JS, sem persistência em disco explicitamente configurada. Persistência de login via AsyncStorage não equivale a persistência das medições. Não prometer histórico completo offline nem retenção de escritas após encerrar o processo Android.
- **Cloud Functions/Cloud Scheduler/FCM:** cron a cada 15 minutos UTC, consulta no máximo 500 schedules vencidos dentro de duas horas; calcula próximo horário via Luxon no fuso local, confirma reagendamento antes de enviar e remove tokens não registrados do schedule. A lógica busca reduzir duplicações; não é prova de entrega exatamente uma vez em concorrência/falhas. Triggers preservam `nextRunAt` em login sem mudança de horários e em troca de device. Há exclusão recursiva de perfil/subcoleções e schedule após exclusão Auth. Implantação/entrega efetivas não verificadas. Não foi localizada chamada explícita a `initializeApp` do Admin em `functions/src`; conferir bootstrap em execução isolada antes de afirmar funcionamento dos triggers (o build TypeScript não o comprova).
- **App Check:** Web usa reCAPTCHA Enterprise opcional; Android já tem ponte RNFirebase/Play Integrity para `CustomProvider` do SDK JS, com provider de debug em desenvolvimento. Tokens, atestação, configuração dos consoles e enforcement não foram verificados.
- **Observabilidade:** logger restringe chaves de contexto; Crashlytics nativo e Sentry Web são conectados fora de `__DEV__`. DSN ausente torna Sentry inoperante com aviso. A mensagem do erro não é sanitizada pelo logger; conteúdo de exceções futuras de OCR/STT/PDF requer tratamento específico antes do coletor.
- **Web push:** service worker em `public/firebase-messaging-sw.js`, configuração por query string, SDK compat carregado de `gstatic.com` na versão **12.16.0**, diferente do JS **12.17.0** do lock. Disponibilidade dessa CDN e compatibilidade real não verificadas.

Documentos antigos não são prova do estado atual: `CLAUDE.md` ainda lista deploy de Hosting, mas a configuração é Vercel; `RELEASE_CHECKLIST.md` descreve ausência de App Check nativo, mas a ponte já existe no código. Não foram corrigidos nesta tarefa documental.

## 3. Contratos funcionais que devem ser preservados — código

### Autenticação, perfil e entrada

`useSession` mantém um único listener Auth via `SessionProvider`. Web usa popup Google; Android verifica Play Services, obtém ID token pelo Google Sign-In e troca por credencial Firebase. Cancelamento e erro de rede têm mensagens em português. Nativo configura persistência Auth em AsyncStorage; Web usa `getAuth` com persistência padrão do SDK. `signOut` encerra a sessão Firebase.

`ensureUserProfile` atualiza nome/e-mail/foto/fuso; só no primeiro login grava `notificationsEnabled: false`, `reminderTimes: []` e `createdAt`. O merge não deve apagar consentimento nem preferências existentes. Falha de sincronização do perfil não bloqueia login e é tentada novamente em outra transição Auth. Ausência de usuário redireciona ao login, inclusive acesso direto às rotas.

Consentimento da versão vigente, com timestamp do servidor, precede onboarding. O leitor ignora aceite com escrita pendente e ausência de documento apenas em cache; troca de UID não herda consentimento. Isso é um gate de navegação: as rules de medições não exigem esse aceite. Onboarding e aviso inicial são preferências locais; onboarding pode ser reaberto em Ajustes. Preservar a ordem dos gates e o fluxo de notificações sem afirmar proteção de backend que não existe.

Referências: `src/features/auth/`, `src/features/privacy/`, `src/features/onboarding/`, `app/_layout.tsx`, `firestore.rules`.

### Registro manual e classificação

A home é o formulário. Sistólica/diastólica obrigatórias; pulso e observação opcionais; data/hora editáveis, inicialmente agora. Feedback por campo e categoria prévia; salvar inválido fica indisponível na UI, e o schema valida novamente antes do repositório. Escrita usa `source: 'manual'`, `createdAt: serverTimestamp()` e `sessionReadings: null` para leitura única. Sucesso limpa os campos, renova a data e tenta feedback háptico sem tornar sua falha um erro de salvamento. Falha preserva o formulário e apresenta mensagem amigável.

| Validação | Referência implementada |
|---|---|
| Sistólica | inteiro entre 50 e 300 mmHg |
| Diastólica | inteiro entre 30 e 200 mmHg, menor que sistólica |
| Pulso | nulo/ausente ou inteiro entre 20 e 250 bpm |
| Observação | nula/ausente ou até 280 caracteres |
| Data | Zod aceita Date/Timestamp e tolera até 60 segundos no futuro; rules toleram 5 minutos contra relógio do servidor |
| Criação/edição | rules exigem timestamp do servidor na criação e `createdAt` imutável na edição |

Categoria é derivada, nunca persistida: crise se sistólica **>180** ou diastólica **>120**; estágio 2 se **>=140** ou **>=90**; estágio 1 se **>=130** ou **>=80**; elevada se sistólica **>=120** com diastólica <80; demais normal. A maior faixa prevalece. **180/120 ainda é estágio 2** nesse contrato; não alterar silenciosamente as fronteiras. O app organiza registros e não diagnostica.

Referências: `reading.schema.ts`, `reading-field-errors.ts`, `useReadingForm.ts`, `useAddReading.ts`, `readings.repo.ts` em `src/features/readings/`; `src/domain/bp-classification.ts`; `app/(app)/index.tsx`.

### Sessões opcionais de duas leituras

Depois de confirmar o salvamento da primeira, `useSecondMeasurementFlow` percorre `idle → offer → measuring → summary → idle`. Oferece espera sugerida de **60 segundos**, que nunca bloqueia aceitar ou salvar. Recusar na oferta ou desistir da segunda mantém a primeira já salva; o estado transitório não tem mecanismo de retomada após encerrar o app.

A segunda leitura **atualiza o mesmo ID**, sem segundo documento. Campos principais recebem média aritmética com `Math.round`; pulso só tem média se ambas as leituras tiverem pulso. `note`, `measuredAt` da primeira e `createdAt` são preservados. `sessionReadings` contém exatamente duas leituras, na ordem primeira/segunda. Erro mantém `measuring` e permite nova tentativa; resumo só após sucesso. Cada entrada é validada; rules e Zod não conferem igualdade matemática entre média principal e detalhes.

Documentos antigos sem `sessionReadings` continuam válidos e são normalizados para `null`. Histórico e CSV apresentam as leituras existentes; não reconstroem valores de sessões antigas que não os guardaram. Cada sessão é **um registro** para médias diárias e gráfico.

Referências: `src/features/readings/useSecondMeasurementFlow.ts`, `src/domain/session-average.ts`, `src/lib/session-readings-format.ts`, `src/components/bp/SecondMeasurement*`, `firestore.rules`.

### Edição, histórico e exclusão

- A linha abre `edit-reading/[id]` com valores preenchidos após leitura; salvar atualiza o documento e retorna, cancelar apenas volta. Registro ausente ou erro produz feedback e botão Voltar.
- Alterar **somente observação/data** mantém `sessionReadings`; alterar sistólica, diastólica **ou pulso** apaga os detalhes (`null`), pois os números deixam de representar aquela média. Essa perda deliberada de detalhes precisa continuar explícita na integração.
- Histórico assina `onSnapshot` por `measuredAt desc`, sem paginação/limite; agrupa por dia **local** com média inteira arredondada por registro e cabeçalhos fixos. Última medição é o primeiro item dessa ordenação, não o mais recentemente criado.
- `includeMetadataChanges` e `hasPendingWrites` alimentam “Pendente de sincronização”. `parseReading` rejeita documento inválido; lista e exportação omitem esse item e logam erro, sem falhar o conjunto nem apresentar contagem de omissões ao usuário.
- Excluir requer confirmação; cancelar não exclui; há proteção de exclusão simultânea na tela e erro visível fora da lista. Na Web, âncora de foco fora das células evita salto de rolagem causado pela reciclagem.

Referências: `app/(app)/edit-reading/[id].tsx`, `app/(app)/history.tsx`, `src/features/readings/useReadings.ts`, `useLastReading.ts`, `useReadingForm.ts`, `useDeleteReading.ts`, `src/components/bp/ReadingRow.tsx`.

### Gráfico

`computeDailyTrend` agrega por dia local, em janelas de **7/30 dias**, do início do dia de N−1 dias atrás até o instante atual. Calcula médias de sistólica/diastólica com `Math.round`, ordena dias crescentes e omite dias sem medições. `TrendChart` inicia em 7 dias; distingue duas séries e ajusta eixo à faixa dos dados com margem. Mostra carregamento/ausência de dados. A curva é suavizada (`curved`) e o espaçamento é por ponto existente, sem eixo proporcional ao intervalo entre dias. O futuro PDF pede outro contrato; não mudar o gráfico legado ao reutilizar sua função.

Referências: `src/features/readings/useReadingsTrend.ts`, `src/components/bp/TrendChart.tsx`.

### CSV

Exporta tudo (padrão), últimos 7/30 dias ou período personalizado. Consulta única usa `measuredAt desc` e limites inclusivos `>= start`/`<= end`, sem depender da lista exibida. Atalhos subtraem **N × 24 horas** de agora; são diferentes da janela de dias civis do gráfico. Personalizado usa a data inicial recebida do seletor e final até **23:59:59.999 local**; intervalo invertido bloqueia exportação.

Formato: UTF-8 com BOM, diretiva `sep=;`, separador `;`, CRLF, cabeçalho `data;hora;sistolica;diastolica;pulso;categoria;observacao;medicoes_da_sessao`. Data/hora em pt-BR no fuso local; pulso/nota/sessão ausentes ficam vazios. Escapa aspas, separadores e quebras de linha. Detalhes de sessão seguem, por exemplo, `150/95 (72) e 120/80 (70)`, com a média nas colunas principais. Há mensagens distintas para conjunto vazio e período vazio.

Nome `pressao-AAAA-MM-DD.csv` ou `pressao-INICIO_a_FIM.csv`. Web cria Blob e download local, removendo link/URL. Android escreve em **documentDirectory** via `expo-file-system/legacy` e abre compartilhamento do sistema; não há limpeza explícita nesse adaptador. Esse comportamento não deve ser copiado como política de retenção do PDF ou das capturas futuras. O encoder atual escapa sintaxe CSV, mas não neutraliza fórmulas de planilha em observações.

Referências: `src/components/bp/ExportCsvDialog.tsx`, `src/features/export/useExportCsv.ts`, `src/features/readings/readings.repo.ts`, `src/lib/csv.ts`, `src/lib/file.web.ts`, `src/lib/file.native.ts`.

### Lembretes e preferências

Primeiro perfil começa com push desligado e horários vazios. Ajustes apresenta três slots de referência (08:00, 14:00, 20:00), editáveis/habilitáveis; são sugestões de UI, não prova de agendamento. A UI passa `minuteInterval={15}` ao seletor (Web usa `step`); o comportamento efetivo depende do seletor/plataforma, sem arredondamento explícito ao salvar. Rules permitem até oito entradas; backend aceita `HH:mm` válido, não só os três slots visuais.

Permissão/token de push é solicitado ao **ativar** notificações, não no primeiro launch. Android cria canal `reminders`, usa token nativo FCM via Expo Notifications (não Expo Push Token); Web verifica suporte/VAPID, pede permissão e registra service worker. Token fica em `devices/{hash}` com plataforma e `lastSeenAt`. Recusa/erro impede ativação; ausência de suporte e VAPID têm feedback específico.

Salvar preferências faz merge no perfil. Desativar cancela os lembretes locais; triggers removem schedule sem notificações/horários. Android recria apenas notificações locais com prefixo `reminder-`; Web tem adaptador local intencionalmente vazio. **Ressalva existente:** `updateReminderTimes` chama sincronização local com os horários mesmo se `notificationsEnabled` estiver falso; não afirmar que salvar horários desligados é sempre inerte. Falha local posterior não desfaz a preferência já salva no Firestore.

Push e lembrete local apontam para registrar com foco na sistólica. Android trata resposta via Expo Notifications; Web trata foreground em `useForegroundPush.web.ts` e background/clique no service worker, que abre/foca `/?autoFocus=systolic`. Não há remoção explícita de device token nem cancelamento de notificações locais no `signOut` de `useSession`; testar logout/troca de conta sem pressupor essa limpeza. Recebimento pode depender de permissões, navegador, conectividade, Doze e política de bateria.

Tema claro/escuro/sistema é preferência **do aparelho**, persistida em AsyncStorage, inclusive no login. Manter escala de fonte, texto além de cores, rótulos e foco, teclado Web, alvos de 48 dp e corpo de 16 px como critérios a inspecionar; constantes e testes não comprovam contraste/operabilidade real de toda a UI. Exclusão de conta usa dois diálogos, reautenticação quando necessária e limpeza backend com retry; não foi executada.

Referências: `app/(app)/settings.tsx`, `src/features/reminders/`, `public/firebase-messaging-sw.js`, `functions/src/`, `src/features/theme/`, `src/features/auth/deleteAccount.ts`.

## 4. Pré-requisitos e comandos Android/Web

Usar projeto Firebase **de desenvolvimento isolado**, contas e registros sintéticos, sem reutilizar configuração de produção. Os comandos abaixo são instruções; somente os listados na seção 5 foram executados. Os clientes atuais não chamam `connectAuthEmulator`/`connectFirestoreEmulator`: subir emuladores sozinho **não redireciona o app**. As regras têm suíte independente já conectada a localhost.

1. Instalar Node/npm compatíveis com os locks. Para o app observar o engine do RN; para Functions resolver a divergência Node 20/Admin >=22 antes de validar implantação. `npm ci` na raiz e `npm --prefix functions ci` instalam projetos separados sem atualizar locks. Java 21+ para emulador Firestore.
2. Copiar `.env.example` para `.env.local` e preencher apenas configuração de desenvolvimento. `app.config.ts` exige as cinco variáveis `EXPO_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,APP_ID,MESSAGING_SENDER_ID}` e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Sem elas a avaliação da configuração falha. Config pública chega a `expoConfig.extra`; não é uma credencial de autorização.
3. Opcionais: `EXPO_PUBLIC_FIREBASE_VAPID_KEY` (necessária para push Web), `EXPO_PUBLIC_APPCHECK_RECAPTCHA_SITE_KEY` e `EXPO_PUBLIC_SENTRY_DSN`. Debug App Check somente no desenvolvimento autorizado; nunca colocar token em documentação, bundle de distribuição ou configuração de produção.

| Plataforma | Pré-requisitos adicionais | Comandos de referência |
|---|---|---|
| Android | Android Studio/SDK/JDK compatíveis com o prebuild; dispositivo/ADB ou emulador com Google Play Services; `google-services.json` do app de desenvolvimento para o pacote `com.ramonmenz.bptracker` (ou caminho `GOOGLE_SERVICES_JSON`); provedor Google, OAuth Web Client ID e fingerprints de assinatura configurados no projeto de teste | Gerar/instalar Dev Client local com `npx expo run:android` (gera arquivos nativos; não executado aqui). Depois `npm run android` ou `npm start` para Metro/Dev Client. **Expo Go não atende** aos módulos nativos. Nova dependência/plugin exige novo Dev Client. |
| Android via EAS | Conta/credenciais e ambiente de desenvolvimento isolado, arquivos e variáveis configurados; CLI >=22 pelo `eas.json`; pode consumir quota | `eas build --profile development --platform android` é alternativa remota para gerar Dev Client, **não executada**. Perfis preview/production existem, mas não são necessários para esta verificação. |
| Web | Navegador com IndexedDB; domínio de teste autorizado no Auth; contexto seguro (HTTPS/localhost) para SW/push e suporte às APIs; VAPID/FCM para validar notificações; chave/site autorizados no App Check se exigido | `npm run web`; build estático `npx expo export -p web`. Servir `dist` com servidor SPA local que devolva `index.html` para rotas e mantenha o service worker na raiz. Não publicar para verificar compilação. |

`npm run android` inicia Metro e abre Dev Client existente; não é comando que sozinho compile/configure Firebase nativo. O `GOOGLE_WEB_CLIENT_ID` é do tipo Web, não o Android client ID. App Check Play Integrity e entrega FCM demandam validação real com configuração compatível, sem ligar enforcement em projeto compartilhado.

## 5. Verificações efetivamente executadas

Ambiente Linux desta sessão: **Node v24.19.0, npm 11.9.0, OpenJDK 21.0.12.1**. Ausentes inicialmente `node_modules` dos dois projetos, `.env.local`, arquivos Google Services, diretórios nativos `android/`/`ios/`, comandos `adb` e `emulator`. Ambiente gerenciado não declarou credenciais nem identidades de serviços. Política HTTP restrita a destinos autorizados; VPN não configurada.

| Comando/checagem | Resultado observado | O que comprova e limite |
|---|---|---|
| `npm ci --cache /tmp/bp-baseline-npm-cache --no-audit --no-fund` | código 0, 1738 pacotes | instalação pelo lock; avisos de dependências obsoletas, sem auditoria de vulnerabilidades |
| `npm --prefix functions ci --cache /tmp/bp-baseline-npm-cache --no-audit --no-fund` | código 0, 518 pacotes | instalação; aviso `EBADENGINE` pois projeto exige Node 20 e host é 24 |
| `npm run lint` | código 0 | lint da configuração atual; não é auditoria de todos os contratos |
| `npm run typecheck` | código 0 | TypeScript sem emissão, com resolução predominantemente nativa |
| `npm test -- --ci --runInBand` | código 0; **45 suítes, 384 testes aprovados** | cenários unitários/componentes; há avisos React sobre `act()`/atualizações assíncronas. Não é sessão de usuário em Android/navegador |
| `npm --prefix functions run build` | código 0 | compilação; não valida bootstrap Admin, trigger, cron ou envio FCM |
| `npm --prefix functions test -- --ci --runInBand` | código 0; **1 suíte, 16 testes aprovados** | função pura `nextRun` incluindo fusos e horário de verão; não é teste integrado do backend |
| Emulador com projeto demo e Jest das regras (comando abaixo) | código 1 **antes do Jest** | download de `cloud-firestore-emulator-v1.21.0.jar` falhou; acesso a `storage.googleapis.com` não consta na política efetiva. **Rules não verificadas por execução** |
| Export Web offline com configuração fictícia (comando abaixo) | código 0; bundle de 1950 módulos; JS reportado 5,6 MB, CSS 12 KB; `index.html` e SW presentes | compilação estática; tamanhos reportados pelo Expo, sem medição de transferência/memória/performance. Avisos de `userInterfaceStyle` ausente e caminhos Google Services inexistentes. Não abriu navegador nem autenticou |
| `git diff --check`, `git diff --no-index --check /dev/null docs/baseline-legado.md` e revisão do diff final | sem mensagens de erro de whitespace; primeiro comando retorna 0 e diff do arquivo novo retorna 1 por haver diferenças; somente `tasks.md` modificado e `docs/baseline-legado.md` novo | nenhuma alteração funcional ou de configuração; links da baseline para constituição/specs conferidos no disco |

As primeiras tentativas de instalação não concluíram por conectividade do sandbox e falta de acesso ao cache padrão `/home/agent/.npm`; repetidas usando rede permitida e cache em `/tmp`, sem alterar os locks. Isso não foi tratado como defeito do aplicativo.

Comando das regras efetivamente tentado, evitando qualquer alias real do `.firebaserc`:

```bash
CI=1 XDG_CONFIG_HOME=/tmp/bp-baseline-config \
FIREBASE_EMULATORS_PATH=/tmp/bp-baseline-emulators \
node_modules/.bin/firebase emulators:exec --project demo-bp-baseline --only firestore \
  'node_modules/.bin/jest --config jest.rules.config.js --runInBand'
```

A suíte `tests/firestore.rules.test.ts` usa `bp-tracker-rules-test` em **127.0.0.1:8080**, com identidades sintéticas Alice/Bob e rules do disco. A CLI usou projeto `demo-bp-baseline`; não houve conexão a banco real. Para reproduzir, é necessário ter o JAR no cache ou acesso autorizado ao seu download. `npm run test:rules -- --project demo-bp-baseline` não é um substituto seguro: o script contém dois comandos e argumentos adicionais podem chegar ao Jest. Usar a forma explícita acima.

Comando do bundle efetivamente executado (todos os valores abaixo são fictícios):

```bash
CI=1 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 \
EXPO_PUBLIC_FIREBASE_API_KEY=baseline-ficticia \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-bp-baseline.invalid \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-bp-baseline \
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:baseline \
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000 \
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=baseline.apps.googleusercontent.com \
node_modules/.bin/expo export --platform web --output-dir /tmp/bp-baseline-web
```

Os resumos acima preservam os resultados relevantes. Logs locais de apoio foram gerados em `/tmp/bp-baseline-{install-app,install-functions,lint,typecheck,app-tests,functions-build,functions-tests,rules,web}.log`; são temporários da sessão, não artefatos persistentes do repositório. Nenhuma captura de tela, medição de latência/memória, validação de interface real ou operação em produção foi realizada.

## 6. Roteiro reproduzível de verificação do legado

### Preparação e registro

Executar em projeto de teste isolado após conferir manualmente sua configuração. Não usar o alias `staging` como prova de que um serviço pode ser exercitado. Usar duas contas de teste A/B sem dados reais; registrar commit, versões Node/JDK, modelo/versão Android, variante/assinatura do Dev Client, navegador/versão, fuso, permissões, conectividade e estado inicial. Instrumentação/capturas devem conter apenas dados sintéticos. Não limpar bancos compartilhados.

Repetir os comandos locais da seção 5, depois os casos abaixo em Android e Web; itens locais/push são específicos da plataforma. Registrar cada caso como **aprovado, reprovado ou bloqueado**, a evidência e o ambiente. Todos os casos manuais abaixo estão **não executados nesta sessão**. Duração de comando não é hora de trabalho realizada.

### Casos e resultados esperados

| ID | Procedimento reproduzível | Resultado de referência / evidência a colher |
|---|---|---|
| L01 — Auth | Sem sessão, abrir Histórico/edição por URL; cancelar Google, simular falta de rede e depois entrar com A; reiniciar app/aba e sair | login protege navegação; cancelamento/rede em português; persistência Auth; sair retorna ao login. Registrar tela e sequência |
| L02 — Consentimento/perfil | Conta nova aceita política; observar onboarding; configurar horários e entrar novamente. Com B, verificar aceite próprio | aceite confirmado precede onboarding; login preserva preferências/consentimento; B não herda estado de A. Conferir somente perfil sintético |
| L03 — Manual | Registrar 120/80, pulso 70 e nota `Teste; "ação"` com quebra de linha; recusar segunda leitura | um documento manual, categoria estágio 1, nota/data corretas; campos limpos; item e última leitura correspondem a `measuredAt` |
| L04 — Bordas | Tentar 49/30, 301/80, 120/29, 250/201, 80/80, pulso 19/251, decimais, nota 281 caracteres e data futura; testar também limites válidos | inválidos não escritos; campos/feedback acessíveis. Separar tolerância de 60 s do cliente e 5 min das rules; não ajustar o relógio de ambiente compartilhado |
| L05 — Classificação | Conferir 119/79, 120/79, 120/80, 139/89, 140/90, 180/120 e 181/120 | normal, elevada, estágio 1, estágio 1, estágio 2, estágio 2, crise; texto além de cor e sem diagnóstico |
| L06 — Sessão | Salvar 150/95 pulso 72, aceitar segunda antes do contador zerar e informar 120/80 pulso 70 | mesmo ID, um documento, 135/88 pulso 71; duas leituras preservadas; data/nota/criação da primeira; resumo e histórico corretos |
| L07 — Sessão parcial/falha | Repetir sem pulso em um lado; desistir na oferta e na segunda; provocar erro controlado de atualização no teste; repetir após erro | pulso médio nulo; desistência mantém só a primeira; falha mantém estado e não apresenta sucesso; retry não cria segundo documento. Encerrar app evidencia ausência de retomada da sessão |
| L08 — Compatibilidade/edição | Em fixture isolada, incluir manual antigo sem `sessionReadings`, sessão detalhada e registro sem pulso/nota. Editar nota/data da sessão, depois números/pulso; cancelar outra edição | antigos continuam legíveis; nota/data mantêm detalhes; números/pulso removem detalhes; `createdAt`/ID preservados; cancelar não escreve; ID removido mostra indisponibilidade |
| L09 — Histórico/exclusão | Criar registros em dias distintos e perto da meia-noite local; consultar e rolar lista longa; cancelar e confirmar exclusão | ordem por medição, grupos/médias locais, última leitura correta; confirmar remove só o item. Conferir foco/rolagem Web e erro visível quando remoção falhar |
| L10 — Gráfico | Com relógio de teste fixo, gerar dias dentro/fora das janelas 7/30, lacunas, dois registros num dia e uma sessão | pontos crescentes, média diária inteira por documento; sem zeros fabricados; sessão conta uma vez; vazio e um dia renderizam. Guardar valores esperados e captura |
| L11 — CSV | Exportar Tudo, 7/30 e personalizado com limites do dia; incluir nota com acentos, `;`, aspas e quebra; exportar período vazio | conferir bytes BOM/`sep=;`/CRLF e oito colunas; limites inclusivos e diferença para janela do gráfico; sessão em uma linha com detalhes; pulso ausente vazio; vazio informa. Web baixa arquivo; Android abre compartilhamento, inclusive indisponibilidade/cancelamento |
| L12 — Offline | Após carregar registros/consentimento, ficar offline, criar/editar, observar pendência e reconectar; repetir reload Web/múltiplas abas e encerramento do processo Android | documentar o observado: fila/feedback/ACK, disponibilidade do cache e o que sobrevive. `await addDoc/updateDoc` pode aguardar ACK; não exigir sucesso/oferta de segunda leitura antes dele. Persistência Android após encerramento permanece hipótese até o teste |
| L13 — Push/permissão | No projeto de teste com backend configurado, negar e conceder notificações; habilitar/desabilitar e mudar slots/fuso; Web sem VAPID/sem suporte | permissão contextual, recusa não liga switch; token nativo/Web correto; schedule/horários coerentes; mensagens distintas para indisponibilidade; login não empurra schedule vencido. Nunca disparar contra usuários reais |
| L14 — Entrega/clique | Android com app aberto, segundo plano, encerrado e restrição de bateria; Web foreground/background/aba fechada; tocar local/push | abre formulário/foco sem contornar login/consentimento; documentar atraso e duplicações observadas. Cron tem cadência de 15 min e há reforço local Android; não exigir precisão de alarme do push. Web não tem agendamento local |
| L15 — Logout/slots | No aparelho de teste, salvar horários com switch desligado; ativar, sair e trocar A por B; inspecionar locais/tokens remanescentes | documentar ressalvas atuais da seção 3, sem presumir limpeza. Garantir que clique nunca permita escrever dados de A na conta B; qualquer falha vira defeito, não aceite automático |
| L16 — Segurança | Rodar suíte de regras em localhost: A/B, não autenticado/provedor diferente, campos extras, fonte inválida, sessão com 1/3 entradas, alteração de criação e acesso a schedules | regras negam acessos indevidos e mantêm o formato legado; registrar contagem/saída real. Não testar negações em produção |
| L17 — Tema/acessibilidade | Alternar claro/escuro/sistema, reiniciar; teclado Web, leitor de tela, fonte ampliada e contraste; abrir/fechar todos os diálogos de sessão | preferência por aparelho inclusive login; foco/restauração, anúncio “por”, detalhes de sessão, erros e botões operáveis, sem conteúdo de fundo navegável durante modal |
| L18 — Conta | Somente conta descartável do projeto de teste: cancelar os dois diálogos; confirmar e exercitar reautenticação recente | cancelamento não exclui; confirmação exclui Auth, árvore users e schedule pelo trigger com retry; registrar limpeza real e eventual bloqueio de bootstrap, sem inferir pelo build |

Para conferir a média diária independentemente: no mesmo dia, sessão 135/88 e leitura única 120/80 devem produzir **128/84** (`Math.round` por campo), com **dois documentos**, não três leituras contadas. Um documento inválido inserido apenas em fixture controlada deve ser omitido no legado; essa omissão é limitação a registrar, não modelo para cobertura completa do PDF.

Após fotografia/voz/PDF, repetir esses casos em condições equivalentes. Medir início frio/aquecido, tempo até formulário utilizável, registro manual, navegação/scroll e uso de memória, com mesmo aparelho, navegador, dataset, cache e rede. **Baseline de desempenho numérico ainda não medido**; meta documental de “10 s/4 toques” não é resultado observado. Não afirmar ausência de degradação com base somente nos testes unitários.

## 7. Riscos de regressão nas novas modalidades

Rastreabilidade: [constituição §§2–4](../constitution.md), [fotografia §4](../specs/spec-fotografia.md), [voz §4](../specs/spec-voz.md) e [PDF §4](../specs/spec-relatorio-pdf.md). As medidas desta tabela orientam trabalho futuro; não foram implementadas nesta TASK-01.

| Risco constatado ou derivado do contrato | Consequência e verificação necessária |
|---|---|
| `source` literal manual em tipos, Zod, hooks e rules | `photo`/`voice` hoje falham ou seriam sobrescritos para manual nos hooks. Atualizar coordenadamente contratos e regras, revisar índices e casos negativos sem invalidar antigos; L03/L08/L16 |
| Hooks de criação/edição fixam source manual | Reutilização ingênua perde a origem; edição futura de assistidos exige decisão explícita. Segunda leitura também passa pelo hook de atualização; preservar origem/ID/detalhes |
| Escrita antecipada pelos hooks ou por fila offline | Reconhecer/aceitar permissão/cancelar não pode criar nem atualizar documento. Candidatos só em memória antes de confirmação; testar resposta tardia, troca de conta, background, retry e duplo toque, inclusive L12 |
| Sessões com média/detalhes e edição destrutiva de detalhes | Evitar dois documentos, dupla contagem ou apagar detalhes ao só editar nota/data. Não confundir source com sessão; preservar arredondamento e pulso ausente; L06–L08/L10–L11 |
| Schema/parser omite documento inválido | Nova origem sem leitura compatível pode sumir de histórico/CSV. PDF não pode chamar a omissão silenciosa de histórico completo; sinalizar lacunas e cache incompleto sem mudar contrato do CSV |
| Janela CSV, gráfico e futuro PDF distintas | Não unificar sem teste: CSV usa horas corridas, gráfico dias locais/inteiros; PDF pede fuso congelado, médias por registro e precisão própria. Não usar média das médias nem duplicar sessões |
| Curva e espaçamento do gráfico legado | Reuso no PDF pode sugerir dias/valores não observados; PDF exige datas reais e representação própria. Generalização não deve mudar resultados do gráfico atual |
| Carregamento de OCR/STT/PDF no bootstrap | Pode atrasar login/formulário e bloquear o manual por câmera/microfone indisponíveis. Adaptadores sob demanda; negar permissões e indisponibilizar reconhecedores deve manter L01–L17 e desempenho comparável |
| Permissões, Dev Client e modelos locais | Nova bridge/plugin exige rebuild; Expo Go não serve como evidência. Voz local/pt-BR precisa de comprovação por ambiente, sem fallback remoto silencioso; câmera/microfone só por ação contextual |
| Memória, logs e arquivos | Logger só filtra chaves do contexto, não conteúdo de exceções. Não enviar transcrição/valores/HTML aos coletores. Captura deve permanecer em memória; CSV Android atual em documentDirectory não autoriza persistir fotografia/áudio nem reter PDF indefinidamente |
| Autenticação/consentimento e tarefas assíncronas | Cancelar resultados antigos ao sair/trocar UID, não salvar nem compartilhar dados da conta anterior. Permissões novas e pré-visualização não substituem consentimento; L01/L02/L15/L18 |
| Acessibilidade/tema/foco | Novos botões/modais não devem deslocar ou cobrir permanentemente o manual; preservar teclado, escala de fonte e anúncio de sessão. L09/L17 com dispositivo/navegador reais |
| Incertezas do ambiente legado | Divergência Node/Admin, bootstrap Admin a conferir, rules ainda sem execução, atestação/push não validados, cache Android e horários locais com switch desligado podem parecer regressões futuras. Registrar falha anterior e comparar sob mesmo ambiente |

## 8. Horas, despesas e pendências da TASK-01

| Dado | Registro disponível |
|---|---|
| Capacidade estimada do ciclo | 100 h, planejamento em `tasks.md`; não são horas realizadas |
| Estimativa da TASK-01 | 3 h, planejamento original; não foi convertida em esforço real |
| Horas anteriormente consumidas | **não informado** |
| Horas realizadas na TASK-01 | **não informado** |
| Horas totais realizadas / saldo de horas do ciclo | **não informado** / **não informado** |
| Teto global de despesas | R$ 300,00, constituição §1 |
| Despesas anteriores / despesas desta etapa / despesas acumuladas | **não informado** / **não informado** / **não informado** |
| Saldo disponível do teto global | **não informado** — sem consumo conhecido não se pode presumir R$ 300,00 livres |

O levantamento documental, inventário de contratos e roteiro foram entregues. A TASK-01 permanece **aberta, com levantamento parcial realizado**: não há dados para apurar esforço/despesas/saldos, as regras não chegaram a executar e não há comprovação funcional Android/Web em ambiente de teste. As verificações locais aprovadas não substituem esses dados.

Para encerrar sem extrapolar a evidência: obter registros de horas/despesas; executar regras com emulador disponível; registrar os casos aplicáveis da seção 6 em Android e Web isolados (ou delimitar formalmente impedimentos/alcance aceito no acompanhamento); apurar desempenho de referência antes de comparar as integrações. Não há estimativa inventada de trabalho realizado nem alteração retroativa dos marcos do plano.
