import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (errorParam || errorDescription) {
    console.error('[Google OAuth Callback Error]:', { errorParam, errorDescription });
    let message = errorDescription || errorParam || 'Authentication failed';
    if (message.includes('Unable to exchange external code')) {
      message =
        'Google Client Secret Mismatch: Supabase was unable to verify the code with Google because the Client Secret is invalid. Please copy the Client Secret (starts with GOCSPX-) from Google Cloud Console and paste it into Supabase Dashboard -> Authentication -> Providers -> Google without extra spaces.';
    }
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(message)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let isCompleted =
          user.user_metadata?.onboarding_completed === true ||
          (request.headers.get('cookie')?.includes('loom_onboarding_completed=true') ?? false);

        if (!isCompleted) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', user.id)
              .single();

            if (profile?.onboarding_completed) {
              isCompleted = true;
            }
          } catch {
            // Profile table may not exist yet
          }
        }

        if (isCompleted) {
          let safePath = '/app';
          if (
            next &&
            next.startsWith('/') &&
            !next.startsWith('//') &&
            !next.startsWith('/\\') &&
            !next.includes('@')
          ) {
            try {
              const parsed = new URL(next, origin);
              if (parsed.origin === origin) {
                safePath = parsed.pathname + parsed.search + parsed.hash;
              }
            } catch {
              safePath = '/app';
            }
          }
          return NextResponse.redirect(`${origin}${safePath}`);
        } else {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    } else {
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(error.message || 'Could not authenticate user')}`
      );
    }
  }

  // If code exchange failed or no code provided, redirect back to /auth with error
  return NextResponse.redirect(`${origin}/auth?error=Could%20not%20authenticate%20user`);
}
