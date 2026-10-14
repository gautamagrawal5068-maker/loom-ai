/**
 * Centralized Model Pricing & Token Usage Estimation
 * Standard token accounting per 1,000,000 tokens.
 * 
 * Note: Costs are always marked as estimates based on actual token accounting.
 */

export interface ModelPricingTier {
  id: string;
  name: string;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

export const MODEL_PRICING: Record<string, ModelPricingTier> = {
  // Silk (Fast, straightforward email generation)
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    name: 'LOOM Silk (Fast)',
    inputPerMillionUsd: 0.0375,
    outputPerMillionUsd: 0.15,
  },
  'gemini-flash-lite-latest': {
    id: 'gemini-flash-lite-latest',
    name: 'LOOM Silk (Fast)',
    inputPerMillionUsd: 0.0375,
    outputPerMillionUsd: 0.15,
  },
  // Weave (Balanced writing quality and capability)
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    name: 'LOOM Weave (Balanced)',
    inputPerMillionUsd: 0.05,
    outputPerMillionUsd: 0.20,
  },
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: 'LOOM Weave (Balanced)',
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
  },
  // Tapestry (Advanced writing for complicated emails)
  'gemini-3.6-flash': {
    id: 'gemini-3.6-flash',
    name: 'LOOM Tapestry (Advanced)',
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    name: 'LOOM Tapestry (Advanced)',
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
  },
};

/**
 * Calculates estimated cost in USD based on actual token counts.
 * Never presents estimated costs as exact bills.
 */
export function calculateEstimatedCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const tier = MODEL_PRICING[modelId] || MODEL_PRICING['gemini-3.5-flash'];
  const inputCost = (inputTokens / 1_000_000) * tier.inputPerMillionUsd;
  const outputCost = (outputTokens / 1_000_000) * tier.outputPerMillionUsd;
  const total = inputCost + outputCost;

  // Round to 6 decimal places (e.g. $0.000042)
  return Math.round(total * 1_000_000) / 1_000_000;
}

/**
 * Formats a micro-cost into a user-friendly label (e.g. "< $0.001" or "$0.0042")
 */
export function formatEstimatedCostUsd(cost: number): string {
  if (cost <= 0) return '$0.00';
  if (cost < 0.0001) return '< $0.0001';
  return `$${cost.toFixed(4)}`;
}
