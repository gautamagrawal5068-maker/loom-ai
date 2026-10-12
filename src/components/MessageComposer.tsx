'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  ArrowUp,
  Loader2,
  Sparkles,
  ChevronDown,
  Check,
  Zap,
  Sliders,
} from 'lucide-react';
import { EmailTone, ModelTier, MODEL_CREDIT_COSTS } from '@/types';

const TONES: EmailTone[] = [
  'Formal',
  'Friendly',
  'Assertive',
  'Apologetic',
  'Concise',
  'Persuasive',
];

const MODEL_OPTIONS: {
  id: ModelTier;
  label: string;
  icon: string;
  speed: string;
  cost: number;
  desc: string;
  badge?: string;
}[] = [
  {
    id: 'silk',
    label: 'Silk',
    icon: '🪡',
    speed: '~0.8s',
    cost: MODEL_CREDIT_COSTS.silk,
    desc: 'Ultra-fast draft for quick replies & follow-ups',
  },
  {
    id: 'weave',
    label: 'Weave',
    icon: '🧵',
    speed: '~2.5s',
    cost: MODEL_CREDIT_COSTS.weave,
    desc: 'Flagship balanced tone for professional correspondence',
  },
  {
    id: 'tapestry',
    label: 'Tapestry',
    icon: '🏛️',
    speed: '~4.5s',
    cost: MODEL_CREDIT_COSTS.tapestry,
    desc: 'Deep multi-step reasoning for executive communication',
    badge: 'Heavyweight',
  },
];

interface MessageComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  activeTone: EmailTone | null;
  onSelectTone: (tone: EmailTone | null) => void;
  modelTier: ModelTier;
  onSelectModelTier: (tier: ModelTier) => void;
  credits: number;
  refillCountdown?: string;
  creditCost: number;
  hasStyleSample: boolean;
  onOpenStyleModal: () => void;
}

export function MessageComposer({
  onSend,
  isLoading,
  activeTone,
  onSelectTone,
  modelTier,
  onSelectModelTier,
  credits,
  refillCountdown,
  creditCost,
  hasStyleSample,
  onOpenStyleModal,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);
  const [creditsPopoverOpen, setCreditsPopoverOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const toneRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
      if (toneRef.current && !toneRef.current.contains(e.target as Node)) {
        setToneDropdownOpen(false);
      }
      if (creditsRef.current && !creditsRef.current.contains(e.target as Node)) {
        setCreditsPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const activeModelOption = MODEL_OPTIONS.find((m) => m.id === modelTier) || MODEL_OPTIONS[1];
  const isEmpty = !content.trim();

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-[#191817] via-[#191817]/95 to-transparent pt-2 pb-4 px-4 w-full z-20">
      <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
        {/* Claude-Style Unified Prompt Card */}
        <div className="relative w-full rounded-2xl border border-[#383633] bg-[#23211f] shadow-sm transition-all focus-within:border-[#cc785c]/70 focus-within:ring-1 focus-within:ring-[#cc785c]/30">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              activeTone
                ? `Write an email in a ${activeTone.toLowerCase()} tone...`
                : 'Write an email draft, reply to a thread, or paste text to polish...'
            }
            className="w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-sm text-[#edebe6] placeholder:text-[#8a877e] focus:outline-none focus:ring-0 leading-relaxed font-sans max-h-[180px] overflow-y-auto"
            rows={1}
            disabled={isLoading}
          />

          {/* Integrated Prompt Box Toolbar */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-[#2e2c29]/70 gap-2 flex-wrap">
            {/* Left Controls: Model Pill, Tone Pill, Credits Pill */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Claude-style Model Selector Dropdown */}
              <div className="relative" ref={modelRef}>
                <button
                  type="button"
                  onClick={() => {
                    setModelDropdownOpen(!modelDropdownOpen);
                    setToneDropdownOpen(false);
                    setCreditsPopoverOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-[#c8c5bc] hover:bg-[#2d2b28] hover:text-[#edebe6] transition-colors cursor-pointer border border-[#383633]/70 bg-[#282623]"
                  title="Select AI Model"
                >
                  <span>{activeModelOption.icon}</span>
                  <span>{activeModelOption.label}</span>
                  <span className="text-[10px] text-[#9f9d96] font-sans">
                    ({activeModelOption.cost}c)
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#9f9d96]" />
                </button>

                {/* Model Popover Menu */}
                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-72 rounded-xl border border-[#3a3834] bg-[#23211f] p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8a877e] border-b border-[#302e2b] mb-1">
                      Choose Drafting Model
                    </div>
                    {MODEL_OPTIONS.map((tier) => {
                      const isSelected = modelTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            onSelectModelTier(tier.id);
                            setModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 rounded-lg p-2 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#2f2d29] text-white border border-[#42403b]'
                              : 'text-[#c8c5bc] hover:bg-[#2a2825] hover:text-white'
                          }`}
                        >
                          <span className="text-base mt-0.5">{tier.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold font-mono flex items-center gap-1.5">
                                <span>{tier.label}</span>
                                {tier.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#cc785c]/20 text-[#cc785c] font-sans border border-[#cc785c]/30">
                                    {tier.badge}
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] font-mono text-[#cc785c] font-medium">
                                {tier.cost} {tier.cost === 1 ? 'credit' : 'credits'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#9f9d96] leading-tight mt-0.5">
                              {tier.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#cc785c] shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tone Selector Pill */}
              <div className="relative" ref={toneRef}>
                <button
                  type="button"
                  onClick={() => {
                    setToneDropdownOpen(!toneDropdownOpen);
                    setModelDropdownOpen(false);
                    setCreditsPopoverOpen(false);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer border ${
                    activeTone
                      ? 'bg-[#cc785c]/15 text-[#cc785c] border-[#cc785c]/40 font-medium'
                      : 'text-[#a6a39b] hover:bg-[#2d2b28] hover:text-[#edebe6] border-transparent hover:border-[#383633]/50'
                  }`}
                  title="Configure Email Tone"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{activeTone || 'Tone'}</span>
                  <ChevronDown className="w-3 h-3 text-[#9f9d96]" />
                </button>

                {/* Tone Popover Menu */}
                {toneDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-48 rounded-xl border border-[#3a3834] bg-[#23211f] p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8a877e] border-b border-[#302e2b] mb-1">
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
                          ? 'bg-[#2f2d29] text-white font-medium'
                          : 'text-[#c8c5bc] hover:bg-[#2a2825] hover:text-white'
                      }`}
                    >
                      <span>Natural / Default</span>
                      {!activeTone && <Check className="w-3 h-3 text-[#cc785c]" />}
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
                              ? 'bg-[#2f2d29] text-[#cc785c] font-medium'
                              : 'text-[#c8c5bc] hover:bg-[#2a2825] hover:text-white'
                          }`}
                        >
                          <span>{tone}</span>
                          {isSelected && <Check className="w-3 h-3 text-[#cc785c]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Credits Pill with Auto-Refill Info */}
              <div className="relative" ref={creditsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setCreditsPopoverOpen(!creditsPopoverOpen);
                    setModelDropdownOpen(false);
                    setToneDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-mono text-[#a6a39b] hover:bg-[#2d2b28] hover:text-[#edebe6] transition-colors cursor-pointer border border-transparent hover:border-[#383633]/50"
                  title={`Credits automatically refill every 5 hours (${refillCountdown || '5h'})`}
                >
                  <Zap className="w-3 h-3 text-[#cc785c]" />
                  <span>
                    <strong className="text-[#edebe6] font-medium">{credits}</strong> credits
                  </span>
                  {refillCountdown && (
                    <span className="text-[10px] text-[#747169] hidden sm:inline">
                      · {refillCountdown}
                    </span>
                  )}
                </button>

                {/* Credits Popover Card */}
                {creditsPopoverOpen && (
                  <div className="absolute bottom-full left-0 mb-1.5 w-64 rounded-xl border border-[#3a3834] bg-[#23211f] p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-semibold text-[#edebe6] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#cc785c]" />
                        <span>Token Balance</span>
                      </span>
                      <span className="text-xs font-mono text-[#cc785c] font-bold">
                        {credits} credits
                      </span>
                    </div>

                    <div className="text-[11px] text-[#9f9d96] space-y-1 mb-3 font-mono border-t border-[#2e2c29] pt-2">
                      <div className="flex justify-between">
                        <span>Silk model:</span>
                        <span>1 credit</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weave model:</span>
                        <span>3 credits</span>
                      </div>
                      <div className="flex justify-between text-[#cc785c]">
                        <span>Tapestry model:</span>
                        <span>8 credits</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#1a1917] border border-[#2e2c29] p-2 text-center">
                      <span className="text-[10px] text-[#9f9d96] font-mono block">
                        Automatic 5-Hour Cycle
                      </span>
                      <span className="text-xs text-[#edebe6] font-mono font-medium block mt-0.5">
                        Refills to 250 in {refillCountdown || '5h'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls: Writing Voice Button & Send Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenStyleModal}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer border ${
                  hasStyleSample
                    ? 'bg-[#cc785c]/10 text-[#cc785c] border-[#cc785c]/40 font-medium'
                    : 'text-[#9f9d96] hover:bg-[#2d2b28] hover:text-[#edebe6] border-transparent hover:border-[#383633]/50'
                }`}
                title="Configure Writing Style Sample"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {hasStyleSample ? 'Voice Active' : 'My Voice'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isEmpty || isLoading}
                className={`p-1.5 rounded-xl transition-all ${
                  isEmpty || isLoading
                    ? 'bg-[#2b2927] text-[#5e5c55] cursor-not-allowed'
                    : 'bg-[#cc785c] hover:bg-[#b95736] text-white shadow-xs cursor-pointer hover:scale-[1.03]'
                }`}
                aria-label="Send draft request"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Subtitle Helper */}
        <div className="flex items-center justify-between text-[11px] text-[#747169] px-1 font-mono">
          <span>
            Model: <strong className="text-[#a6a39b]">{activeModelOption.label}</strong> ({creditCost}c)
            {activeModelOption.id === 'tapestry' && (
              <span className="text-[#cc785c] ml-1.5">• Deep Humanizer Active</span>
            )}
          </span>
          <span className="hidden sm:inline">Shift + Enter for new line • Enter to draft</span>
        </div>
      </div>
    </div>
  );
}
