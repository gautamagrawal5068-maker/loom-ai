import { NextRequest, NextResponse } from 'next/server';
import { humanizeEmailDraft } from '@/lib/humanizer';

export async function POST(request: NextRequest) {
  try {
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
