import { Fragment, type ComponentType, type ReactNode } from 'react';

/**
 * Substituto mínimo do FlashList para testes: mesmo contrato (data/renderItem/ListHeaderComponent
 * /keyExtractor), sem a dependência real — @shopify/flash-list publica um import ESM que o
 * transformIgnorePatterns do projeto não cobre (só há exceção para firebase/lucide-react-native,
 * ver jest.config.js).
 *
 * Vive num arquivo à parte (em vez de dentro do factory do jest.mock) porque o plugin do
 * NativeWind reescreve TODO React.createElement do arquivo que também contém JSX — incluindo o
 * de dentro do factory — e o jest-hoist proíbe um factory de referenciar esse helper injetado.
 */
interface FlashListStubProps<TItem> {
  data: readonly TItem[];
  renderItem: (info: { item: TItem; index: number }) => ReactNode;
  ListHeaderComponent?: ComponentType | ReactNode;
  keyExtractor?: (item: TItem, index: number) => string;
}

export function FlashListStub<TItem>({ data, renderItem, ListHeaderComponent, keyExtractor }: FlashListStubProps<TItem>) {
  const header =
    typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : (ListHeaderComponent ?? null);

  return (
    <Fragment>
      {header}
      {data.map((item, index) => (
        <Fragment key={keyExtractor ? keyExtractor(item, index) : index}>{renderItem({ item, index })}</Fragment>
      ))}
    </Fragment>
  );
}
