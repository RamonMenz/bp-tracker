import { useRef, useState } from 'react';
import { Modal, TextInput, View } from 'react-native';

import { BpNumberInput } from '@/components/bp/BpNumberInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineFeedback } from '@/components/ui/InlineFeedback';
import { Text } from '@/components/ui/Text';
import { computeBpFieldErrors, isBpPairValid } from '@/features/readings/reading-field-errors';

export interface SecondMeasurementDialogProps {
  visible: boolean;
  isSaving: boolean;
  /** Mensagem amigável já traduzida (useSecondMeasurementFlow.saveError) — nunca error.message
   *  cru (CLAUDE.md §4.3). */
  error: string | null;
  onSubmit: (values: { systolic: string; diastolic: string; pulse: string }) => void;
  onCancel: () => void;
}

/** Scrim sobre a tela — mesmo tom de ConfirmDialog.tsx, para os dois pop-ups do app não divergirem. */
const BACKDROP_COLOR = 'rgba(15, 23, 42, 0.55)';

/**
 * Pop-up da SEGUNDA medição da sessão (protocolo AHA), no molde de `ConfirmDialog` — Card dentro
 * de um Modal transparente, com o mesmo scrim e o mesmo tratamento do botão físico "voltar" do
 * Android.
 *
 * Só os três campos numéricos: sem observação e sem seletor de horário, de propósito. A segunda
 * medição é uma confirmação rápida da primeira, e ela herda `note`/`measuredAt` do registro
 * original (é o mesmo documento que será atualizado com a média — ver
 * `useSecondMeasurementFlow.submitSecondMeasurement`). Repetir o formulário grande aqui pediria
 * ao usuário para redigitar contexto que já existe.
 *
 * Componente burro (CLAUDE.md §3.4): guarda apenas o rascunho dos próprios campos. Não salva, não
 * decide quando fechar e NÃO limpa os campos ao receber um `error` — depois de uma falha o
 * usuário precisa poder tocar "Salvar segunda medição" de novo sem redigitar nada. Quem consome
 * decide fechar ou manter aberto.
 */
export function SecondMeasurementDialog({
  visible,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: SecondMeasurementDialogProps) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');

  const diastolicRef = useRef<TextInput>(null);
  const pulseRef = useRef<TextInput>(null);

  const values = { systolic, diastolic, pulse };
  // Mesmas regras do formulário grande (reading-field-errors.ts), não uma segunda cópia delas.
  const fieldErrors = computeBpFieldErrors(values);

  // O pulso é opcional, mas, uma vez preenchido fora de faixa, trava o salvar do mesmo jeito que
  // os obrigatórios — seria rejeitado pelo schema Zod adiante de qualquer forma.
  const canSubmit = isBpPairValid(values, fieldErrors) && fieldErrors.pulse === null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Botão físico "voltar" do Android: sem isto o pop-up vira uma armadilha na única plataforma
      // nativa do app. Cai na saída segura — a primeira medição já está salva de qualquer forma.
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: BACKDROP_COLOR }}>
        <Card accessibilityViewIsModal elevation="flat" className="w-full max-w-[420px] gap-4">
          <View className="gap-1">
            <Text variant="sectionHeader">Segunda medição</Text>
            <Text variant="caption">
              Digite os valores da nova leitura. A observação e o horário continuam sendo os da primeira
              medição.
            </Text>
          </View>

          <View className="flex-row items-start gap-3">
            <BpNumberInput
              label="Sistólica"
              unit="mmHg"
              value={systolic}
              onChangeText={setSystolic}
              maxLength={3}
              errorMessage={fieldErrors.systolic ?? undefined}
              onDigitsComplete={() => diastolicRef.current?.focus()}
            />
            <BpNumberInput
              ref={diastolicRef}
              label="Diastólica"
              unit="mmHg"
              value={diastolic}
              onChangeText={setDiastolic}
              maxLength={3}
              errorMessage={fieldErrors.diastolic ?? undefined}
              onDigitsComplete={() => pulseRef.current?.focus()}
            />
          </View>

          {/* Pulso sozinho na linha, com a largura de um campo: alinhado à coluna da sistólica,
              para o par de cima continuar sendo o que puxa o olho. */}
          <View className="flex-row items-start gap-3">
            <BpNumberInput
              ref={pulseRef}
              label="Pulso"
              unit="bpm"
              value={pulse}
              onChangeText={setPulse}
              maxLength={3}
              errorMessage={fieldErrors.pulse ?? undefined}
              returnKeyType="done"
            />
            {/* Coluna vazia só para o pulso não esticar pela largura toda — o BpNumberInput é
                flex-1 e, sozinho, ficaria com o dobro da caixa dos campos de cima. */}
            <View className="flex-1" />
          </View>

          {error ? <InlineFeedback tone="danger" message={error} /> : null}

          {/* Empilhado e em largura cheia, mesmo motivo de ConfirmDialog: com o texto ampliado
              (o app nunca desativa allowFontScaling — §4.7) os rótulos não cabem em meia linha. */}
          <View className="gap-3">
            <Button
              label="Salvar segunda medição"
              onPress={() => onSubmit(values)}
              loading={isSaving}
              disabled={!canSubmit}
            />
            <Button label="Cancelar" variant="ghost" onPress={onCancel} disabled={isSaving} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
