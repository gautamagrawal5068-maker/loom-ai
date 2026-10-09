'use client';

import { Mail, Sparkles, Reply, PenLine, ArrowRight } from 'lucide-react';

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
      description: 'Requesting project approval from a senior leader',
      prompt: 'Write a professional email requesting project approval from a senior leader with a clear timeline and resource ask.',
      icon: <Mail className="w-4 h-4 text-emerald-600" />,
    },
    {
      title: 'Make this email sound more natural',
      description: 'Polish an email draft to sound conversational and warm',
      prompt: 'Help me make this draft sound more natural and conversational while keeping it respectful:',
      icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
    },
    {
      title: 'Write a polite follow-up',
      description: 'Checking in on an unanswered message after 4 days',
      prompt: 'Write a polite, concise follow-up email checking in on an unanswered message sent earlier this week.',
      icon: <Reply className="w-4 h-4 text-emerald-600" />,
    },
    {
      title: 'Help me respond to an email',
      description: 'Drafting a thoughtful reply to a client or team inquiry',
      prompt: 'Help me draft a clear, helpful response to an email from a colleague asking for an update.',
      icon: <PenLine className="w-4 h-4 text-emerald-600" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full my-auto animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium mb-4">
          <span>AI Email Assistant</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          LOOM <span className="text-emerald-600">AI</span>
        </h1>
        <p className="text-stone-500 text-sm sm:text-base mt-2 max-w-md mx-auto leading-relaxed">
          Your emails, written the way you would write them.
        </p>
      </div>

      {/* Writing Style Banner */}
      <div className="w-full mb-6 p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">
              {hasStyleSample ? 'Personal Style Active' : 'Personalize Your Voice'}
            </h2>
            <p className="text-xs text-stone-500">
              {hasStyleSample
                ? 'LOOM AI is mirroring your vocabulary and phrasing style.'
                : 'Add a sample email so LOOM AI sounds authentically like you.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenStyleModal}
          className={`shrink-0 text-xs font-medium px-3.5 py-2 rounded-xl transition-colors cursor-pointer ${
            hasStyleSample
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
          }`}
        >
          {hasStyleSample ? 'Edit Sample' : 'Add Style Sample'}
        </button>
      </div>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="group flex flex-col justify-between p-4 bg-white border border-stone-200 rounded-2xl text-left hover:border-emerald-300 hover:bg-stone-50/50 shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-stone-50 border border-stone-100 group-hover:bg-emerald-50 transition-colors">
                  {suggestion.icon}
                </div>
                <span className="text-sm font-medium text-stone-800 group-hover:text-emerald-800 transition-colors">
                  {suggestion.title}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-xs text-stone-400 pl-8 leading-relaxed">
              {suggestion.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
