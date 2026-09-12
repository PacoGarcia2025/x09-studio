import { evaluateResourceDecision, type ResourceDecisionInput } from "./decision-layer";

export type SelectResourceCandidatesInput = ResourceDecisionInput & {
  maxCandidates?: number;
};

export function selectResourceCandidates(input: SelectResourceCandidatesInput) {
  const decision = evaluateResourceDecision(input);

  const ranked = [...input.resources]
    .filter((resource) => !resource.userGalleryOnly && !resource.requiresUserConsent)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
    .slice(0, Math.max(1, input.maxCandidates ?? 3));

  return {
    ...decision,
    candidates: ranked,
  };
}
