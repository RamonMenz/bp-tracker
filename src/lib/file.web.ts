const DOWNLOAD_FAILED_MESSAGE = 'Não foi possível baixar o arquivo. Tente novamente.';

export async function saveAndShareCsv(filename: string, csv: string): Promise<void> {
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch {
    throw new Error(DOWNLOAD_FAILED_MESSAGE);
  }
}
