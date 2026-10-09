'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserCategory, EmailPurpose, PreferredStyle } from '@/types';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  User,
  Briefcase,
  Target,
  PenTool,
  Loader2,
} from 'lucide-react';

const CATEGORIES: { label: UserCategory; desc: string }[] = [
  { label: 'Professional', desc: 'Working in tech, corporate, or operations' },
  { label: 'Founder', desc: 'Running an early-stage startup or venture' },
  { label: 'Freelancer', desc: 'Working independently with various clients' },
  { label: 'Student', desc: 'Enrolled in academic coursework or research' },
  { label: 'Other', desc: 'General correspondence and community' },
];

const PURPOSES: { label: EmailPurpose; desc: string }[] = [
  { label: 'Work', desc: 'Internal team syncs, stakeholder updates, and reports' },
  { label: 'Business', desc: 'Client outreach, partnership proposals, and sales' },
  { label: 'School', desc: 'Professor inquiries, applications, and group projects' },
  { label: 'Personal', desc: 'Casual communication and personal correspondence' },
  { label: 'Mixed', desc: 'A versatile combination of personal and business needs' },
];

const STYLES: { label: PreferredStyle; desc: string }[] = [
  { label: 'Professional', desc: 'Polished, articulate, and business-focused' },
  { label: 'Friendly', desc: 'Approachable, warm, and collaborative' },
  { label: 'Direct', desc: 'Concise, high-efficiency, with zero fluff' },
  { label: 'Warm', desc: 'Empathetic, encouraging, and supportive' },
  { label: 'Adaptable', desc: 'Context-aware, adapting to whoever you email' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form State
  const [preferredName, setPreferredName] = useState('');
  const [userCategory, setUserCategory] = useState<UserCategory | null>(null);
  const [emailPurpose, setEmailPurpose] = useState<EmailPurpose | null>(null);
  const [preferredStyle, setPreferredStyle] = useState<PreferredStyle | null>(null);
  const [styleSample, setStyleSample] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resume state from Supabase or localStorage
  useEffect(() => {
    async function loadInitialProfile() {
      if (!isSupabaseConfigured()) {
        // Fallback to local storage
        const localName = localStorage.getItem('loom_onboard_name') || '';
        const localCat = (localStorage.getItem('loom_onboard_cat') as UserCategory) || null;
        const localPurp = (localStorage.getItem('loom_onboard_purp') as EmailPurpose) || null;
        const localStyle = (localStorage.getItem('loom_onboard_style') as PreferredStyle) || null;
        const localSample = localStorage.getItem('loom-ai-style-sample') || '';

        if (localName) setPreferredName(localName);
        if (localCat) setUserCategory(localCat);
        if (localPurp) setEmailPurpose(localPurp);
        if (localStyle) setPreferredStyle(localStyle);
        if (localSample) setStyleSample(localSample);
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth');
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.preferred_name) setPreferredName(profile.preferred_name);
        if (profile.user_category) setUserCategory(profile.user_category);
        if (profile.email_purpose) setEmailPurpose(profile.email_purpose);
        if (profile.preferred_style) setPreferredStyle(profile.preferred_style);
        if (profile.style_sample) setStyleSample(profile.style_sample);

        // If user has already completed onboarding, allow visiting or fast-track
        const autoSkip = new URLSearchParams(window.location.search).get('edit') !== 'true';
        if (profile.onboarding_completed && autoSkip) {
          router.replace('/app');
          return;
        }
      } else {
        // Default preferred name from OAuth user metadata
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        if (metaName) setPreferredName(metaName);
      }

      setIsLoading(false);
    }

    loadInitialProfile();
  }, [router]);

  // Intermediate auto-save helper
  const saveProgress = async (partialData: Record<string, unknown>) => {
    if (isSupabaseConfigured() && userId) {
      const supabase = createClient();
      await supabase.from('profiles').upsert({
        id: userId,
        ...partialData,
        updated_at: new Date().toISOString(),
      });
    }

    // Local storage backup
    if (partialData.preferred_name) localStorage.setItem('loom_onboard_name', String(partialData.preferred_name));
    if (partialData.user_category) localStorage.setItem('loom_onboard_cat', String(partialData.user_category));
    if (partialData.email_purpose) localStorage.setItem('loom_onboard_purp', String(partialData.email_purpose));
    if (partialData.preferred_style) localStorage.setItem('loom_onboard_style', String(partialData.preferred_style));
    if (partialData.style_sample) localStorage.setItem('loom-ai-style-sample', String(partialData.style_sample));
  };

  const handleNext = async () => {
    setValidationError(null);

    // Validation per step
    if (currentStep === 1) {
      if (!preferredName.trim()) {
        setValidationError('Please enter your preferred name.');
        return;
      }
      await saveProgress({ preferred_name: preferredName.trim() });
    } else if (currentStep === 2) {
      if (!userCategory) {
        setValidationError('Please select a category that best describes you.');
        return;
      }
      await saveProgress({ user_category: userCategory });
    } else if (currentStep === 3) {
      if (!emailPurpose) {
        setValidationError('Please choose your primary email purpose.');
        return;
      }
      await saveProgress({ email_purpose: emailPurpose });
    } else if (currentStep === 4) {
      if (!preferredStyle) {
        setValidationError('Please select your preferred writing style.');
        return;
      }
      await saveProgress({ preferred_style: preferredStyle });
    } else if (currentStep === 5) {
      await saveProgress({ style_sample: styleSample.trim() });
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    const finalData = {
      preferred_name: preferredName.trim(),
      user_category: userCategory,
      email_purpose: emailPurpose,
      preferred_style: preferredStyle,
      style_sample: styleSample.trim(),
      onboarding_completed: true,
    };

    await saveProgress(finalData);

    if (styleSample.trim()) {
      localStorage.setItem('loom-ai-style-sample', styleSample.trim());
    }

    setIsSaving(false);
    router.replace('/app');
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-xs text-zinc-400 font-mono">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-[#09090b] text-zinc-100 p-4 sm:p-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-pink-600/10 via-purple-600/15 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between pb-6 relative z-10">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl mx-auto mb-6 relative z-10">
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Wizard Content Card */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center relative z-10 my-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#121217]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-sm transition-all">
          {/* Validation Error banner */}
          {validationError && (
            <div className="mb-6 p-3 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300 text-xs flex items-center gap-2">
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: PREFERRED NAME */}
          {currentStep === 1 && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <User className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider">Step 1</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                What should LOOM call you?
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Your preferred name will be used to personalize greetings and email sign-offs.
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Preferred Name</label>
                <input
                  type="text"
                  autoFocus
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="e.g. Gautam or Alex"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-sm placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* STEP 2: USER CATEGORY */}
          {currentStep === 2 && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider">Step 2</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                Which category describes you best?
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Helps LOOM AI tailor vocabulary, formality, and context to your daily work.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setUserCategory(cat.label)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                      userCategory === cat.label
                        ? 'border-purple-500 bg-purple-950/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">{cat.label}</div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: MAIN EMAIL PURPOSE */}
          {currentStep === 3 && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider">Step 3</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                What is your main email writing goal?
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Tell us where most of your drafted emails will be sent.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PURPOSES.map((purp) => (
                  <button
                    key={purp.label}
                    type="button"
                    onClick={() => setEmailPurpose(purp.label)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                      emailPurpose === purp.label
                        ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">{purp.label}</div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{purp.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PREFERRED WRITING STYLE */}
          {currentStep === 4 && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider">Step 4</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                What is your default writing style?
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                Choose the baseline tone that feels most authentic to you.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STYLES.map((style) => (
                  <button
                    key={style.label}
                    type="button"
                    onClick={() => setPreferredStyle(style.label)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                      preferredStyle === style.label
                        ? 'border-pink-500 bg-pink-950/20 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">{style.label}</div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: OPTIONAL WRITING SAMPLE */}
          {currentStep === 5 && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <PenTool className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-wider">Step 5 (Optional)</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                Add a personal writing sample
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                Paste an email or paragraph you wrote previously. LOOM AI will analyze your sentence
                cadence and phrasing habits. You can skip this and add it anytime.
              </p>

              <div className="mb-4">
                <textarea
                  value={styleSample}
                  onChange={(e) => setStyleSample(e.target.value)}
                  rows={6}
                  placeholder={`Hi Team,\n\nHope everyone is having a solid week. Quick update on the roadmap deliverables—we closed the QA blockers this morning...\n\nBest,\n${
                    preferredName || 'Alex'
                  }`}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/60 text-white text-sm placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans leading-relaxed"
                />
                <div className="text-right text-xs text-zinc-500 mt-1">
                  {styleSample.trim()
                    ? `${styleSample.trim().split(/\s+/).length} words provided`
                    : 'Optional — you can skip this step'}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMATION & COMPLETION */}
          {currentStep === 6 && (
            <div className="animate-in fade-in duration-200 text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 font-mono">
                You&apos;re ready to write with LOOM AI
              </h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                We configured your workspace for{' '}
                <span className="text-purple-300 font-semibold">{preferredName}</span> with a{' '}
                <span className="text-cyan-300 font-semibold">{preferredStyle}</span> style tailored for{' '}
                <span className="text-pink-300 font-semibold">{emailPurpose}</span> communication.
              </p>

              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 text-left max-w-md mx-auto text-xs space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Name:</span>
                  <span className="font-medium text-zinc-200">{preferredName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category:</span>
                  <span className="font-medium text-zinc-200">{userCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Purpose:</span>
                  <span className="font-medium text-zinc-200">{emailPurpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Baseline Style:</span>
                  <span className="font-medium text-zinc-200">{preferredStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Style Sample:</span>
                  <span className="font-medium text-zinc-200">
                    {styleSample.trim() ? 'Configured' : 'Skipped (can add anytime)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between gap-4">
            {currentStep > 1 && currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {currentStep === 5 && !styleSample.trim() && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Skip for now
                </button>
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:opacity-95 text-white text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:opacity-95 text-white text-sm font-semibold shadow-[0_0_20px_rgba(217,70,239,0.35)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto text-center pt-4 text-[11px] text-zinc-600 relative z-10 font-mono">
        LOOM AI — Personalization Engine
      </footer>
    </div>
  );
}
