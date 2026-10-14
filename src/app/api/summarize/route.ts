import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
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
          { error: 'Unauthorized: Session verification failed.' },
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

    const { emailText } = await request.json();

    if (!emailText || typeof emailText !== 'string' || emailText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "emailText" is required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are LOOM AI's Email Intelligence Analyzer.
Analyze the received email provided by the user with extreme analytical accuracy.
DO NOT fabricate facts, dates, or requests that are not present in the text.

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

    const isGeminiNative = apiUrl.includes('generativelanguage.googleapis.com');
    const candidateModels = isGeminiNative
      ? ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.6-flash']
      : [modelName];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!isGeminiNative && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let res: Response | undefined;
    let lastErr = '';

    for (const modelToTry of candidateModels) {
      let targetUrl = apiUrl;
      let payload: Record<string, unknown>;

      if (isGeminiNative) {
        targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey}`;
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

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.ok) {
          res = response;
          break;
        } else {
          lastErr = await response.text().catch(() => response.statusText);
        }
      } catch (fErr: unknown) {
        lastErr = fErr instanceof Error ? fErr.message : 'Network error';
      }
    }

    clearTimeout(timeoutId);

    if (!res || !res.ok) {
      return NextResponse.json(
        { error: `Model service error: ${lastErr || 'Failed to connect to model service'}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    let rawText = '';

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      rawText = data.candidates[0].content.parts[0].text;
    } else if (data?.choices?.[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    } else {
      rawText = typeof data === 'string' ? data : JSON.stringify(data);
    }

    // Clean JSON markdown if wrapped in ```json
    const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json({
      mainPoints: Array.isArray(parsed.mainPoints) ? parsed.mainPoints : [],
      importantDates: Array.isArray(parsed.importantDates) ? parsed.importantDates : [],
      requiredActions: Array.isArray(parsed.requiredActions) ? parsed.requiredActions : [],
      questionsNeedingAnswers: Array.isArray(parsed.questionsNeedingAnswers) ? parsed.questionsNeedingAnswers : [],
      suggestedReplyPrompt: parsed.suggestedReplyPrompt || '',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: `Failed to summarize email: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
