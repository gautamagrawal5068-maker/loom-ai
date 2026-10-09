'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Trash2 } from 'lucide-react';

interface StyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleSample: string;
  onSaveStyle: (sample: string) => void;
}

export function StyleModal({
  isOpen,
  onClose,
  styleSample,
  onSaveStyle,
}: StyleModalProps) {
  const [sampleText, setSampleText] = useState(styleSample);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSampleText(styleSample);
  }, [styleSample, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveStyle(sampleText.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setSampleText('');
    onSaveStyle('');
  };

  const wordCount = sampleText.trim() ? sampleText.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#121217] p-6 shadow-2xl border border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/40 text-purple-400 border border-purple-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">Personal Writing Style</h2>
              <p className="text-xs text-zinc-400">Teach LOOM AI your authentic cadence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-zinc-400 mb-3.5 leading-relaxed">
          Paste an email or paragraph you have previously written. LOOM AI will adapt its greeting
          habits, sentence lengths, level of formality, and sign-offs to write future drafts in your voice.
        </p>

        {/* Textarea */}
        <div className="relative mb-3">
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={7}
            placeholder={`e.g.\nHi Sarah,\n\nHope your week is going great! Quick follow-up on the design proposal we reviewed on Tuesday. Everything looks solid—just have two quick questions on timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex`}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-zinc-500 font-mono">
            <span>
              {wordCount > 0 ? (
                <span className="text-purple-400 font-medium">{wordCount} words provided</span>
              ) : (
                'No sample set'
              )}
            </span>
            {wordCount > 0 && wordCount < 20 && (
              <span className="text-amber-400">Tip: 25+ words gives best results</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          {sampleText.trim() ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-950/30 cursor-pointer font-mono"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Sample
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 px-4 py-2 text-xs font-mono font-semibold text-white shadow-[0_0_15px_rgba(217,70,239,0.3)] hover:opacity-95 transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  Saved!
                </>
              ) : (
                'Save Style'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
