// A API legada (documentDirectory/writeAsStringAsync) foi movida para este subpath no SDK 57 —
// a raiz 'expo-file-system' agora expõe só a API nova baseada em File/Directory/Paths.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const WRITE_FAILED_MESSAGE = 'Não foi possível preparar o arquivo para compartilhar. Tente novamente.';
const SHARE_UNAVAILABLE_MESSAGE = 'Compartilhamento não está disponível neste aparelho.';
const SHARE_FAILED_MESSAGE = 'Não foi possível compartilhar o arquivo. Tente novamente.';

export async function saveAndShareCsv(filename: string, csv: string): Promise<void> {
  const uri = `${FileSystem.documentDirectory}${filename}`;

  try {
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    throw new Error(WRITE_FAILED_MESSAGE);
  }

  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error(SHARE_UNAVAILABLE_MESSAGE);
  }

  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });
  } catch {
    throw new Error(SHARE_FAILED_MESSAGE);
  }
}
