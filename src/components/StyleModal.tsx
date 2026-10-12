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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#21201e] p-6 shadow-xl border border-[#34322e] text-[#edebe6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#282624] text-[#cc785c] border border-[#383633]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#edebe6] font-mono">Personal Writing Voice</h2>
              <p className="text-xs text-[#9f9d96]">Teach LOOM AI your authentic cadence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8a877e] hover:bg-[#282624] hover:text-[#edebe6] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-[#9f9d96] mb-3.5 leading-relaxed">
          Paste an email or paragraph you have previously written. LOOM AI will adapt its greeting
          habits, sentence lengths, tone nuances, and sign-offs to write future drafts in your voice.
        </p>

        {/* Textarea */}
        <div className="relative mb-3">
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={7}
            placeholder={`e.g.\nHi Sarah,\n\nHope your week is going great! Quick follow-up on the design proposal we reviewed on Tuesday. Everything looks solid—just have two quick questions on timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex`}
            className="w-full rounded-xl border border-[#34322e] bg-[#1a1918] p-3.5 text-sm text-[#edebe6] placeholder:text-[#6e6b63] focus:border-[#cc785c] focus:outline-none focus:ring-1 focus:ring-[#cc785c]/30 transition-all font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-[#8a877e] font-mono">
            <span>
              {wordCount > 0 ? (
                <span className="text-[#cc785c] font-medium">{wordCount} words provided</span>
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
        <div className="flex items-center justify-between pt-3 border-t border-[#2d2b28]">
          {sampleText.trim() ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-[#8a877e] hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-950/20 cursor-pointer font-mono"
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
              className="rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-[#9f9d96] hover:text-[#edebe6] hover:bg-[#282624] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-[#cc785c] hover:bg-[#b95736] px-4 py-2 text-xs font-mono font-semibold text-white transition-colors cursor-pointer shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  Saved!
                </>
              ) : (
                'Save Voice'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
