export type EmailTone =
  | 'Formal'
  | 'Friendly'
  | 'Assertive'
  | 'Apologetic'
  | 'Concise'
  | 'Persuasive';

export type UserCategory =
  | 'Student'
  | 'Professional'
  | 'Founder'
  | 'Freelancer'
  | 'Other';

export type EmailPurpose =
  | 'Work'
  | 'School'
  | 'Business'
  | 'Personal'
  | 'Mixed';

export type PreferredStyle =
  | 'Professional'
  | 'Friendly'
  | 'Direct'
  | 'Warm'
  | 'Adaptable';

export interface UserProfile {
  id: string;
  preferred_name: string | null;
  user_category: UserCategory | null;
  email_purpose: EmailPurpose | null;
  preferred_style: PreferredStyle | null;
  style_sample: string | null;
  onboarding_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ModelTier = 'silk' | 'weave' | 'tapestry';

export const DEFAULT_MESSAGING_TOKENS = 50_000; // 50,000 tokens for messaging (~50 email drafts per cycle)
export const MAX_CONTEXT_WINDOW_TOKENS = 100_000; // 100k context window capacity
export const ESTIMATED_TOKENS_PER_MESSAGE = 1_000; // ~1k context tokens per message turn

export const MODEL_CREDIT_COSTS: Record<ModelTier, number> = {
  silk: 800,       // Ultra-fast lightweight response (~800 tokens)
  weave: 1000,     // Balanced natural voice matching (~1k tokens)
  tapestry: 1400,  // Advanced writing & deep nuance (~1.4k tokens)
};

export interface DraftRevision {
  id: string;
  subject: string;
  body: string;
  timestamp: number;
  label: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  revisions?: DraftRevision[];
  currentRevisionIndex?: number;
  tokensUsed?: number;
  modelTier?: ModelTier;
  timeTakenSec?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  tone?: EmailTone | null;
  context?: string | null;
  keepContext?: boolean;
}

export interface WritingProfile {
  styleSample: string;
  defaultTone: EmailTone | null;
  preferredLength: 'concise' | 'balanced' | 'thorough';
  writingStyle: 'professional' | 'warm' | 'direct' | 'academic';
  preferredGreeting: string;
  preferredSignoff: string;
  preferredLanguage: string;
  userCategory?: UserCategory | null;
  emailPurpose?: EmailPurpose | null;
  preferredStyle?: PreferredStyle | null;
}

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
  providerReported: boolean;
  timeTakenSec?: number;
  modelTier?: string;
  isOffContext?: boolean;
}

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastModelUsed?: string;
}

export interface EmailTemplate {
  id: string;
  title: string;
  category: 'School' | 'Workplace' | 'Internships' | 'Outreach' | 'Follow-ups' | 'Thank You' | 'Apologies' | 'Meetings';
  description: string;
  promptTemplate: string;
}

export interface EmailSummaryResult {
  mainPoints: string[];
  importantDates: string[];
  requiredActions: string[];
  questionsNeedingAnswers: string[];
  suggestedReplyPrompt?: string;
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  styleSample?: string | null;
  tone?: EmailTone | null;
  modelTier?: ModelTier;
  context?: string | null;
  writingProfile?: WritingProfile | null;
  userCategory?: UserCategory | null;
  emailPurpose?: EmailPurpose | null;
  preferredStyle?: PreferredStyle | null;
}

export interface ChatResponse {
  content: string;
  error?: string;
  modelUsed?: string;
  creditsCost?: number;
  remainingCredits?: number;
  usage?: TokenUsage;
}
