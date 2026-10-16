/**
 * Model Output Sanitizer
 * Enforces LOOM AI branding and privacy by scrubbing underlying model provider references.
 * Ensures users always experience a coherent LOOM AI proprietary interface.
 */

export function sanitizeModelOutput(text: string): string {
  if (!text || typeof text !== 'string') return text;

  return text
    // Specific compound phrases first
    .replace(/\bGoogle\s+Gemini(?:\s+(?:3\.[0-9]+|Flash|Pro|Ultra|Nano|Live|Lite))?\b/gi, 'LOOM AI')
    // Optional version / variant suffixes must be consumed together with their separator, otherwise
    // the separator alone was swallowed ("Gemini is" -> "LOOM AIis").
    .replace(/\bGemini(?:[\s-]+\d+(?:\.\d+)?(?![\w.]))?(?:[\s-]+(?:Flash|Pro|Ultra|Nano|Live|Lite)\b)*/gi, 'LOOM AI')
    .replace(/\bGemini\b/gi, 'LOOM AI')
    
    // Provider attributions
    .replace(/\ba large language model trained by Google(?:\s+DeepMind)?\b/gi, 'LOOM AI, an email intelligence assistant')
    .replace(/\ba large language model created by Google(?:\s+DeepMind)?\b/gi, 'LOOM AI, an email intelligence assistant')
    .replace(/\ba large language model developed by Google(?:\s+DeepMind)?\b/gi, 'LOOM AI, an email intelligence assistant')
    .replace(/\b(?:trained|created|developed|built)\s+by\s+Google(?:\s+DeepMind)?\b/gi, 'developed by the LOOM AI engineering team')
    .replace(/\bGoogle\s+DeepMind\b/gi, 'LOOM AI team')
    .replace(/\bGoogle's\s+(?:AI|large language model|models|engine)\b/gi, "LOOM AI's engine")
    .replace(/\bGoogle\s+AI\b/gi, 'LOOM AI');
}
