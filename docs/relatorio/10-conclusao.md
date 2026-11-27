# 10. Conclusão

[← 9. Discussão crítica](09-discussao-limitacoes.md) · [Índice](README.md) · [Próximo: 11. Referências →](11-referencias.md)

> Conclusão provisória, escrita em 27/11/2026, antes da avaliação de 08/12. [PENDENTE: o autor deve revisá-la após as últimas entregas e a resposta da orientadora.]

O ciclo do 2º semestre de 2026 se propôs a acrescentar ao Aferi registro assistido por fotografia e por voz, com confirmação obrigatória, além de um relatório PDF para consulta médica, e a fundamentar as escolhas técnicas numa comparação entre abordagens. Em relação a esse objetivo, o resultado é parcial e desigual entre as entregas:

- **Fotografia (irredutível):** a arquitetura local em memória foi implementada e endurecida nas duas plataformas, e a cadeia completa funcionou com texto tipográfico. Nas condições observadas (um aparelho, cartões sintéticos, uma tentativa por condição), porém, **não leu o visor de sete segmentos**, que é o caso-alvo. A investigação foi pausada (D-001), sem declarar inviabilidade universal e sem substituir a modalidade pelo registro manual. O estado final depende da orientadora.
- **Voz:** o parser pt-BR está concluído e testado. O reconhecimento local foi **demonstrado** em clientes isolados no Android e no Chrome, inclusive sem rede, mas **não está integrado ao produto**, e a privacidade do serviço do sistema não foi verificada.
- **PDF:** na Web, está **implementado, no produto e testado** com evidência automatizada em 19 de 22 critérios. No Android não existe. **Nada foi validado em fluxo logado ou em aparelho.**
- **Comparação entre abordagens:** **não executada** em nenhuma das modalidades, por falta de corpus rotulado e porque a frente de fotografia foi pausada.
- **Decisão técnica:** documentada e rastreável, com alternativas, critérios e descartes. Foi formalizada em 26/10, depois do marco de 06/10.

O ciclo também produziu resultados de engenharia que não estavam na lista de entregas:

- correções de privacidade e isolamento no legado e no código novo (Sentry Web, vazamento entre contas no PDF, guardrails de conta e de logs);
- ampliação da verificação automatizada de 384 para 1.001 testes, com conferência do conteúdo do PDF no CI;
- um método de evidência explícito, com níveis, ledger sem reescrita e relatos sanitizados, que impediu declarar como concluído o que só foi implementado ou demonstrado.

Os marcos de 06/10, 27/10, 10/11 e 24/11 não foram cumpridos e estão declarados com as datas reais. A homologação em produção, com conta de teste, é uma limitação assumida. Horas e despesas não foram informadas.

Em síntese, o ciclo entrega um produto com o caminho manual intacto, um PDF Web pronto para validação, uma capacidade de voz demonstrada e ainda não integrada, e uma análise documentada dos limites de uma abordagem de OCR genérico em visores de sete segmentos. É também uma base rastreável para continuar no TCC ([capítulo 12](12-trabalhos-futuros.md)).
