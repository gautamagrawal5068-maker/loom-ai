import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeModelOutput } from '@/lib/sanitizer';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_BODY_BYTES = 200_000;
const MAX_EMAIL_CHARS = 50_000;

export async function POST(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Unauthorized: Please sign in to use LOOM AI.' },
            { status: 401 }
          );
        }
      } catch (authErr) {
        console.error('Session verification error:', authErr);
        return NextResponse.json(
          { error: 'Unauthorized: Please sign in to use LOOM AI.' },
          { status: 401 }
        );
      }
    }

    const apiUrl = process.env.MODEL_API_URL;
    const apiKey = process.env.MODEL_API_KEY;
    const modelName = process.env.MODEL_NAME || 'gemini-3.5-flash';

    if (!apiUrl) {
      return NextResponse.json(
        { error: 'Model API is not configured.' },
        { status: 503 }
      );
    }

    const isGeminiNative = apiUrl.includes('generativelanguage.googleapis.com');
    if (isGeminiNative && !apiKey) {
      return NextResponse.json({ error: 'Model API is not configured.' }, { status: 503 });
    }

    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    let emailText: unknown;
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
      }
      const parsedBody: unknown = JSON.parse(rawBody);
      emailText =
        parsedBody && typeof parsedBody === 'object' ? (parsedBody as Record<string, unknown>).emailText : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload received in request.' }, { status: 400 });
    }

    if (!emailText || typeof emailText !== 'string' || emailText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "emailText" is required.' },
        { status: 400 }
      );
    }
    if (emailText.length > MAX_EMAIL_CHARS) {
      return NextResponse.json(
        { error: `Email is too long to analyze (max ${MAX_EMAIL_CHARS.toLocaleString()} characters).` },
        { status: 413 }
      );
    }

    const systemPrompt = `You are LOOM AI's Email Intelligence Analyzer.
Analyze the received email provided by the user with extreme analytical accuracy.
DO NOT fabricate facts, dates, or requests that are not present in the text.
STRICT RULE: You are LOOM AI. Never mention "Gemini", "Google", or any external foundation models under any circumstances.

You MUST respond strictly with valid JSON conforming to this TypeScript interface:
{
  "mainPoints": string[],
  "importantDates": string[],
  "requiredActions": string[],
  "questionsNeedingAnswers": string[],
  "suggestedReplyPrompt": string
}

Guidelines:
- "mainPoints": 2-4 concise bullets summarizing the core message.
- "importantDates": Any explicit deadlines, meeting dates, or milestones mentioned (or empty array if none).
- "requiredActions": Tasks or next steps expected of the recipient (or empty array if none).
- "questionsNeedingAnswers": Specific questions asked in the email that require response (or empty array if none).
- "suggestedReplyPrompt": A ready-to-use prompt that acknowledges the main points and addresses the questions.`;

    const candidateModels = isGeminiNative
      ? ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3-flash-preview']
      : [modelName];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isGeminiNative && apiKey) {
      // Header instead of ?key= query param so the key never appears in URLs/logs
      headers['x-goog-api-key'] = apiKey;
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let res: Response | undefined;
    let lastErr = '';
    let lastStatus = 0;
    let timedOut = false;
    const ATTEMPT_TIMEOUT_MS = 8000;

    for (const modelToTry of candidateModels) {
      if (controller.signal.aborted) {
        timedOut = true;
        break;
      }

      let targetUrl = apiUrl;
      let payload: Record<string, unknown>;

      if (isGeminiNative) {
        targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToTry)}:generateContent`;
        payload = {
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: `Analyze this received email:\n\n${emailText}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        };
      } else {
        payload = {
          model: modelToTry,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this received email:\n\n${emailText}` },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        };
      }

      const attemptController = new AbortController();
      let attemptTimedOut = false;
      const attemptTimer = setTimeout(() => {
        attemptTimedOut = true;
        attemptController.abort();
      }, ATTEMPT_TIMEOUT_MS);

      const onGlobalAbort = () => attemptController.abort();
      controller.signal.addEventListener('abort', onGlobalAbort, { once: true });

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: attemptController.signal,
        });

        clearTimeout(attemptTimer);
        controller.signal.removeEventListener('abort', onGlobalAbort);

        if (response.ok) {
          res = response;
          break;
        } else {
          lastStatus = response.status;
          lastErr = await response.text().catch(() => response.statusText);
          if (response.status === 503 || response.status === 429 || response.status === 404 || response.status >= 500) {
            continue;
          }
          break;
        }
      } catch (fErr: unknown) {
        clearTimeout(attemptTimer);
        controller.signal.removeEventListener('abort', onGlobalAbort);

        if (controller.signal.aborted) {
          timedOut = true;
          break;
        }
        if (attemptTimedOut) {
          timedOut = true;
          continue;
        }

        lastErr = fErr instanceof Error ? fErr.message : 'Network error';
      }
    }

    clearTimeout(timeoutId);

    if (!res || !res.ok) {
      // Upstream error bodies can reveal provider internals: log them, return a generic message
      console.error(`Summarize model failure (status ${lastStatus || 'n/a'}):`, lastErr.slice(0, 2000));
      if (!res && timedOut && !lastStatus) {
        return NextResponse.json(
          { error: 'Model request timed out. Please try again.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        {
          error: lastStatus
            ? `Model service returned an error (HTTP ${lastStatus}). Please try again.`
            : 'Failed to connect to model service. Please try again.',
        },
        { status: 502 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      const data = await res.json();
      let rawText: unknown = '';
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = data.candidates[0].content.parts[0].text;
      } else if (data?.choices?.[0]?.message?.content) {
        rawText = data.choices[0].message.content;
      }
      if (typeof rawText !== 'string' || !rawText.trim()) {
        throw new Error('Model returned no text');
      }
      // Clean JSON markdown if wrapped in ```json / ``` fences
      const cleanedJson = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const candidate: unknown = JSON.parse(cleanedJson);
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        throw new Error('Model JSON is not an object');
      }
      parsed = candidate as Record<string, unknown>;
    } catch (parseErr) {
      console.error('Summarize: could not parse model output:', parseErr);
      return NextResponse.json(
        { error: 'The model returned an unreadable analysis. Please try again.' },
        { status: 502 }
      );
    }

    const sanitizeList = (arr: unknown) =>
      Array.isArray(arr) ? arr.map((item) => sanitizeModelOutput(String(item))) : [];

    return NextResponse.json({
      mainPoints: sanitizeList(parsed.mainPoints),
      importantDates: sanitizeList(parsed.importantDates),
      requiredActions: sanitizeList(parsed.requiredActions),
      questionsNeedingAnswers: sanitizeList(parsed.questionsNeedingAnswers),
      suggestedReplyPrompt:
        typeof parsed.suggestedReplyPrompt === 'string'
          ? sanitizeModelOutput(parsed.suggestedReplyPrompt)
          : '',
    });
  } catch (error: unknown) {
    console.error('Unhandled /api/summarize error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize email. Please try again.' },
      { status: 500 }
    );
  }
}
