'use client';

import { Mail, Sparkles, Reply, PenLine, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
  onOpenStyleModal: () => void;
  hasStyleSample: boolean;
}

export function WelcomeScreen({
  onSuggestionClick,
  onOpenStyleModal,
  hasStyleSample,
}: WelcomeScreenProps) {
  const suggestions = [
    {
      title: 'Write a professional email',
      description: 'Requesting project sign-off with clear timeline and deliverables',
      prompt:
        'Write a professional email requesting project approval from a senior leader with a clear timeline and resource ask.',
      icon: <Mail className="w-4 h-4 text-cyan-400" />,
    },
    {
      title: 'Make this email sound more natural',
      description: 'Polish an email draft to sound conversational and authentic',
      prompt: 'Help me make this draft sound more natural and conversational while keeping it respectful:',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    },
    {
      title: 'Write a polite follow-up',
      description: 'Checking in on an unanswered message sent earlier this week',
      prompt:
        'Write a polite, concise follow-up email checking in on an unanswered message sent 4 days ago.',
      icon: <Reply className="w-4 h-4 text-pink-400" />,
    },
    {
      title: 'Help me respond to an email',
      description: 'Drafting a thoughtful response addressing colleague queries',
      prompt: 'Help me draft a clear, helpful response to an email from a colleague asking for an update.',
      icon: <PenLine className="w-4 h-4 text-blue-400" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full my-auto animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="mb-4">
          <Logo size="lg" />
        </div>
        <p className="text-zinc-400 text-sm sm:text-base mt-1 max-w-md mx-auto leading-relaxed">
          Your emails, written the way you would write them.
        </p>
      </div>

      {/* Writing Style Action Banner */}
      <div className="w-full mb-6 p-4 rounded-2xl bg-[#121217] border border-zinc-800 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-950/40 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white font-mono">
              {hasStyleSample ? 'Personal Style Active' : 'Personalize Your Voice'}
            </h2>
            <p className="text-xs text-zinc-400">
              {hasStyleSample
                ? 'LOOM AI is mirroring your sentence length and phrasing style.'
                : 'Teach LOOM AI how you naturally write with a sample email.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenStyleModal}
          className={`shrink-0 text-xs font-mono font-medium px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            hasStyleSample
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
              : 'bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)] hover:opacity-95'
          }`}
        >
          {hasStyleSample ? 'Edit Sample' : 'Add Style Sample'}
        </button>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="group flex flex-col justify-between p-4 bg-[#121217] border border-zinc-800 rounded-2xl text-left hover:border-purple-500/50 hover:bg-zinc-900/60 shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/40 transition-colors">
                  {suggestion.icon}
                </div>
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {suggestion.title}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-xs text-zinc-400 pl-9 leading-relaxed">
              {suggestion.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
