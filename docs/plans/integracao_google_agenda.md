# Integração com Google Agenda — Documento de Decisão

> Registrado em 2026-08-26, a partir da sugestão do usuário na sessão que criou o popup
> explicativo de "notificações push indisponíveis" (`app/(app)/settings.tsx`). Este documento
> **não implementa nada** — existe para decidir, com dados concretos de esforço/custo/risco,
> qual dos dois caminhos abaixo perseguir (ou nenhum, por ora).

---

## Contexto

Hoje, quando o push web não está configurado (VAPID key ausente) ou o navegador não suporta push,
o app mostra um popup sugerindo "configure um alarme no celular ou um lembrete no Google Agenda"
como alternativa manual — o usuário mesmo cria o evento. A pergunta que este documento responde:
**vale a pena o app criar esse evento automaticamente?**

Existem dois caminhos com naturezas completamente diferentes — um é essencialmente um link, o
outro é uma integração de servidor com credenciais de terceiro. Tratá-los como "a mesma feature em
dois tamanhos" seria subestimar o segundo.

---

## Opção A — Link "Adicionar ao Google Agenda"

### Como funciona
O Google Agenda aceita criar um evento a partir de uma URL com os dados preenchidos por query
string, sem nenhuma autenticação OAuth adicional além do login que o usuário já tem no navegador/app:

```
https://calendar.google.com/calendar/render?action=TEMPLATE
  &text=Medir+pressão
  &dates=20260827T080000/20260827T081500
  &recur=RRULE:FREQ=DAILY
  &details=Lembrete+criado+pelo+BP+Tracker
```

Um botão por horário configurado (`reminderTimes`) abre essa URL via `Linking.openURL` — o Google
Agenda (app ou web) abre com o evento recorrente diário já montado; o usuário só confirma "Salvar".
Depois disso, o evento é **do usuário**, no calendário dele — o app não tem mais nenhuma relação
com ele (não sabe se existe, se foi editado ou apagado).

### Complexidade
**Baixa.** Não há chamada de API, não há OAuth além do que já existe, não há dado novo persistido
no Firestore.

### Desenvolvimento
1. Função pura nova em `src/lib/` (ex. `googleCalendarLink.ts`) que recebe um horário `"HH:MM"` e
   devolve a URL montada — testável sem emulador, mesmo padrão de `src/lib/csv.ts` e `datetime.ts`.
   Cobrir nos testes: horário que cruza meia-noite na duração do evento, encoding de caracteres
   especiais no `text`/`details`.
2. Um botão por slot na tela de Ajustes (`app/(app)/settings.tsx`), ao lado de cada horário já
   renderizado (`slots.map(...)`, por volta da linha 288) — reaproveitando `Linking.openURL` e o
   tratamento de falha que `handleOpenPrivacyPolicy` já usa (linhas 206-212).
3. Nenhuma mudança em `firestore.rules`, `firestore.indexes.json`, Cloud Functions ou schema Zod.

**Estimativa:** menos de um dia de desenvolvimento, incluindo testes.

### Custo
**Zero.** Sem chamada de API paga, sem infraestrutura nova, sem processo de revisão do Google.

### Manutenção
Praticamente nenhuma — é uma URL pública e estável do Google, sem versionamento de API para
acompanhar.

### Limitações (o que isso **não** resolve)
- O app não sabe se o usuário realmente salvou o evento, nem se editou o horário depois.
- Mudar o horário nos Ajustes do app não atualiza o evento já criado — o usuário precisa recriar
  manualmente (ou editar os dois lugares).
- Sem "desativar" central: se o usuário desligar os lembretes no app, o evento no Google Agenda
  continua existindo até ele mesmo apagar.
- É um convite de um toque, não uma sincronização — mais parecido com "compartilhar", que é
  exatamente o efeito que o popup atual pede.

---

## Opção B — Sincronização automática via Google Calendar API

### Como funcionaria
O backend (Cloud Functions) criaria/atualizaria um evento recorrente na agenda do usuário sempre
que `reminderTimes` mudasse em `users/{uid}`, sem o usuário precisar clicar em nada depois da
configuração inicial.

### Complexidade
**Alta.** Não é "a mesma ideia com mais código" — introduz uma categoria de risco que o projeto
não tem hoje: **credencial de terceiro de longa duração, por usuário**, guardada pelo backend.

### Desenvolvimento
1. **Escopo OAuth novo.** O login hoje (Firebase Auth + Google, provedor único) não pede acesso à
   Agenda. Seria necessário solicitar `https://www.googleapis.com/auth/calendar.events` — via
   consentimento incremental, idealmente só quando o usuário optar por essa sincronização (nunca
   no login inicial, mesmo espírito do "notificações só são pedidas ao ativar o switch", já
   praticado em `useReminderSettings.ts`).
2. **Refresh token de longa duração.** Para criar/editar eventos depois que o app fechou, é preciso
   um *refresh token* — só se obtém de forma confiável levando o `serverAuthCode` do Google
   Sign-In (`offlineAccess: true`) até o backend e trocando-o lá pelo token, usando o client secret
   (Secret Manager, nunca no cliente). Isso não dá para fazer só no app.
3. **Onde guardar o refresh token.** Ele é uma credencial, não um dado comum do Firestore — não
   pode entrar numa coleção que as Security Rules do cliente conseguem ler, no mesmo espírito de
   `schedules/{uid}` (hoje exclusivo do Admin SDK, `CLAUDE.md §4.4`). Duas opções, nenhuma trivial:
   - Cloud KMS: criptografar o token antes de gravar em Firestore, decriptar só no backend.
   - Um Secret por usuário no Secret Manager — mais caro e mais difícil de escalar (ver Custo).
4. **Cloud Function nova**, reagindo à escrita em `users/{uid}` — parecido com
   `functions/src/triggers/onUserSettingsWrite.ts`, mas com uma responsabilidade nova: chamar a
   Calendar API para criar/atualizar o evento recorrente, tratando:
   - token expirado/revogado (o usuário pode revogar acesso a qualquer momento em
     [myaccount.google.com/permissions](https://myaccount.google.com/permissions), sem avisar o
     app — a sincronização simplesmente para);
   - limites de taxa e erros transitórios da API (retry com backoff);
   - o quê fazer se o evento foi apagado manualmente pelo usuário no Google Agenda (recriar? não
     recriar?) — decisão de produto, não só técnica.
5. **UI nova** em Ajustes: estado de conexão ("conectado à sua Google Agenda" / "desconectado —
   toque para reconectar"), e um botão de desconexão que revoga o acesso e apaga o token guardado.

**Estimativa:** semanas, não dias — o item 3 e o tratamento de revogação/erro (item 4) tendem a
consumir mais tempo que a integração "feliz" com a API em si.

### Custo
- **Google Calendar API em si:** cota gratuita generosa para este volume de uso (poucas
  chamadas por usuário, disparadas só quando os horários mudam) — não deve gerar cobrança direta
  de API.
- **Guardar o token com segurança:**
  - Secret Manager cobra por *versão de secret* ativa e por acesso — um secret por usuário deixa
    de ser desprezível assim que a base de usuários cresce (ordem de centavos de dólar por usuário
    por mês, mas escala linearmente com a base — vale checar a tabela de preços vigente antes de
    decidir).
  - Cloud KMS (criptografar o token e guardá-lo já cifrado em Firestore) tende a sair mais barato
    nesta escala: custo por operação de criptografar/decriptar, sem custo por segredo armazenado.
- **Cloud Functions/Scheduler:** a Function nova soma pouco ao consumo que já existe hoje
  (`dispatchReminders.ts` já roda no Scheduler) — não deve tirar o projeto da camada gratuita do
  Firebase sozinha, mas é mais uma peça rodando 24/7.
- **Revisão do Google (OAuth verification).** `calendar.events` está hoje classificado por listas
  públicas do Google como escopo **sensível** (não **restrito**) — o que significa passar pelo
  processo de verificação do OAuth consent screen (formulário, política de privacidade **real e
  publicada**, possivelmente vídeo de demonstração, semanas de espera), mas **sem** a avaliação de
  segurança paga (CASA) exigida para escopos restritos. Essa classificação deve ser **reconferida
  no momento da implementação** — o Google já reclassificou escopos antes. Vale notar: este projeto
  já tem um bloqueador prévio para essa revisão — `PRIVACY_POLICY_URL` em
  `settings.tsx:41` ainda é um placeholder (`plano_de_funcionalidades.md`, item 1); a política real
  precisaria existir antes de qualquer submissão à revisão do Google.

### Manutenção contínua
- Monitorar falhas de sincronização por usuário (token revogado é esperado, não é bug — mas
  precisa de um caminho de erro amigável, no espírito do `CLAUDE.md §4.3`).
- Acompanhar mudanças na Calendar API/política de OAuth do Google ao longo do tempo.
- Mais uma superfície de log a auditar para nunca vazar dado de saúde (`CLAUDE.md §4.4/§4.5): o
  evento criado deve conter só "Medir pressão" — nunca um valor de medição — e isso precisa ficar
  garantido no código, não como convenção informal.

### Conflito arquitetural a decidir antes de codar
O `CLAUDE.md §1` é explícito: o backend serverless existe **"para uma única coisa: disparar
lembretes push"**. Uma Function que fala com a Calendar API é uma segunda responsabilidade de
servidor — não é uma violação técnica impossível de contornar, mas **é uma mudança de princípio de
arquitetura documentado**, não só mais uma function. Isso merece uma decisão consciente do
usuário/time, e — se aprovada — uma atualização explícita do `CLAUDE.md §1` e do `PLAN.md` para
refletir o novo escopo do backend, no mesmo commit que introduzir a mudança.

---

## Comparação lado a lado

| Critério | A — Link "Adicionar ao Agenda" | B — Sincronização automática (API) |
|---|---|---|
| Complexidade | Baixa | Alta |
| Esforço de desenvolvimento | < 1 dia | Semanas |
| Infraestrutura nova | Nenhuma | Cloud Function + guarda de credencial (KMS/Secret Manager) |
| Custo direto | Zero | Baixo-médio, cresce com a base de usuários |
| Revisão externa necessária | Nenhuma | Verificação OAuth do Google (bloqueada hoje pela política de privacidade placeholder) |
| Mantém-se sincronizado se o horário mudar | Não — usuário recria manualmente | Sim |
| Risco de token revogado/erro silencioso | Não existe (não há token) | Existe, precisa de tratamento e UI dedicada |
| Exige mudança de princípio do `CLAUDE.md §1` | Não | Sim |
| Dado de saúde em serviço de terceiro | Não (nada além do título genérico do evento) | Mesmo risco controlado, mas superfície de código maior para garantir |

---

## Recomendação

Começar pela **Opção A**. Resolve o problema real de hoje (usuário sem push funcionando) com uma
fração do esforço, do custo e do risco de segurança/privacidade da Opção B, e não força nenhuma
decisão de arquitetura irreversível. A Opção B só compensa se, depois de um tempo de uso real da
Opção A, ficar claro que a fricção de recriar o evento manualmente incomoda o suficiente para
justificar semanas de desenvolvimento, guarda de credencial de terceiro e revisão do Google.

## Decisões pendentes (🔴 do usuário, não técnicas)

1. 🔴 Aprovar seguir com a Opção A agora — e, se sim, priorizar isso ou outro item do
   `roadmap_futuro.md`/`plano_de_funcionalidades.md` primeiro.
2. 🔴 Se a Opção B for cogitada no futuro: decidir se vale reabrir o `CLAUDE.md §1` (escopo do
   backend) antes de qualquer linha de código, e resolver a política de privacidade real (bloqueio
   já existente, independente desta feature) como pré-requisito.
