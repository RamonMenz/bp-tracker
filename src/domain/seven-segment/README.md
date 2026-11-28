# Leitor de sete segmentos — CANDIDATO, NÃO HABILITADO

**Situação:** candidato comparativo de laboratório. **Não habilitado** no produto e **aguarda decisão
da orientadora** (P02, congelamento da decisão técnica; P106, análise dos limites; P048, mudanças de
escopo). Nenhum arquivo de `app/` ou `native-modules/` pode importar este diretório, e
`not-enabled.test.ts` falha se isso acontecer.

**O que é:** o porte em TypeScript puro (sem I/O, rede, DOM ou dependências) do H-seg v2
(`tools/lab-fotografia/hseg_v2.py`). Recebe um LCD **já retificado** em tons de cinza, cujo recorte
viria do guia de enquadramento, e o modelo do aparelho (`gtech` ou `generic`). Lê os três campos
por lógica pura. Na dúvida, o campo fica incerto e aparece vazio na revisão; o leitor nunca
completa, troca ou escolhe valores. `toCandidateSet` entrega o resultado no contrato da revisão; a
confirmação do usuário continua obrigatória antes de salvar.

**O que não está demonstrado:** os números conhecidos vêm de 20 fotos de um único autor, já vistas
durante o ajuste (**dentro da amostra**, não validação). Não houve teste em celular. Cada modelo de
aparelho exige um gabarito próprio. Detalhes, limites e o protocolo de validação com fotos novas
estão em [`docs/fotografia-lab.md`](../../../docs/fotografia-lab.md).
