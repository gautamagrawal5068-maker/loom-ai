'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Mail, Lock, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/app';
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

  return (
    <div className="min-h-dvh flex flex-col justify-center items-center px-4 py-12 bg-[#191817] text-[#ecebe6] relative overflow-hidden font-sans">
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="mb-4 hover:scale-105 transition-transform">
            <Logo size="xl" withGlow={true} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' ? 'Welcome back to LOOM' : 'Create your LOOM account'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs">
            Your emails, written the way you would write them.
          </p>
        </div>

        {/* Configuration Notice */}
        {!supabaseConfigured && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Supabase Configuration Required</span>
              Add your credentials to <code className="bg-amber-900/40 px-1 py-0.5 rounded text-amber-200 font-mono">.env.local</code> to activate live authentication.
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#343230] bg-[#23211f] p-6 sm:p-8 shadow-xl">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#1a1917] border border-[#2f2d2a] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#2f2d2a] text-[#edebe6] shadow-xs'
                  : 'text-[#9e9a93] hover:text-[#edebe6]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#2f2d2a] text-[#edebe6] shadow-xs'
                  : 'text-[#9e9a93] hover:text-[#edebe6]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#383633] bg-[#1a1917] hover:bg-[#282624] text-[#edebe6] text-xs font-medium transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#cc785c]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-[#343230]" />
            <span className="px-3 text-[11px] text-[#9e9a93] font-mono">or email</span>
            <div className="flex-1 border-t border-[#343230]" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#c4c0b6] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Gautam Agrawal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#383633] bg-[#1a1917] text-[#edebe6] text-xs placeholder:text-[#6e6a64] focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c]/30 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#c4c0b6] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7e7a73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gautam@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#383633] bg-[#1a1917] text-[#edebe6] text-xs placeholder:text-[#6e6a64] focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#c4c0b6] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7e7a73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#383633] bg-[#1a1917] text-[#edebe6] text-xs placeholder:text-[#6e6a64] focus:border-[#cc785c] focus:ring-1 focus:ring-[#cc785c]/30 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#cc785c] hover:bg-[#b8684e] text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-[#9e9a93] hover:text-[#edebe6] transition-colors inline-flex items-center gap-1 font-mono"
          >
            ← Back to LOOM AI
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
        <div className="min-h-dvh flex items-center justify-center bg-[#191817]">
          <Loader2 className="w-6 h-6 animate-spin text-[#cc785c]" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
