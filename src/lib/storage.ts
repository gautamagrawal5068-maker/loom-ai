import { Conversation, EmailTone, WritingProfile, UsageStats, TokenUsage } from '@/types';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CONVERSATIONS_KEY = 'loom-ai-conversations';
const ACTIVE_CONVERSATION_KEY = 'loom-ai-active-conversation';
const STYLE_SAMPLE_KEY = 'loom-ai-style-sample';
const ACTIVE_TONE_KEY = 'loom-ai-active-tone';

const DELETED_CONVERSATIONS_KEY = 'loom-ai-deleted-conversations';

export function loadDeletedConversationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_CONVERSATIONS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markConversationDeleted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadDeletedConversationIds();
    existing.add(id);
    localStorage.setItem(DELETED_CONVERSATIONS_KEY, JSON.stringify(Array.from(existing)));
  } catch (err) {
    console.error('Failed to mark conversation deleted:', err);
  }
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY);
    if (!data) return [];
    const convs: Conversation[] = JSON.parse(data);
    const deletedIds = loadDeletedConversationIds();
    return convs.filter((c) => !deletedIds.has(c.id));
  } catch (error) {
    console.error('Failed to load conversations from storage:', error);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = loadDeletedConversationIds();
    const clean = conversations.filter((c) => !deletedIds.has(c.id));
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(clean));
  } catch (error) {
    console.error('Failed to save conversations to storage:', error);
  }
}

export function loadActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch (error) {
    console.error('Failed to load active conversation ID from storage:', error);
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    } else {
      localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    }
  } catch (error) {
    console.error('Failed to save active conversation ID to storage:', error);
  }
}

export function loadStyleSample(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STYLE_SAMPLE_KEY) || '';
  } catch (error) {
    console.error('Failed to load style sample from storage:', error);
    return '';
  }
}

export function saveStyleSample(sample: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!sample) {
      localStorage.removeItem(STYLE_SAMPLE_KEY);
    } else {
      localStorage.setItem(STYLE_SAMPLE_KEY, sample);
    }
  } catch (error) {
    console.error('Failed to save style sample to storage:', error);
  }
}

export function loadActiveTone(): EmailTone | null {
  if (typeof window === 'undefined') return null;
  try {
    const tone = localStorage.getItem(ACTIVE_TONE_KEY);
    return (tone as EmailTone) || null;
  } catch (error) {
    console.error('Failed to load active tone from storage:', error);
    return null;
  }
}

export function saveActiveTone(tone: EmailTone | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!tone) {
      localStorage.removeItem(ACTIVE_TONE_KEY);
    } else {
      localStorage.setItem(ACTIVE_TONE_KEY, tone);
    }
  } catch (error) {
    console.error('Failed to save active tone to storage:', error);
  }
}

const MESSAGING_TOKENS_KEY = 'loom-ai-messaging-tokens';
const TOKENS_RESET_AT_KEY = 'loom-ai-tokens-reset-at';
export const DEFAULT_MESSAGING_TOKENS = 50_000; // 50k tokens (~50 drafts per cycle)
export const DEFAULT_CREDITS = DEFAULT_MESSAGING_TOKENS;
export const MAX_CONTEXT_WINDOW_TOKENS = 100_000; // 100k tokens Claude/ChatGPT-style context capacity
export const TOKENS_PER_MESSAGE = 1_000; // ~1k context tokens per message turn
export const REFILL_CYCLE_HOURS = 5;
export const REFILL_CYCLE_MS = REFILL_CYCLE_HOURS * 60 * 60 * 1000; // 5 hours in ms

/**
 * Returns remaining countdown string ONLY when tokens are 0 and countdown is active.
 * When tokens > 0, returns null because countdown has not started.
 */
export function getTokensCountdownFormatted(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(TOKENS_RESET_AT_KEY);
    if (!stored) return null;
    const resetAt = parseInt(stored, 10);
    if (isNaN(resetAt)) return null;

    if (Date.now() >= resetAt) {
      // 5 hours have passed: auto-refill to 50k and reset timer!
      localStorage.removeItem(TOKENS_RESET_AT_KEY);
      localStorage.setItem(MESSAGING_TOKENS_KEY, DEFAULT_MESSAGING_TOKENS.toString());
      return null;
    }

    const diff = Math.max(0, resetAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  } catch {
    return null;
  }
}

export function getTimeUntilRefillFormatted(): string {
  const activeCountdown = getTokensCountdownFormatted();
  return activeCountdown || '5h 00m';
}

export function loadMessagingTokens(): number {
  if (typeof window === 'undefined') return DEFAULT_MESSAGING_TOKENS;
  try {
    const resetAtRaw = localStorage.getItem(TOKENS_RESET_AT_KEY);
    const resetAt = resetAtRaw ? parseInt(resetAtRaw, 10) : null;

    // Check if 5-hour refill cycle from exhaustion has elapsed
    if (resetAt && Date.now() >= resetAt) {
      localStorage.removeItem(TOKENS_RESET_AT_KEY);
      localStorage.setItem(MESSAGING_TOKENS_KEY, DEFAULT_MESSAGING_TOKENS.toString());
      return DEFAULT_MESSAGING_TOKENS;
    }

    const data = localStorage.getItem(MESSAGING_TOKENS_KEY);
    if (data === null) {
      localStorage.setItem(MESSAGING_TOKENS_KEY, DEFAULT_MESSAGING_TOKENS.toString());
      return DEFAULT_MESSAGING_TOKENS;
    }
    const parsed = parseInt(data, 10);
    if (isNaN(parsed) || parsed > DEFAULT_MESSAGING_TOKENS) {
      // Auto-migrate legacy 500k quota to 50k quota
      localStorage.setItem(MESSAGING_TOKENS_KEY, DEFAULT_MESSAGING_TOKENS.toString());
      return DEFAULT_MESSAGING_TOKENS;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load messaging tokens:', error);
    return DEFAULT_MESSAGING_TOKENS;
  }
}

export function saveMessagingTokens(tokens: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.max(0, tokens);
    localStorage.setItem(MESSAGING_TOKENS_KEY, clamped.toString());

    // Strict rule: 5-hour countdown begins ONLY when tokens reach 0!
    if (clamped === 0) {
      const existingReset = localStorage.getItem(TOKENS_RESET_AT_KEY);
      if (!existingReset) {
        const nextTime = Date.now() + REFILL_CYCLE_MS;
        localStorage.setItem(TOKENS_RESET_AT_KEY, nextTime.toString());
      }
    } else {
      // Tokens are available; no refill countdown is running
      localStorage.removeItem(TOKENS_RESET_AT_KEY);
    }
  } catch (error) {
    console.error('Failed to save messaging tokens:', error);
  }
}

export function loadCredits(): number {
  return loadMessagingTokens();
}

export function saveCredits(credits: number): void {
  saveMessagingTokens(credits);
}

const ONBOARDING_KEY = 'loom_onboarding_completed';

export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isCookie = document.cookie.includes('loom_onboarding_completed=true');
    const isLocal = localStorage.getItem(ONBOARDING_KEY) === 'true';
    return isCookie || isLocal;
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (completed) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      document.cookie = 'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';
    } else {
      localStorage.removeItem(ONBOARDING_KEY);
      document.cookie = 'loom_onboarding_completed=; path=/; max-age=0; SameSite=Lax';
    }
  } catch (error) {
    console.error('Failed to update onboarding completion state:', error);
  }
}

// ==============================================================================
// Personal Writing Profile Persistence
// ==============================================================================

const WRITING_PROFILE_KEY = 'loom-ai-writing-profile';

export const DEFAULT_WRITING_PROFILE: WritingProfile = {
  styleSample: '',
  defaultTone: null,
  preferredLength: 'balanced',
  writingStyle: 'professional',
  preferredGreeting: 'Hi [Name],',
  preferredSignoff: 'Best,',
  preferredLanguage: 'English (US)',
};

export function loadWritingProfile(): WritingProfile {
  if (typeof window === 'undefined') return DEFAULT_WRITING_PROFILE;
  try {
    const raw = localStorage.getItem(WRITING_PROFILE_KEY);
    if (!raw) {
      // Migrate existing styleSample if present
      const existingSample = loadStyleSample();
      return {
        ...DEFAULT_WRITING_PROFILE,
        styleSample: existingSample,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WRITING_PROFILE,
      ...parsed,
    };
  } catch (err) {
    console.error('Failed to load writing profile from storage:', err);
    return DEFAULT_WRITING_PROFILE;
  }
}

export function saveWritingProfile(profile: WritingProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WRITING_PROFILE_KEY, JSON.stringify(profile));
    if (profile.styleSample !== undefined) {
      saveStyleSample(profile.styleSample);
    }
  } catch (err) {
    console.error('Failed to save writing profile to storage:', err);
  }
}

// ==============================================================================
// Server-Verified Token Usage Tracker
// ==============================================================================

const USAGE_STATS_KEY = 'loom-ai-usage-stats';

export const DEFAULT_USAGE_STATS: UsageStats = {
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  lastModelUsed: 'Weave',
};

export function loadUsageStats(): UsageStats {
  if (typeof window === 'undefined') return DEFAULT_USAGE_STATS;
  try {
    const raw = localStorage.getItem(USAGE_STATS_KEY);
    if (!raw) return DEFAULT_USAGE_STATS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USAGE_STATS,
      ...parsed,
    };
  } catch (err) {
    console.error('Failed to load usage stats:', err);
    return DEFAULT_USAGE_STATS;
  }
}

export function recordUsage(usage: TokenUsage): UsageStats {
  if (typeof window === 'undefined') return DEFAULT_USAGE_STATS;
  try {
    const current = loadUsageStats();
    const updated: UsageStats = {
      totalRequests: current.totalRequests + 1,
      totalInputTokens: current.totalInputTokens + usage.promptTokens,
      totalOutputTokens: current.totalOutputTokens + usage.candidatesTokens,
      totalTokens: current.totalTokens + usage.totalTokens,
      estimatedCostUsd: Math.round((current.estimatedCostUsd + usage.estimatedCostUsd) * 1_000_000) / 1_000_000,
      lastModelUsed: usage.model,
    };
    localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to record token usage:', err);
    return DEFAULT_USAGE_STATS;
  }
}


