'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  ArrowUp,
  Loader2,
  ChevronDown,
  Check,
  Sliders,
  Mic,
  MicOff,
  BookOpen,
  X,
  Lock,
} from 'lucide-react';
import { EmailTone, ModelTier } from '@/types';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [key: number]: {
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: SpeechRecognitionErrorLike) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

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
  modelTier?: ModelTier;
  onSelectModelTier?: (tier: ModelTier) => void;
  hasStyleSample?: boolean;
  onOpenStyleModal?: () => void;
  onOpenTemplatesModal?: () => void;
  remainingTokens?: number;
  tokensCountdown?: string | null;
  initialPrompt?: string;
  conversationUsedTokens?: number;
}

export function MessageComposer({
  onSend,
  isLoading,
  activeTone,
  onSelectTone,
  onOpenTemplatesModal,
  remainingTokens,
  tokensCountdown,
  initialPrompt,
}: MessageComposerProps) {
  const [content, setContent] = useState('');

  const isLocked = Boolean(tokensCountdown) || (remainingTokens !== undefined && remainingTokens <= 0);

  // Popover state for tone
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const initialSpeechTextRef = useRef('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toneRef = useRef<HTMLDivElement>(null);

  // Sync external prompt when template or suggestion selected
  useEffect(() => {
    if (initialPrompt) {
      setContent(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  // Close tone popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toneRef.current && !toneRef.current.contains(e.target as Node)) {
        setToneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Voice Dictation cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 180);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || isLoading || isLocked) return;

    onSend(trimmed);
    setContent('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLocked) {
        handleSend();
      }
    }
  };

  // Toggle Voice Dictation via Browser Web Speech API
  const toggleDictation = () => {
    if (isLocked) return;
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      setIsListening(false);
      return;
    }

    setDictationError(null);
    const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    const SpeechRecognition = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionInstanceLike)
      | undefined;

    if (!SpeechRecognition) {
      setDictationError('Voice dictation is not supported in this browser. Try Chrome, Safari, or Edge.');
      setTimeout(() => setDictationError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      initialSpeechTextRef.current = content;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const prefix = initialSpeechTextRef.current ? `${initialSpeechTextRef.current} ` : '';
        setContent(prefix + transcript);

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          const newHeight = Math.min(textareaRef.current.scrollHeight, 180);
          textareaRef.current.style.height = `${newHeight}px`;
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorLike) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setDictationError('Microphone permission was denied. Please allow microphone access.');
        } else if (event.error !== 'no-speech') {
          setDictationError(`Dictation error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setDictationError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error('Failed to start dictation:', err);
      setDictationError('Could not start microphone session.');
      setIsListening(false);
      setTimeout(() => setDictationError(null), 4000);
    }
  };

  const isEmpty = content.trim().length === 0;

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/95 to-transparent shrink-0">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Dictation error banner if any */}
        {dictationError && (
          <div className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <span>{dictationError}</span>
            <button onClick={() => setDictationError(null)} className="p-1 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 5-Hour Locked Quota Banner */}
        {isLocked && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-200 text-xs font-mono shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
              <span>
                <strong className="text-red-300">50k Token Quota Depleted:</strong> Usage paused for 5 hours. Resumes in <strong className="text-white underline decoration-red-400/50">{tokensCountdown || '5h 00m'}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Unified Executive Composer Box */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d0f17] shadow-xl focus-within:border-cyan-500/40 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.12)] transition-all">
          {/* Main Prompt Textarea + Dictation Mic */}
          <div className="relative flex items-start rounded-t-2xl">
            <textarea
              ref={textareaRef}
              value={content}
              disabled={isLocked}
              onChange={(e) => {
                setContent(e.target.value);
                handleInput();
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isLocked
                  ? `Usage paused for 5 hours — refills in ${tokensCountdown || '5h 00m'}...`
                  : isListening
                  ? 'Listening... Speak your email instructions naturally...'
                  : 'How can LOOM AI help draft or refine your email today?'
              }
              rows={2}
              className={`w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none resize-none font-sans leading-relaxed selection:bg-cyan-500/30 selection:text-white ${
                isLocked ? 'cursor-not-allowed opacity-60' : ''
              } ${isListening ? 'placeholder:text-cyan-400 animate-pulse' : ''}`}
            />
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] bg-[#090a0f]/80 rounded-b-2xl flex-wrap gap-2">
            {/* Left Controls: Tone & Templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tone Selector */}
              <div className="relative" ref={toneRef}>
                <button
                  type="button"
                  onClick={() => {
                    setToneDropdownOpen(!toneDropdownOpen);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer border ${
                    activeTone
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-medium'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-[#f8fafc] border-transparent hover:border-white/[0.08]'
                  }`}
                  title="Configure Email Tone"
                >
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  <span>{activeTone || 'Tone'}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>

                {/* Tone Popover Menu */}
                {toneDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-white/[0.12] bg-[#121520] p-1.5 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1">
                      Email Tone
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTone(null);
                        setToneDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                        !activeTone
                          ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                          : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span>Natural / Default</span>
                      {!activeTone && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                    {TONES.map((tone) => {
                      const isSelected = activeTone === tone;
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => {
                            onSelectTone(tone);
                            setToneDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                              : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <span>{tone}</span>
                          {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Templates Button */}
              {onOpenTemplatesModal && (
                <button
                  type="button"
                  onClick={onOpenTemplatesModal}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono text-zinc-400 hover:bg-white/[0.05] hover:text-[#f8fafc] transition-colors cursor-pointer border border-transparent hover:border-white/[0.08]"
                  title="Browse email template starters"
                >
                  <BookOpen className="w-3 h-3" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
              )}
            </div>

            {/* Right Controls: Voice Mic & Send Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDictation}
                disabled={isLocked}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                  isLocked
                    ? 'opacity-40 cursor-not-allowed border-transparent text-zinc-600'
                    : isListening
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border-transparent'
                }`}
                title={isLocked ? 'Usage paused' : isListening ? 'Stop dictation' : 'Voice dictation'}
                aria-label="Voice Dictation"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5 text-cyan-400" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isEmpty || isLoading || isLocked}
                className={`p-1.5 rounded-xl transition-all ${
                  isLocked
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/[0.04]'
                    : isEmpty || isLoading
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold shadow-lg shadow-cyan-500/25 cursor-pointer hover:scale-[1.03]'
                }`}
                aria-label="Send draft request"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Minimalist Subtitle Helper */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-mono">
          <span>
            {isLocked ? (
              <span className="text-red-400 font-medium">Usage paused • Refill in {tokensCountdown || '5h 00m'}</span>
            ) : (
              '100k context window • 50k token cycle'
            )}
          </span>
          <span className="hidden sm:inline">
            {isLocked ? '5-hour automatic refill countdown active' : 'Shift + Enter for new line'}
          </span>
        </div>
      </div>
    </div>
  );
}
