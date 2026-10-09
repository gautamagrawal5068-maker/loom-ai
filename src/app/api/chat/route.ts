import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Read MODEL_API_URL and MODEL_API_KEY from environment variables
    const apiUrl = process.env.MODEL_API_URL;
    const apiKey = process.env.MODEL_API_KEY;

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

    // 3. Parse request body
    const body = await request.json();
    const { messages, styleSample, tone } = body;

    // 4. Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: "messages" array is required and cannot be empty.' },
        { status: 400 }
      );
    }

    // 5. Construct tailored system prompt
    let systemPrompt = `You are LOOM AI, an intelligent email writing assistant. Your mission is: "Your emails, written the way you would write them."

Your core capabilities:
- Write natural, personalized emails that feel human and bespoke.
- Support tones: Formal, Friendly, Assertive, Apologetic, Concise, and Persuasive.
- Learn from writing examples provided by the user to authentically mirror their style, vocabulary, sentence length, and cadence.
- Support multi-turn revisions: when the user asks to refine or tweak an email (e.g. "make it more direct", "soften the ask", "add a P.S."), keep the context and produce an updated draft.

Formatting rules:
When writing or revising an email draft, always format it as:
Subject: [Compelling, context-appropriate subject line]

[Email body, with greeting, paragraphs, and sign-off]

If the user is asking a conversational question or clarification, you may answer naturally, but when an email is requested or drafted, adhere to the Subject / Body format.`;

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

    // 6. Call model API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Build payload compatible with OpenAI / vLLM / HuggingFace TGI
    const payload = {
      model: 'loom',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    };

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 7. Handle non-2xx responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error body');
      return NextResponse.json(
        {
          error: `Model API returned error ${response.status} (${response.statusText}): ${errorText}`,
        },
        { status: 502 }
      );
    }

    // 8. Parse response JSON across various inference provider formats
    const data = await response.json();

    let extractedContent: string | null = null;

    // Format A: OpenAI / vLLM / LiteLLM chat completions
    if (
      data?.choices &&
      Array.isArray(data.choices) &&
      data.choices[0]?.message?.content
    ) {
      extractedContent = data.choices[0].message.content;
    }
    // Format B: HuggingFace array format [{ generated_text: "..." }]
    else if (Array.isArray(data) && data[0]?.generated_text) {
      extractedContent = data[0].generated_text;
    }
    // Format C: HuggingFace object format { generated_text: "..." }
    else if (data?.generated_text) {
      extractedContent = data.generated_text;
    }
    // Format D: Anthropic or generic format { content: [...] } or { content: "..." }
    else if (typeof data?.content === 'string') {
      extractedContent = data.content;
    } else if (Array.isArray(data?.content) && data.content[0]?.text) {
      extractedContent = data.content[0].text;
    }
    // Format E: Simple text/response fields
    else if (data?.text) {
      extractedContent = data.text;
    } else if (data?.response) {
      extractedContent = data.response;
    }

    if (!extractedContent) {
      return NextResponse.json(
        {
          error:
            'Unexpected response format from model API. Expected OpenAI or Hugging Face response structure.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: extractedContent.trim() });
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
