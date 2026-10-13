'use client';

import { Mail, Sparkles, Reply, PenLine, ArrowRight, BookOpen, FileSearch } from 'lucide-react';

interface WelcomeScreenProps {
  userName?: string | null;
  onSuggestionClick: (text: string) => void;
  onOpenStyleModal: () => void;
  hasStyleSample: boolean;
  onOpenTemplatesModal?: () => void;
  onOpenReplyModal?: () => void;
  onOpenSummarizeModal?: () => void;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeScreen({
  userName,
  onSuggestionClick,
  onOpenStyleModal,
  hasStyleSample,
  onOpenTemplatesModal,
  onOpenReplyModal,
  onOpenSummarizeModal,
}: WelcomeScreenProps) {
  const greeting = userName ? `${getTimeGreeting()}, ${userName}` : getTimeGreeting();

  const suggestions = [
    {
      tag: 'Executive',
      title: 'Write a professional email',
      description: 'Requesting project sign-off with clear timeline and deliverables',
      prompt:
        'Write a professional email requesting project approval from a senior leader with a clear timeline and resource ask.',
      icon: <Mail className="w-4 h-4 text-cyan-400" />,
    },
    {
      tag: 'Polish',
      title: 'Make this draft sound natural',
      description: 'Refine an email draft to sound relaxed, authentic, and clear',
      prompt: 'Help me make this draft sound more natural and conversational while keeping it respectful:',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
    },
    {
      tag: 'Follow-up',
      title: 'Write a polite follow-up',
      description: 'Checking in on an unanswered message sent earlier this week',
      prompt:
        'Write a polite, concise follow-up email checking in on an unanswered message sent 4 days ago.',
      icon: <Reply className="w-4 h-4 text-cyan-400" />,
    },
    {
      tag: 'Response',
      title: 'Respond to an email',
      description: 'Drafting a thoughtful update addressing colleague queries',
      prompt: 'Help me draft a clear, helpful response to an email from a colleague asking for an update.',
      icon: <PenLine className="w-4 h-4 text-cyan-400" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full my-auto animate-in fade-in duration-200">
      {/* Personalized Greeting Header */}
      <div className="text-center mb-6 flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0d0f17] border border-white/[0.08] flex items-center justify-center text-cyan-400 mb-4 shadow-md">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#f8fafc] mb-2 font-sans">
          {greeting}
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          What would you like to draft today?
        </p>
      </div>

      {/* Clean Quick Action Tools */}
      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap w-full">
        {onOpenTemplatesModal && (
          <button
            type="button"
            onClick={onOpenTemplatesModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121520] hover:bg-[#181d2d] border border-white/[0.06] hover:border-cyan-500/30 text-xs font-mono text-zinc-300 transition-all cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Templates</span>
          </button>
        )}

        {onOpenReplyModal && (
          <button
            type="button"
            onClick={onOpenReplyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121520] hover:bg-[#181d2d] border border-white/[0.06] hover:border-cyan-500/30 text-xs font-mono text-zinc-300 transition-all cursor-pointer shadow-xs"
          >
            <Reply className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reply to Email</span>
          </button>
        )}

        {onOpenSummarizeModal && (
          <button
            type="button"
            onClick={onOpenSummarizeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121520] hover:bg-[#181d2d] border border-white/[0.06] hover:border-cyan-500/30 text-xs font-mono text-zinc-300 transition-all cursor-pointer shadow-xs"
          >
            <FileSearch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Summarize</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStyleModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121520] hover:bg-[#181d2d] border border-white/[0.06] hover:border-cyan-500/30 text-xs font-mono text-zinc-300 transition-all cursor-pointer shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{hasStyleSample ? 'Writing Voice (Active)' : 'Teach Voice'}</span>
        </button>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="group flex flex-col justify-between p-3.5 bg-[#0d0f17] hover:bg-[#121520] border border-white/[0.08] hover:border-cyan-500/40 rounded-xl text-left shadow-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[#121520] border border-white/[0.08]">
                  {suggestion.icon}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  {suggestion.tag}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-xs font-semibold text-[#f8fafc] block mb-0.5">
                {suggestion.title}
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
