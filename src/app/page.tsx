'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/Logo';
import { ArrowRight, ShieldCheck, Check, Copy } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { copyToClipboard } from '@/lib/clipboard';

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

  const handleCopy = async () => {
    const text = `Subject: ${currentDraft.subject}\n\n${currentDraft.body.join('\n\n')}`;
    if (await copyToClipboard(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  const isLoom = viewMode === 'loom';

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-fg font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Loom.ai home" className="shrink-0 rounded-lg">
            <Wordmark size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-fg-subtle">
            <a href="#demo" className="py-2 hover:text-fg transition-colors">
              Interactive demo
            </a>
            <a href="#features" className="py-2 hover:text-fg transition-colors">
              Features
            </a>
            <a href="#security" className="py-2 hover:text-fg transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated ? (
              <Link href="/app" className="btn btn-primary">
                <span>Open workspace</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/auth" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link href="/app" className="btn btn-primary">
                  <span>Start writing</span>
                  <ArrowRight className="size-4 hidden sm:block" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-5 sm:px-8 pt-20 sm:pt-28 lg:pt-36 pb-20 sm:pb-24">
          <div className="max-w-5xl mx-auto flex flex-col items-center text-center animate-fade-up">
            <p className="eyebrow">Personal email intelligence</p>

            <h1 className="mt-5 font-display font-normal tracking-tight text-fg text-5xl sm:text-6xl lg:text-[76px] leading-[1.02] max-w-4xl">
              Your emails, written the way{' '}
              <em className="font-display italic text-accent-strong">you would write them.</em>
            </h1>

            <p className="mt-7 text-lg leading-relaxed text-fg-muted max-w-xl">
              LOOM AI studies your natural phrasing, vocabulary habits, and cadence to compose
              authentic emails in any tone, without the robotic clichés.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Link href="/app" className="btn btn-primary btn-lg">
                <span>{isAuthenticated ? 'Enter workspace' : 'Start writing free'}</span>
                <ArrowRight className="size-4" />
              </Link>
              <a href="#demo" className="btn btn-secondary btn-lg">
                Compare AI styles
              </a>
            </div>

            <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-fg-subtle">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-fg-faint" />
                Learns from your writing style
              </li>
              <li aria-hidden="true" className="hidden sm:block text-fg-faint">·</li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-fg-faint" />
                6 calibrated email tones
              </li>
              <li aria-hidden="true" className="hidden sm:block text-fg-faint">·</li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-fg-faint" />
                Secure PostgreSQL &amp; RLS
              </li>
            </ul>
          </div>
        </section>

        {/* Interactive demo */}
        <section id="demo" className="scroll-mt-16 px-5 sm:px-8 py-20 sm:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center">
              <p className="eyebrow">Interactive demo</p>
              <h2 className="mt-3 font-display font-normal tracking-tight text-fg text-3xl sm:text-4xl">
                See how LOOM&nbsp;AI calibrates tone
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-fg-muted max-w-lg mx-auto">
                Switch tones, then compare generic AI with LOOM to see robotic filler turn into
                clean, human writing.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mt-10 flex justify-center">
              <div className="inline-flex p-1 rounded-full bg-panel border border-line" role="group" aria-label="Draft source">
                <button
                  type="button"
                  onClick={() => setViewMode('loom')}
                  aria-pressed={isLoom}
                  className={`h-8 px-3.5 rounded-full text-sm transition-colors ${
                    isLoom ? 'bg-raised text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  LOOM AI
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('generic')}
                  aria-pressed={!isLoom}
                  className={`h-8 px-3.5 rounded-full text-sm transition-colors ${
                    !isLoom ? 'bg-raised text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
                  }`}
                >
                  Generic AI
                </button>
              </div>
            </div>

            {/* Tone chips */}
            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              {(['Friendly', 'Assertive', 'Formal', 'Concise', 'Persuasive', 'Apologetic'] as DemoTone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setActiveTone(tone)}
                  data-active={activeTone === tone}
                  aria-pressed={activeTone === tone}
                  className="chip"
                >
                  {tone}
                </button>
              ))}
            </div>

            {/* Email card */}
            <div
              className={`card mt-8 rounded-2xl overflow-hidden transition-colors ${
                isLoom ? '' : 'border-danger-line'
              }`}
            >
              {/* Top bar */}
              <div className="bg-panel border-b border-line px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
                  <span className="text-sm text-fg-subtle whitespace-nowrap">
                    Tone · <span className="text-fg">{activeTone}</span>
                  </span>
                  <span
                    className={`badge whitespace-nowrap ${
                      isLoom ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                    }`}
                  >
                    {isLoom ? 'Cliché score 0% · human' : 'Cliché score 88% · AI slop'}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <span className="hidden sm:inline font-mono text-xs text-fg-subtle whitespace-nowrap">
                    {wordCount} words · ~{readSeconds}s
                  </span>
                  <button type="button" onClick={handleCopy} className="btn btn-sm btn-ghost">
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy draft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Headers */}
              <div className="px-5 sm:px-8 py-4 border-b border-line space-y-2 text-sm">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="w-16 shrink-0 text-fg-subtle">To</span>
                  <span className="text-fg-muted min-w-0 break-words">{currentDraft.recipient}</span>
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="w-16 shrink-0 text-fg-subtle">Subject</span>
                  <span className={`font-medium min-w-0 ${isLoom ? 'text-fg' : 'text-danger/85'}`}>
                    {currentDraft.subject}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-4 text-[15px] leading-7 text-fg-muted">
                {currentDraft.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 px-5 sm:px-8 py-20 sm:py-24">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-10 md:gap-16">
            <div className="md:sticky md:top-28 md:self-start">
              <p className="eyebrow">Features</p>
              <h2 className="mt-3 font-display font-normal tracking-tight text-fg text-3xl sm:text-4xl">
                Everything you need to write like a pro
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-fg-muted max-w-md">
                Built from scratch to give founders, executives, and professionals total confidence in
                their outbound communication.
              </p>
            </div>

            <ol className="border-b border-line">
              <li className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-t border-line py-8">
                <span className="font-mono text-xs text-fg-faint pt-1">01</span>
                <div>
                  <h3 className="text-base font-semibold text-fg">Personal style mirror</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    Paste an example of your past emails. LOOM AI analyzes your typical sentence lengths,
                    vocabulary choices, sign-offs, and greeting habits so every output sounds genuinely yours.
                  </p>
                  <p className="mt-3 text-sm text-fg-subtle">Zero robotic AI clichés</p>
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-t border-line py-8">
                <span className="font-mono text-xs text-fg-faint pt-1">02</span>
                <div>
                  <h3 className="text-base font-semibold text-fg">6 dynamic tone presets</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    Formal, Friendly, Assertive, Apologetic, Concise, or Persuasive. Adapt instantly whether
                    you are emailing a Fortune 500 board or pinging a teammate on Slack.
                  </p>
                  <p className="mt-3 text-sm text-fg-subtle">One-click tone calibration</p>
                </div>
              </li>
              <li className="grid grid-cols-[2.5rem_1fr] gap-x-2 border-t border-line py-8">
                <span className="font-mono text-xs text-fg-faint pt-1">03</span>
                <div>
                  <h3 className="text-base font-semibold text-fg">Multi-turn iteration</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                    Never start over. Ask LOOM to “make it punchier”, “soften the deadline ask”, or “add a
                    bulleted roadmap” while preserving full conversational context up to 100k tokens.
                  </p>
                  <p className="mt-3 text-sm text-fg-subtle">Claude &amp; ChatGPT style 100k context window</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-16 px-5 sm:px-8 pb-20 sm:pb-24">
          <div className="max-w-5xl mx-auto rounded-2xl border border-line px-6 py-7 sm:px-8 sm:py-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <ShieldCheck className="size-5 shrink-0 mt-0.5 text-fg-subtle" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-fg">
                  Enterprise data isolation with Row Level Security
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted max-w-2xl">
                  Your conversations, onboarding parameters, and writing samples are stored in a dedicated
                  Supabase PostgreSQL database protected by strict Row Level Security (RLS). Your data is
                  accessible only by your authenticated session.
                </p>
              </div>
            </div>
            <Link href="/auth" className="btn btn-secondary shrink-0 self-start md:self-center ml-9 md:ml-0">
              Create secure account
            </Link>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-5 sm:px-8">
          <div className="max-w-5xl mx-auto border-t border-line py-24 sm:py-28 text-center flex flex-col items-center">
            <h2 className="font-display font-normal tracking-tight text-fg text-4xl sm:text-5xl max-w-2xl">
              Start writing natural emails today
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted max-w-md">
              Join professionals who save hours every week while sounding more like themselves.
            </p>
            <Link href="/app" className="btn btn-primary btn-lg mt-9">
              <span>{isAuthenticated ? 'Go to workspace' : 'Get started with LOOM AI'}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-fg-subtle">
          <Wordmark size="sm" />

          <p className="text-center md:text-left">© 2026 LOOM AI. Your emails, written the way you would write them.</p>

          <div className="flex items-center gap-5">
            <Link href="/auth" className="inline-flex items-center min-h-9 hover:text-fg transition-colors">
              Sign in
            </Link>
            <Link href="/onboarding" className="inline-flex items-center min-h-9 hover:text-fg transition-colors">
              Onboarding
            </Link>
            <Link href="/app" className="inline-flex items-center min-h-9 hover:text-fg transition-colors">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
