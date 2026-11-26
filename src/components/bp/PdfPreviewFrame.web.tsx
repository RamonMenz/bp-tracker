import { createElement } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';
import { useColorScheme } from '@/theme/useColorScheme';

export interface PdfPreviewFrameProps {
  /** URL de objeto local (`blob:`) — nunca um endereço remoto. */
  url: string;
  title: string;
}

/**
 * Pré-visualização Web do PDF num `<iframe>` com a URL local do Blob (spec-relatorio-pdf §3.4.1):
 * o visualizador do navegador exibe o documento sem iniciar impressão nem enviar nada.
 *
 * Só embute quando o navegador declara visualizador de PDF (`navigator.pdfViewerEnabled`). Sem ele
 * (Chromium headless, alguns navegadores móveis), um `<iframe>` com PDF vira DOWNLOAD automático —
 * uma entrega sem ação do usuário (PDF-15). Nesses casos não há prévia embutida: o resumo continua
 * valendo e o arquivo só sai por "Salvar PDF".
 */
export function PdfPreviewFrame({ url, title }: PdfPreviewFrameProps) {
  const scheme = useColorScheme();
  const palette = colors[scheme];
  const canEmbed = typeof navigator !== 'undefined' && navigator.pdfViewerEnabled === true;

  if (!canEmbed) {
    return (
      <Text variant="body">
        Este navegador não exibe PDF dentro da página. Confira o resumo acima e use “Salvar PDF” para abrir o arquivo no seu leitor.
      </Text>
    );
  }

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
          // Alvo de toque ≥ 48 px (CLAUDE.md §4.7); o texto segue a tipografia do app.
          style: { minHeight: 48, display: 'flex', alignItems: 'center', textDecoration: 'underline', color: palette.primary },
        },
        <Text variant="body" color={palette.primary}>
          Abrir a pré-visualização em outra aba
        </Text>,
      )}
    </View>
  );
}
