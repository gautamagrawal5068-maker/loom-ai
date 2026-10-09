import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Query profile to check onboarding completion
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profile?.onboarding_completed) {
          const redirectPath = next || '/app';
          return NextResponse.redirect(`${origin}${redirectPath}`);
        } else {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  // If code exchange failed or no code provided, redirect back to /auth with error
  return NextResponse.redirect(`${origin}/auth?error=Could%20not%20authenticate%20user`);
}
