# 8. Dificuldades encontradas

[← 7. Resultados](07-resultados.md) · [Índice](README.md) · [Próximo: 9. Discussão crítica →](09-discussao-limitacoes.md)

Esta é uma lista factual, com a fonte de cada item. A análise está no [capítulo 9](09-discussao-limitacoes.md).

## 8.1 Técnicas

| Dificuldade | Efeito | Fonte |
|---|---|---|
| **OCR genérico em dígitos de sete segmentos.** O ML Kit não emitiu dígitos ASCII no cartão B nem depois do ROI591; o visor real também não foi lido | Principal bloqueio da modalidade irredutível; cerca de duas semanas de investigação (PRs #64–#85, de 11/11 a 26/11) sem funcionalidade utilizável no produto | [etapa 4](../task-09-etapa-4-resultado-roi591.md), [etapa 6](../task-09-etapa-6-viabilidade-roi591.md); D-001 |
| **Build Android fora do ambiente dos agentes.** No ambiente de nuvem, o download do React Native foi recusado (HTTP 403 em `repo.reactnative.dev`), o wrapper Gradle não baixou a distribuição e o Google Maven ficou inacessível. Não havia SDK, ADB nem aparelho | Nenhum Kotlin compilado pelos agentes; todo build e ensaio Android dependeu do autor, no Windows | TASK-04, TASK-07, TASK-12 em `tasks.md`; E-006 |
| **Download do emulador do Firestore** falhou nos ambientes locais das primeiras tarefas (JAR 1.21.0) | Rules novas (34 cenários) executadas só no CI do PR #62 | TASK-11, TASK-18 |
| **Transporte de commits e ferramental Windows.** Commits locais levados por `git bundle`; Metro e `adb reverse` na porta 8099; árvore suja por `android/build/`; tela cinza por falta de `flex-1` no CSS da demo | Rodadas extras de build; correções no #93 | [task-12 §diagnóstico](../task-12-voz-android.md#diagnóstico-e-correções-da-rodada) |
| **Permissão de microfone.** O módulo pedia permissão mesmo com `RECORD_AUDIO` já concedida, e a solicitação era cancelada | Corrigido (`6b6db56`); a causa exata dos cancelamentos anteriores não foi isolada | E-026, E-027 |
| **Pacote pt-BR local no navegador.** O Chromium 154 da nuvem ficou em `downloadable`, e a instalação não o disponibilizou | Capacidade só demonstrada no Chrome 158 do autor | TASK-05, TASK-13 |
| **Incompatibilidade do jsPDF com o runtime nativo.** O `TextDecoder` do Expo só aceita UTF-8, e o `fast-png` precisa de latin1 | Reforça `expo-print` no Android; o Android continua sem PDF | E-022 |
| **Worker de PDF no Metro.** O `unstable_createWorker` gerou um chunk `__common` de 567 KB carregado em toda abertura | Worker descartado; geração na thread principal com limite de 3.000 registros | D-008 |
| **Opacidade de SDKs de terceiros.** Rota de telemetria e ID de instância no ML Kit; DataTransport; serviço de voz do SO | Privacidade interna não demonstrada nem refutada; não há ferramenta qualificada para medir tráfego por UID no aparelho (`cmd netstats` indisponível) | [auditoria de dependências](../task-07-auditoria-dependencias.md); Q-019 |
| **Padrões inseguros no legado.** Breadcrumbs padrão do Sentry; `error.message` repassado ao Crashlytics | Um corrigido (#91), outro pendente (Q-013) | E-024, E-034 |

## 8.2 De processo e de governança

- **Cronograma.** Specs e plano formalizados só em 26/10, quando os marcos de 22/09, 06/10 e 13/10 já tinham passado. A integração prevista para 27/10 virou clientes isolados, e o PDF começou em 26/11, dois dias depois do marco de 24/11 ([tasks.md, Controle do plano](../../tasks.md)).
- **Dependência do autor para tudo o que é físico.** Build, instalação, ensaio e retorno sanitizado passam por uma única pessoa, e cada rodada exigiu roteiro, identidade de artefato e conferência. O ciclo de feedback ficou longo.
- **Sem ambiente de homologação.** Recriar a configuração de Vercel e Firebase consumiria tempo; a homologação usa produção com conta de teste (D-003).
- **Decisões que dependem da orientadora**, sem registro de resposta: estado da fotografia, inversão da precedência de P116, marco de 06/10 (P02), semântica de `source` (P01), corte do legado, comparação mínima e coleta com terceiros (Q-001 a Q-008).
- **Coordenação entre dois agentes e o autor.** Exigiu regras de dono único por arquivo e por branch (D-006) e consolidações documentais periódicas. Divergências entre documentos apareceram e foram registradas sem reescrever o histórico (por exemplo, E-027 aponta uma divergência interna na `task-12-revisao-estatica.md`).
- **Reprodutibilidade de ensaios.** Commit local inexistente no GitHub, APK sem hash e ensaio sem commit (Q-016).
- **Esforço não medido.** Sem registro de horas nem de despesas desde o início do acompanhamento (Q-009), não dá para comparar o planejado com o realizado.
