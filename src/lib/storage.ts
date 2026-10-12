import { Conversation, EmailTone } from '@/types';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

const CREDITS_KEY = 'loom-ai-credits';
const CREDITS_RESET_AT_KEY = 'loom-ai-credits-reset-at';
export const DEFAULT_CREDITS = 250;
export const REFILL_CYCLE_HOURS = 5;
export const REFILL_CYCLE_MS = REFILL_CYCLE_HOURS * 60 * 60 * 1000; // 5 hours in ms

export function getNextRefillTime(): number {
  if (typeof window === 'undefined') return Date.now() + REFILL_CYCLE_MS;
  try {
    const stored = localStorage.getItem(CREDITS_RESET_AT_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (isNaN(parsed) || parsed <= Date.now()) {
      const nextTime = Date.now() + REFILL_CYCLE_MS;
      localStorage.setItem(CREDITS_RESET_AT_KEY, nextTime.toString());
      return nextTime;
    }
    return parsed;
  } catch {
    return Date.now() + REFILL_CYCLE_MS;
  }
}

export function getTimeUntilRefillFormatted(): string {
  const nextTime = getNextRefillTime();
  const diff = Math.max(0, nextTime - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function loadCredits(): number {
  if (typeof window === 'undefined') return DEFAULT_CREDITS;
  try {
    const nextReset = localStorage.getItem(CREDITS_RESET_AT_KEY);
    const resetTime = nextReset ? parseInt(nextReset, 10) : NaN;

    // Check if 5-hour refill window has elapsed
    if (isNaN(resetTime) || Date.now() >= resetTime) {
      // Auto-refill back to full capacity
      const nextTime = Date.now() + REFILL_CYCLE_MS;
      localStorage.setItem(CREDITS_RESET_AT_KEY, nextTime.toString());
      localStorage.setItem(CREDITS_KEY, DEFAULT_CREDITS.toString());
      return DEFAULT_CREDITS;
    }

    const data = localStorage.getItem(CREDITS_KEY);
    if (!data) return DEFAULT_CREDITS;
    const parsed = parseInt(data, 10);
    return isNaN(parsed) ? DEFAULT_CREDITS : parsed;
  } catch (error) {
    console.error('Failed to load credits from storage:', error);
    return DEFAULT_CREDITS;
  }
}

export function saveCredits(credits: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CREDITS_KEY, credits.toString());
  } catch (error) {
    console.error('Failed to save credits to storage:', error);
  }
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

