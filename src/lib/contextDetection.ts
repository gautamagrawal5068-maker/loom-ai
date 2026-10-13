import { ModelTier, MAX_CONTEXT_WINDOW_TOKENS } from '@/types';

/**
 * Detects whether a message deviates from email correspondence into off-topic tasks
 * (such as complex math equations, coding assignments, or science homework).
 * Off-context queries incur heavier context token consumption.
 */
export function detectOffContext(text: string): { isOffContext: boolean; reason?: string } {
  if (!text) return { isOffContext: false };
  const lower = text.toLowerCase().trim();

  // Math queries: formulas, arithmetic, equations, calculus, solving for x, etc.
  const mathFormula = /\b(solve for|evaluate|simplify|derivative|integral|integrate|d\/dx|matrix|pythagorean|trigonometry|quadratic|logarithm)\b/i;
  const mathSymbols = /[-+]?\b\d+[\s]*[\+\-\*\/÷\^%×][\s]*\d+\b/;
  const mathKeywords = [
    'equation',
    'algebra',
    'calculus',
    'geometry',
    'quadratic',
    'square root',
    'solve 2x',
    'solve x',
    'solve math',
    'solve maths',
    'math problem',
    'maths problem',
    'do this math',
  ];

  const hasFinancialContext =
    lower.includes('invoice') ||
    lower.includes('budget') ||
    lower.includes('price') ||
    lower.includes('cost') ||
    lower.includes('dollar') ||
    lower.includes('$') ||
    lower.includes('% discount') ||
    lower.includes('percent');

  const isMath =
    mathFormula.test(lower) ||
    (!hasFinancialContext && mathSymbols.test(lower)) ||
    mathKeywords.some((kw) => lower.includes(kw));

  // Coding patterns (outside email inquiries)
  const codePatterns = /\b(write a (python|c\+\+|java|javascript|rust|go|sql|bash) (script|code|program|function|algorithm)|solve leetcode|debug this code)\b/i;
  const isCode = codePatterns.test(lower);

  // Homework / science essays
  const essayPatterns = /\b(write an essay on|solve this physics|chemistry equation|explain quantum|photosynthesis)\b/i;
  const isEssay = essayPatterns.test(lower);

  if (isMath) return { isOffContext: true, reason: 'math' };
  if (isCode) return { isOffContext: true, reason: 'code' };
  if (isEssay) return { isOffContext: true, reason: 'homework' };

  return { isOffContext: false };
}

/**
 * Computes realistic, dynamic context window consumption for a conversation (out of 100k max).
 * Context consumption naturally shortens the available window with each message:
 * - Base persona and system prompt instructions (~1,800 tokens)
 * - Accumulated conversation history attention (~1,200 - 2,000 tokens per turn)
 * - Raw content tokens
 * - Off-topic penalty (+3,500 tokens if user asks non-email questions like math or code)
 */
export function calculateConversationContextUsage(
  messages: Array<{ role: string; content: string }>,
  context?: string | null,
  modelTier?: ModelTier
): number {
  if (!messages || messages.length === 0) return 0;

  // 1. Base system prompt & persona guidelines
  let total = 1800;

  // 2. Extra background context if attached
  if (context && context.trim().length > 0) {
    total += Math.ceil(context.trim().length / 3.0) + 800;
  }

  // 3. Model tier reasoning footprint
  const tierContextBase: Record<string, number> = {
    silk: 700,
    weave: 1400,
    tapestry: 2200,
  };
  const tierCost = tierContextBase[modelTier || 'weave'] || 1400;

  // 4. Per-message turn accumulation
  for (const m of messages) {
    const rawLenTokens = Math.max(30, Math.ceil((m.content || '').length / 3.2));
    const turnOverhead = m.role === 'user' ? tierCost : Math.round(tierCost * 0.8);
    const offContextBonus = detectOffContext(m.content).isOffContext ? 3500 : 0;
    total += rawLenTokens + turnOverhead + offContextBonus;
  }

  return Math.min(MAX_CONTEXT_WINDOW_TOKENS, total);
}
