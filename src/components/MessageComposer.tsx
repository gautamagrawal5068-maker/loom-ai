'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { EmailTone } from '@/types';

const TONES: EmailTone[] = [
  'Formal',
  'Friendly',
  'Assertive',
  'Apologetic',
  'Concise',
  'Persuasive',
];

interface MessageComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  activeTone: EmailTone | null;
  onSelectTone: (tone: EmailTone | null) => void;
  hasStyleSample: boolean;
  onOpenStyleModal: () => void;
}

export function MessageComposer({
  onSend,
  isLoading,
  activeTone,
  onSelectTone,
  hasStyleSample,
  onOpenStyleModal,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 140);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    onSend(trimmed);
    setContent('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToneClick = (tone: EmailTone) => {
    if (activeTone === tone) {
      onSelectTone(null);
    } else {
      onSelectTone(tone);
    }
  };

  const isEmpty = !content.trim();

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent pt-3 pb-4 px-4 w-full z-20">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Controls Bar: Tone Pills & Style Indicator */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {/* Tone Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-zinc-500 select-none mr-0.5">TONE:</span>
            {TONES.map((tone) => {
              const isSelected = activeTone === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => handleToneClick(tone)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.35)] border border-pink-400/50 scale-102'
                      : 'bg-[#121217] text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                  aria-pressed={isSelected}
                  title={`Draft emails with a ${tone.toLowerCase()} tone`}
                >
                  {tone}
                </button>
              );
            })}
          </div>

          {/* Style Sample Button */}
          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 text-xs font-mono border transition-all cursor-pointer ${
              hasStyleSample
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/50 hover:bg-purple-900/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-[#121217] text-zinc-400 border-zinc-800 hover:border-purple-500/40 hover:text-purple-300'
            }`}
            title="Configure writing style sample"
          >
            <Sparkles className={`w-3 h-3 ${hasStyleSample ? 'text-purple-400' : 'text-zinc-500'}`} />
            <span>{hasStyleSample ? 'Style active' : 'Add style'}</span>
          </button>
        </div>

        {/* Input Textarea Container */}
        <div className="w-full bg-[#121217] border border-zinc-800 rounded-2xl shadow-xl focus-within:border-purple-500/80 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all flex items-end px-4 py-2.5">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              activeTone
                ? `Describe what to write (in ${activeTone.toLowerCase()} tone)...`
                : 'Describe the email you want to write or paste a draft to refine...'
            }
            className="resize-none border-0 focus:ring-0 focus:outline-none bg-transparent text-zinc-100 text-sm placeholder:text-zinc-500 flex-1 py-1 max-h-[140px] overflow-y-auto leading-relaxed font-sans"
            rows={1}
            disabled={isLoading}
          />

          <button
            onClick={handleSend}
            disabled={isEmpty || isLoading}
            className={`ml-2 p-2 rounded-xl flex-shrink-0 transition-all cursor-pointer ${
              isEmpty || isLoading
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)] hover:opacity-95'
            }`}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 text-center font-mono">
          LOOM AI drafts bespoke emails tailored to your voice. Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
