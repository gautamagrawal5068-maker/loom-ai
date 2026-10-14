import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { humanizeEmailDraft } from '@/lib/humanizer';

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
          { error: 'Unauthorized: Please sign in to use LOOM AI.' },
          { status: 401 }
        );
      }
    }

    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const humanized = await humanizeEmailDraft(text);
    return NextResponse.json({ text: humanized });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
