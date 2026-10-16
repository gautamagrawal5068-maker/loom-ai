'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Reply,
  ArrowRight,
  Calendar,
  CheckCircle2,
  HelpCircle,
  ListOrdered,
  Loader2,
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

const segmentClass = (active: boolean) =>
  `inline-flex items-center h-8 px-3.5 rounded-full text-sm whitespace-nowrap transition-colors ${
    active ? 'bg-raised text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
  }`;

function SummarySection({
  icon: Icon,
  title,
  items,
  iconClassName = 'text-fg-subtle',
}: {
  icon: typeof ListOrdered;
  title: string;
  items: string[];
  iconClassName?: string;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Icon className={`size-3.5 ${iconClassName}`} />
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm text-fg-muted leading-relaxed">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-fg-faint" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

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

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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

  const isReply = activeTab === 'reply';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="modal-backdrop animate-in fade-in duration-150" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reply-summarize-title"
        className="modal-panel relative z-10 w-full max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden text-fg animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="reply-summarize-title" className="text-lg font-semibold text-fg">
                {isReply ? 'Reply to an email' : 'Summarize an email'}
              </h2>
              <p className="mt-0.5 text-sm text-fg-subtle">
                {isReply
                  ? 'Paste what you received and LOOM drafts a context-aware reply.'
                  : 'Pull out the main points, dates, actions, and open questions.'}
              </p>
            </div>
            <button onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 inline-flex p-1 rounded-full bg-panel border border-line" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reply'}
              onClick={() => setActiveTab('reply')}
              className={segmentClass(activeTab === 'reply')}
            >
              Reply to email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'summarize'}
              onClick={() => setActiveTab('summarize')}
              className={segmentClass(activeTab === 'summarize')}
            >
              Summarize email
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {isReply ? (
            <>
              {/* Received Email Input */}
              <div>
                <label htmlFor="reply-received" className="label">
                  Email you received
                </label>
                <textarea
                  id="reply-received"
                  value={receivedEmail}
                  onChange={(e) => setReceivedEmail(e.target.value)}
                  rows={6}
                  placeholder="Paste the email you received here…"
                  className="field max-sm:text-base min-h-36 resize-y leading-relaxed"
                />
              </div>

              {/* User's Intended Response */}
              <div>
                <label htmlFor="reply-intent" className="label">
                  What would you like to say?
                </label>
                <input
                  id="reply-intent"
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="e.g. Accept the meeting but propose Tuesday 2pm instead; thank them for the quick turnaround"
                  className="field max-sm:text-base"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <span className="label">Tone</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setSelectedTone(selectedTone === tone ? null : tone)}
                      data-active={selectedTone === tone}
                      className="chip"
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Context */}
              <div>
                <label htmlFor="reply-context" className="label">
                  Additional constraints or context{' '}
                  <span className="font-normal text-fg-subtle">(optional)</span>
                </label>
                <input
                  id="reply-context"
                  type="text"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder="e.g. Don't mention the budget yet; keep under 100 words"
                  className="field max-sm:text-base"
                />
              </div>
            </>
          ) : (
            <>
              {/* Summarize Tab */}
              <div>
                <label htmlFor="summarize-input" className="label">
                  Email or thread to analyze
                </label>
                <textarea
                  id="summarize-input"
                  value={emailToSummarize}
                  onChange={(e) => setEmailToSummarize(e.target.value)}
                  rows={6}
                  placeholder="Paste the email thread or lengthy message you want summarized…"
                  className="field max-sm:text-base min-h-36 resize-y leading-relaxed"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunSummarize}
                    disabled={!emailToSummarize.trim() || isSummarizing}
                    className={`btn ${summaryResult ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      'Summarize email'
                    )}
                  </button>
                </div>
              </div>

              {summaryError && (
                <div
                  role="alert"
                  className="rounded-xl border border-danger-line bg-danger-soft text-danger px-3.5 py-2.5 text-sm"
                >
                  {summaryError}
                </div>
              )}

              {/* Summary Breakdown Results */}
              {summaryResult && (
                <div className="space-y-5 border-t border-line pt-5 animate-fade-up">
                  <SummarySection icon={ListOrdered} title="Main points" items={summaryResult.mainPoints} />

                  {summaryResult.importantDates.length > 0 && (
                    <SummarySection
                      icon={Calendar}
                      title="Important dates & deadlines"
                      items={summaryResult.importantDates}
                    />
                  )}

                  {summaryResult.requiredActions.length > 0 && (
                    <SummarySection
                      icon={CheckCircle2}
                      title="Required actions"
                      items={summaryResult.requiredActions}
                      iconClassName="text-success"
                    />
                  )}

                  {summaryResult.questionsNeedingAnswers.length > 0 && (
                    <SummarySection
                      icon={HelpCircle}
                      title="Questions needing answers"
                      items={summaryResult.questionsNeedingAnswers}
                    />
                  )}

                  {/* 1-Click Generate Reply from Summary */}
                  <button
                    type="button"
                    onClick={handleReplyFromSummary}
                    disabled={isLoading}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Reply className="size-4" />}
                    Generate reply from this summary
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {isReply && (
          <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateReply}
              disabled={!receivedEmail.trim() || isLoading}
              className="btn btn-primary"
            >
              Draft response
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
