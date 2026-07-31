export function optimizationDecision(input: { impressions: number; spend: number; purchases: number; targetCpa: number }) {
  return {
    pause: input.impressions >= 1000 && input.spend >= input.targetCpa * 1.5 && input.purchases === 0,
    qualifiesForScale: input.purchases >= 3 && input.spend / input.purchases <= input.targetCpa * .8,
  };
}
