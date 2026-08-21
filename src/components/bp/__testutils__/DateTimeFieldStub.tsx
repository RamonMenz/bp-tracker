import { TextInput } from 'react-native';

/**
 * Stub de `@/components/ui/DateTimeField` para testes de componentes que só precisam exercitar a
 * PRÓPRIA lógica de quem o usa (ex.: ExportCsvDialog.test.tsx) — não a conversão texto↔Date do
 * seletor de verdade, que já tem cobertura própria em DateTimeField.web.test.tsx.
 *
 * Existe em módulo à parte (e não inline dentro do `jest.mock(...)` de quem consome) porque a
 * factory de `jest.mock` é IÇADA para antes de qualquer import, e o babel-plugin-jest-hoist barra
 * referência a qualquer identificador fora do escopo da factory — inclusive `TextInput` depois de
 * passar pelo babel do NativeWind, que embrulha toda JSX de componente nativo numa referência que
 * o hoist não reconhece. Um `require(...)` de um módulo à parte dentro da factory contorna isso: só
 * este arquivo (fora da factory) precisa lidar com a JSX/o wrapper do NativeWind.
 *
 * Aceita "YYYY-MM-DD" (o formato de `mode="date"`) e repassa como `Date` à meia-noite local — o
 * mesmo contrato que `DateTimeField.web.tsx::fromInputValue` já implementa e testa de verdade.
 */
export function DateTimeFieldStub({
  accessibilityLabel,
  onChange,
}: {
  accessibilityLabel?: string;
  onChange: (date: Date) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      onChangeText={(text) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

        if (match !== null) {
          onChange(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        }
      }}
    />
  );
}
