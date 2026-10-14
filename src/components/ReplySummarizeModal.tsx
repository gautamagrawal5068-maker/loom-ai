'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Reply,
  FileSearch,
  ArrowRight,
  Calendar,
  CheckCircle2,
  HelpCircle,
  ListOrdered,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { EmailTone, EmailSummaryResult } from '@/types';

interface ReplySummarizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'reply' | 'summarize';
  isLoading?: boolean;
  onGenerateDraft: (prompt: string, context?: string) => void;
}

const TONES: EmailTone[] = [
  'Formal',
  'Friendly',
  'Assertive',
  'Apologetic',
  'Concise',
  'Persuasive',
];

export function ReplySummarizeModal({
  isOpen,
  onClose,
  initialTab = 'reply',
  isLoading = false,
  onGenerateDraft,
}: ReplySummarizeModalProps) {
  const [activeTab, setActiveTab] = useState<'reply' | 'summarize'>(initialTab);

  // Synchronize active tab whenever modal opens or initialTab prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Reply tab state
  const [receivedEmail, setReceivedEmail] = useState('');
  const [intent, setIntent] = useState('');
  const [selectedTone, setSelectedTone] = useState<EmailTone | null>(null);
  const [extraContext, setExtraContext] = useState('');

  // Summarize tab state
  const [emailToSummarize, setEmailToSummarize] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<EmailSummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateReply = () => {
    if (!receivedEmail.trim() || isLoading) return;

    let prompt = `Help me draft a clear, context-aware reply to the following received email:

"""
${receivedEmail.trim()}
"""`;

    if (intent.trim()) {
      prompt += `\n\nMy intended response & key points to make:\n${intent.trim()}`;
    }

    if (selectedTone) {
      prompt += `\n\nAdopt a ${selectedTone.toLowerCase()} tone.`;
    }

    onGenerateDraft(prompt, extraContext.trim() || undefined);
    onClose();
  };

  const handleRunSummarize = async () => {
    if (!emailToSummarize.trim() || isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);
    setSummaryResult(null);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText: emailToSummarize.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed with status ${res.status}`);
      }

      const data = await res.json();
      setSummaryResult(data);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to analyze email.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleReplyFromSummary = () => {
    if (!summaryResult) return;
    const prompt = summaryResult.suggestedReplyPrompt ||
      `Draft a thoughtful reply addressing the key questions and action items from this email summary:\n` +
      `- Questions to answer: ${summaryResult.questionsNeedingAnswers.join(', ') || 'None'}\n` +
      `- Action items: ${summaryResult.requiredActions.join(', ') || 'Acknowledged'}`;

    onGenerateDraft(prompt, `Original Email Analyzed:\n${emailToSummarize.trim().slice(0, 1000)}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0d0f17] shadow-2xl border border-white/[0.08] text-[#f8fafc] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#090a0f]">
          <div className="flex items-center gap-1.5 bg-[#121520] border border-white/[0.08] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('reply')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'reply'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-[#f8fafc] border border-transparent'
              }`}
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply to Email</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summarize')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'summarize'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-[#f8fafc] border border-transparent'
              }`}
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Summarize Email</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-[#f8fafc] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[65vh]">
          {activeTab === 'reply' ? (
            <>
              {/* Received Email Input */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  1. Paste Received Email:
                </label>
                <textarea
                  value={receivedEmail}
                  onChange={(e) => setReceivedEmail(e.target.value)}
                  rows={5}
                  placeholder="Paste the email you received here..."
                  className="w-full bg-[#121520] border border-white/[0.08] rounded-xl p-3 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-y"
                />
              </div>

              {/* User's Intended Response */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  2. What would you like to say?
                </label>
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="e.g. Accept the meeting but propose Tuesday 2pm instead; thank them for the quick turnaround"
                  className="w-full bg-[#121520] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  3. Select Response Tone:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setSelectedTone(selectedTone === tone ? null : tone)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                        selectedTone === tone
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold'
                          : 'bg-[#121520] text-zinc-400 hover:text-white border-white/[0.08]'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Context */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  4. Additional Constraints or Context (Optional):
                </label>
                <input
                  type="text"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder="e.g. Don't mention the budget yet; keep under 100 words"
                  className="w-full bg-[#121520] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>
            </>
          ) : (
            <>
              {/* Summarize Tab */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  Paste Email or Thread to Analyze:
                </label>
                <textarea
                  value={emailToSummarize}
                  onChange={(e) => setEmailToSummarize(e.target.value)}
                  rows={5}
                  placeholder="Paste the email thread or lengthy message you wish to summarize..."
                  className="w-full bg-[#121520] border border-white/[0.08] rounded-xl p-3 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-y"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleRunSummarize}
                    disabled={!emailToSummarize.trim() || isSummarizing}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all ${
                      !emailToSummarize.trim() || isSummarizing
                        ? 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer'
                    }`}
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Summarize Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {summaryError && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 text-xs font-mono">
                  {summaryError}
                </div>
              )}

              {/* Summary Breakdown Results */}
              {summaryResult && (
                <div className="space-y-3.5 pt-2 border-t border-white/[0.08]">
                  {/* Main Points */}
                  <div className="p-3.5 rounded-xl bg-[#121520] border border-white/[0.08]">
                    <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-[#f8fafc]">
                      <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Main Points</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                      {summaryResult.mainPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dates & Deadlines */}
                  {summaryResult.importantDates.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#121520] border border-white/[0.08]">
                      <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-cyan-300">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Important Dates & Deadlines</span>
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                        {summaryResult.importantDates.map((d, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Required Actions */}
                  {summaryResult.requiredActions.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#121520] border border-white/[0.08]">
                      <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Required Actions</span>
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                        {summaryResult.requiredActions.map((act, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Questions Needing Answers */}
                  {summaryResult.questionsNeedingAnswers.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#121520] border border-white/[0.08]">
                      <div className="flex items-center gap-2 mb-2 text-xs font-mono font-semibold text-purple-300">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Questions Needing Answers</span>
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                        {summaryResult.questionsNeedingAnswers.map((q, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-purple-400 font-bold">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 1-Click Generate Reply from Summary */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleReplyFromSummary}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-sans font-semibold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Generate Reply from this Summary</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'reply' && (
          <div className="p-3.5 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-sans text-zinc-400 hover:text-[#f8fafc] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateReply}
              disabled={!receivedEmail.trim() || isLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all ${
                !receivedEmail.trim() || isLoading
                  ? 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer'
              }`}
            >
              <span>Draft Response</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
