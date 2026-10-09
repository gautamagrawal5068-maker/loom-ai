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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Personal Writing Style</h2>
              <p className="text-xs text-stone-500">Teach LOOM AI how you naturally write</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-stone-600 mb-3 leading-relaxed">
          Paste a sample email or paragraph you have previously written. LOOM AI will analyze your
          greeting style, sentence rhythm, level of formality, and sign-offs to write future drafts
          in your authentic voice.
        </p>

        {/* Textarea */}
        <div className="relative mb-3">
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={7}
            placeholder={`e.g.\nHi Sarah,\n\nHope your week is going great! Quick follow-up on the design proposal we reviewed on Tuesday. Everything looks solid—just have two quick questions on timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex`}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-stone-400">
            <span>
              {wordCount > 0 ? (
                <span className="text-emerald-700 font-medium">{wordCount} words provided</span>
              ) : (
                'No sample set yet'
              )}
            </span>
            {wordCount > 0 && wordCount < 20 && (
              <span className="text-amber-600">Tip: 25+ words gives best results</span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          {sampleText.trim() ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
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
              className="rounded-xl px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
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
