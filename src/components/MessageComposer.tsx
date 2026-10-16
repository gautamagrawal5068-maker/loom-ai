'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  ArrowUp,
  Loader2,
  ChevronDown,
  Check,
  SlidersHorizontal,
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
  /** 'hero' = centered on the empty state, 'docked' = pinned under the thread. */
  variant?: 'hero' | 'docked';
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
  variant = 'docked',
}: MessageComposerProps) {
  const [content, setContent] = useState('');

  const isLocked = Boolean(tokensCountdown) || (remainingTokens !== undefined && remainingTokens <= 0);

  // Popover state for tone
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const initialSpeechTextRef = useRef('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toneRef = useRef<HTMLDivElement>(null);

  // Sync external prompt when template or suggestion selected
  useEffect(() => {
    if (initialPrompt) {
      setContent(initialPrompt);
      // Resize after React commits the new value, then place the caret at the end.
      const id = setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [initialPrompt]);

  // Close tone popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toneRef.current && !toneRef.current.contains(e.target as Node)) {
        setToneDropdownOpen(false);
      }
    }
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        setToneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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

    // Immediately terminate any active voice dictation session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    isListeningRef.current = false;
    setIsListening(false);
    initialSpeechTextRef.current = '';

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
      isListeningRef.current = false;
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
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (!isListeningRef.current) return;
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
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
        isListeningRef.current = false;
        setIsListening(false);
        setTimeout(() => setDictationError(null), 5000);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error('Failed to start dictation:', err);
      setDictationError('Could not start microphone session.');
      isListeningRef.current = false;
      setIsListening(false);
      setTimeout(() => setDictationError(null), 4000);
    }
  };

  const isEmpty = content.trim().length === 0;


  const isHero = variant === 'hero';
  const canSend = !isEmpty && !isLoading && !isLocked;

  return (
    <div
      className={
        isHero
          ? 'w-full'
          : 'relative shrink-0 bg-bg px-3 sm:px-4 pb-3 pt-1 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-bg before:to-transparent'
      }
    >
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Dictation error */}
        {dictationError && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-danger-line bg-danger-soft pl-3.5 pr-1 py-1 text-sm text-danger animate-in fade-in">
            <span>{dictationError}</span>
            <button onClick={() => setDictationError(null)} className="icon-btn text-danger" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Quota paused */}
        {isLocked && (
          <div className="flex items-center gap-2.5 rounded-xl border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-fg-muted animate-in fade-in duration-200">
            <Lock className="size-4 text-danger shrink-0" />
            <span>
              <span className="text-fg font-medium">You&apos;ve used your 50k tokens.</span> Drafting resumes in{' '}
              <span className="font-mono text-fg">{tokensCountdown || '5h 00m'}</span>.
            </span>
          </div>
        )}

        {/* Composer */}
        <div className="composer">
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
                ? `Usage paused — refills in ${tokensCountdown || '5h 00m'}`
                : isListening
                ? 'Listening… speak your email instructions'
                : isHero
                ? 'What email should we write?'
                : 'Ask for a change, or describe a new email…'
            }
            rows={isHero ? 2 : 1}
            aria-label="Message"
            className={`block w-full resize-none bg-transparent px-5 pt-4 pb-1.5 text-base leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none ${
              isLocked ? 'cursor-not-allowed opacity-60' : ''
            } ${isListening ? 'placeholder:text-accent' : ''}`}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
            <div className="flex items-center gap-0.5">
              {/* Tone */}
              <div className="relative" ref={toneRef}>
                <button
                  type="button"
                  onClick={() => {
                    setToneDropdownOpen(!toneDropdownOpen);
                  }}
                  className={`btn btn-sm btn-ghost ${activeTone ? 'text-fg bg-hover' : ''}`}
                  title="Email tone"
                  aria-haspopup="menu"
                  aria-expanded={toneDropdownOpen}
                >
                  <SlidersHorizontal className="size-4" />
                  <span>{activeTone || 'Tone'}</span>
                  <ChevronDown className="size-3.5 text-fg-subtle" />
                </button>

                {toneDropdownOpen && (
                  <div
                    role="menu"
                    className="menu absolute bottom-full left-0 mb-2 w-56 z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 origin-bottom-left"
                  >
                    <div className="menu-label">Tone</div>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={!activeTone}
                      onClick={() => {
                        onSelectTone(null);
                        setToneDropdownOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span>
                        Natural
                        <span className="text-fg-subtle"> · your default</span>
                      </span>
                      {!activeTone && <Check className="size-4" />}
                    </button>
                    {TONES.map((tone) => {
                      const isSelected = activeTone === tone;
                      return (
                        <button
                          key={tone}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isSelected}
                          onClick={() => {
                            onSelectTone(tone);
                            setToneDropdownOpen(false);
                          }}
                          className="menu-item"
                        >
                          <span>{tone}</span>
                          {isSelected && <Check className="size-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {onOpenTemplatesModal && !isHero && (
                <button
                  type="button"
                  onClick={onOpenTemplatesModal}
                  className="btn btn-sm btn-ghost max-sm:w-9 max-sm:px-0"
                  title="Browse email templates"
                >
                  <BookOpen className="size-4" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleDictation}
                disabled={isLocked}
                className={`icon-btn rounded-full ${isListening ? 'bg-accent-soft text-accent-strong' : ''}`}
                title={isLocked ? 'Usage paused' : isListening ? 'Stop dictation' : 'Voice dictation'}
                aria-label="Voice Dictation"
                aria-pressed={isListening}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={`grid place-items-center size-9 rounded-full transition-colors ${
                  canSend ? 'bg-accent text-on-accent hover:bg-accent-strong' : 'bg-raised text-fg-faint cursor-not-allowed'
                }`}
                aria-label="Send draft request"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isLocked ? (
                  <Lock className="size-4" />
                ) : (
                  <ArrowUp className="size-[18px]" strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Helper line */}
        {!isHero && (
          <p className="text-center text-xs text-fg-faint">
            {isLocked ? (
              <span className="text-danger">Usage paused · refills in {tokensCountdown || '5h 00m'}</span>
            ) : (
              <>
                100k context window · 50k token cycle
                <span className="hidden sm:inline"> · Shift + Enter for a new line</span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
