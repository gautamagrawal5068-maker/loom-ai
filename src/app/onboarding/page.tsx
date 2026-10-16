'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wordmark } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UserCategory, EmailPurpose, PreferredStyle, WritingProfile } from '@/types';
import { loadWritingProfile, saveWritingProfile } from '@/lib/storage';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

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

  // Resume state from Supabase user_metadata, profiles table, or localStorage
  useEffect(() => {
    async function loadInitialProfile() {
      if (!isSupabaseConfigured()) {
        // Fallback to local storage
        const localName = localStorage.getItem('loom_onboard_name') || '';
        const localCat = (localStorage.getItem('loom_onboard_cat') as UserCategory) || null;
        const localPurp = (localStorage.getItem('loom_onboard_purp') as EmailPurpose) || null;
        const localStyle = (localStorage.getItem('loom_onboard_style') as PreferredStyle) || null;
        const localSample = localStorage.getItem('loom-ai-style-sample') || '';
        const localCompleted = localStorage.getItem('loom_onboarding_completed') === 'true';

        if (localName) setPreferredName(localName);
        if (localCat) setUserCategory(localCat);
        if (localPurp) setEmailPurpose(localPurp);
        if (localStyle) setPreferredStyle(localStyle);
        if (localSample) setStyleSample(localSample);

        const autoSkip = new URLSearchParams(window.location.search).get('edit') !== 'true';
        if (localCompleted && autoSkip) {
          router.replace('/app');
          return;
        }

        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/auth');
          return;
        }

        setUserId(user.id);

        const autoSkip = new URLSearchParams(window.location.search).get('edit') !== 'true';

        // Check if user already finished onboarding via user metadata, cookie, or localStorage
        const isCompletedMeta = user.user_metadata?.onboarding_completed === true;
        const isCompletedCookie =
          typeof document !== 'undefined' &&
          document.cookie.includes('loom_onboarding_completed=true');
        const isCompletedLocal =
          typeof localStorage !== 'undefined' &&
          localStorage.getItem('loom_onboarding_completed') === 'true';

        // Preload any saved preferences from user_metadata or localStorage
        const metaName =
          user.user_metadata?.preferred_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          localStorage.getItem('loom_onboard_name') ||
          '';
        if (metaName) setPreferredName(metaName);

        const metaCat =
          user.user_metadata?.user_category ||
          (localStorage.getItem('loom_onboard_cat') as UserCategory) ||
          null;
        if (metaCat) setUserCategory(metaCat);

        const metaPurp =
          user.user_metadata?.email_purpose ||
          (localStorage.getItem('loom_onboard_purp') as EmailPurpose) ||
          null;
        if (metaPurp) setEmailPurpose(metaPurp);

        const metaStyle =
          user.user_metadata?.preferred_style ||
          (localStorage.getItem('loom_onboard_style') as PreferredStyle) ||
          null;
        if (metaStyle) setPreferredStyle(metaStyle);

        const metaSample =
          user.user_metadata?.style_sample ||
          localStorage.getItem('loom-ai-style-sample') ||
          '';
        if (metaSample) setStyleSample(metaSample);

        // Fast-track skip to /app if already completed and not in edit mode
        if ((isCompletedMeta || isCompletedCookie || isCompletedLocal) && autoSkip) {
          router.replace('/app');
          return;
        }

        // Also query profiles table if it exists
        try {
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

            if (profile.onboarding_completed && autoSkip) {
              document.cookie =
                'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';
              localStorage.setItem('loom_onboarding_completed', 'true');
              router.replace('/app');
              return;
            }
          }
        } catch {
          // profiles table does not exist or has RLS error; handled gracefully
        }
      } catch (err) {
        console.error('Onboarding session fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialProfile();
  }, [router]);

  // Unified save helper (persists to localStorage, Supabase user_metadata, and profiles table)
  const saveProgress = async (partialData: Record<string, unknown>) => {
    // 1. LocalStorage backup
    if (partialData.preferred_name)
      localStorage.setItem('loom_onboard_name', String(partialData.preferred_name));
    if (partialData.user_category)
      localStorage.setItem('loom_onboard_cat', String(partialData.user_category));
    if (partialData.email_purpose)
      localStorage.setItem('loom_onboard_purp', String(partialData.email_purpose));
    if (partialData.preferred_style)
      localStorage.setItem('loom_onboard_style', String(partialData.preferred_style));
    if (partialData.style_sample)
      localStorage.setItem('loom-ai-style-sample', String(partialData.style_sample));

    if (partialData.onboarding_completed) {
      localStorage.setItem('loom_onboarding_completed', 'true');
      document.cookie =
        'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';
    }

    // 2. Persist to Supabase Auth user_metadata (100% reliable, zero schema requirements)
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      try {
        await supabase.auth.updateUser({
          data: partialData,
        });
      } catch (metaErr) {
        console.warn('Supabase user metadata update warning:', metaErr);
      }

      // 3. Try to upsert to profiles table if it exists
      if (userId) {
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            ...partialData,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Table may not exist yet in user's Supabase project
        }
      }
    }
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
      preferred_name: preferredName.trim() || 'User',
      user_category: userCategory || 'Professional',
      email_purpose: emailPurpose || 'Work',
      preferred_style: preferredStyle || 'Professional',
      style_sample: styleSample.trim(),
      onboarding_completed: true,
    };

    await saveProgress(finalData);

    localStorage.setItem('loom_onboarding_completed', 'true');
    document.cookie =
      'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';

    if (styleSample.trim()) {
      localStorage.setItem('loom-ai-style-sample', styleSample.trim());
    }

    // Save onboarding preferences directly into the personal writing profile
    try {
      const currentProfile = loadWritingProfile();
      const styleMap: Record<PreferredStyle, WritingProfile['writingStyle']> = {
        Professional: 'professional',
        Friendly: 'warm',
        Direct: 'direct',
        Warm: 'warm',
        Adaptable: 'professional',
      };
      const updatedProfile: WritingProfile = {
        ...currentProfile,
        styleSample: styleSample.trim() || currentProfile.styleSample,
        userCategory: finalData.user_category,
        emailPurpose: finalData.email_purpose,
        preferredStyle: finalData.preferred_style,
        writingStyle: finalData.preferred_style ? styleMap[finalData.preferred_style] || currentProfile.writingStyle : currentProfile.writingStyle,
      };
      saveWritingProfile(updatedProfile);
    } catch (err) {
      console.warn('Failed to save writing profile during onboarding finish:', err);
    }

    setIsSaving(false);
    router.replace('/app');
  };

  const handleSkipToWorkspace = async () => {
    setIsSaving(true);
    const finalData = {
      onboarding_completed: true,
      preferred_name: preferredName.trim() || 'User',
      user_category: userCategory || 'Professional',
      preferred_style: preferredStyle || 'Professional',
      email_purpose: emailPurpose || 'Work',
      style_sample: styleSample.trim(),
    };
    await saveProgress(finalData);
    localStorage.setItem('loom_onboarding_completed', 'true');
    document.cookie =
      'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';

    if (styleSample.trim()) {
      localStorage.setItem('loom-ai-style-sample', styleSample.trim());
    }

    try {
      const currentProfile = loadWritingProfile();
      const styleMap: Record<PreferredStyle, WritingProfile['writingStyle']> = {
        Professional: 'professional',
        Friendly: 'warm',
        Direct: 'direct',
        Warm: 'warm',
        Adaptable: 'professional',
      };
      const updatedProfile: WritingProfile = {
        ...currentProfile,
        styleSample: styleSample.trim() || currentProfile.styleSample,
        userCategory: finalData.user_category,
        emailPurpose: finalData.email_purpose,
        preferredStyle: finalData.preferred_style,
        writingStyle: finalData.preferred_style ? styleMap[finalData.preferred_style] || currentProfile.writingStyle : currentProfile.writingStyle,
      };
      saveWritingProfile(updatedProfile);
    } catch (err) {
      console.warn('Failed to save writing profile during skip:', err);
    }

    setIsSaving(false);
    router.replace('/app');
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-5 animate-spin text-fg-subtle" />
          <p className="text-sm text-fg-subtle">Loading onboarding…</p>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const optionClass = (selected: boolean) =>
    `relative w-full rounded-2xl border px-4 py-3.5 pr-11 text-left transition-colors ${
      selected
        ? 'border-accent-line bg-accent-soft'
        : 'border-line bg-panel hover:border-line-strong'
    }`;

  const renderOptions = <T extends string>(
    options: { label: T; desc: string }[],
    selected: T | null,
    onSelect: (value: T) => void
  ) => (
    <div className="grid grid-cols-1 gap-2.5">
      {options.map((opt) => {
        const isSelected = selected === opt.label;
        return (
          <button
            key={opt.label}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(opt.label)}
            className={optionClass(isSelected)}
          >
            <div className="text-sm font-medium text-fg">{opt.label}</div>
            <div className="mt-0.5 text-sm leading-relaxed text-fg-muted">{opt.desc}</div>
            {isSelected && (
              <Check className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-accent" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-fg px-4 sm:px-8">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-xl items-center justify-between pt-5 pb-4">
        <Link href="/" aria-label="Loom.ai home" className="rounded-lg">
          <Wordmark size="sm" />
        </Link>
        <button type="button" onClick={handleSkipToWorkspace} className="btn btn-ghost btn-sm -mr-2">
          Skip to workspace
        </button>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between text-sm text-fg-subtle">
          <span>
            Step <span className="tabular-nums">{currentStep}</span> of{' '}
            <span className="tabular-nums">{totalSteps}</span>
          </span>
          {currentStep === 5 && <span>Optional</span>}
        </div>
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentStep}
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Wizard content */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col py-12 sm:py-16">
        {/* STEP 1: PREFERRED NAME */}
        {currentStep === 1 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              What should Loom call you?
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Your preferred name will be used to personalize greetings and email sign-offs.
            </p>

            <div className="mt-8">
              <label htmlFor="onboard-name" className="label">
                Preferred name
              </label>
              <input
                id="onboard-name"
                type="text"
                autoFocus
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="e.g. Gautam or Alex"
                className="field"
              />
            </div>
          </div>
        )}

        {/* STEP 2: USER CATEGORY */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              Which describes you best?
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Helps Loom tailor vocabulary, formality, and context to your daily work.
            </p>
            <div className="mt-8">{renderOptions(CATEGORIES, userCategory, setUserCategory)}</div>
          </div>
        )}

        {/* STEP 3: MAIN EMAIL PURPOSE */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              What will you mostly write?
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Tell us where most of your drafted emails will be sent.
            </p>
            <div className="mt-8">{renderOptions(PURPOSES, emailPurpose, setEmailPurpose)}</div>
          </div>
        )}

        {/* STEP 4: PREFERRED WRITING STYLE */}
        {currentStep === 4 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              What&apos;s your default writing style?
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Choose the baseline tone that feels most authentic to you.
            </p>
            <div className="mt-8">{renderOptions(STYLES, preferredStyle, setPreferredStyle)}</div>
          </div>
        )}

        {/* STEP 5: OPTIONAL WRITING SAMPLE */}
        {currentStep === 5 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              Add a writing sample
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              Paste an email or paragraph you wrote previously. Loom will learn your sentence
              cadence and phrasing habits. You can skip this and add it anytime.
            </p>

            <div className="mt-8">
              <label htmlFor="onboard-sample" className="label">
                Writing sample
              </label>
              <textarea
                id="onboard-sample"
                value={styleSample}
                onChange={(e) => setStyleSample(e.target.value)}
                rows={7}
                placeholder={`Hi Team,\n\nHope everyone is having a solid week. Quick update on the roadmap deliverables—we closed the QA blockers this morning...\n\nBest,\n${
                  preferredName || 'Alex'
                }`}
                className="field resize-y leading-relaxed"
              />
              <div className="mt-1.5 text-right text-xs text-fg-subtle tabular-nums">
                {styleSample.trim()
                  ? `${styleSample.trim().split(/\s+/).length} words provided`
                  : 'Optional — you can skip this step'}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: CONFIRMATION & COMPLETION */}
        {currentStep === 6 && (
          <div className="animate-in fade-in duration-200">
            <h1 className="font-display text-3xl font-normal tracking-tight text-fg">
              You&apos;re ready to write with Loom
            </h1>
            <p className="mt-2 text-[15px] text-fg-muted">
              We configured your workspace for{' '}
              <span className="font-medium text-fg">{preferredName}</span> with a{' '}
              <span className="font-medium text-fg">{preferredStyle}</span> style tailored for{' '}
              <span className="font-medium text-fg">{emailPurpose}</span> communication.
            </p>

            <dl className="card mt-8 divide-y divide-line text-sm">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-fg-subtle">Name</dt>
                <dd className="font-medium text-fg">{preferredName}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-fg-subtle">Category</dt>
                <dd className="font-medium text-fg">{userCategory}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-fg-subtle">Purpose</dt>
                <dd className="font-medium text-fg">{emailPurpose}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-fg-subtle">Baseline style</dt>
                <dd className="font-medium text-fg">{preferredStyle}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-fg-subtle">Style sample</dt>
                <dd className="font-medium text-fg">
                  {styleSample.trim() ? 'Configured' : 'Skipped (can add anytime)'}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
          >
            {validationError}
          </div>
        )}

        {/* Navigation controls */}
        <div className="mt-10 flex items-center justify-between gap-4">
          {currentStep > 1 && currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="btn btn-ghost -ml-3"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep === 5 && !styleSample.trim() && (
              <button type="button" onClick={() => setCurrentStep(6)} className="btn btn-ghost">
                Skip for now
              </button>
            )}

            {currentStep < totalSteps ? (
              <button type="button" onClick={handleNext} className="btn btn-primary">
                <span>Continue</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSaving}
                className="btn btn-primary btn-lg"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter workspace</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-xl pb-6 text-center text-xs text-fg-faint">
        Loom.ai — Personalization engine
      </footer>
    </div>
  );
}
