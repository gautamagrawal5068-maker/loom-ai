'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Check, Feather, Lock } from 'lucide-react';
import { Conversation, EmailTone, ModelTier, UsageStats, MAX_CONTEXT_WINDOW_TOKENS, DraftRevision } from '@/types';
import { calculateConversationContextUsage } from '@/lib/contextDetection';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { Logo } from './Logo';

interface ChatAreaProps {
  conversation: Conversation | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onRetry: () => void;
  onOpenSidebar: () => void;
  activeTone: EmailTone | null;
  onSelectTone: (tone: EmailTone | null) => void;
  modelTier: ModelTier;
  onSelectModelTier: (tier: ModelTier) => void;
  usageStats?: UsageStats;
  userName?: string | null;
  hasStyleSample: boolean;
  onOpenStyleModal: () => void;
  onOpenTemplatesModal?: () => void;
  onOpenReplyModal?: () => void;
  onOpenSummarizeModal?: () => void;
  remainingTokens?: number;
  tokensCountdown?: string | null;
  onUpdateMessageDraft?: (
    messageId: string,
    subject: string,
    body: string,
    revisions?: DraftRevision[],
    revisionIdx?: number
  ) => void;
  activeInitialPrompt?: string;
}

const MODEL_TABS: { id: ModelTier; label: string; desc: string }[] = [
  { id: 'silk', label: 'Silk', desc: 'Fastest drafts, about a second' },
  { id: 'weave', label: 'Weave', desc: 'Balanced quality and tone' },
  { id: 'tapestry', label: 'Tapestry', desc: 'Deeper reasoning and humanizing' },
];

/** Tiny ring showing how much of the context window is still free. */
function ContextRing({ percent }: { percent: number }) {
  const r = 5.5;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 -rotate-90" aria-hidden="true">
      <circle cx="7" cy="7" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.75" />
      <circle
        cx="7"
        cy="7"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

export function ChatArea({
  conversation,
  isLoading,
  onSendMessage,
  onRetry,
  onOpenSidebar,
  activeTone,
  onSelectTone,
  modelTier,
  onSelectModelTier,
  userName,
  hasStyleSample,
  onOpenStyleModal,
  onOpenTemplatesModal,
  onOpenReplyModal,
  onOpenSummarizeModal,
  remainingTokens = 50_000,
  tokensCountdown = null,
  onUpdateMessageDraft,
  activeInitialPrompt,
}: ChatAreaProps) {
  const scrollRef = useAutoScroll([conversation?.id, conversation?.messages?.length, isLoading]);

  const [headerModelOpen, setHeaderModelOpen] = useState(false);
  const headerModelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerModelRef.current && !headerModelRef.current.contains(e.target as Node)) {
        setHeaderModelOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setHeaderModelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasMessages = conversation && conversation.messages && conversation.messages.length > 0;

  // Dynamic 100k context window consumption (shortens visibly on each message turn)
  const conversationUsedTokens = calculateConversationContextUsage(
    conversation?.messages || [],
    conversation?.context,
    modelTier
  );

  const remainingContextTokens = Math.max(0, MAX_CONTEXT_WINDOW_TOKENS - conversationUsedTokens);
  const remainingContextK =
    remainingContextTokens >= 100_000
      ? '100k'
      : `${(remainingContextTokens / 1000).toFixed(1)}k`;

  const contextPercent = Math.max(2, Math.min(100, Math.round((remainingContextTokens / MAX_CONTEXT_WINDOW_TOKENS) * 100)));

  const currentTokens = remainingTokens !== undefined ? remainingTokens : 50_000;
  const currentTokensK =
    currentTokens >= 50_000
      ? '50k'
      : currentTokens >= 1000
      ? `${(currentTokens / 1000).toFixed(1)}k`
      : `${currentTokens}`;

  const activeModelTab = MODEL_TABS.find((m) => m.id === modelTier) || MODEL_TABS[1];

  const composer = (
    <MessageComposer
      onSend={onSendMessage}
      isLoading={isLoading}
      activeTone={activeTone}
      onSelectTone={onSelectTone}
      modelTier={modelTier}
      onSelectModelTier={onSelectModelTier}
      hasStyleSample={hasStyleSample}
      onOpenStyleModal={onOpenStyleModal}
      onOpenTemplatesModal={onOpenTemplatesModal}
      remainingTokens={remainingTokens}
      tokensCountdown={tokensCountdown}
      initialPrompt={activeInitialPrompt}
      conversationUsedTokens={conversationUsedTokens}
      variant={hasMessages ? 'docked' : 'hero'}
    />
  );

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-bg overflow-hidden text-fg">
      {/* Top bar */}
      <header className="relative h-14 flex items-center justify-between gap-3 px-2 sm:px-4 shrink-0 z-20">
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={onOpenSidebar} className="icon-btn md:hidden" aria-label="Open sidebar">
            <Menu className="size-5" />
          </button>

          {/* Model selector */}
          <div className="relative" ref={headerModelRef}>
            <button
              type="button"
              onClick={() => setHeaderModelOpen((prev) => !prev)}
              className="flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-lg text-[15px] font-medium text-fg hover:bg-hover transition-colors"
              title="Select model"
              aria-haspopup="menu"
              aria-expanded={headerModelOpen}
            >
              <span>Loom</span>
              <span className="text-fg-subtle font-normal">{activeModelTab.label}</span>
              <ChevronDown
                className={`size-4 text-fg-subtle transition-transform ${headerModelOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {headerModelOpen && (
              <div
                role="menu"
                className="menu absolute left-0 top-full mt-1.5 w-72 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
              >
                <div className="menu-label">Model</div>
                {MODEL_TABS.map((m) => {
                  const isActive = modelTier === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => {
                        onSelectModelTier(m.id);
                        setHeaderModelOpen(false);
                      }}
                      className="menu-item py-2"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg">{m.label}</span>
                        <span className="block text-xs text-fg-subtle mt-0.5">{m.desc}</span>
                      </span>
                      {isActive && <Check className="size-4 text-fg shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {hasMessages && (
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 max-w-[36%] truncate text-sm text-fg-muted pointer-events-none">
            {conversation?.title || 'New draft'}
          </div>
        )}

        {/* Right: usage + voice */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {tokensCountdown ? (
            <span
              className="badge h-7 px-2.5 bg-danger-soft text-danger"
              title={`50k token quota depleted. Usage paused for 5 hours. Refill countdown: ${tokensCountdown}`}
            >
              <Lock className="size-3" />
              <span>Paused</span>
              <span className="font-mono">{tokensCountdown}</span>
            </span>
          ) : (
            <div className="hidden sm:flex items-center gap-3 h-9 px-2.5 text-xs text-fg-subtle select-none">
              <span
                className="flex items-center gap-1.5"
                title={`Context window: ${remainingContextTokens.toLocaleString()} / 100,000 tokens remaining (${contextPercent}%)`}
              >
                <ContextRing percent={contextPercent} />
                <span className="font-mono text-fg-muted">{remainingContextK}</span>
                <span>context</span>
              </span>
              <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
              <span title={`Messaging allowance: ${currentTokens.toLocaleString()} / 50,000 tokens remaining`}>
                <span className="font-mono text-fg-muted">{currentTokensK}</span> tokens
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenStyleModal}
            className="btn btn-sm btn-ghost relative"
            title="Configure personal writing profile"
          >
            <Feather className="size-4" />
            <span className="hidden sm:inline">Voice</span>
            {hasStyleSample && (
              <span className="absolute top-1.5 left-[22px] size-1.5 rounded-full bg-accent" aria-label="Voice active" />
            )}
          </button>
        </div>
      </header>

      {!hasMessages ? (
        /* Empty state: greeting with the composer centered, like a blank page */
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col justify-center px-4 pb-12 pt-2">
            <WelcomeScreen
              userName={userName}
              isLoading={isLoading}
              onSuggestionClick={(prompt) => onSendMessage(prompt)}
              onOpenStyleModal={onOpenStyleModal}
              hasStyleSample={hasStyleSample}
              onOpenTemplatesModal={onOpenTemplatesModal}
              onOpenReplyModal={onOpenReplyModal}
              onOpenSummarizeModal={onOpenSummarizeModal}
              composer={composer}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="max-w-3xl mx-auto pt-4 pb-10 space-y-8">
              {conversation.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLoading={isLoading}
                  onRetry={onRetry}
                  onQuickPrompt={(prompt) => onSendMessage(prompt)}
                  onUpdateMessageDraft={onUpdateMessageDraft}
                />
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 animate-in fade-in duration-200" aria-live="polite">
                  <Logo size="sm" />
                  <span className="text-sm shimmer-text">
                    {modelTier === 'tapestry'
                      ? 'Reasoning through your draft…'
                      : 'Drafting in your natural voice…'}
                  </span>
                </div>
              )}
              <div ref={scrollRef} className="h-px" />
            </div>
          </div>

          {composer}
        </>
      )}
    </div>
  );
}
