import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Text } from '@/components/ui/Text';
import type { CandidateReviewView } from '@/features/assisted-entry/useCandidateReview';
import type { VoiceReviewController } from '@/features/assisted-entry/useVoiceReview';

export function VoiceReadingReview({ review, onDatePickerVisibilityChange, separateDateAndTime }: {
  review: CandidateReviewView & Pick<VoiceReviewController, 'inputIssue'>;
  onDatePickerVisibilityChange?: (isOpen: boolean) => void;
  separateDateAndTime?: boolean;
}) {
  return <>
    {review.inputIssue ? <Text accessibilityRole="alert">{review.inputIssue}</Text> : null}
    <CandidateReadingReview review={review} onDatePickerVisibilityChange={onDatePickerVisibilityChange}
      separateDateAndTime={separateDateAndTime} />
  </>;
}
