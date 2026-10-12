'use client';

import { Mail, Sparkles, Reply, PenLine, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  userName?: string | null;
  onSuggestionClick: (text: string) => void;
  onOpenStyleModal: () => void;
  hasStyleSample: boolean;
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
}: WelcomeScreenProps) {
  const greeting = userName ? `${getTimeGreeting()}, ${userName}` : getTimeGreeting();

  const suggestions = [
    {
      tag: 'Executive',
      title: 'Write a professional email',
      description: 'Requesting project sign-off with clear timeline and deliverables',
      prompt:
        'Write a professional email requesting project approval from a senior leader with a clear timeline and resource ask.',
      icon: <Mail className="w-4 h-4 text-[#cc785c]" />,
    },
    {
      tag: 'Polish',
      title: 'Make this draft sound natural',
      description: 'Refine an email draft to sound relaxed, authentic, and clear',
      prompt: 'Help me make this draft sound more natural and conversational while keeping it respectful:',
      icon: <Sparkles className="w-4 h-4 text-[#cc785c]" />,
    },
    {
      tag: 'Follow-up',
      title: 'Write a polite follow-up',
      description: 'Checking in on an unanswered message sent earlier this week',
      prompt:
        'Write a polite, concise follow-up email checking in on an unanswered message sent 4 days ago.',
      icon: <Reply className="w-4 h-4 text-[#cc785c]" />,
    },
    {
      tag: 'Response',
      title: 'Respond to an email',
      description: 'Drafting a thoughtful update addressing colleague queries',
      prompt: 'Help me draft a clear, helpful response to an email from a colleague asking for an update.',
      icon: <PenLine className="w-4 h-4 text-[#cc785c]" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full my-auto animate-in fade-in duration-200">
      {/* Claude / GPT Style Personalized Greeting Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#23211f] border border-[#383633] flex items-center justify-center text-[#cc785c] mb-4 shadow-sm">
          <Sparkles className="w-6 h-6 text-[#cc785c]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[#edebe6] mb-2 font-serif">
          {greeting}
        </h1>
        <p className="text-[#9f9d96] text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          What would you like to draft today?
        </p>
      </div>

      {/* Writing Voice Banner */}
      <div className="w-full mb-5 p-3.5 rounded-2xl bg-[#21201e] border border-[#34322e] flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#282624] text-[#cc785c] border border-[#3a3834]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#edebe6] font-mono flex items-center gap-2">
              <span>{hasStyleSample ? 'Writing Voice Active' : 'Teach LOOM Your Voice'}</span>
              {hasStyleSample && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </h2>
            <p className="text-[11px] text-[#9f9d96]">
              {hasStyleSample
                ? 'Mirroring your typical sentence length, vocabulary, and sign-offs.'
                : 'Paste a past email sample to adapt drafts to your authentic cadence.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenStyleModal}
          className={`shrink-0 text-xs font-mono font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer border ${
            hasStyleSample
              ? 'bg-[#282624] hover:bg-[#302e2b] text-[#c8c5bc] border-[#383633]'
              : 'bg-[#cc785c] hover:bg-[#b95736] text-white border-transparent'
          }`}
        >
          {hasStyleSample ? 'Edit Voice' : 'Set Voice'}
        </button>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="group flex flex-col justify-between p-3.5 bg-[#21201e] hover:bg-[#272522] border border-[#32302d] hover:border-[#42403b] rounded-xl text-left shadow-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-[#282624] border border-[#383633]">
                  {suggestion.icon}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8a877e]">
                  {suggestion.tag}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#747169] group-hover:text-[#cc785c] group-hover:translate-x-0.5 transition-all" />
            </div>

            <div>
              <span className="text-xs font-semibold text-[#edebe6] block mb-0.5">
                {suggestion.title}
              </span>
              <p className="text-[11px] text-[#9f9d96] leading-relaxed">
                {suggestion.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
