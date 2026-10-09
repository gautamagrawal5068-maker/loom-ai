export type EmailTone =
  | 'Formal'
  | 'Friendly'
  | 'Assertive'
  | 'Apologetic'
  | 'Concise'
  | 'Persuasive';

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
