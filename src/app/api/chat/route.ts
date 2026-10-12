import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { humanizeEmailDraft } from '@/lib/humanizer';

export async function POST(request: NextRequest) {
  try {
    // 1. Read MODEL_API_URL, MODEL_API_KEY, and MODEL_NAME from environment variables
    const apiUrl = process.env.MODEL_API_URL;
    const apiKey = process.env.MODEL_API_KEY;
    const modelName = process.env.MODEL_NAME || 'gemini-3.8-flash';

    // 2. Return clear error if model configuration is missing
    if (!apiUrl) {
      return NextResponse.json(
        {
          error:
            'Model API is not configured. Please set MODEL_API_URL and MODEL_API_KEY in your .env.local file or Vercel environment variables.',
        },
        { status: 503 }
      );
    }

    // 3. User session verification if Supabase configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (process.env.NODE_ENV === 'production' && !user) {
          return NextResponse.json(
            { error: 'Unauthorized: Please sign in to draft emails with LOOM AI.' },
            { status: 401 }
          );
        }
      } catch (authErr) {
        console.warn('Session verification warning:', authErr);
      }
    }

    // 4. Parse request body
    const body = await request.json();
    const { messages, styleSample, tone, modelTier } = body;

    // Model Tier Mapping: Silk (fast), Weave (balanced), Tapestry (heavyweight reasoning)
    const MODEL_TIERS: Record<string, string> = {
      silk: 'gemini-flash-lite-latest',
      weave: 'gemini-3.5-flash',
      tapestry: 'gemini-3.6-flash',
    };

    const selectedTier = (modelTier as string)?.toLowerCase() || 'weave';
    const activeModel = MODEL_TIERS[selectedTier] || modelName || 'gemini-3.5-flash';

    // 5. Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "messages" array is required and cannot be empty.' },
        { status: 400 }
      );
    }

    // 6. Construct tailored system prompt
    let systemPrompt = `You are LOOM AI, an intelligent email writing assistant. Your mission is: "Your emails, written the way you would write them."

Your core capabilities:
- Write natural, personalized emails that feel human and bespoke.
- Support tones: Formal, Friendly, Assertive, Apologetic, Concise, and Persuasive.
- Learn from writing examples provided by the user to authentically mirror their style, vocabulary, sentence length, and cadence.
- Support multi-turn revisions: when the user asks to refine or tweak an email (e.g. "make it more direct", "soften the ask", "add a P.S."), keep the context and produce an updated draft.

Formatting & Conversational Guidelines:
1. CASUAL GREETINGS & GENERAL QUESTIONS:
   If the user says a greeting (e.g. "hi", "hello", "hey", "good morning") or asks a general conversational question (e.g. "what can you do?", "how does this work?"), RESPOND CONVERSATIONALLY and warmly like Claude or ChatGPT.
   DO NOT create a fake email with "Subject:" when the user simply said "hi" or asked a question. Greet them naturally, acknowledge their name if provided, and ask what email or message they would like to draft or refine today.

2. EMAIL DRAFTS & REVISIONS:
   ONLY when the user requests, describes, or asks to write, revise, answer, or polish an email, format your response as:
   Subject: [Compelling, context-appropriate subject line]

   [Email body, with greeting, paragraphs, and sign-off]`;

    if (tone) {
      systemPrompt += `\n\nActive Requested Tone: "${tone}". Ensure the email draft adopts a ${tone.toLowerCase()} tone without sounding artificial or exaggerated.`;
    }

    if (styleSample && typeof styleSample === 'string' && styleSample.trim().length > 0) {
      systemPrompt += `\n\nUser's Personal Writing Style Sample:
"""
${styleSample.trim()}
"""
CRITICAL INSTRUCTION: Analyze the writing style above. Emulate the user's typical sentence length, vocabulary, formality, phrasing habits, and greeting/sign-off conventions so the draft sounds indistinguishable from something they wrote themselves.`;
    }

    // 7. Call model API with timeout & fallback support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const isGeminiNative = apiUrl.includes('generativelanguage.googleapis.com');

    // Candidate fallback models for Gemini native to guard against temporary Google demand spikes
    const candidateModels = isGeminiNative
      ? [activeModel, 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-lite-latest'].filter(
          (m, idx, arr) => arr.indexOf(m) === idx
        )
      : [activeModel];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!isGeminiNative && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let response: Response | undefined;
    let lastErrorText = '';

    try {
      for (const modelToTry of candidateModels) {
        let targetUrl = apiUrl;
        let payload: Record<string, unknown>;

        if (isGeminiNative) {
          targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey}`;
          const geminiContents = messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

          payload = {
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          };
        } else {
          payload = {
            model: modelToTry,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature: 0.7,
            max_tokens: 2048,
          };
        }

        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (res.ok) {
            response = res;
            break;
          }

          // If temporary overload (503) or rate limit (429) or not found (404), try fallback candidate
          lastErrorText = await res.text().catch(() => `HTTP ${res.status}`);
          if (res.status === 503 || res.status === 429 || res.status === 404) {
            console.warn(`Model ${modelToTry} returned ${res.status}, attempting fallback...`);
            continue;
          }

          // Other errors: abort fallback loop
          response = res;
          break;
        } catch (fetchErr) {
          console.warn(`Fetch error with model ${modelToTry}:`, fetchErr);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // 8. Handle non-2xx responses or failures across all candidates
    if (!response || !response.ok) {
      return NextResponse.json(
        {
          error: `Model API returned error: ${lastErrorText || response?.statusText || 'Unable to connect to model service'}`,
        },
        { status: 502 }
      );
    }

    // 9. Parse response JSON across Gemini, OpenAI, and HuggingFace formats
    const data = await response.json();

    let extractedContent: string | null = null;

    // Format A: Google Gemini native response { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    if (
      data?.candidates &&
      Array.isArray(data.candidates) &&
      data.candidates[0]?.content?.parts
    ) {
      extractedContent = data.candidates[0].content.parts
        .map((p: { text?: string }) => p.text || '')
        .join('');
    }
    // Format B: OpenAI / vLLM / LiteLLM chat completions { choices: [{ message: { content: "..." } }] }
    else if (
      data?.choices &&
      Array.isArray(data.choices) &&
      data.choices[0]?.message?.content
    ) {
      extractedContent = data.choices[0].message.content;
    }
    // Format C: HuggingFace array format [{ generated_text: "..." }]
    else if (Array.isArray(data) && data[0]?.generated_text) {
      extractedContent = data[0].generated_text;
    }
    // Format D: HuggingFace object format { generated_text: "..." }
    else if (data?.generated_text) {
      extractedContent = data.generated_text;
    }
    // Format E: Anthropic or generic format { content: [...] } or { content: "..." }
    else if (typeof data?.content === 'string') {
      extractedContent = data.content;
    } else if (Array.isArray(data?.content) && data.content[0]?.text) {
      extractedContent = data.content[0].text;
    }
    // Format F: Simple text/response fields
    else if (data?.text) {
      extractedContent = data.text;
    } else if (data?.response) {
      extractedContent = data.response;
    }

    if (!extractedContent) {
      return NextResponse.json(
        {
          error:
            'Unexpected response format from model API. Expected Gemini or OpenAI response structure.',
        },
        { status: 502 }
      );
    }

    // Detect if user message is a greeting/casual ping vs. an actual email draft request
    const lastUserMessage =
      messages && messages.length > 0 ? messages[messages.length - 1]?.content || '' : '';
    const cleanUserText = lastUserMessage.trim().toLowerCase().replace(/[^\w\s]/g, '');
    const isGreetingOrCasual =
      [
        'hi',
        'hello',
        'hey',
        'heyy',
        'heyyy',
        'good morning',
        'good afternoon',
        'good evening',
        'howdy',
        'sup',
        'yo',
        'how are you',
        'who are you',
        'what can you do',
        'help',
        'thanks',
        'thank you',
      ].includes(cleanUserText) ||
      (cleanUserText.length <= 4 && ['hi', 'hey', 'yo', 'sup'].includes(cleanUserText));

    const hasSubjectHeader = /^(?:#{1,3}\s*)?(?:\*{0,2}Subject:\*{0,2}\s*)(.+)$/im.test(
      extractedContent
    );
    const isEmailDraft = hasSubjectHeader && extractedContent.trim().length > 60;

    // Humanize draft via RewriteAI API ONLY when Tapestry model is selected AND it is an actual email draft (never on "hi" or casual chat)
    let finalContent = extractedContent.trim();
    if (selectedTier === 'tapestry' && isEmailDraft && !isGreetingOrCasual) {
      try {
        finalContent = await humanizeEmailDraft(finalContent);
      } catch (hErr) {
        console.warn('RewriteAI Humanizer error on Tapestry, using model output directly:', hErr);
      }
    }

    const MODEL_CREDIT_COSTS: Record<string, number> = {
      silk: 1,
      weave: 3,
      tapestry: 8,
    };
    // Casual pings / greetings only cost 1 credit, not full heavyweight draft price
    const creditsCost = isGreetingOrCasual ? 1 : MODEL_CREDIT_COSTS[selectedTier] || 3;

    return NextResponse.json({
      content: finalContent,
      modelUsed: selectedTier,
      creditsCost,
    });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; message?: string };

    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Model API request timed out after 30 seconds. Please try again.' },
        { status: 504 }
      );
    }

    if (err.name === 'TypeError') {
      return NextResponse.json(
        { error: `Network connection to model API failed: ${err.message}` },
        { status: 503 }
      );
    }

    if (err.name === 'SyntaxError') {
      return NextResponse.json(
        { error: 'Invalid JSON payload received in request.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Internal server error: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
