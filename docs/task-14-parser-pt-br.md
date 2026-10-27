# TASK-14 — parser determinístico pt-BR

27/10/2026. Branch `feature/task-14-parser-pt-br`, criada de `staging`
`7d72cb3347dca04bde9b8a706f523a6da245dea2`. Escopo: interpretação pura da
[spec de voz §3.3](../specs/spec-voz.md), sem STT, interface ou persistência.

Os tipos `FinalTranscript`, `CandidateField` e `CandidateSet` da
[TASK-03](https://github.com/RamonMenz/bp-tracker/blob/7fbe13784afd6b8aee0fea2aa8122150836f1028/docs/arquitetura-ia.md)
foram materializados em `src/domain/assisted-entry.ts`. A PoC dessa revisão usa
um subconjunto em `pocs/src/domain/contracts.ts`; não havia parser de voz a reutilizar.
Essa frente não foi alterada ou mesclada nesta tarefa. As evidências das TASK-01–05
continuam na branch das PoCs, sem reclassificar seu andamento neste checkout.

`interpretVoice(FinalTranscript)` devolve modalidade, instante original e campos,
sem transcrição na saída. Exige resultado final pt-BR e timestamp finito não negativo,
inclusive em runtime. Erros de contrato têm mensagem fixa, sem entrada clínica.
Não acessa relógio, histórico, disco, microfone, rede, React, Firebase ou logger;
não mantém dados entre chamadas. Não há nova dependência.

## Gramática e limites

- Inteiros canônicos por extenso de zero a 999, variante `catorze`, ou algarismos
  de até seis dígitos. Não soma sequências malformadas como `cento vinte`.
- Pares com `por` ou `/`. Multiplica ambos por dez apenas quando **ambos estão
  presentes**, com sistólica de 5 a 30 e diastólica de 3 a 20 na escala coloquial
  (faixas existentes divididas por dez). Esses limites delimitam a gramática,
  não substituem a validação clínica. Não troca campos para satisfazer SYS > DIA.
- Decimal coloquial com uma casa: `vírgula`, vírgula numérica ou ponto numérico.
  Usa décimos inteiros sem arredondamento. `13,55` e `treze vírgula cinquenta e
  cinco` são ilegíveis, sem truncamento.
- Rótulos `sistólica`, `diastólica`, `pulso` em qualquer ordem, seguidos de inteiro.
  São valores explícitos sem escala, inclusive pulso. Rótulo sem valor fica ausente;
  decimal rotulado fica incerto.
- Normaliza acentos, caixa e pontuação. Aceita introdução restrita como `minha
  pressão está`, `pressão arterial de`, conectivo `e` e unidades `mmHg`/`bpm`.
  Texto adicional desconhecido torna incertos candidatos anteriormente identificados.
- Pares não coloquiais com ambos inteiros >=30 preservam os valores. Combinações
  com escala pequena/decimal fora da gramática ficam incertas. `120 por` mantém
  SYS explícita e DIA ausente; `12 por` não autoriza multiplicação isolada.
- Limite de entrada: 2000 caracteres; excesso deixa campos incertos `unreadable`.
  Não é duração máxima de áudio ou timeout de reconhecimento.

`candidate` não equivale a dado válido ou autorizado para salvar: `80 por 120` e
`400 por 250` permanecem assim para validação futura. Sem estrutura identificável,
campos ficam `missing`. Número adicional sem rótulo não vira pulso: torna incertos
candidatos cuja aceitação exigiria descartá-lo. Par e rótulo sobrepostos são
rejeitados conservadoramente, mesmo com valores iguais.

| Motivo | Situação |
|---|---|
| `mixed-scale` | Escalas mistas, combinação fora da gramática ou escala isolada |
| `multiple-pairs` | Múltiplos pares ou correção/negação (`não`, `digo`, `corrigindo`, `ou` etc.); não escolhe a última fala |
| `ambiguous-label` | Rótulo repetido ou número reutilizado em estruturas sobrepostas |
| `unidentified-number` | Número adicional sem associação ou texto não previsto junto a candidatos |
| `unreadable` | Numeral malformado, precisão não suportada ou entrada excessiva |

## Exemplos sintéticos e reprodução

São **simulações de transcrição final**, sem comprovação de reconhecimento.
`—` significa `{ status: 'missing' }`; números são `candidate` com `value`/`basis`;
incertezas não contêm valor numérico.

| Entrada | SYS | DIA | Pulso | Base ou motivo |
|---|---:|---:|---:|---|
| doze por oito | 120 | 80 | — | `colloquial-pair` |
| cento e vinte por oitenta | 120 | 80 | — | `explicit-phrase` |
| treze vírgula cinco por oito vírgula cinco | 135 | 85 | — | `colloquial-pair` |
| 120 por 80, pulso setenta e dois | 120 | 80 | 72 | Par `explicit-phrase`, pulso `label` |
| diastólica oitenta; sistólica cento e vinte | 120 | 80 | — | `label` |
| pulso setenta e dois | — | — | 72 | `label` |
| cento e vinte | — | — | — | Sem estrutura identificável |
| doze por oitenta | incerto | incerto | — | `mixed-scale` |
| doze por oito, não, quatorze por nove | incerto | incerto | — | `multiple-pairs` |
| sistólica 120 sistólica 130 | incerto | — | — | `ambiguous-label` |
| 13,55 por 8 | incerto | incerto | — | SYS `unreadable`, DIA `mixed-scale` |
| texto vazio | — | — | — | Sem candidato |

Na raiz do repositório, com **Node 24**, sem instalar dependências:

```bash
node --input-type=module <<'JS'
import { interpretVoice } from './src/domain/interpret-voice-pt-br.ts';
// Apenas fixtures sintéticas fixas, nunca transcrições de uso.
for (const text of [
  'doze por oito',
  'treze vírgula cinco por oito vírgula cinco',
  '120 por 80, pulso setenta e dois',
  'doze por oitenta',
  'doze por oito, não, quatorze por nove',
]) {
  const candidates = interpretVoice({
    kind: 'transcript', locale: 'pt-BR', final: true,
    capturedAtMs: 1793001600000, text,
  });
  process.stdout.write(JSON.stringify({ simulacao: true, entrada: text, candidates }, null, 2) + '\n');
}
JS
```

Node pode informar reinterpretação do módulo como ESM. Não é necessário mudar
o tipo de módulo do aplicativo.

## Verificações e pendências

Testes de comportamento em `src/domain/interpret-voice-pt-br.test.ts`, com Jest
existente. Nenhum script ou dependência novo.

```bash
npm ci --ignore-scripts
npm test -- --runInBand src/domain/interpret-voice-pt-br.test.ts
npm run typecheck
npm run lint
```

Verificados: 46 testes do parser, 384 testes legados em 45 suítes, TypeScript
strict, lint e `git diff --check`. Exemplos executados com Node 24.19.0. A instalação
foi recuperada com cache npm temporário após falha inicial. Testes legados emitiram
avisos de React `act`, sem falhas.

Essas evidências cobrem interpretação e regressão automatizada, não acurácia do
motor, localidade do reconhecimento, ruído real ou dispositivo. O parser não distingue
texto alucinado de fala real; isso depende da avaliação do reconhecedor. STT,
revisão, confirmação e persistência continuam nas tarefas correspondentes.
TASK-04/05/06/15 não são concluídas por esta entrega. Modelo clínico, rules,
configuração remota e caminho manual preservados. Sem operação Firebase, commit,
push, deploy ou contratação. Horas/despesas acumuladas e saldo global continuam
não informados; não presumir R$300 disponíveis.

Próxima tarefa recomendada: antecipar a parte isolada da TASK-15, revisão editável
com fixtures sintéticas identificadas e confirmação demonstrativa sem writer clínico,
mantendo a tarefa aberta até integração e verificação real.
