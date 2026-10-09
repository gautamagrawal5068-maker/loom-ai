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

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  tone?: EmailTone | null;
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  styleSample?: string | null;
  tone?: EmailTone | null;
}

export interface ChatResponse {
  content: string;
  error?: string;
}
