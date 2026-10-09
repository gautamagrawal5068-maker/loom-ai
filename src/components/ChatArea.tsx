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
    <div className="flex flex-col flex-1 min-w-0 h-full bg-stone-50 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-14 border-b border-stone-200 flex items-center justify-between px-4 bg-white shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 md:hidden transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-stone-800 truncate">
            {conversation?.title || 'New Email Draft'}
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTone && (
            <span className="hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tone: {activeTone}
            </span>
          )}

          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
              hasStyleSample
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'text-stone-600 border-stone-200 hover:border-emerald-300 hover:text-emerald-700'
            }`}
            title="Configure writing style sample"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
                  <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-600/70 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-emerald-600/70 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-emerald-600/70 animate-bounce" />
                      <span className="text-xs text-stone-400 ml-2">Drafting email...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} className="h-1 shrink-0" />
        </div>
      </div>

      {/* Bottom Message Composer */}
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
