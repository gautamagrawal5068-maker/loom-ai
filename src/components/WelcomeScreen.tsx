'use client';

import type { ReactNode } from 'react';
import { Reply, BookOpen, FileSearch, Feather, ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';

interface WelcomeScreenProps {
  userName?: string | null;
  isLoading?: boolean;
  onSuggestionClick: (text: string) => void;
  onOpenStyleModal: () => void;
  hasStyleSample: boolean;
  onOpenTemplatesModal?: () => void;
  onOpenReplyModal?: () => void;
  onOpenSummarizeModal?: () => void;
  /** The composer, rendered centered under the greeting on an empty thread. */
  composer?: ReactNode;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const SUGGESTIONS = [
  {
    tag: 'Executive',
    title: 'Write a professional email',
    description: 'Request project sign-off with a clear timeline and deliverables',
    prompt:
      'Write a professional email requesting project approval from a senior leader with a clear timeline and resource ask.',
  },
  {
    tag: 'Polish',
    title: 'Make a draft sound natural',
    description: 'Relaxed, authentic, and clear — without losing respect',
    prompt: 'Help me make this draft sound more natural and conversational while keeping it respectful:',
  },
  {
    tag: 'Follow-up',
    title: 'Write a polite follow-up',
    description: 'Check in on a message that went unanswered this week',
    prompt: 'Write a polite, concise follow-up email checking in on an unanswered message sent 4 days ago.',
  },
  {
    tag: 'Response',
    title: 'Respond to a colleague',
    description: 'A thoughtful update that answers their questions',
    prompt: 'Help me draft a clear, helpful response to an email from a colleague asking for an update.',
  },
];

export function WelcomeScreen({
  userName,
  isLoading = false,
  onSuggestionClick,
  onOpenStyleModal,
  hasStyleSample,
  onOpenTemplatesModal,
  onOpenReplyModal,
  onOpenSummarizeModal,
  composer,
}: WelcomeScreenProps) {
  const greeting = userName ? `${getTimeGreeting()}, ${userName}` : getTimeGreeting();

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center animate-fade-up">
      {/* Greeting */}
      <h1
        className="font-display text-[34px] sm:text-[44px] leading-tight font-normal text-fg text-center flex items-center justify-center gap-3.5 mb-8 sm:mb-9"
      >
        <Logo size="md" className="translate-y-px" />
        <span suppressHydrationWarning>{greeting}</span>
      </h1>

      {/* Composer */}
      {composer && <div className="w-full">{composer}</div>}

      {/* Quick tools */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        {onOpenTemplatesModal && (
          <button type="button" onClick={onOpenTemplatesModal} disabled={isLoading} className="chip">
            <BookOpen className="size-3.5" />
            <span>Templates</span>
          </button>
        )}
        {onOpenReplyModal && (
          <button type="button" onClick={onOpenReplyModal} disabled={isLoading} className="chip">
            <Reply className="size-3.5" />
            <span>Reply to an email</span>
          </button>
        )}
        {onOpenSummarizeModal && (
          <button type="button" onClick={onOpenSummarizeModal} disabled={isLoading} className="chip">
            <FileSearch className="size-3.5" />
            <span>Summarize</span>
          </button>
        )}
        <button type="button" onClick={onOpenStyleModal} disabled={isLoading} className="chip">
          <Feather className="size-3.5" />
          <span>{hasStyleSample ? 'Your voice' : 'Teach your voice'}</span>
          {hasStyleSample && <span className="size-1.5 rounded-full bg-accent" aria-label="active" />}
        </button>
      </div>

      {/* Suggestions */}
      <div className="w-full mt-10 sm:mt-12">
        <div className="eyebrow px-1 mb-2.5">Start from an idea</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              onClick={() => onSuggestionClick(s.prompt)}
              disabled={isLoading}
              className="group relative flex flex-col items-start text-left rounded-2xl border border-line px-4 py-3.5 transition-colors hover:bg-hover hover:border-line-strong disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="block text-[11px] font-medium text-fg-faint mb-1">{s.tag}</span>
              <span className="block text-sm font-medium text-fg pr-6">{s.title}</span>
              <span className="block text-[13px] text-fg-subtle mt-0.5 leading-snug">{s.description}</span>
              <ArrowUpRight className="absolute top-3.5 right-3.5 size-4 text-fg-faint opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
