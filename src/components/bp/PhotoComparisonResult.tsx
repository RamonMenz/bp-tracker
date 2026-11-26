import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { CandidateField } from '@/domain/assisted-entry';
import type { ComparisonPass, PhotoComparison } from '@/services/recognition/photo-comparison';

function field(value: CandidateField): string {
  return value.status === 'candidate' ? String(value.value) : value.status === 'missing' ? 'ausente' : 'incerto';
}
function Pass({ title, pass }: { title: string; pass: ComparisonPass }) {
  return <Card className="gap-2">
    <Text variant="title" accessibilityRole="header">{title}</Text>
    <Text>{`SYS: ${field(pass.candidates.fields.systolic)} · DIA: ${field(pass.candidates.fields.diastolic)} · PUL: ${field(pass.candidates.fields.pulse)}`}</Text>
    <Text selectable>{pass.diagnostic.join('\n')}</Text>
  </Card>;
}
/** Avaliação somente leitura: não contém editor, seleção de melhor resultado ou confirmação. */
export function PhotoComparisonResult({ result }: { result: PhotoComparison }) {
  return <>
    <Text>Dois resultados do mesmo quadro. Compare cada campo com o cartão sintético. Nenhum resultado foi escolhido ou combinado.</Text>
    <Pass title="Original · quadro completo" pass={result.original} />
    <Pass title="Processado · região da guia" pass={result.processed} />
    <Text selectable>{result.transform.join('\n')}</Text>
  </>;
}
