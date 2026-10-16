/**
 * RewriteAI Humanizer Integration
 * Uses RewriteAI API (https://rewriteai.com/api/v1/humanize) to convert AI drafts
 * into natural, authentically human text that bypasses AI detectors.
 */

export async function humanizeText(text: string): Promise<string> {
  const apiKey = process.env.REWRITEAI_API_KEY;
  if (!apiKey || !text || text.trim().length === 0) {
    return text;
  }

  const controller = new AbortController();
  // Covers the whole exchange (headers + body read) and is always cleared in `finally`
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://rewriteai.com/api/v1/humanize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      const humanized = Array.isArray(data?.results) ? data.results[0]?.text : undefined;
      if (typeof humanized === 'string' && humanized.trim()) {
        return humanized.trim();
      }
    } else {
      const errBody = await response.text().catch(() => '');
      console.warn(`RewriteAI API returned ${response.status}:`, errBody.slice(0, 500));
    }
  } catch (err) {
    console.warn('RewriteAI Humanizer call failed, using original draft:', err);
  } finally {
    clearTimeout(timeoutId);
  }

  return text;
}

export async function humanizeEmailDraft(content: string): Promise<string> {
  const subjectRegex = /^(?:#{1,3}\s*)?(?:\*{0,2}Subject:\*{0,2}\s*)(.+)$/im;
  const match = content.match(subjectRegex);

  if (match && match.index !== undefined) {
    const preamble = content.substring(0, match.index).trim();
    const subjectLine = match[0].trim();
    const bodyStartIndex = match.index + match[0].length;
    const emailBody = content.substring(bodyStartIndex).trim();

    if (emailBody.length > 0) {
      const humanizedBody = await humanizeText(emailBody);
      const parts: string[] = [];
      if (preamble) {
        parts.push(preamble);
        parts.push('');
      }
      parts.push(subjectLine);
      parts.push('');
      parts.push(humanizedBody);
      return parts.join('\n');
    }
  }

  return await humanizeText(content);
}
