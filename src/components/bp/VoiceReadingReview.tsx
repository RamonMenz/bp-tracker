import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Text } from '@/components/ui/Text';
import type { CandidateReviewView } from '@/features/assisted-entry/useCandidateReview';
import type { VoiceReviewController } from '@/features/assisted-entry/useVoiceReview';

export function VoiceReadingReview({ review }: { review: CandidateReviewView & Pick<VoiceReviewController, 'inputIssue'> }) {
  return <>
    {review.inputIssue ? <Text accessibilityRole="alert">{review.inputIssue}</Text> : null}
    <CandidateReadingReview review={review} />
  </>;
}
