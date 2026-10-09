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

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load conversations from storage:', error);
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
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
