# Roadmap Futuro — Funcionalidades Não Iniciadas

> Varredura de 2026-08-17, papel de PM/Tech Lead. Diferente de `plano_de_funcionalidades.md`
> (que lista o que está **pela metade**), este documento cobre o que tem **zero código e zero
> UI** — só ideia, campo reservado ou nada. Não há `README.md` nem pasta `/docs` neste repositório
> — todo o planejamento vive nos `.md` da raiz (`PLAN.md` é a fonte primária; os demais são
> registros de sessões anteriores de correção/UX). Metodologia: leitura integral de `PLAN.md` e
> varredura por palavras-chave (`futuro`, `reservado`, `integraç`, `opcional`, `roadmap`,
> `bluetooth`, `widget`, `ios`, `família`) nos demais `.md`, cruzada com o código para confirmar
> que cada item realmente não tem implementação (nem parcial).

---

## Planejadas na Documentação

Itens que o próprio time (em `PLAN.md` ou nos registros de sessões anteriores) já cogitou por
escrito, mas que não têm nenhum código correspondente hoje.

### 1. Suporte a iOS — configurado no papel, zero pipeline de build

**Onde está escrito:** `PLAN.md §1.1` fala em "Google Sign-In... duas implementações reais"
sem nunca excluir iOS, e o próprio `app.config.ts:88-91` já reserva
`ios.bundleIdentifier: 'com.ramonmenz.bptracker'` e `ios.googleServicesFile`. Mas:
- `PLAN.md` Fase 1 e Fase 7 só mencionam `eas build --profile android` — nunca iOS.
- `RELEASE_CHECKLIST.md` não tem nenhuma seção sobre conta Apple Developer, certificados,
  provisioning profile ou TestFlight.
- `eas.json` não tem bloco de credenciais/`ios` diferenciado.
- Não existe `GoogleService-Info.plist` nem qualquer menção a ele fora do `app.config.ts`.

**Estado atual:** o identificador de bundle foi escolhido (decisão que não pode mudar depois de
publicado), mas isso é a única coisa que existe. Nenhum build iOS jamais rodou.

**Por que importa:** parte relevante do público-alvo (pessoas hipertensas, geralmente mais velhas)
usa iPhone. Ficar só no Android exclui metade do mercado potencial.

---

### 2. Integração automática com aparelhos de pressão (Bluetooth) — campo reservado, sem nenhuma lógica

**Onde está escrito:** `PLAN.md §2.1`, no schema de `users/{uid}/readings/{readingId}`:
```ts
source: 'manual',                  // reservado p/ integrações futuras
```
O mesmo campo existe em `src/types/models.ts:17` e `src/features/readings/reading.schema.ts:73`
— mas como `z.literal('manual')`, ou seja, o schema **rejeita** qualquer outro valor hoje. É um
lugar reservado, não uma feature parcial.

**Estado atual:** zero. Nenhum código de pareamento Bluetooth, nenhum parser de protocolo de
aparelho (Omron, Bluetooth LE Health Device Profile), nenhuma tela de "conectar aparelho".

**Por que importa:** é o maior gerador de erro de digitação e de abandono do registro manual —
mas é uma integração de hardware não trivial (cada fabricante tem protocolo próprio) e não deveria
ser priorizada antes do produto provar retenção com registro manual.

---

### 3. Coletor de erros em produção na Web — mencionado como próximo passo, nunca começado

**Onde está escrito:** `prompts_de_funcionalidades.md:334` — ao registrar o gap do Crashlytics
nativo, o próprio prompt já registra: *"uma integração futura poderia usar Sentry ou Firebase
Crashlytics JS"*. `src/services/crashReporter.web.ts` documenta isso como
`IS_WEB_CRASH_REPORTING_GAP` — um no-op **intencional**, não um bug, mas também não tem nenhum
código de verdade por trás.

**Estado atual:** zero. Nenhuma dependência instalada, nenhum SDK inicializado na build web.

**Por que importa:** hoje, um erro em produção na versão web do app não gera nenhum sinal para o
time — só aparece se o usuário reclamar.

---

## Sugestões de Produto

Funcionalidades que nenhum `.md` do repositório menciona, mas que — no domínio de rastreio de
pressão arterial — são o que diferencia um protótipo funcional de um app que um paciente real usa
por anos e um médico real recomenda. Ordenadas por impacto esperado.

### 1. Exportação em PDF para o médico
Hoje o único export é CSV cru (`src/lib/csv.ts`) — ótimo para uma planilha, ruim para levar numa
consulta de 15 minutos. Um relatório em PDF com o gráfico de tendência, a tabela do período
selecionado e a média do intervalo (já calculável — ver `plano_de_funcionalidades.md` item 2) é o
formato que médicos de fato aceitam impresso ou por e-mail. **Alto impacto, esforço médio**
(gerar PDF client-side com `expo-print`/`react-native-html-to-pdf`, reaproveitando o mesmo dado do
export CSV).

### 2. Meta/faixa alvo definida pelo médico + indicador de aderência
O app hoje só classifica cada medição isoladamente (`bp-classification.ts`). Não existe conceito
de "meta pessoal" (ex.: médico pediu para manter abaixo de 135/85) nem de aderência ao protocolo
de 3x/dia (quantos dias na semana o usuário realmente bateu a meta de medições). É a métrica que
mais aproxima o app do "eu seguindo o tratamento", que é o objetivo real por trás do "medir 3x ao
dia sem esquecer" do `PLAN.md`. **Alto impacto, esforço médio.**

### 3. Sign in with Apple (obrigatório para publicar com Google Sign-In no iOS)
Não é só uma sugestão de UX: a App Store **rejeita** apps que oferecem login social de terceiros
(Google) sem também oferecer "Sign in with Apple". Se o item 1 da seção anterior (suporte iOS)
avançar, este item deixa de ser opcional. Vale registrar aqui porque hoje `CLAUDE.md` e `PLAN.md`
descrevem "Google — provedor único" como decisão definitiva, e essa decisão precisa ser
revisitada antes (não depois) de qualquer build iOS. **Bloqueante para o item 1, esforço baixo.**

### 4. Modo cuidador / perfil de terceiro
Parte real do público de um app de pressão é gente que mede a pressão dos pais idosos, não a
própria. Hoje o modelo (`users/{uid}` dono único de suas `readings`) não tem espaço para "meça e
acompanhe a pressão da minha mãe" sem compartilhar a própria conta Google dela. Precisa de decisão
de modelagem (perfis dentro da conta vs. conta compartilhada com convite) antes de virar código —
é a funcionalidade de maior risco de arquitetura desta lista. **Alto impacto para o público-alvo
real, esforço alto.**

### 5. Duas medições consecutivas por sessão (protocolo clínico AHA)
Diretrizes de aferição recomendam 2 medições com 1–2 min de intervalo, com o app reportando a
média das duas — reduz o efeito "jaleco branco" e ruído de uma leitura isolada. O schema atual
(`reading.schema.ts`) grava uma leitura por vez sem esse conceito de "sessão". Seria uma pequena
extensão de UX (contador "medição 2 de 2" no formulário) sobre a arquitetura existente, não uma
reescrita. **Impacto clínico real, esforço baixo-médio.**

### 6. Widget de tela inicial (Android)
A meta do `PLAN.md` é registro em "≤ 10 segundos, 4 toques" — um widget nativo elimina até o passo
de abrir o app. É a extensão mais direta da filosofia de UX já documentada no §4.4 do `PLAN.md`,
só que nunca foi escrita como item do roadmap. Requer módulo nativo (`expo-android-widget` ou
equivalente) — não é uma mudança trivial de RN puro. **Impacto alto na meta central do produto,
esforço médio-alto.**

### 7. Onboarding com orientação de como medir corretamente
O app "registra, não diagnostica" (`CLAUDE.md §1`), mas a qualidade do dado registrado depende de
como a medição foi feita (repouso de 5 min, braço na altura do coração, sem falar). Hoje não existe
nenhuma tela de primeiro uso além do login — o "estado vazio com propósito" do `PLAN.md §4.4 item
5` cobre só a configuração de horários, não a educação do usuário. Conteúdo estático, sem
linguagem médica prescritiva. **Impacto na qualidade do dado, esforço baixo.**

---

## Resumo executivo

| Origem | # | Item | Esforço |
|---|---|---|---|
| Documentação | 1 | Suporte a iOS (build, credenciais, App Store) | Médio-alto (+ conta Apple Developer) |
| Documentação | 2 | Integração Bluetooth com aparelhos de pressão | Alto |
| Documentação | 3 | Coletor de erros em produção na Web | Baixo |
| Sugestão PM | 1 | Exportação em PDF para o médico | Médio |
| Sugestão PM | 2 | Meta/faixa alvo + indicador de aderência | Médio |
| Sugestão PM | 3 | Sign in with Apple | Baixo (bloqueante do item 1) |
| Sugestão PM | 4 | Modo cuidador / perfil de terceiro | Alto |
| Sugestão PM | 5 | Duas medições consecutivas (protocolo AHA) | Baixo-médio |
| Sugestão PM | 6 | Widget de tela inicial (Android) | Médio-alto |
| Sugestão PM | 7 | Onboarding de como medir corretamente | Baixo |
