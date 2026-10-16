'use client';

import { useState, useEffect } from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import { WritingProfile, EmailTone } from '@/types';
import { DEFAULT_WRITING_PROFILE } from '@/lib/storage';

interface StyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  writingProfile: WritingProfile;
  onSaveProfile: (profile: WritingProfile) => void;
}

const TONES: EmailTone[] = [
  'Formal',
  'Friendly',
  'Assertive',
  'Apologetic',
  'Concise',
  'Persuasive',
];

const LENGTH_OPTIONS = [
  { id: 'concise', label: 'Concise', desc: '1-2 short paragraphs' },
  { id: 'balanced', label: 'Balanced', desc: '2-3 standard paragraphs' },
  { id: 'thorough', label: 'Thorough', desc: 'In-depth with full details' },
] as const;

const STYLE_OPTIONS = [
  { id: 'professional', label: 'Professional', desc: 'Polished executive tone' },
  { id: 'warm', label: 'Warm & Friendly', desc: 'Approachable & collaborative' },
  { id: 'direct', label: 'Direct', desc: 'Action-oriented, minimal filler' },
  { id: 'academic', label: 'Academic', desc: 'Scholarly & articulate' },
] as const;

const LANGUAGES = [
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Hindi',
  'Japanese',
  'Italian',
];

const SAMPLE_TARGET_WORDS = 25;

const segmentClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm whitespace-nowrap transition-colors ${
    active ? 'bg-raised text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
  }`;

const optionCardClass = (active: boolean) =>
  `relative w-full rounded-2xl border p-3.5 text-left transition-colors ${
    active
      ? 'border-accent-line bg-accent-soft'
      : 'border-line bg-panel hover:border-line-strong hover:bg-hover'
  }`;

export function StyleModal({
  isOpen,
  onClose,
  writingProfile,
  onSaveProfile,
}: StyleModalProps) {
  const [profile, setProfile] = useState<WritingProfile>(writingProfile || DEFAULT_WRITING_PROFILE);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'sample' | 'preferences'>('sample');

  useEffect(() => {
    if (writingProfile) {
      setProfile(writingProfile);
    }
  }, [writingProfile, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleClearSample = () => {
    setProfile((prev) => ({ ...prev, styleSample: '' }));
  };

  const wordCount = profile.styleSample?.trim() ? profile.styleSample.trim().split(/\s+/).length : 0;
  const sampleStrength = Math.min(wordCount / SAMPLE_TARGET_WORDS, 1);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="modal-backdrop animate-in fade-in duration-150" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        className="modal-panel relative z-10 w-full max-w-2xl max-h-[85dvh] flex flex-col overflow-hidden text-fg animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="style-modal-title" className="text-lg font-semibold text-fg">
                Writing profile
              </h2>
              <p className="mt-0.5 text-sm text-fg-subtle">
                Personalize tone, conventions, and your authentic voice.
              </p>
            </div>
            <button onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 inline-flex p-1 rounded-full bg-panel border border-line" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sample'}
              onClick={() => setActiveTab('sample')}
              className={segmentClass(activeTab === 'sample')}
            >
              <span>Voice sample</span>
              {wordCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-fg-subtle">{wordCount}w</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preferences'}
              onClick={() => setActiveTab('preferences')}
              className={segmentClass(activeTab === 'preferences')}
            >
              Style &amp; conventions
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === 'sample' ? (
            <div className="space-y-3">
              <p className="text-sm text-fg-muted leading-relaxed">
                Paste an email or paragraph you previously wrote. LOOM AI emulates your sentence length,
                vocabulary, phrasing rhythm, and sign-offs to write future drafts in your own voice.
              </p>

              <label htmlFor="style-sample" className="sr-only">
                Voice sample
              </label>
              <textarea
                id="style-sample"
                value={profile.styleSample || ''}
                onChange={(e) => setProfile((prev) => ({ ...prev, styleSample: e.target.value }))}
                rows={8}
                placeholder={`e.g.\nHi Sarah,\n\nHope your week is going great! Quick follow-up on the design proposal we reviewed on Tuesday. Everything looks solid—just have two quick questions on timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex`}
                className="field max-sm:text-base min-h-48 resize-y leading-relaxed"
              />

              <div className="space-y-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${sampleStrength * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-fg-subtle">
                  <span>
                    {wordCount > 0 ? (
                      <span className="text-fg-muted">
                        <span className="font-mono tabular-nums">{wordCount}</span> words provided
                      </span>
                    ) : (
                      'No sample set'
                    )}
                  </span>
                  {wordCount > 0 && wordCount < SAMPLE_TARGET_WORDS && (
                    <span>Tip: 25+ words gives the best personalization</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Default Tone */}
              <div>
                <span className="label">Default email tone</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setProfile((prev) => ({ ...prev, defaultTone: null }))}
                    data-active={!profile.defaultTone}
                    className="chip"
                  >
                    Natural / Dynamic
                  </button>
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, defaultTone: tone }))}
                      data-active={profile.defaultTone === tone}
                      className="chip"
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Length */}
              <div>
                <span className="label">Preferred draft length</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LENGTH_OPTIONS.map((opt) => {
                    const active = profile.preferredLength === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setProfile((prev) => ({ ...prev, preferredLength: opt.id }))}
                        className={optionCardClass(active)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-fg">{opt.label}</span>
                          {active && <Check className="size-3.5 text-accent" />}
                        </div>
                        <div className="mt-0.5 text-xs text-fg-subtle">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Writing Style Demeanor */}
              <div>
                <span className="label">Writing demeanor</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((opt) => {
                    const active = profile.writingStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setProfile((prev) => ({ ...prev, writingStyle: opt.id }))}
                        className={optionCardClass(active)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-fg">{opt.label}</span>
                          {active && <Check className="size-3.5 text-accent" />}
                        </div>
                        <div className="mt-0.5 text-xs text-fg-subtle">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Greeting & Sign-off */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="style-greeting" className="label">
                    Preferred greeting
                  </label>
                  <input
                    id="style-greeting"
                    type="text"
                    value={profile.preferredGreeting}
                    onChange={(e) => setProfile((prev) => ({ ...prev, preferredGreeting: e.target.value }))}
                    placeholder="e.g. Hi [Name],"
                    className="field max-sm:text-base"
                  />
                </div>
                <div>
                  <label htmlFor="style-signoff" className="label">
                    Preferred sign-off
                  </label>
                  <input
                    id="style-signoff"
                    type="text"
                    value={profile.preferredSignoff}
                    onChange={(e) => setProfile((prev) => ({ ...prev, preferredSignoff: e.target.value }))}
                    placeholder="e.g. Best,"
                    className="field max-sm:text-base"
                  />
                </div>
              </div>

              {/* Language */}
              <div>
                <label htmlFor="style-language" className="label">
                  Default language
                </label>
                <select
                  id="style-language"
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
                  className="field max-sm:text-base cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between gap-2">
          {activeTab === 'sample' && profile.styleSample?.trim() ? (
            <button onClick={handleClearSample} className="btn btn-ghost -ml-2 hover:text-danger">
              <Trash2 className="size-4" />
              Clear sample
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              {savedSuccess ? (
                <>
                  <Check className="size-4" />
                  Saved
                </>
              ) : (
                'Save profile'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
