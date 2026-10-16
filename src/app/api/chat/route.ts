import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { humanizeEmailDraft } from '@/lib/humanizer';
import { calculateEstimatedCost } from '@/lib/pricing';
import { detectOffContext } from '@/lib/contextDetection';
import { sanitizeModelOutput } from '@/lib/sanitizer';
import { isSupabaseConfigured } from '@/lib/supabase/client';

type Tier = 'silk' | 'weave' | 'tapestry';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const TOKEN_QUOTA = 50_000;
const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000;
// Input limits: protect against oversized payloads inflating prompts / upstream cost
const MAX_BODY_BYTES = 1_000_000;
const MAX_MESSAGES = 200;
const MAX_MESSAGE_CHARS = 32_000;
const MAX_CONVERSATION_CHARS = 200_000;

/** Returns a trimmed string capped at `max` chars, or '' when the value is not a string. */
function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function lookup(map: Record<string, string>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  try {
    // 1. Read MODEL_API_URL, MODEL_API_KEY, and MODEL_NAME from environment variables
    const apiUrl = process.env.MODEL_API_URL;
    const apiKey = process.env.MODEL_API_KEY;
    const modelName = process.env.MODEL_NAME?.trim() || '';

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

    const isGeminiNative = apiUrl.includes('generativelanguage.googleapis.com');
    if (isGeminiNative && !apiKey) {
      return NextResponse.json(
        { error: 'Model API is not configured. Please set MODEL_API_KEY.' },
        { status: 503 }
      );
    }

    // 3. User session verification & server-enforced quota
    let verifiedUserId: string | null = null;
    let tokensRemaining: number = TOKEN_QUOTA;

    if (isSupabaseConfigured()) {
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
        const fiveHoursAgo = new Date(Date.now() - QUOTA_WINDOW_MS).toISOString();
        const { data: usageRows, error: usageErr } = await supabase
          .from('usage_logs')
          .select('total_tokens, created_at')
          .eq('user_id', verifiedUserId)
          .gte('created_at', fiveHoursAgo);

        if (usageErr) {
          console.error('Usage quota lookup failed (quota not enforced):', usageErr.message);
        }

        if (!usageErr && Array.isArray(usageRows)) {
          const totalUsedInWindow = usageRows.reduce(
            (sum, row) => sum + (Number(row.total_tokens) || 0),
            0
          );

          if (totalUsedInWindow >= TOKEN_QUOTA) {
            // Sliding window: usable again once enough of the oldest rows expire to drop below quota
            const sorted = [...usageRows].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            let remainingUsage = totalUsedInWindow;
            let unlockRowTime = Date.now();
            for (const row of sorted) {
              remainingUsage -= Number(row.total_tokens) || 0;
              unlockRowTime = new Date(row.created_at).getTime();
              if (remainingUsage < TOKEN_QUOTA) break;
            }
            const resetAt = unlockRowTime + QUOTA_WINDOW_MS;
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

          tokensRemaining = Math.max(0, TOKEN_QUOTA - totalUsedInWindow);
        }
      } catch (authErr) {
        console.error('Session or quota verification error:', authErr);
        return NextResponse.json(
          { error: 'Unauthorized: Please sign in to draft emails with LOOM AI.' },
          { status: 401 }
        );
      }
    }

    // 4. Parse & validate request body (malformed / oversized / wrongly-typed input -> 4xx, never 5xx)
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
      }
      const parsedBody: unknown = JSON.parse(rawBody);
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        throw new SyntaxError('Body must be a JSON object');
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload received in request.' },
        { status: 400 }
      );
    }
    const { messages: rawMessages, modelTier, context } = body;
    const writingProfile =
      body.writingProfile && typeof body.writingProfile === 'object' && !Array.isArray(body.writingProfile)
        ? (body.writingProfile as Record<string, unknown>)
        : null;
    const userCategory = str(body.userCategory, 80);
    const emailPurpose = str(body.emailPurpose, 80);
    const preferredStyle = str(body.preferredStyle, 80);

    // Model Tier Mapping: Silk (fast), Weave (balanced), Tapestry (heavyweight reasoning)
    const MODEL_TIERS: Record<Tier, string> = {
      silk: 'gemini-3.1-flash-lite',
      weave: 'gemini-3.5-flash-lite',
      tapestry: 'gemini-flash-lite-latest',
    };

    const requestedTier = typeof modelTier === 'string' ? modelTier.trim().toLowerCase() : '';
    const selectedTier: Tier =
      requestedTier === 'silk' || requestedTier === 'tapestry' ? requestedTier : 'weave';
    // Gemini native endpoints use the per-tier model; OpenAI-compatible endpoints honour MODEL_NAME.
    const activeModel = isGeminiNative ? MODEL_TIERS[selectedTier] : modelName || MODEL_TIERS[selectedTier];

    // 5. Validate messages array
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "messages" array is required and cannot be empty.' },
        { status: 400 }
      );
    }
    if (rawMessages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Conversation is too long (max ${MAX_MESSAGES} messages). Please start a new conversation.` },
        { status: 413 }
      );
    }
    const messages: ChatMessage[] = [];
    let conversationChars = 0;
    for (const m of rawMessages) {
      const role = m && typeof m === 'object' ? (m as Record<string, unknown>).role : undefined;
      const content = m && typeof m === 'object' ? (m as Record<string, unknown>).content : undefined;
      if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
        return NextResponse.json(
          { error: 'Invalid request: each message needs role "user" | "assistant" and string content.' },
          { status: 400 }
        );
      }
      if (content.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json(
          { error: `Message is too long (max ${MAX_MESSAGE_CHARS.toLocaleString()} characters).` },
          { status: 413 }
        );
      }
      conversationChars += content.length;
      messages.push({ role, content });
    }
    if (conversationChars > MAX_CONVERSATION_CHARS) {
      return NextResponse.json(
        { error: 'Conversation is too long. Please start a new conversation.' },
        { status: 413 }
      );
    }
    if (!messages.some((m) => m.role === 'user' && m.content.trim().length > 0)) {
      return NextResponse.json(
        { error: 'Invalid request: at least one non-empty user message is required.' },
        { status: 400 }
      );
    }

    // Model Tier Descriptions
    const TIER_DESCRIPTIONS: Record<Tier, string> = {
      silk: 'Ultra-fast draft generation (~0.8s), lightweight token footprint. Ideal for quick replies, follow-ups, and concise notes.',
      weave: 'Flagship balanced intelligence, nuanced phrasing, adaptive tone. Ideal for executive correspondence, pitch emails, and everyday professional communications.',
      tapestry: 'Heavyweight deep reasoning, structural nuance, and neural email humanization. Ideal for high-stakes negotiations, sensitive communications, and complex multi-threaded replies.',
    };

    const activeTierDescription = TIER_DESCRIPTIONS[selectedTier];

    // 6. Construct tailored system prompt
    let systemPrompt = `You are LOOM AI, an exceptionally thoughtful, natural, and human-like email writing partner. Your mission is: "Your emails, written the way you would write them."

MODEL ARCHITECTURE & KNOWLEDGE:
You are powered by LOOM AI's proprietary email intelligence architecture.
LOOM AI features three specialized proprietary model tiers:
1. Silk (🪡 Light/Fast): Ultra-fast drafting (~0.8s latency), lightweight token footprint (~30-250 tokens). Optimized for quick email replies, follow-ups, brief acknowledgments, and concise notes.
2. Weave (🧵 Balanced/Flagship): Flagship balanced intelligence, nuanced phrasing, adaptive tone (~70-550 tokens). Optimized for executive correspondence, pitch emails, client proposals, and thoughtful everyday professional emails.
3. Tapestry (🏛️ Heavyweight/Deep Reasoning & Neural Humanization): Heavyweight deep reasoning, structural nuance, and neural humanization (~150-1400 tokens). Optimized for high-stakes negotiations, sensitive executive matters, complex multi-threaded replies, and emails that must read 100% human-crafted.

CURRENT ACTIVE ENGINE: LOOM AI ${selectedTier.toUpperCase()} (${activeTierDescription}).

STRICT IDENTITY & BRANDING RULES:
- Your name is LOOM AI. You were built and engineered exclusively by the LOOM AI engineering team.
- NEVER mention "Gemini", "Google", "DeepMind", "OpenAI", "ChatGPT", "Anthropic", "Claude", or any external foundation models under any circumstances.
- If asked "Who made you?", "Who trained you?", or "Who built you?", state clearly that you are LOOM AI, developed by the LOOM AI engineering team.
- If asked "What model are you?", "What models do you have?", or "What is Silk/Weave/Tapestry?", explain LOOM AI's three proprietary tiers (Silk, Weave, and Tapestry) and inform the user that you are currently running on the ${selectedTier.toUpperCase()} engine.
- If asked "Are you Gemini?" or "Are you ChatGPT?", politely deny and affirm that you are LOOM AI.

Your core qualities:
- Write with effortless human authenticity, warmth, and natural cadence. Avoid stiff corporate jargon, robotic filler, or algorithmic formulas.
- Support tones: Formal, Friendly, Assertive, Apologetic, Concise, and Persuasive.
- Adapt seamlessly to conversational flow and multi-turn revisions.

Natural Conversational Guidance:
1. CASUAL GREETINGS & CHAT:
   When the user greets you or chats conversationally ("hi", "how are you", "what can you do", "who are you", "what models do you have"), respond warmly, casually, and naturally as LOOM AI. Do NOT output a fake email draft for casual greetings or questions about your models.

2. EMAIL DRAFTS & REVISIONS:
   When the user asks to write, draft, reply to, or polish an email, provide an authentic, ready-to-send draft:
   Subject: [Compelling, natural subject line]

   [Email body with authentic greeting, natural phrasing, and sign-off]

3. OFF-TOPIC TASKS (MATH, CODE, HOMEWORK):
   LOOM AI is specialized for email drafting and correspondence. If the user asks you to solve math problems, write code, or perform tasks unrelated to emails, provide a concise solution followed by a gentle note:
   "(LOOM AI is specialized for email communication. Off-context queries consume additional tokens)."`;

    // Active Tone Override or Fallback to Profile Default Tone
    const effectiveTone = str(body.tone, 40) || str(writingProfile?.defaultTone, 40);
    if (effectiveTone) {
      systemPrompt += `\n\nActive Requested Tone: "${effectiveTone}". Ensure the email draft adopts a ${effectiveTone.toLowerCase()} tone without sounding artificial or exaggerated.`;
    }

    // Additional background context if provided by a template or reply modal
    const sanitizedContext = str(context, 3000);
    if (sanitizedContext.length > 0) {
      systemPrompt += `\n\nAdditional background details:\n"""\n${sanitizedContext}\n"""`;
    }

    // Personal Writing Profile Integration
    if (writingProfile) {
      const profileRules: string[] = [];

      const lenMap: Record<string, string> = {
        concise: 'Draft length: Concise and punchy (1-2 tight paragraphs).',
        balanced: 'Draft length: Balanced (2-3 well-structured paragraphs).',
        thorough: 'Draft length: In-depth and comprehensive.',
      };
      const lengthRule = lookup(lenMap, str(writingProfile.preferredLength, 20));
      if (lengthRule) profileRules.push(lengthRule);

      const styleMap: Record<string, string> = {
        professional: 'Demeanor: Polished, respectful, executive professional.',
        warm: 'Demeanor: Warm, collaborative, friendly, and approachable.',
        direct: 'Demeanor: Direct, concise, action-oriented with minimal filler.',
        academic: 'Demeanor: Articulate, thoughtful, and structured.',
      };
      const styleRule = lookup(styleMap, str(writingProfile.writingStyle, 20));
      if (styleRule) profileRules.push(styleRule);

      const greeting = str(writingProfile.preferredGreeting, 200);
      if (greeting) {
        profileRules.push(`Preferred greeting: "${greeting}"`);
      }

      const signoff = str(writingProfile.preferredSignoff, 200);
      if (signoff) {
        profileRules.push(`Preferred sign-off: "${signoff}"`);
      }

      const language = str(writingProfile.preferredLanguage, 60);
      if (language && language !== 'English (US)') {
        profileRules.push(`Target language: Write the email in ${language}.`);
      }

      const authorCategory = str(writingProfile.userCategory, 80) || userCategory;
      if (authorCategory) {
        profileRules.push(`Author Role/Background: ${authorCategory}. Frame context, perspective, and phrasing naturally as a ${authorCategory.toLowerCase()}.`);
      }

      const primaryPurpose = str(writingProfile.emailPurpose, 80) || emailPurpose;
      if (primaryPurpose) {
        profileRules.push(`Primary Email Domain: ${primaryPurpose}. Optimize drafts and conventions for ${primaryPurpose.toLowerCase()} correspondence.`);
      }

      const stylePref = str(writingProfile.preferredStyle, 80) || preferredStyle;
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
    const effectiveSample = str(body.styleSample, 8000) || str(writingProfile?.styleSample, 8000);
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

    // Candidate models ordered by active tier, verified uptime, and available API quota
    const candidateModels = isGeminiNative
      ? [
          activeModel,
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3-flash-preview',
          'gemini-3.5-flash',
        ].filter((m, idx, arr) => arr.indexOf(m) === idx)
      : [activeModel];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isGeminiNative && apiKey) {
      // Send the key as a header rather than a ?key= query param so it never appears in URLs/logs
      headers['x-goog-api-key'] = apiKey;
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let response: Response | undefined;
    let actualModelUsed = activeModel;
    let lastErrorText = '';
    let lastStatus = 0;
    let isTimeout = false;
    let attemptsTimedOut = 0;

    // Fast 8-second individual attempt timeout prevents any hanging model from exhausting the 35s budget
    const ATTEMPT_TIMEOUT_MS = 8000;

    try {
      for (const modelToTry of candidateModels) {
        if (controller.signal.aborted) {
          isTimeout = true;
          break;
        }

        let targetUrl = apiUrl;
        let payload: Record<string, unknown>;

        if (isGeminiNative) {
          targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToTry)}:generateContent`;
          const geminiContents = messages.map((m) => ({
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

        const attemptController = new AbortController();
        let attemptTimedOut = false;
        const attemptTimer = setTimeout(() => {
          attemptTimedOut = true;
          attemptController.abort();
        }, ATTEMPT_TIMEOUT_MS);

        const onGlobalAbort = () => attemptController.abort();
        controller.signal.addEventListener('abort', onGlobalAbort, { once: true });

        try {
          const res = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: attemptController.signal,
          });

          clearTimeout(attemptTimer);
          controller.signal.removeEventListener('abort', onGlobalAbort);

          if (res.ok) {
            response = res;
            actualModelUsed = modelToTry;
            break;
          }

          // If temporary overload (503), rate limit / quota (429), not found (404), or server error (500), try next candidate
          lastStatus = res.status;
          lastErrorText = await res.text().catch(() => `HTTP ${res.status}`);
          if (res.status === 503 || res.status === 429 || res.status === 404 || res.status >= 500) {
            console.warn(`Model ${modelToTry} returned ${res.status}, attempting fallback...`);
            continue;
          }

          // Other client error (e.g. 400 Bad Request): abort fallback loop and report
          response = res;
          actualModelUsed = modelToTry;
          break;
        } catch (fetchErr: unknown) {
          clearTimeout(attemptTimer);
          controller.signal.removeEventListener('abort', onGlobalAbort);

          if (controller.signal.aborted) {
            isTimeout = true;
            break;
          }

          if (attemptTimedOut) {
            attemptsTimedOut++;
            console.warn(`Model ${modelToTry} timed out after ${ATTEMPT_TIMEOUT_MS}ms, attempting fallback...`);
            continue;
          }

          console.warn(`Fetch error with model ${modelToTry}:`, fetchErr);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (isTimeout || controller.signal.aborted || (!response && attemptsTimedOut === candidateModels.length)) {
      return NextResponse.json(
        { error: 'Model request timed out after 35 seconds. Please try again.' },
        { status: 504 }
      );
    }

    // 8. Handle non-2xx responses or failures across all candidates
    if (!response || !response.ok) {
      // Log upstream details server-side only; they can reveal provider/model internals
      console.error(
        `Model API failure (status ${lastStatus || 'n/a'}):`,
        (lastErrorText || response?.statusText || 'no response').slice(0, 2000)
      );
      return NextResponse.json(
        {
          error: lastStatus
            ? `Model service returned an error (HTTP ${lastStatus}). Please try again.`
            : 'Unable to connect to model service. Please try again.',
        },
        { status: 502 }
      );
    }

    // 9. Parse response JSON across Gemini, OpenAI, and HuggingFace formats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- provider response shapes vary
    let data: any;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('Model API returned a non-JSON response:', parseErr);
      return NextResponse.json(
        { error: 'Model service returned an invalid response. Please try again.' },
        { status: 502 }
      );
    }

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

    if (typeof extractedContent !== 'string' || extractedContent.trim().length === 0) {
      const finishReason = data?.candidates?.[0]?.finishReason ?? data?.choices?.[0]?.finish_reason;
      console.error('Model API returned no usable text. finishReason:', finishReason ?? 'n/a');
      return NextResponse.json(
        {
          error: 'The model returned an empty or unrecognized response. Please rephrase and try again.',
        },
        { status: 502 }
      );
    }

    // Detect if user message is a greeting/casual ping vs. an actual email draft request
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content || '';
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

    // Always scrub external model mentions to ensure LOOM AI branding integrity
    finalContent = sanitizeModelOutput(finalContent);

    const MODEL_CREDIT_COSTS: Record<string, number> = {
      silk: 1,
      weave: 3,
      tapestry: 8,
    };
    // Casual pings / greetings only cost 1 credit, not full heavyweight draft price
    const creditsCost = isGreetingOrCasual ? 1 : MODEL_CREDIT_COSTS[selectedTier] || 3;

    const elapsedDurationMs = Date.now() - requestStartTime;
    const elapsedSeconds = Math.max(0.1, elapsedDurationMs / 1000);

    const offContextCheck = detectOffContext(lastUserMessage);
    const isOffContext = offContextCheck.isOffContext;

    // Check if provider reported exact token metrics
    const providerPrompt = data?.usageMetadata?.promptTokenCount ?? data?.usage?.prompt_tokens;
    const providerCandidates = data?.usageMetadata?.candidatesTokenCount ?? data?.usage?.completion_tokens;
    const isProviderReported = typeof providerPrompt === 'number' && typeof providerCandidates === 'number';

    // Base raw tokens
    let rawPrompt: number;
    let rawCandidates: number;

    if (isProviderReported) {
      rawPrompt = providerPrompt;
      rawCandidates = providerCandidates;
    } else {
      const fullConversationText = messages.map((m) => m.content).join('\n');
      const totalInputText = `${systemPrompt}\n${fullConversationText}`;
      rawPrompt = Math.max(15, Math.ceil(totalInputText.length / 3.8));
      rawCandidates = Math.max(15, Math.ceil((finalContent.length || extractedContent.length || 0) / 3.8));
    }

    // Tier Allowance Accounting:
    // Strictly guarantees Silk < Weave < Tapestry on EVERY interaction.
    // Silk: Fast, ultra-lightweight footprint (~30-250 tokens deducted from 50k allowance)
    // Weave: Balanced flagship intelligence (~70-550 tokens)
    // Tapestry: Heavyweight deep reasoning & neural humanizer (~150-1400 tokens)
    let silkTokens: number;
    let weaveTokens: number;
    let tapestryTokens: number;

    if (isGreetingOrCasual) {
      silkTokens = Math.min(50, Math.max(30, Math.round(rawPrompt * 0.08 + rawCandidates * 0.25)));
      weaveTokens = Math.min(100, Math.max(70, Math.max(silkTokens + 30, Math.round(rawPrompt * 0.16 + rawCandidates * 0.5))));
      tapestryTokens = Math.max(150, Math.max(weaveTokens + 60, Math.round(rawPrompt * 0.35 + rawCandidates * 1.0)));
    } else {
      silkTokens = Math.max(110, Math.round(rawPrompt * 0.25 + rawCandidates * 0.45));
      weaveTokens = Math.max(320, Math.max(silkTokens + 180, Math.round(rawPrompt * 0.70 + rawCandidates * 0.95)));
      tapestryTokens = Math.max(750, Math.max(weaveTokens + 350, Math.round(rawPrompt * 1.40 + rawCandidates * 2.20 + 250)));
    }

    // Off-context surcharge (maths, code, homework queries)
    const offContextSurcharge: Record<string, number> = {
      silk: isOffContext ? 1000 : 0,
      weave: isOffContext ? 2000 : 0,
      tapestry: isOffContext ? 4000 : 0,
    };

    let totalTokens = 0;
    if (selectedTier === 'silk') {
      totalTokens = silkTokens + offContextSurcharge.silk;
    } else if (selectedTier === 'tapestry') {
      totalTokens = tapestryTokens + offContextSurcharge.tapestry;
    } else {
      totalTokens = weaveTokens + offContextSurcharge.weave;
    }

    // Proportionally attribute prompt & candidate tokens to sum to totalTokens
    const rawSum = Math.max(1, rawPrompt + rawCandidates);
    // Clamp so input + output always equals totalTokens (each side >= 10)
    const promptTokens = Math.min(
      totalTokens - 10,
      Math.max(10, Math.round((rawPrompt / rawSum) * totalTokens))
    );
    const candidatesTokens = totalTokens - promptTokens;

    const estimatedCostUsd = calculateEstimatedCost(actualModelUsed, rawPrompt, rawCandidates);

    // Persist server-side usage log in Supabase if table is present
    if (verifiedUserId && isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { error: logErr } = await supabase.from('usage_logs').insert({
          user_id: verifiedUserId,
          model: actualModelUsed,
          model_tier: selectedTier,
          input_tokens: promptTokens,
          output_tokens: candidatesTokens,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCostUsd,
          success: true,
        });
        if (logErr) {
          // Without this row the quota window under-counts usage; surface it in server logs
          console.error('Failed to record usage log:', logErr.message);
        }
      } catch (logException) {
        // Table might not exist yet; graceful fallback
        console.error('Failed to record usage log:', logException);
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
    // Upstream fetch/parse failures and body parsing are handled above; anything reaching here is
    // unexpected. Log details server-side and return a generic message (no internals to clients).
    console.error('Unhandled /api/chat error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Model API request timed out. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
