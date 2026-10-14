'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Sparkles, Activity, ChevronDown, Check, Brain } from 'lucide-react';
import { Conversation, EmailTone, ModelTier, UsageStats, MAX_CONTEXT_WINDOW_TOKENS, DraftRevision } from '@/types';
import { calculateConversationContextUsage } from '@/lib/contextDetection';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';

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
  const scrollRef = useAutoScroll([conversation?.messages?.length, isLoading]);

  const [headerModelOpen, setHeaderModelOpen] = useState(false);
  const headerModelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerModelRef.current && !headerModelRef.current.contains(e.target as Node)) {
        setHeaderModelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const MODEL_TABS: { id: ModelTier; label: string; icon: string; desc: string }[] = [
    { id: 'silk', label: 'Silk', icon: '🪡', desc: 'Fast draft (~0.8s)' },
    { id: 'weave', label: 'Weave', icon: '🧵', desc: 'Flagship balanced tone' },
    { id: 'tapestry', label: 'Tapestry', icon: '🏛️', desc: 'Deep reasoning & humanizer' },
  ];

  const activeModelTab = MODEL_TABS.find((m) => m.id === modelTier) || MODEL_TABS[1];

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-[#090a0f] overflow-hidden text-[#f8fafc]">
      {/* Calm Top Navigation Bar */}
      <div className="h-14 border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 bg-[#0d0f17]/90 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/[0.05] hover:text-white md:hidden transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-[#f8fafc] truncate font-mono">
            {conversation?.title || 'New Email Draft'}
          </div>
        </div>

        {/* Right Header Controls: Model Selector + 100k Context Indicator + 50k Tokens Allowance + Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Antigravity / GPT Model Dropbox */}
          <div className="relative" ref={headerModelRef}>
            <button
              type="button"
              onClick={() => setHeaderModelOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono transition-all cursor-pointer group"
              title="Select Model Tier"
            >
              <span className="text-xs">{activeModelTab.icon}</span>
              <span className="font-semibold text-white">{activeModelTab.label}</span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 transition-transform ${
                  headerModelOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-cyan-400'
                }`}
              />
            </button>

            {headerModelOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/[0.1] bg-[#0d0f17]/98 backdrop-blur-xl p-2 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1 flex items-center justify-between">
                  <span>Model Tier</span>
                  <span className="text-cyan-400">LOOM</span>
                </div>
                {MODEL_TABS.map((m) => {
                  const isActive = modelTier === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModelTier(m.id);
                        setHeaderModelOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/15 text-white border border-cyan-500/30'
                          : 'hover:bg-white/[0.05] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.icon}</span>
                        <div>
                          <div className={`text-xs font-mono font-semibold ${isActive ? 'text-cyan-300' : 'text-white'}`}>
                            {m.label}
                          </div>
                          <div className="text-[10px] text-zinc-400">{m.desc}</div>
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic 100k Context Window Indicator */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#121520] select-none hover:border-purple-500/30 transition-all text-zinc-300"
            title={`Context Window: ${remainingContextTokens.toLocaleString()} / 100,000 tokens remaining (${contextPercent}% capacity)`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span className="flex items-center gap-1">
              <strong className="text-white font-medium">{remainingContextK}</strong>
              <span className="text-zinc-500 text-[11px]">ctx</span>
            </span>
            <div className="w-8 h-1.5 rounded-full bg-zinc-800 overflow-hidden ml-0.5 hidden md:block">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${contextPercent}%` }}
              />
            </div>
          </div>

          {/* 50k Messaging Quota & 5-Hour Refill Pause */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-xl border select-none transition-all ${
              tokensCountdown
                ? 'border-red-500/40 text-red-300 bg-red-950/30 shadow-xs'
                : 'border-white/[0.08] bg-[#121520] text-zinc-300 hover:border-cyan-500/30'
            }`}
            title={
              tokensCountdown
                ? `50k token quota depleted. Usage paused for 5 hours. Refill countdown: ${tokensCountdown}`
                : `Messaging Allowance: ${currentTokens.toLocaleString()} / 50,000 tokens remaining`
            }
          >
            <Activity className={`w-3.5 h-3.5 ${tokensCountdown ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
            {tokensCountdown ? (
              <span className="text-red-300 font-medium flex items-center gap-1">
                <span className="text-zinc-400">Locked:</span>
                <span className="font-mono text-red-200">{tokensCountdown}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <strong className="text-white font-medium">{currentTokensK}</strong>
                <span className="text-zinc-500 text-[11px]">tokens</span>
              </span>
            )}
          </div>

          {/* Profile Button */}
          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              hasStyleSample
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                : 'text-zinc-400 border-white/[0.06] hover:border-white/[0.15] hover:text-[#f8fafc] bg-[#121520]'
            }`}
            title="Configure personal writing profile"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {hasStyleSample ? 'Profile' : 'Profile'}
            </span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          {!hasMessages ? (
            <WelcomeScreen
              userName={userName}
              isLoading={isLoading}
              onSuggestionClick={(prompt) => onSendMessage(prompt)}
              onOpenStyleModal={onOpenStyleModal}
              hasStyleSample={hasStyleSample}
              onOpenTemplatesModal={onOpenTemplatesModal}
              onOpenReplyModal={onOpenReplyModal}
              onOpenSummarizeModal={onOpenSummarizeModal}
            />
          ) : (
            <div className="space-y-5">
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
                <div className="flex justify-start w-full animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#0d0f17] border border-white/[0.08] flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 select-none">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="bg-[#0d0f17] border border-white/[0.08] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-pink-400 typing-dot" />
                        <span className="text-xs text-zinc-400 font-mono ml-2">
                          {modelTier === 'tapestry'
                            ? 'Drafting with Tapestry reasoning...'
                            : 'Drafting in your natural voice...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} className="h-1 shrink-0" />
        </div>
      </div>

      {/* Persistent Message Composer */}
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
      />
    </div>
  );
}
