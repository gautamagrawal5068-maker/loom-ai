'use client';

import { Menu, Sparkles, Zap } from 'lucide-react';
import { Conversation, EmailTone, ModelTier } from '@/types';
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
  credits: number;
  refillCountdown?: string;
  userName?: string | null;
  creditCost: number;
  styleSample: string;
  onOpenStyleModal: () => void;
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
  credits,
  refillCountdown,
  userName,
  creditCost,
  styleSample,
  onOpenStyleModal,
}: ChatAreaProps) {
  const scrollRef = useAutoScroll([conversation?.messages?.length, isLoading]);

  const hasMessages = conversation && conversation.messages && conversation.messages.length > 0;
  const hasStyleSample = styleSample.trim().length > 0;

  const modelLabels: Record<ModelTier, string> = {
    silk: 'Silk (Fast)',
    weave: 'Weave (Balanced)',
    tapestry: 'Tapestry (Deep)',
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-[#191817] overflow-hidden text-[#ecebe6]">
      {/* Calm Top Navigation Bar */}
      <div className="h-13 border-b border-[#2e2c29] flex items-center justify-between px-4 sm:px-6 bg-[#191817]/90 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded-lg text-[#9f9d96] hover:bg-[#282624] hover:text-white md:hidden transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-[#edebe6] truncate font-mono">
            {conversation?.title || 'New Email Draft'}
          </div>
        </div>

        {/* Right Header Status Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Model Pill */}
          <span className="hidden sm:inline-flex items-center text-xs font-mono px-2.5 py-0.5 rounded-lg bg-[#242220] text-[#c8c5bc] border border-[#34322e]">
            {modelLabels[modelTier]}
          </span>

          {/* Credits Balance Pill with Auto-Refill Countdown */}
          <div
            className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-[#242220] text-[#a6a39b] border border-[#34322e]"
            title={`Credits automatically refill every 5 hours (${refillCountdown || '5h'})`}
          >
            <Zap className="w-3 h-3 text-[#cc785c]" />
            <span>
              <strong className="text-[#edebe6] font-medium">{credits}</strong> credits
            </span>
            {refillCountdown && (
              <span className="text-[10px] text-[#747169] hidden md:inline">
                · {refillCountdown}
              </span>
            )}
          </div>

          {activeTone && (
            <span className="hidden md:inline-flex items-center text-xs font-mono px-2 py-0.5 rounded-lg bg-[#cc785c]/10 text-[#cc785c] border border-[#cc785c]/30">
              Tone: {activeTone}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              hasStyleSample
                ? 'bg-[#cc785c]/15 text-[#cc785c] border-[#cc785c]/40 hover:bg-[#cc785c]/25'
                : 'text-[#9f9d96] border-[#34322e] hover:border-[#423f3b] hover:text-[#edebe6] bg-[#242220]'
            }`}
            title="Configure writing style sample"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#cc785c]" />
            <span className="hidden sm:inline">
              {hasStyleSample ? 'Voice Active' : 'My Voice'}
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
              onSuggestionClick={onSendMessage}
              onOpenStyleModal={onOpenStyleModal}
              hasStyleSample={hasStyleSample}
            />
          ) : (
            <div className="space-y-5">
              {conversation.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRetry={onRetry}
                  onQuickPrompt={onSendMessage}
                />
              ))}

              {isLoading && (
                <div className="flex justify-start w-full animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#242220] border border-[#383633] flex items-center justify-center text-[#cc785c] shrink-0 mt-0.5 select-none">
                      <Sparkles className="w-3.5 h-3.5 text-[#cc785c]" />
                    </div>
                    <div className="bg-[#21201e] border border-[#34322e] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#cc785c] typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-[#cc785c] typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-[#cc785c] typing-dot" />
                        <span className="text-xs text-[#9f9d96] font-mono ml-2">
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
        credits={credits}
        refillCountdown={refillCountdown}
        creditCost={creditCost}
        hasStyleSample={hasStyleSample}
        onOpenStyleModal={onOpenStyleModal}
      />
    </div>
  );
}
