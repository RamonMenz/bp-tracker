# 2. Contextualização e justificativa

[← 1. Identificação](01-identificacao.md) · [Índice](README.md) · [Próximo: 3. Referencial teórico →](03-referencial-teorico-trabalhos-correlatos.md)

## 2.1 Problema

O automonitoramento residencial da pressão arterial ajuda a acompanhar pessoas hipertensas, mas depende de duas coisas: que o paciente meça e registre com regularidade (adesão) e que o valor registrado seja confiável (TAP [P014](../fontes/tap-aferi-v1.0.md#p014)). As diretrizes brasileiras de hipertensão tratam da medição fora do consultório (referências [R1] e [R2] do [capítulo 11](11-referencias.md)). [PENDENTE: o autor deve conferir nas diretrizes as recomendações específicas sobre MRPA e AMPA que quiser citar. Este rascunho não transcreve recomendações clínicas.]

O Aferi existia antes deste ciclo com o nome BP Tracker. Ele atacava a adesão com lembretes programados, um registro curto (a tela inicial é o próprio formulário) e acessibilidade voltada a pessoas idosas. O TAP aponta duas lacunas desse produto:

1. **Entrada só manual** ([P015](../fontes/tap-aferi-v1.0.md#p015)). Digitar está sujeito a erro e cria atrito no registro. Para quem tem baixa acuidade visual, tremor ou artrite, entradas alternativas por fotografia do visor e por voz são condição de uso autônomo. As duas se complementam: a fotografia exige luz adequada e visor aceso, e a voz não depende disso.
2. **Falta de evidência comparativa** ([P016](../fontes/tap-aferi-v1.0.md#p016)). No contexto do produto, não havia medição que indicasse qual abordagem de reconhecimento atende melhor o público quanto a acurácia, latência, segurança, privacidade e custo.

Há uma terceira lacuna, de apresentação. A exportação em CSV não é um formato prático para mostrar o histórico numa consulta, e por isso o TAP prevê um PDF legível com gráfico, tabela e médias ([P023](../fontes/tap-aferi-v1.0.md#p023), [P032](../fontes/tap-aferi-v1.0.md#p032)).

## 2.2 Objetivo e entregas previstas

Objetivo geral (TAP [P019](../fontes/tap-aferi-v1.0.md#p019)): desenvolver registro assistido de medições por fotografia e por voz, oferecer a informação registrada num formato adequado à consulta médica e fundamentar a escolha técnica de cada modalidade numa comparação documentada entre abordagens alternativas.

| Entrega | Natureza no TAP | Estado em 27/11/2026 (detalhes no [capítulo 7](07-resultados.md)) |
|---|---|---|
| Registro por fotografia, com confirmação | Principal e **irredutível** ([P021](../fontes/tap-aferi-v1.0.md#p021), [P117](../fontes/tap-aferi-v1.0.md#p117)) | Fora do produto. Resultado negativo no visor de sete segmentos nas condições observadas; investigação pausada (D-001) |
| Registro por voz, em pt-BR, com confirmação | Principal; admite entrega parcial declarada ([P022](../fontes/tap-aferi-v1.0.md#p022), [P116](../fontes/tap-aferi-v1.0.md#p116)) | Capacidade demonstrada em clientes isolados; não integrada ao produto |
| Relatório PDF para consulta | Principal ([P023](../fontes/tap-aferi-v1.0.md#p023)) | Web implementada e testada; Android inexistente; nada validado em fluxo logado |
| Relatório técnico final com decisão e comparação | Principal e **irredutível** ([P024](../fontes/tap-aferi-v1.0.md#p024), [P117](../fontes/tap-aferi-v1.0.md#p117)) | Este documento. A comparação entre abordagens não foi executada ([capítulo 6](06-decisao-tecnica-comparacao.md)) |
| Complementos: observabilidade anônima, serviço próprio, indicadores agregados, testes além do necessário | Cortáveis, do último para o primeiro ([P025–P029](../fontes/tap-aferi-v1.0.md#p025)) | Não realizados como complementos (TASK-28 aberta) |

## 2.3 Justificativa acadêmica

O TAP vincula o projeto à situação desafiadora da unidade curricular: processamento digital de sinais e imagens, arquitetura de sistemas, acessibilidade e medição sistemática aplicados a um software real ([P017](../fontes/tap-aferi-v1.0.md#p017)). Como benefícios esperados, lista um produto mais acessível, entrega legível ao profissional de saúde, evidência comparativa com casos de teste rotulados reaproveitáveis e decisão técnica rastreável ([P031–P035](../fontes/tap-aferi-v1.0.md#p031)).

Neste rascunho, os três primeiros benefícios aparecem como **objetivos**, não como resultados. O estado de cada um é discutido nos capítulos [7](07-resultados.md) e [9](09-discussao-limitacoes.md). A rastreabilidade da decisão técnica é o resultado mais bem sustentado do ciclo ([capítulo 6](06-decisao-tecnica-comparacao.md)).

## 2.4 Restrições que moldaram o trabalho

As regras da [constituição do projeto](../../constitution.md), derivadas do TAP, valem para todas as escolhas:

- **Teto absoluto de R$ 300,00** para o ciclo inteiro, com preferência por camadas gratuitas e software livre (constituição §1; TAP [P073](../fontes/tap-aferi-v1.0.md#p073)).
- **Privacidade e LGPD:** imagens e áudios só em memória, sem persistência nem log; nenhum valor clínico em telemetria; envio a terceiros conta como fator desfavorável (constituição §2; TAP [P112–P113](../fontes/tap-aferi-v1.0.md#p112)). Dado de pressão arterial é dado pessoal sensível de saúde (LGPD, art. 5º, II; referência [R3]).
- **Confirmação explícita:** nenhum valor reconhecido automaticamente é gravado sem confirmação do usuário, nem em fila offline (constituição §3; TAP [P114](../fontes/tap-aferi-v1.0.md#p114)).
- **Preservação do legado:** registro manual, edição e consulta não podem perder funcionalidade nem desempenho (constituição §4; TAP [P115](../fontes/tap-aferi-v1.0.md#p115)).
- **O sistema registra e organiza, não diagnostica** (TAP [P043](../fontes/tap-aferi-v1.0.md#p043)).
- **Prazo como restrição prioritária, sem prorrogação** (TAP [P110](../fontes/tap-aferi-v1.0.md#p110)). Equipe de uma pessoa.

Ficam fora do ciclo (TAP [P038–P043](../fontes/tap-aferi-v1.0.md#p038)): avaliação de usabilidade com participantes, artigo em formato SBC, migração de infraestrutura, treino de modelos do zero, observabilidade operacional ampla, iOS, loja de aplicativos, Bluetooth, widget, modo cuidador e qualquer função diagnóstica.
