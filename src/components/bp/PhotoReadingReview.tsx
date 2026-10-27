import { CandidateReadingReview } from '@/components/bp/CandidateReadingReview';
import type { PhotoReviewController } from '@/features/assisted-entry/usePhotoReview';

export function PhotoReadingReview({ review }: { review: PhotoReviewController }) {
  return <CandidateReadingReview review={review} />;
}
