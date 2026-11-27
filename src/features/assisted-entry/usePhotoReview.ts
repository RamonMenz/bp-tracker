import { useCandidateReview } from './useCandidateReview';

// Entrada de fotografia preservada: sempre demonstrativa, sem callback clínico.
export function usePhotoReview() { return useCandidateReview('photo'); }
export type PhotoReviewController = ReturnType<typeof usePhotoReview>;
export type { CandidateReviewDraft as PhotoReviewDraft, CandidateReviewValues as PhotoReviewValues } from './useCandidateReview';
