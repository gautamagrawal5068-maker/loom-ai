'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Mail, Lock, User, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

function getSafeRedirectUrl(target: string | null): string {
  if (!target) return '/app';
  if (
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\') &&
    !target.includes('@')
  ) {
    try {
      const dummyOrigin = 'http://localhost';
      const parsed = new URL(target, dummyOrigin);
      // `/.//evil.com` normalizes to the path `//evil.com`, which the router would treat
      // as protocol-relative — reject anything whose normalized path isn't a single slash.
      if (parsed.origin === dummyOrigin && !parsed.pathname.startsWith('//')) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      return '/app';
    }
  }
  return '/app';
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirectUrl(searchParams.get('redirectTo'));
  const urlError = searchParams.get('error');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (supabaseConfigured) {
      const supabase = createClient();
      supabase.auth.getUser().then((res) => {
        if (res.data?.user) {
          router.replace(redirectTo);
        }
      });
    }
  }, [supabaseConfigured, redirectTo, router]);

  const handleGoogleSignIn = async () => {
    if (!supabaseConfigured) {
      setErrorMessage(
        'Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
      );
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      let errMessage = err instanceof Error ? err.message : 'Google authentication failed';
      if (
        errMessage.toLowerCase().includes('provider is not enabled') ||
        errMessage.toLowerCase().includes('unsupported provider')
      ) {
        errMessage =
          'Google Sign-In is not enabled yet in your Supabase project. You can sign in or create an account with Email & Password below, or enable Google under Supabase Dashboard → Authentication → Providers → Google.';
      }
      setErrorMessage(errMessage);
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      setErrorMessage(
        'Supabase is not configured yet. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
      );
      return;
    }

    if (!email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              redirectTo
            )}`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace('/onboarding');
        } else {
          setSuccessMessage(
            'Account created! Please check your email inbox to confirm your account before signing in.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check user_metadata, cookie, localStorage, and profiles table
          const isCompletedMeta = user.user_metadata?.onboarding_completed === true;
          const isCompletedCookie =
            typeof document !== 'undefined' &&
            document.cookie.includes('loom_onboarding_completed=true');
          const isCompletedLocal =
            typeof localStorage !== 'undefined' &&
            localStorage.getItem('loom_onboarding_completed') === 'true';

          let isCompletedDb = false;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', user.id)
              .single();
            isCompletedDb = !!profile?.onboarding_completed;
          } catch {
            // Profile table may not exist yet
          }

          if (isCompletedMeta || isCompletedCookie || isCompletedLocal || isCompletedDb) {
            router.replace(redirectTo || '/app');
          } else {
            router.replace('/onboarding');
          }
        } else {
          router.replace(redirectTo || '/app');
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(errMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `h-8 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-raised text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
    }`;

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pb-10 pt-[max(3rem,calc(50dvh_-_22rem))] bg-bg text-fg">
      <div className="w-full max-w-[400px] animate-fade-up">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="Loom.ai home" className="mb-6 flex rounded-xl">
            <Logo size="lg" />
          </Link>
          <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-[15px] text-fg-muted">
            Your emails, written the way you would write them.
          </p>
        </div>

        {/* Configuration notice */}
        {!supabaseConfigured && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-line-strong bg-panel px-3.5 py-2.5 text-sm leading-relaxed text-fg-muted">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <div>
              <span className="block font-medium text-fg">Supabase configuration required</span>
              Add your credentials to{' '}
              <code className="rounded bg-elevated px-1 py-0.5 font-mono text-[13px] text-fg">.env.local</code>{' '}
              to activate live authentication.
            </div>
          </div>
        )}

        {/* Mode switcher */}
        <div className="mb-6 grid grid-cols-2 rounded-full border border-line bg-panel p-1">
          <button
            type="button"
            aria-pressed={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={tabClass(mode === 'signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={tabClass(mode === 'signup')}
          >
            Create account
          </button>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm leading-relaxed text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm leading-relaxed text-success"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="btn btn-secondary btn-lg w-full gap-3"
        >
          {isGoogleLoading ? (
            <Loader2 className="size-4 animate-spin text-fg-subtle" />
          ) : (
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-xs text-fg-faint">
          <div className="h-px flex-1 bg-line" />
          <span>or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-full-name" className="label">
                Full name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
                <input
                  id="auth-full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Gautam Agrawal"
                  className="field pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="label">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gautam@company.com"
                className="field pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="label">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" />
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="btn btn-primary btn-lg mt-2 w-full"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign in' : 'Create free account'}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Guest and navigation links */}
        <div className="mt-8 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="inline-flex min-h-9 items-center rounded-md px-1 text-fg-subtle transition-colors hover:text-fg"
          >
            About Loom.ai
          </Link>
          <Link
            href="/app"
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-1 font-medium text-fg-muted transition-colors hover:text-fg"
          >
            Continue as guest
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-bg">
          <Loader2 className="size-5 animate-spin text-fg-subtle" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
