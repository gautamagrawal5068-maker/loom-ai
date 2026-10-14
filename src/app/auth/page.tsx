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
    <div className="min-h-dvh flex flex-col justify-center items-center px-4 py-12 bg-[#090a0f] text-[#f8fafc] relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="mb-4 hover:scale-105 transition-transform">
            <Logo size="xl" withGlow={true} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'signin' ? 'Welcome back to LOOM' : 'Create your LOOM account'}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Your emails, written the way you would write them.
          </p>
        </div>

        {/* Configuration Notice */}
        {!supabaseConfigured && (
          <div className="mb-6 p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Supabase Configuration Required</span>
              Add your credentials to <code className="bg-cyan-900/40 px-1 py-0.5 rounded text-cyan-200 font-mono">.env.local</code> to activate live authentication.
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-6 sm:p-8 shadow-2xl shadow-black/60">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#121520] border border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white/[0.08] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-white/[0.08] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
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
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-white/[0.08] bg-[#121520] hover:bg-[#181b28] text-slate-200 text-xs font-medium transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
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
            <div className="flex-1 border-t border-white/[0.08]" />
            <span className="px-3 text-[11px] text-slate-500 font-mono">or email</span>
            <div className="flex-1 border-t border-white/[0.08]" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Gautam Agrawal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#121520] text-slate-100 text-xs placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gautam@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#121520] text-slate-100 text-xs placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#121520] text-slate-100 text-xs placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
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

        {/* Guest and Navigation Links */}
        <div className="flex items-center justify-between mt-6 px-1">
          <Link
            href="/landing"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 font-mono"
          >
            ← About LOOM AI
          </Link>
          <Link
            href="/app"
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 font-mono font-medium"
          >
            Continue as Guest →
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
        <div className="min-h-dvh flex items-center justify-center bg-[#090a0f]">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
