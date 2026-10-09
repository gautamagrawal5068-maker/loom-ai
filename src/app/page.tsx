'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import {
  Sparkles,
  ArrowRight,
  Mail,
  Sliders,
  ShieldCheck,
  Check,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsAuthenticated(!!user);
      });
    }
  }, []);

  const handleCopySample = () => {
    navigator.clipboard.writeText(
      'Subject: Quick sync on Q3 roadmap\n\nHi Sarah,\n\nHope your week is off to a great start! Quick follow-up on the roadmap deliverables we reviewed on Tuesday. Everything is locked in—just have two brief questions on deployment timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex'
    );
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#09090b] text-zinc-100 selection:bg-purple-900/40 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-purple-600/15 via-pink-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-[600px] left-1/4 w-[400px] h-[400px] bg-cyan-500/5 blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between border-b border-zinc-800/60 relative z-20">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-3 font-mono text-xs">
          {isAuthenticated ? (
            <Link
              href="/app"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white font-semibold shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:opacity-95 transition-all"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth"
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 hover:border-purple-500/50 shadow-xs transition-all"
              >
                <span>Get Started</span>
                <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-20 relative z-10 max-w-5xl mx-auto w-full text-center">
        {/* Release Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-300 text-xs font-mono mb-6 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-in fade-in duration-300">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Personalized Email Intelligence</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-3xl leading-[1.12] font-mono">
          Your emails, written the way{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
            you would write them.
          </span>
        </h1>

        {/* Subhead */}
        <p className="mt-5 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-sans">
          An AI assistant that learns from your writing style, adapts across 6 distinct tones, and
          drafts emails that sound authentically like you.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 font-mono">
          <Link
            href={isAuthenticated ? '/app' : '/auth'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white text-sm font-semibold shadow-[0_0_25px_rgba(217,70,239,0.35)] hover:opacity-95 transition-all"
          >
            <span>{isAuthenticated ? 'Open Workspace' : 'Start Writing Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!isAuthenticated && (
            <Link
              href="/auth"
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-zinc-800 bg-[#121217] hover:bg-zinc-900 text-zinc-300 text-sm font-medium transition-all"
            >
              Sign In with Google
            </Link>
          )}
        </div>

        {/* Interactive Email Draft Preview Mockup */}
        <div className="mt-14 w-full max-w-2xl text-left animate-in fade-in duration-500">
          <div className="rounded-2xl border border-zinc-800 bg-[#121217] shadow-2xl overflow-hidden hover:border-zinc-700 transition-all">
            {/* Header bar */}
            <div className="bg-[#181820] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>LOOM AI DRAFT PREVIEW</span>
              </div>

              <button
                onClick={handleCopySample}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
              >
                {copiedDraft ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-500" />
                )}
                <span>{copiedDraft ? 'Copied' : 'Copy Sample'}</span>
              </button>
            </div>

            {/* Subject Row */}
            <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40 flex items-baseline gap-2.5">
              <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider select-none">
                Subject:
              </span>
              <span className="text-sm font-semibold text-white font-sans">
                Quick sync on Q3 roadmap
              </span>
            </div>

            {/* Body */}
            <div className="p-5 text-sm text-zinc-200 leading-relaxed font-sans space-y-3">
              <p>Hi Sarah,</p>
              <p>
                Hope your week is off to a great start! Quick follow-up on the roadmap deliverables
                we reviewed on Tuesday. Everything is locked in—just have two brief questions on
                deployment timeline before our partner call.
              </p>
              <p>Let me know if you have 5 mins tomorrow morning.</p>
              <p>
                Best,
                <br />
                Alex
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl border border-zinc-800 bg-[#121217]/60 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono mb-1">Writing Style Mirror</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Provide past email samples so LOOM AI adapts to your authentic sentence length,
              vocabulary habits, and sign-offs.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-800 bg-[#121217]/60 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-pink-950/40 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono mb-1">6 Expressive Tones</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Switch seamlessly between Formal, Friendly, Assertive, Apologetic, Concise, and
              Persuasive styles with one click.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-800 bg-[#121217]/60 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono mb-1">Security & Persistence</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Built on Supabase PostgreSQL with Row Level Security. Your emails and drafts are
              isolated to your authenticated account.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-6 px-4 sm:px-6 relative z-10 bg-[#0c0c10]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
          <Logo size="sm" />
          <p>© 2026 LOOM AI. Your emails, written the way you would write them.</p>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="hover:text-zinc-300 transition-colors">
              Sign In
            </Link>
            <Link href="/onboarding" className="hover:text-zinc-300 transition-colors">
              Onboarding
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
