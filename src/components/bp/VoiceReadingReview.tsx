import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import { Text } from '@/components/ui/Text';
import type { VoiceReviewController } from '@/features/assisted-entry/useVoiceReview';

export function VoiceReadingReview({ review }: { review: VoiceReviewController }) {
  return <>
    {review.inputIssue ? <Text accessibilityRole="alert">{review.inputIssue}</Text> : null}
    <CandidateReadingReview review={review} />
  </>;
}
