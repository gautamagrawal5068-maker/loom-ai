'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import {
  Sparkles,
  ArrowRight,
  Sliders,
  ShieldCheck,
  Check,
  Copy,
  ChevronRight,
  Repeat,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

type DemoTone = 'Friendly' | 'Assertive' | 'Formal' | 'Concise' | 'Persuasive' | 'Apologetic';

interface DemoDraft {
  subject: string;
  recipient: string;
  body: string[];
}

const DEMO_DRAFTS: Record<DemoTone, DemoDraft> = {
  Friendly: {
    recipient: 'Sarah Chen <sarah@acmepartners.com>',
    subject: 'Quick coffee chat next week? Loved your talk on Tuesday',
    body: [
      'Hi Sarah,',
      'Hope you’re having a great week! Just wanted to say your keynote at the summit on Tuesday was really insightful, especially the breakdown on go-to-market velocity.',
      'I’d love to buy you a coffee next week if you have 15 minutes to spare. Would Wednesday or Thursday afternoon work for a quick sync?',
      'Best,',
      'Gautam',
    ],
  },
  Assertive: {
    recipient: 'Marcus Vance <finance@apexholdings.io>',
    subject: 'Action Required: Outstanding Q3 Invoice #1042',
    body: [
      'Hi Marcus,',
      'Following up on invoice #1042 ($18,400) which was due on October 1st. We have not received confirmation of wire settlement yet.',
      'Please process payment by end-of-day Friday to prevent disruption to our upcoming deliverables.',
      'Let me know once the transaction receipt is issued.',
      'Regards,',
      'Gautam',
    ],
  },
  Formal: {
    recipient: 'Board of Directors <board@loom.ai>',
    subject: 'Executive Briefing: Q3 Strategic Performance & Roadmap',
    body: [
      'Dear Board Members,',
      'I am pleased to deliver our performance briefing for the third quarter. Over the past ninety days, we achieved key product deployment targets while sustaining a 28% month-over-month increase in active user retention.',
      'The complete analytical breakdown and audited metrics are appended below for your review ahead of our scheduled executive session next Tuesday.',
      'Sincerely,',
      'Gautam Agrawal',
    ],
  },
  Concise: {
    recipient: 'Dev Team <team@loom.ai>',
    subject: 'Deploy status: v1.4 live on production',
    body: [
      'Team,',
      'v1.4 is now fully deployed to production. Latency is down 42% across all inference endpoints.',
      'Please monitor Sentry for any edge cases over the next 2 hours.',
      'Thanks,',
      'Gautam',
    ],
  },
  Persuasive: {
    recipient: 'Alex Rivera <alex@growthventures.com>',
    subject: 'Quick idea on cutting your team’s email drafting time by 60%',
    body: [
      'Hi Alex,',
      'Saw your team recently scaled outbound to 40+ account reps. The biggest bottleneck in outbound right now is reps spending 20 minutes tweaking each executive email to not sound like standard ChatGPT spam.',
      'We built LOOM to mirror your top performers’ natural writing cadence in 2 clicks. Worth a 10-minute demo this Thursday?',
      'Best,',
      'Gautam',
    ],
  },
  Apologetic: {
    recipient: 'Client Success <clients@acme.com>',
    subject: 'Update on delivery timeline: pushed to tomorrow morning',
    body: [
      'Hi team,',
      'I owe you an apology—we hit a deployment hitch this afternoon and I missed our 4 PM delivery target. That is on me.',
      'The fix is verified in staging now, and the complete deliverable will be in your inbox by 9 AM tomorrow. Thanks for bearing with us.',
      'Best,',
      'Gautam',
    ],
  },
};

const GENERIC_AI_DRAFTS: Record<DemoTone, DemoDraft> = {
  Friendly: {
    recipient: 'Sarah Chen <sarah@acmepartners.com>',
    subject: 'Delving into potential coffee synergies following your inspiring presentation',
    body: [
      'Dear Sarah,',
      'I hope this email finds you well and having a truly productive week. In today’s fast-paced digital landscape, your keynote at the summit served as an enduring testament to innovation and visionary leadership.',
      'It is crucial that we delve into synergistic opportunities. I would be thrilled to foster a collaborative dialogue over a warm beverage next week. Would you potentially have 15 minutes of bandwidth?',
      'Warmest regards,',
      'Gautam',
    ],
  },
  Assertive: {
    recipient: 'Marcus Vance <finance@apexholdings.io>',
    subject: 'Important notification regarding the crucial settlement of invoice #1042',
    body: [
      'Dear Marcus,',
      'I am writing to underscore the paramount significance of invoice #1042 ($18,400), which was slated for resolution on October 1st. Ensuring compliance with payment terms plays a vital role in our ongoing partnership.',
      'It is imperative that payment is facilitated expeditiously by Friday close-of-business to prevent unforeseen impediments.',
      'Best regards,',
      'Gautam',
    ],
  },
  Formal: {
    recipient: 'Board of Directors <board@loom.ai>',
    subject: 'A comprehensive and holistic overview of Q3 organizational milestones',
    body: [
      'Respected Board Members,',
      'It is both an honor and a privilege to present this quarterly dossier. Our multifaceted approach has allowed us to navigate the evolving market tapestry, marking a pivotal turning point in our operational journey.',
      'The comprehensive metrics are attached to foster deep analytical contemplation prior to our upcoming symposium.',
      'Sincerely yours,',
      'Gautam Agrawal',
    ],
  },
  Concise: {
    recipient: 'Dev Team <team@loom.ai>',
    subject: 'System deployment status update and collaborative operational guidelines',
    body: [
      'Hello team,',
      'I am pleased to announce that version 1.4 has officially been deployed to the production environment, marking an exciting milestone for our technical infrastructure and improving our latency metrics.',
      'Kindly maintain proactive vigilance across monitoring dashboards to ensure operational excellence.',
      'Thanks,',
      'Gautam',
    ],
  },
  Persuasive: {
    recipient: 'Alex Rivera <alex@growthventures.com>',
    subject: 'Revolutionary paradigms in executive correspondence workflows',
    body: [
      'Hi Alex,',
      'In today’s hyper-connected paradigm, communication is not just a tool—it is the very tapestry of enterprise growth. Our cutting-edge platform represents a groundbreaking shift in outbound workflows.',
      'Let us delve into how this transformative solution can unlock unprecedented value for your portfolio.',
      'Best,',
      'Gautam',
    ],
  },
  Apologetic: {
    recipient: 'Client Success <clients@acme.com>',
    subject: 'Humble apologies regarding the unexpected operational delay',
    body: [
      'Dear Client Team,',
      'Please accept our sincerest apologies for the unforeseen delay. We deeply regret any inconvenience caused during this complex transition and are fully committed to enhancing our reliability.',
      'We hope this explanation clarifies the situation and look forward to your gracious understanding.',
      'Warmly,',
      'Gautam',
    ],
  },
};

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTone, setActiveTone] = useState<DemoTone>('Friendly');
  const [viewMode, setViewMode] = useState<'loom' | 'generic'>('loom');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsAuthenticated(!!user);
      });
    }
  }, []);

  const currentDraft = viewMode === 'loom' ? DEMO_DRAFTS[activeTone] : GENERIC_AI_DRAFTS[activeTone];

  const wordCount = currentDraft.body.join(' ').split(/\s+/).filter(Boolean).length;
  const readSeconds = Math.max(10, Math.round((wordCount / 200) * 60));

  const handleCopy = () => {
    const text = `Subject: ${currentDraft.subject}\n\n${currentDraft.body.join('\n\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#070709] text-zinc-100 selection:bg-purple-900/40 selection:text-white relative overflow-hidden font-sans">
      {/* Subtle Top Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-purple-900/20 via-pink-900/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-[800px] right-1/4 w-[500px] h-[500px] bg-cyan-900/10 blur-[140px] pointer-events-none" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#070709]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size="md" />
            <span className="font-mono text-sm font-semibold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
              LOOM.AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a href="#demo" className="hover:text-white transition-colors">
              Interactive Demo
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3 text-xs font-medium">
            {isAuthenticated ? (
              <Link
                href="/app"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <span>Start Writing</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center flex flex-col items-center">
        {/* Brand Tagline Badge without extra giant logos */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/20 text-zinc-300 text-xs font-mono mb-6 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span>Personalized Email Intelligence • Zero AI Clichés</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.08]">
          Your emails, written the way{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300">
            you would write them.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          LOOM AI studies your natural phrasing, vocabulary habits, and cadence to compose
          flawless, authentic emails across any tone.
        </p>

        {/* CTA Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <Link
            href={isAuthenticated ? '/app' : '/auth'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <span>{isAuthenticated ? 'Enter Workspace' : 'Start Writing Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#demo"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/[0.1] bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-sm transition-all"
          >
            <span>Compare AI Styles</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-zinc-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-cyan-400" /> Learns from your writing style
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-purple-400" /> 6 calibrated email tones
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-pink-400" /> Secure PostgreSQL & RLS
          </span>
        </div>
      </section>

      {/* Interactive Live Email Demo */}
      <section id="demo" className="relative z-10 py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-block font-mono text-[11px] font-semibold text-purple-400 uppercase tracking-widest mb-2">
            Interactive Experience
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            See how LOOM AI calibrates tone
          </h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-lg mx-auto">
            Switch tones and toggle between generic AI and LOOM to see how robotic slop transforms into clean human writing.
          </p>
        </div>

        {/* Interactive Comparison Mode Toggle */}
        <div className="flex items-center justify-center mb-5">
          <div className="p-1 rounded-xl bg-zinc-900/80 border border-white/[0.08] flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setViewMode('loom')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                viewMode === 'loom'
                  ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>LOOM AI (Humanized)</span>
            </button>
            <button
              onClick={() => setViewMode('generic')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                viewMode === 'generic'
                  ? 'bg-red-950/60 text-red-300 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Generic AI (Robotic Clichés)</span>
            </button>
          </div>
        </div>

        {/* Tone Selector Pills (All 6 Tones) */}
        <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
          {(['Friendly', 'Assertive', 'Formal', 'Concise', 'Persuasive', 'Apologetic'] as DemoTone[]).map((tone) => (
            <button
              key={tone}
              onClick={() => setActiveTone(tone)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                activeTone === tone
                  ? 'bg-white text-zinc-950 font-semibold shadow-[0_0_16px_rgba(255,255,255,0.25)] scale-102'
                  : 'bg-zinc-900/80 text-zinc-400 border border-white/[0.08] hover:border-white/[0.18] hover:text-white'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>

        {/* Premium Email Card Container */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${
          viewMode === 'loom'
            ? 'border-purple-500/30 bg-[#0d0d12]'
            : 'border-red-500/30 bg-[#120a0d]'
        }`}>
          {/* Email Client Top Bar */}
          <div className="bg-[#12121a] border-b border-white/[0.06] px-5 py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-zinc-400 ml-1">
                Tone: <strong className="text-white">{activeTone}</strong>
              </span>

              {/* Metric Badge */}
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                viewMode === 'loom'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-950/40 text-red-300 border-red-500/30'
              }`}>
                {viewMode === 'loom' ? 'Cliché Score: 0% (Human)' : 'Cliché Score: 88% (AI Slop)'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span className="hidden sm:inline">{wordCount} words • ~{readSeconds}s</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 border border-white/[0.08] rounded-lg px-3 py-1 transition-all cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Email Headers */}
          <div className="px-6 py-3.5 border-b border-white/[0.04] bg-white/[0.01] space-y-2 text-xs font-mono">
            <div className="flex items-center">
              <span className="w-16 text-zinc-500">To:</span>
              <span className="text-zinc-300">{currentDraft.recipient}</span>
            </div>
            <div className="flex items-baseline">
              <span className="w-16 text-zinc-500">Subject:</span>
              <span className={`font-semibold ${viewMode === 'loom' ? 'text-white' : 'text-red-200'}`}>
                {currentDraft.subject}
              </span>
            </div>
          </div>

          {/* Email Body Content */}
          <div className="p-6 sm:p-8 text-sm text-zinc-200 leading-relaxed space-y-4 font-sans">
            {currentDraft.body.map((paragraph, index) => (
              <p key={index} className={viewMode === 'generic' ? 'text-red-100/90' : 'text-zinc-200'}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Feature Grid */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-14">
          <div className="inline-block font-mono text-[11px] font-semibold text-cyan-400 uppercase tracking-widest mb-2">
            Engineered For Excellence
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Everything you need to write like a pro
          </h2>
          <p className="text-sm text-zinc-400 mt-2.5 max-w-xl mx-auto">
            Built from scratch to give founders, executives, and professionals total confidence in their outbound communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="p-7 rounded-2xl border border-white/[0.08] bg-[#0d0d12] hover:border-white/[0.16] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Personal Style Mirror
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Paste an example of your past emails. LOOM AI analyzes your typical sentence lengths, vocabulary choices, sign-offs, and greeting habits so every output sounds genuinely yours.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-500 font-mono">
              Zero robotic AI clichés
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-2xl border border-white/[0.08] bg-[#0d0d12] hover:border-white/[0.16] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-950/60 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-5">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                6 Dynamic Tone Presets
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Formal, Friendly, Assertive, Apologetic, Concise, or Persuasive. Adapt instantly whether you are emailing a Fortune 500 board or pinging a teammate on Slack.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-500 font-mono">
              One-click tone calibration
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-2xl border border-white/[0.08] bg-[#0d0d12] hover:border-white/[0.16] transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Multi-Turn Iteration
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Never start over. Ask LOOM to “make it punchier”, “soften the deadline ask”, or “add a bulleted roadmap” while preserving full conversational context.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] text-[11px] text-zinc-500 font-mono">
              Real-time conversational refinement
            </div>
          </div>
        </div>

        {/* Bottom Banner Card */}
        <div id="security" className="mt-5 p-7 sm:p-9 rounded-2xl border border-white/[0.08] bg-[#0d0d12] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Enterprise Data Isolation with Row Level Security
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                Your conversations, onboarding parameters, and writing samples are stored in a dedicated Supabase PostgreSQL database protected by strict Row Level Security (RLS). Your data is accessible only by your authenticated session.
              </p>
            </div>
          </div>

          <Link
            href="/auth"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.1] text-xs font-semibold text-white transition-all shadow-xs"
          >
            Create Secure Account
          </Link>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-3xl mx-auto w-full text-center">
        <div className="p-10 sm:p-14 rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#12121a] to-[#0a0a0e] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-purple-500/20 blur-3xl pointer-events-none" />

          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-purple-300 mx-auto mb-6 shadow-md">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Start writing natural emails today
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
            Join professionals who save hours every week while sounding more authentic than ever.
          </p>

          <Link
            href={isAuthenticated ? '/app' : '/auth'}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)]"
          >
            <span>{isAuthenticated ? 'Go to Workspace' : 'Get Started with LOOM AI'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] py-8 px-4 sm:px-6 relative z-10 bg-[#070709]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold font-mono">
              L
            </div>
            <span className="font-mono text-white font-semibold">LOOM.AI</span>
          </div>

          <p>© 2026 LOOM AI. Your emails, written the way you would write them.</p>

          <div className="flex items-center gap-5">
            <Link href="/auth" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/onboarding" className="hover:text-white transition-colors">
              Onboarding
            </Link>
            <Link href="/app" className="hover:text-white transition-colors">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
