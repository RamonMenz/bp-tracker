# 10. Conclusão

[← 9. Discussão crítica](09-discussao-limitacoes.md) · [Índice](README.md) · [Próximo: 11. Referências →](11-referencias.md)

> Conclusão provisória, revista em 28/11/2026 (primeira versão em 27/11), antes da avaliação de 08/12. [PENDENTE: o autor deve revisá-la após os ensaios em aparelho e a resposta da orientadora.]

O ciclo do 2º semestre de 2026 se propôs a acrescentar ao Aferi registro assistido por fotografia e por voz, com confirmação obrigatória, além de um relatório PDF para consulta médica, e a fundamentar as escolhas técnicas numa comparação entre abordagens. Em relação a esse objetivo, o resultado é parcial e desigual entre as entregas:

| Entrega | Estado em 28/11/2026 |
|---|---|
| **PDF Web** | No produto e **validado pelo autor** em fluxo logado, com 53 registros, recortes de período, dados de teste e impressão em cinza (relato, E-045). Faltam leitor de tela e navegador móvel |
| **PDF Android** | Implementado com `expo-print` e testado com dublês. **Não validado em aparelho**: falta um build novo |
| **Voz** | Parser concluído. Reconhecimento local **demonstrado** nas demos (Galaxy S25 FE e Chrome 158), inclusive sem rede. Integrado ao produto Web e Android **atrás de flags desligadas**, testado só com reconhecedor simulado. Uma rodada real revelou falha em frases curtas (0 de 10), com correção **ainda não validada**. Privacidade do serviço do sistema não verificada |
| **Fotografia (irredutível)** | Arquitetura local em memória implementada nas duas plataformas; cadeia completa funciona com texto tipográfico. Nas condições observadas (um aparelho, cartões sintéticos, uma tentativa por condição), **não leu o visor de sete segmentos**. Pausada (D-001), sem declarar inviabilidade universal e sem substituir a modalidade pelo manual. Estado final depende da orientadora |
| **Comparação entre abordagens** | **Não executada**, por falta de corpus rotulado e pela pausa da fotografia |
| **Decisão técnica** | Documentada e rastreável; formalizada em 26/10, depois do marco de 06/10. Mantida sem troca de stack |

O ciclo também produziu resultados de engenharia que não estavam na lista de entregas:

- correções de privacidade e isolamento no legado e no código novo: Sentry Web, Crashlytics, vazamento entre contas no PDF e guardrails de conta e de logs;
- verificação automatizada de 384 para 1.134 testes, com o conteúdo do PDF conferido no CI;
- um método de trabalho com agentes de IA (capítulo 4-A), com níveis de evidência, ledger sem reescrita e relatos sanitizados, que impediu declarar como concluído o que só foi implementado ou demonstrado e ajudou a encontrar defeitos reais antes do uso ([§4A.5](04a-desenvolvimento-assistido-por-agentes.md#4a5-defeitos-que-a-verificação-encontrou)).

Os marcos de 06/10, 27/10, 10/11 e 24/11 não foram cumpridos no prazo e estão declarados com as datas reais. A homologação em produção, com conta de teste, é uma limitação assumida. Horas e despesas: não informado.

Em síntese, o ciclo entrega um produto com o caminho manual intacto e um PDF Web em uso; um PDF Android e uma voz no produto prontos para validação em aparelho; uma capacidade de voz real demonstrada, com uma falha conhecida e uma correção a testar; e uma análise documentada dos limites do OCR genérico em visores de sete segmentos. É também uma base rastreável para continuar no TCC ([capítulo 12](12-trabalhos-futuros.md)).
