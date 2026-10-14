import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { humanizeEmailDraft } from '@/lib/humanizer';
import { calculateEstimatedCost } from '@/lib/pricing';
import { detectOffContext } from '@/lib/contextDetection';

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
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

    // 3. User session verification & server-enforced quota
    let verifiedUserId: string | null = null;
    let tokensRemaining: number = 50_000;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Unauthorized: Please sign in to draft emails with LOOM AI.' },
            { status: 401 }
          );
        }
        verifiedUserId = user.id;

        // Enforce 50,000 token quota per 5-hour window directly from server logs
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
        const { data: usageRows, error: usageErr } = await supabase
          .from('usage_logs')
          .select('total_tokens, created_at')
          .eq('user_id', verifiedUserId)
          .gte('created_at', fiveHoursAgo);

        if (!usageErr && Array.isArray(usageRows)) {
          const totalUsedInWindow = usageRows.reduce(
            (sum, row) => sum + (row.total_tokens || 0),
            0
          );

          if (totalUsedInWindow >= 50_000) {
            const earliestTime = usageRows.reduce((min, row) => {
              const t = new Date(row.created_at).getTime();
              return t < min ? t : min;
            }, Date.now());
            const resetAt = earliestTime + 5 * 60 * 60 * 1000;
            const msRemaining = Math.max(0, resetAt - Date.now());
            const hours = Math.floor(msRemaining / (1000 * 60 * 60));
            const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const timeFormatted = `${hours}h ${mins.toString().padStart(2, '0')}m`;

            return NextResponse.json(
              {
                error: `50,000 messaging token quota reached. Quota refills in ${timeFormatted}.`,
                tokensRemaining: 0,
                resetAt,
              },
              { status: 429 }
            );
          }

          tokensRemaining = Math.max(0, 50_000 - totalUsedInWindow);
        }
      } catch (authErr) {
        console.error('Session or quota verification error:', authErr);
        return NextResponse.json(
          { error: 'Unauthorized: Please sign in to draft emails with LOOM AI.' },
          { status: 401 }
        );
      }
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      messages,
      styleSample,
      tone,
      modelTier,
      context,
      writingProfile,
      userCategory,
      emailPurpose,
      preferredStyle,
    } = body;

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
    let systemPrompt = `You are LOOM AI, an exceptionally thoughtful, natural, and human-like email writing partner. Your mission is: "Your emails, written the way you would write them."

Your core qualities:
- Write with effortless human authenticity, warmth, and natural cadence. Avoid stiff corporate jargon, robotic filler, or algorithmic formulas.
- Support tones: Formal, Friendly, Assertive, Apologetic, Concise, and Persuasive.
- Adapt seamlessly to conversational flow and multi-turn revisions.

Natural Conversational Guidance:
1. CASUAL GREETINGS & CHAT:
   When the user greets you or chats conversationally ("hi", "how are you", "what can you do"), respond warmly, casually, and naturally like Claude or ChatGPT. Do NOT output a fake email draft for casual greetings.

2. EMAIL DRAFTS & REVISIONS:
   When the user asks to write, draft, reply to, or polish an email, provide an authentic, ready-to-send draft:
   Subject: [Compelling, natural subject line]

   [Email body with authentic greeting, natural phrasing, and sign-off]

3. OFF-TOPIC TASKS (MATH, CODE, HOMEWORK):
   LOOM AI is specialized for email drafting and correspondence. If the user asks you to solve math problems, write code, or perform tasks unrelated to emails, provide a concise solution followed by a gentle note:
   "(LOOM AI is specialized for email communication. Off-context queries consume additional tokens)."`;

    // Active Tone Override or Fallback to Profile Default Tone
    const effectiveTone = tone || writingProfile?.defaultTone;
    if (effectiveTone) {
      systemPrompt += `\n\nActive Requested Tone: "${effectiveTone}". Ensure the email draft adopts a ${effectiveTone.toLowerCase()} tone without sounding artificial or exaggerated.`;
    }

    // Additional background context if provided by a template or reply modal
    if (context && typeof context === 'string' && context.trim().length > 0) {
      const sanitizedContext = context.trim().slice(0, 3000);
      systemPrompt += `\n\nAdditional background details:\n"""\n${sanitizedContext}\n"""`;
    }

    // Personal Writing Profile Integration
    if (writingProfile && typeof writingProfile === 'object') {
      const profileRules: string[] = [];

      if (writingProfile.preferredLength) {
        const lenMap: Record<string, string> = {
          concise: 'Draft length: Concise and punchy (1-2 tight paragraphs).',
          balanced: 'Draft length: Balanced (2-3 well-structured paragraphs).',
          thorough: 'Draft length: In-depth and comprehensive.',
        };
        if (lenMap[writingProfile.preferredLength]) {
          profileRules.push(lenMap[writingProfile.preferredLength]);
        }
      }

      if (writingProfile.writingStyle) {
        const styleMap: Record<string, string> = {
          professional: 'Demeanor: Polished, respectful, executive professional.',
          warm: 'Demeanor: Warm, collaborative, friendly, and approachable.',
          direct: 'Demeanor: Direct, concise, action-oriented with minimal filler.',
          academic: 'Demeanor: Articulate, thoughtful, and structured.',
        };
        if (styleMap[writingProfile.writingStyle]) {
          profileRules.push(styleMap[writingProfile.writingStyle]);
        }
      }

      if (writingProfile.preferredGreeting && writingProfile.preferredGreeting.trim()) {
        profileRules.push(`Preferred greeting: "${writingProfile.preferredGreeting.trim()}"`);
      }

      if (writingProfile.preferredSignoff && writingProfile.preferredSignoff.trim()) {
        profileRules.push(`Preferred sign-off: "${writingProfile.preferredSignoff.trim()}"`);
      }

      if (writingProfile.preferredLanguage && writingProfile.preferredLanguage.trim() && writingProfile.preferredLanguage !== 'English (US)') {
        profileRules.push(`Target language: Write the email in ${writingProfile.preferredLanguage.trim()}.`);
      }

      const authorCategory = writingProfile.userCategory || userCategory;
      if (authorCategory) {
        profileRules.push(`Author Role/Background: ${authorCategory}. Frame context, perspective, and phrasing naturally as a ${authorCategory.toLowerCase()}.`);
      }

      const primaryPurpose = writingProfile.emailPurpose || emailPurpose;
      if (primaryPurpose) {
        profileRules.push(`Primary Email Domain: ${primaryPurpose}. Optimize drafts and conventions for ${primaryPurpose.toLowerCase()} correspondence.`);
      }

      const stylePref = writingProfile.preferredStyle || preferredStyle;
      if (stylePref) {
        profileRules.push(`Baseline Voice/Style: ${stylePref}.`);
      }

      if (profileRules.length > 0) {
        systemPrompt += `\n\nUser's Personal Profile Preferences:
${profileRules.map((r) => `- ${r}`).join('\n')}
(CRITICAL PRECEDENCE RULE: Explicit instructions in the user's current prompt ALWAYS take precedence over these saved profile preferences).`;
      }
    } else if (userCategory || emailPurpose || preferredStyle) {
      const profileRules: string[] = [];
      if (userCategory) profileRules.push(`Author Role/Background: ${userCategory}.`);
      if (emailPurpose) profileRules.push(`Primary Email Domain: ${emailPurpose}.`);
      if (preferredStyle) profileRules.push(`Baseline Voice/Style: ${preferredStyle}.`);
      systemPrompt += `\n\nUser's Onboarding Profile:
${profileRules.map((r) => `- ${r}`).join('\n')}`;
    }

    // Writing Style Sample (Direct prop or Profile sample)
    const effectiveSample = (styleSample || writingProfile?.styleSample || '').trim();
    if (effectiveSample.length > 0) {
      systemPrompt += `\n\nUser's Personal Writing Style Sample:
"""
${effectiveSample}
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
    let actualModelUsed = activeModel;
    let lastErrorText = '';
    let isTimeout = false;

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
            actualModelUsed = modelToTry;
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
          actualModelUsed = modelToTry;
          break;
        } catch (fetchErr: unknown) {
          const err = fetchErr as Error & { name?: string };
          if (err.name === 'AbortError' || controller.signal.aborted) {
            isTimeout = true;
            break;
          }
          console.warn(`Fetch error with model ${modelToTry}:`, fetchErr);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (isTimeout || controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Model request timed out after 35 seconds. Please try again.' },
        { status: 504 }
      );
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

    // Natural conversation token accounting:
    // Usage tokens are weighed by:
    // 1. Work done (output draft length / tokens)
    // 2. Model reasoning strength (Silk: 1.0x, Weave: 1.6x, Tapestry: 3.0x deep reasoning)
    // 3. Time taken during generation (server elapsed duration)
    // 4. Off-context surcharge (+3500 tokens if user asks non-email tasks like maths/code)
    const elapsedDurationMs = Date.now() - requestStartTime;
    const elapsedSeconds = Math.max(0.1, elapsedDurationMs / 1000);

    const offContextCheck = detectOffContext(lastUserMessage);
    const isOffContext = offContextCheck.isOffContext;

    // Check if provider reported exact token metrics
    const providerPrompt = data?.usageMetadata?.promptTokenCount ?? data?.usage?.prompt_tokens;
    const providerCandidates = data?.usageMetadata?.candidatesTokenCount ?? data?.usage?.completion_tokens;
    const providerTotal = data?.usageMetadata?.totalTokenCount ?? data?.usage?.total_tokens;
    const isProviderReported = typeof providerPrompt === 'number' && typeof providerCandidates === 'number';

    let promptTokens: number;
    let candidatesTokens: number;
    let totalTokens: number;

    if (isProviderReported) {
      promptTokens = providerPrompt;
      candidatesTokens = providerCandidates;
      totalTokens = providerTotal ?? (promptTokens + candidatesTokens);
    } else {
      // Accurate fallback estimation:
      // Count total context sent: system prompt (guidelines + persona + profile) + entire conversation messages
      const fullConversationText = (messages || []).map((m: { content: string }) => m.content || '').join('\n');
      const totalInputText = `${systemPrompt}\n${fullConversationText}`;
      promptTokens = Math.max(15, Math.ceil(totalInputText.length / 3.8));
      candidatesTokens = Math.max(15, Math.ceil((finalContent.length || extractedContent.length || 0) / 3.8));

      // Reasoning strength multipliers
      const TIER_MULTIPLIERS: Record<string, number> = {
        silk: 1.0,
        weave: 1.4,
        tapestry: 2.0,
      };
      const tierMultiplier = TIER_MULTIPLIERS[selectedTier] || 1.4;

      // Time effort tokens (~20 tokens per second of generation time)
      const timeEffortTokens = Math.round(elapsedSeconds * 20);

      // Off-context surcharge (maths, code, homework queries)
      const offContextSurcharge = isOffContext ? 2500 : 0;

      const baseWeightedTokens = promptTokens + Math.round(candidatesTokens * tierMultiplier) + timeEffortTokens;
      totalTokens = Math.max(120, baseWeightedTokens + offContextSurcharge);
    }

    const estimatedCostUsd = calculateEstimatedCost(actualModelUsed, promptTokens, candidatesTokens);

    // Persist server-side usage log in Supabase if table is present
    if (verifiedUserId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        await supabase.from('usage_logs').insert({
          user_id: verifiedUserId,
          model: actualModelUsed,
          model_tier: selectedTier,
          input_tokens: promptTokens,
          output_tokens: candidatesTokens,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCostUsd,
          success: true,
        });
      } catch {
        // Table might not exist yet; graceful fallback
      }
    }

    return NextResponse.json({
      content: finalContent,
      modelUsed: selectedTier,
      creditsCost,
      tokensUsed: totalTokens,
      remainingTokens: Math.max(0, tokensRemaining - totalTokens),
      usage: {
        promptTokens,
        candidatesTokens,
        totalTokens,
        timeTakenSec: Number(elapsedSeconds.toFixed(2)),
        modelTier: selectedTier,
        isOffContext,
        estimatedCostUsd,
        model: actualModelUsed,
        providerReported: isProviderReported,
      },
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
