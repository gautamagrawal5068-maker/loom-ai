'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Trash2, Sliders } from 'lucide-react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0d0f17] shadow-2xl border border-white/[0.08] text-[#f8fafc] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.08] bg-[#090a0f]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121520] text-cyan-400 border border-white/[0.08]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f8fafc] font-mono">Personal Writing Profile</h2>
              <p className="text-xs text-zinc-400">Personalize tone, conventions, and authentic voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-[#f8fafc] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-5 pt-3 border-b border-white/[0.08] bg-[#090a0f] gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sample')}
            className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sample'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-[#f8fafc]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Voice Sample {wordCount > 0 ? `(${wordCount}w)` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 pb-2.5 px-2 text-xs font-mono font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-[#f8fafc]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Style & Conventions</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[58vh]">
          {activeTab === 'sample' ? (
            <div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                Paste an email or paragraph you previously wrote. LOOM AI emulates your actual sentence
                length, vocabulary, phrasing rhythm, and sign-offs to write future drafts in your authentic voice.
              </p>

              <textarea
                value={profile.styleSample || ''}
                onChange={(e) => setProfile((prev) => ({ ...prev, styleSample: e.target.value }))}
                rows={7}
                placeholder={`e.g.\nHi Sarah,\n\nHope your week is going great! Quick follow-up on the design proposal we reviewed on Tuesday. Everything looks solid—just have two quick questions on timeline.\n\nLet me know if you have 5 mins tomorrow.\n\nBest,\nAlex`}
                className="w-full rounded-xl border border-white/[0.08] bg-[#121520] p-3 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans leading-relaxed resize-y"
              />

              <div className="flex items-center justify-between mt-2 px-1 text-xs text-zinc-500 font-mono">
                <span>
                  {wordCount > 0 ? (
                    <span className="text-cyan-400 font-medium">{wordCount} words provided</span>
                  ) : (
                    'No sample set'
                  )}
                </span>
                {wordCount > 0 && wordCount < 25 && (
                  <span className="text-cyan-400">Tip: 25+ words gives best personalization</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Default Tone */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  Default Email Tone
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setProfile((prev) => ({ ...prev, defaultTone: null }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                      !profile.defaultTone
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold'
                        : 'bg-[#121520] text-zinc-400 hover:text-[#f8fafc] border-white/[0.08]'
                    }`}
                  >
                    Natural / Dynamic
                  </button>
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, defaultTone: tone }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                        profile.defaultTone === tone
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold'
                          : 'bg-[#121520] text-zinc-400 hover:text-[#f8fafc] border-white/[0.08]'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Length */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  Preferred Draft Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, preferredLength: opt.id }))}
                      className={`p-2.5 rounded-xl text-left transition-colors cursor-pointer border ${
                        profile.preferredLength === opt.id
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                          : 'bg-[#121520] text-zinc-400 hover:text-[#f8fafc] border-white/[0.08]'
                      }`}
                    >
                      <div className="text-xs font-mono font-semibold block">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Writing Style Demeanor */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  Writing Demeanor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProfile((prev) => ({ ...prev, writingStyle: opt.id }))}
                      className={`p-2.5 rounded-xl text-left transition-colors cursor-pointer border ${
                        profile.writingStyle === opt.id
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                          : 'bg-[#121520] text-zinc-400 hover:text-[#f8fafc] border-white/[0.08]'
                      }`}
                    >
                      <div className="text-xs font-mono font-semibold block">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Greeting & Sign-off */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1 uppercase tracking-wider">
                    Preferred Greeting
                  </label>
                  <input
                    type="text"
                    value={profile.preferredGreeting}
                    onChange={(e) => setProfile((prev) => ({ ...prev, preferredGreeting: e.target.value }))}
                    placeholder="e.g. Hi [Name],"
                    className="w-full bg-[#121520] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1 uppercase tracking-wider">
                    Preferred Sign-off
                  </label>
                  <input
                    type="text"
                    value={profile.preferredSignoff}
                    onChange={(e) => setProfile((prev) => ({ ...prev, preferredSignoff: e.target.value }))}
                    placeholder="e.g. Best,"
                    className="w-full bg-[#121520] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-mono font-semibold text-[#f8fafc] mb-1.5 uppercase tracking-wider">
                  Default Language
                </label>
                <select
                  value={profile.preferredLanguage}
                  onChange={(e) => setProfile((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
                  className="w-full bg-[#121520] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-[#f8fafc] focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.08] bg-[#090a0f]">
          {activeTab === 'sample' && profile.styleSample?.trim() ? (
            <button
              onClick={handleClearSample}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-950/20 cursor-pointer font-mono"
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
              className="rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-zinc-400 hover:text-[#f8fafc] hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 hover:opacity-95 text-white px-4 py-2 text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  Saved!
                </>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
