'use client';

import { Menu, Sparkles } from 'lucide-react';
import { Conversation, EmailTone } from '@/types';
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
  styleSample,
  onOpenStyleModal,
}: ChatAreaProps) {
  const scrollRef = useAutoScroll([conversation?.messages?.length, isLoading]);

  const hasMessages = conversation && conversation.messages && conversation.messages.length > 0;
  const hasStyleSample = styleSample.trim().length > 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-[#09090b] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#0c0c10] shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-zinc-200 truncate font-mono">
            {conversation?.title || 'New Email Draft'}
          </div>
        </div>

        {/* Right Header Status Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTone && (
            <span className="hidden sm:inline-flex items-center text-xs font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/40">
              Tone: {activeTone}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              hasStyleSample
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/30'
                : 'text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300'
            }`}
            title="Configure writing style sample"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">
              {hasStyleSample ? 'Style Active' : 'My Style'}
            </span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto flex flex-col min-h-full">
          {!hasMessages ? (
            <WelcomeScreen
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
                />
              ))}

              {isLoading && (
                <div className="flex justify-start w-full animate-in fade-in duration-150">
                  <div className="bg-[#121217] border border-zinc-800 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                      <span className="text-xs text-zinc-400 font-mono ml-2">Drafting email...</span>
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
        hasStyleSample={hasStyleSample}
        onOpenStyleModal={onOpenStyleModal}
      />
    </div>
  );
}
