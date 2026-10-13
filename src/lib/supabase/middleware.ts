import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured yet, allow viewing routes without hard crashing
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run on static files or API routes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes: /onboarding requires authentication
  if (!user && pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If authenticated user visits /auth, send them to onboarding or workspace
  if (user && pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    
    // Check cookie, user metadata, or profiles table
    let isCompleted =
      request.cookies.get('loom_onboarding_completed')?.value === 'true' ||
      user.user_metadata?.onboarding_completed === true;

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
        // Profile table might not exist; fallback to true if user metadata exists
        isCompleted = false;
      }
    }

    if (isCompleted) {
      url.pathname = '/app';
    } else {
      url.pathname = '/onboarding';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
