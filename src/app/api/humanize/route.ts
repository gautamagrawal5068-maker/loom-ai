import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { humanizeEmailDraft } from '@/lib/humanizer';
import { sanitizeModelOutput } from '@/lib/sanitizer';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_BODY_BYTES = 100_000;
const MAX_TEXT_CHARS = 20_000;

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

    if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    let text: unknown;
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
      }
      const parsedBody: unknown = JSON.parse(rawBody);
      text = parsedBody && typeof parsedBody === 'object' ? (parsedBody as Record<string, unknown>).text : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload received in request.' }, { status: 400 });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: `Text is too long (max ${MAX_TEXT_CHARS.toLocaleString()} characters).` },
        { status: 413 }
      );
    }

    const humanized = await humanizeEmailDraft(text);
    return NextResponse.json({ text: sanitizeModelOutput(humanized) });
  } catch (err: unknown) {
    console.error('Unhandled /api/humanize error:', err);
    return NextResponse.json({ error: 'Failed to humanize text. Please try again.' }, { status: 500 });
  }
}
