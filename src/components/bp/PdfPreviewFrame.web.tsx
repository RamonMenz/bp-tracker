import { createElement } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface PdfPreviewFrameProps {
  /** URL de objeto local (`blob:`) — nunca um endereço remoto. */
  url: string;
  title: string;
}

/**
 * Pré-visualização Web do PDF num `<iframe>` com a URL local do Blob (spec-relatorio-pdf §3.4.1):
 * o visualizador do navegador exibe o documento sem iniciar impressão nem enviar nada. Navegadores
 * móveis que não exibem PDF embutido contam com o link para abrir a prévia numa aba.
 */
export function PdfPreviewFrame({ url, title }: PdfPreviewFrameProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];

  return (
    <View className="gap-2">
      <View className="h-[360px] overflow-hidden rounded-2xl border" style={{ borderColor: palette.border }}>
        {createElement('iframe', {
          src: url,
          title,
          style: { border: 0, width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
        })}
      </View>
      {createElement(
        'a',
        {
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            color: palette.primary,
            fontSize: 16,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'inherit',
          },
        },
        'Abrir a pré-visualização em outra aba',
      )}
    </View>
  );
}
