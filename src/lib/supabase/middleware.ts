import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
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

  // Refreshes the session (and rotates auth cookies via setAll) on every matched request
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error('Supabase session refresh failed in middleware:', err);
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Any redirect must carry the refreshed auth cookies, otherwise a rotated refresh token is lost
  // and the user gets signed out on the next request.
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  // Protected routes: /onboarding requires authentication
  if (!user && (pathname === '/onboarding' || pathname.startsWith('/onboarding/'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.search = '';
    url.searchParams.set('redirectTo', pathname);
    return redirectWithCookies(url);
  }

  // If authenticated user visits the /auth page, send them to onboarding or workspace.
  // Exact match only: /auth/callback must reach its route handler to exchange the OAuth code / honour `next`.
  if (user && (pathname === '/auth' || pathname === '/auth/')) {
    const url = request.nextUrl.clone();
    url.search = '';

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
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}
