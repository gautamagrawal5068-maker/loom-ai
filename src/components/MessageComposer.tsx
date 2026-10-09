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
      onSelectTone(null); // toggle off
    } else {
      onSelectTone(tone);
    }
  };

  const isEmpty = !content.trim();

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent pt-3 pb-4 px-4 w-full">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Controls bar: Tones & Style Sample */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {/* Tone Selector Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-medium text-stone-400 select-none mr-0.5">Tone:</span>
            {TONES.map((tone) => {
              const isSelected = activeTone === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => handleToneClick(tone)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs scale-102'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                  aria-pressed={isSelected}
                  title={`Draft emails with a ${tone.toLowerCase()} tone`}
                >
                  {tone}
                </button>
              );
            })}
          </div>

          {/* Style Sample Indicator button */}
          <button
            type="button"
            onClick={onOpenStyleModal}
            className={`flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
              hasStyleSample
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:text-emerald-700'
            }`}
            title="Configure your personal writing sample"
          >
            <Sparkles className={`w-3 h-3 ${hasStyleSample ? 'text-emerald-600' : 'text-stone-400'}`} />
            <span>{hasStyleSample ? 'Style sample active' : 'Add writing style'}</span>
          </button>
        </div>

        {/* Input box */}
        <div className="w-full bg-white border border-stone-200 rounded-2xl shadow-xs focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all flex items-end px-4 py-2">
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
            className="resize-none border-0 focus:ring-0 focus:outline-none bg-transparent text-stone-800 text-sm flex-1 py-2 max-h-[140px] overflow-y-auto leading-relaxed"
            rows={1}
            disabled={isLoading}
          />

          <button
            onClick={handleSend}
            disabled={isEmpty || isLoading}
            className={`ml-2 p-2 rounded-xl flex-shrink-0 transition-colors cursor-pointer ${
              isEmpty || isLoading
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
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

        <p className="text-[11px] text-stone-400 text-center">
          LOOM AI drafts personalized emails tailored to your instructions and voice. Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
