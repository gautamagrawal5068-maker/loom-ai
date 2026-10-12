'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, ChatResponse, EmailTone, ChatRequest, UserProfile, ModelTier, MODEL_CREDIT_COSTS, UserCategory, EmailPurpose, PreferredStyle } from '@/types';
import {
  generateId,
  loadConversations as loadLocalConversations,
  saveConversations as saveLocalConversations,
  saveActiveConversationId as saveLocalActiveId,
  loadStyleSample as loadLocalStyleSample,
  saveStyleSample as saveLocalStyleSample,
  loadActiveTone as loadLocalActiveTone,
  saveActiveTone as saveLocalActiveTone,
  loadCredits as loadLocalCredits,
  saveCredits as saveLocalCredits,
  getTimeUntilRefillFormatted,
  loadDeletedConversationIds,
  markConversationDeleted,
} from '@/lib/storage';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface SupabaseMessageRow {
  id: string;
  role: string;
  content: string;
  is_error: boolean;
  created_at: string;
}

interface SupabaseConversationRow {
  id: string;
  title: string;
  tone: string | null;
  created_at: string;
  updated_at: string;
  messages: SupabaseMessageRow[];
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    Promise.resolve(promise)
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [styleSample, setStyleSampleState] = useState<string>('');
  const [activeTone, setActiveToneState] = useState<EmailTone | null>(null);
  const [modelTier, setModelTierState] = useState<ModelTier>('weave');
  const [credits, setCreditsState] = useState<number>(() => loadLocalCredits());
  const [refillCountdown, setRefillCountdown] = useState<string>(() => getTimeUntilRefillFormatted());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from Supabase or localStorage with guaranteed timeout failsafe
  useEffect(() => {
    let isMounted = true;

    // Guaranteed failsafe timer: forces workspace ready after 1200ms under ANY circumstance
    const failsafeTimer = setTimeout(() => {
      if (isMounted) {
        setIsInitialized((prev) => {
          if (!prev) {
            console.warn('[useConversations] Failsafe: workspace forced ready after 1200ms.');
            const fallbackConvs = loadLocalConversations();
            const deletedIds = loadDeletedConversationIds();
            const cleanConvs = fallbackConvs.filter((c) => !deletedIds.has(c.id));
            setConversations(cleanConvs);
            // Every time LOOM opens, start on a fresh new chat with personalized greeting
            setActiveConversationId(null);
            return true;
          }
          return prev;
        });
      }
    }, 1200);

    async function initialize() {
      try {
        const supabaseConfigured = isSupabaseConfigured();

        if (supabaseConfigured) {
          try {
            const supabase = createClient();
            // Cap auth check at 800ms to avoid blocking workspace loading
            const authResult = await withTimeout(
              supabase.auth.getUser(),
              800,
              { data: { user: null }, error: null } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>
            );

            const user = authResult?.data?.user;

            if (user && isMounted) {
              setUserId(user.id);

              // 1. Fetch user profile (capped at 600ms)
              const profilePromise = supabase.from('profiles').select('*').eq('id', user.id).single();
              const profileResult = await withTimeout(
                profilePromise,
                600,
                { data: null, error: null } as unknown as Awaited<typeof profilePromise>
              );

              if (profileResult?.data && isMounted) {
                setProfile(profileResult.data as UserProfile);
                if (profileResult.data.style_sample) {
                  setStyleSampleState(profileResult.data.style_sample);
                }
              } else if (user && isMounted) {
                // Synthesize profile from user metadata and local storage
                const metaName =
                  user.user_metadata?.preferred_name ||
                  user.user_metadata?.full_name ||
                  (typeof localStorage !== 'undefined'
                    ? localStorage.getItem('loom_onboard_name')
                    : '') ||
                  user.email?.split('@')[0] ||
                  'User';
                const metaCat =
                  user.user_metadata?.user_category ||
                  (typeof localStorage !== 'undefined'
                    ? (localStorage.getItem('loom_onboard_cat') as UserCategory)
                    : null) ||
                  'Professional';
                const metaPurp =
                  user.user_metadata?.email_purpose ||
                  (typeof localStorage !== 'undefined'
                    ? (localStorage.getItem('loom_onboard_purp') as EmailPurpose)
                    : null) ||
                  'Work';
                const metaStyle =
                  user.user_metadata?.preferred_style ||
                  (typeof localStorage !== 'undefined'
                    ? (localStorage.getItem('loom_onboard_style') as PreferredStyle)
                    : null) ||
                  'Professional';
                const metaSample =
                  user.user_metadata?.style_sample ||
                  (typeof localStorage !== 'undefined'
                    ? localStorage.getItem('loom-ai-style-sample')
                    : '') ||
                  '';

                setProfile({
                  id: user.id,
                  preferred_name: metaName,
                  user_category: metaCat,
                  email_purpose: metaPurp,
                  preferred_style: metaStyle,
                  style_sample: metaSample,
                  onboarding_completed: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

                if (metaSample) {
                  setStyleSampleState(metaSample);
                }

                // If user is inside the workspace, ensure onboarding is marked complete
                if (typeof document !== 'undefined') {
                  document.cookie =
                    'loom_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax';
                }
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem('loom_onboarding_completed', 'true');
                }
              }

              // 2. Fetch conversations (capped at 800ms)
              const convPromise = supabase
                .from('conversations')
                .select(`
                  id,
                  title,
                  tone,
                  created_at,
                  updated_at,
                  messages (
                    id,
                    role,
                    content,
                    is_error,
                    created_at
                  )
                `)
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

              const convResult = await withTimeout(
                convPromise,
                800,
                { data: null, error: null } as unknown as Awaited<typeof convPromise>
              );

              let loadedConvs: Conversation[] = [];

              if (convResult?.data && Array.isArray(convResult.data) && convResult.data.length > 0) {
                const rows = convResult.data as unknown as SupabaseConversationRow[];
                loadedConvs = rows.map((c) => ({
                  id: c.id,
                  title: c.title,
                  tone: (c.tone as EmailTone) || null,
                  createdAt: new Date(c.created_at).getTime(),
                  updatedAt: new Date(c.updated_at).getTime(),
                  messages: (c.messages || [])
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((m) => ({
                      id: m.id,
                      role: m.role as 'user' | 'assistant',
                      content: m.content,
                      isError: m.is_error,
                      timestamp: new Date(m.created_at).getTime(),
                    })),
                }));
              }

              // 3. Fallback to local conversations if Supabase has none
              const localConvs = loadLocalConversations();
              const deletedIds = loadDeletedConversationIds();
              let allConvs = loadedConvs.length > 0 ? loadedConvs : localConvs;
              allConvs = allConvs.filter((c) => !deletedIds.has(c.id));

              if (isMounted) {
                setConversations(allConvs);
                // Open a fresh new chat with the Claude/GPT greeting every time LOOM is opened
                setActiveConversationId(null);

                // Load style sample and tone from localStorage if not in profile
                if (!profileResult?.data?.style_sample) {
                  const savedStyle = loadLocalStyleSample();
                  if (savedStyle) setStyleSampleState(savedStyle);
                }
                const savedTone = loadLocalActiveTone();
                if (savedTone) setActiveToneState(savedTone);

                if (typeof window !== 'undefined') {
                  const savedTier = localStorage.getItem('loom_active_model_tier') as ModelTier | null;
                  if (savedTier && ['silk', 'weave', 'tapestry'].includes(savedTier)) {
                    setModelTierState(savedTier);
                  }
                }

                setIsInitialized(true);
                return;
              }
            }
          } catch (err) {
            console.error('Supabase initialization fallback to localStorage:', err);
          }
        }

        // Local storage fallback for unauthenticated or local usage
        if (isMounted) {
          const savedConvs = loadLocalConversations();
          const deletedIds = loadDeletedConversationIds();
          const cleanConvs = savedConvs.filter((c) => !deletedIds.has(c.id));
          const savedStyle = loadLocalStyleSample();
          const savedTone = loadLocalActiveTone();

          setConversations(cleanConvs);
          setStyleSampleState(savedStyle);
          setActiveToneState(savedTone);

          if (typeof window !== 'undefined') {
            const savedTier = localStorage.getItem('loom_active_model_tier') as ModelTier | null;
            if (savedTier && ['silk', 'weave', 'tapestry'].includes(savedTier)) {
              setModelTierState(savedTier);
            }
          }

          // Open a fresh new chat with the Claude/GPT greeting every time LOOM is opened
          setActiveConversationId(null);
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
    };
  }, []);

  // Save active conversation id locally
  useEffect(() => {
    if (isInitialized) {
      saveLocalActiveId(activeConversationId);
    }
  }, [activeConversationId, isInitialized]);

  // Sync to local storage for backup (always preserved, including when empty)
  useEffect(() => {
    if (isInitialized) {
      saveLocalConversations(conversations);
    }
  }, [conversations, isInitialized]);

  // Periodic 5-hour automatic refill checker & countdown updater (every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCredits = loadLocalCredits();
      setCreditsState(currentCredits);
      setRefillCountdown(getTimeUntilRefillFormatted());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const setModelTier = useCallback((tier: ModelTier) => {
    setModelTierState(tier);
    if (typeof window !== 'undefined') {
      localStorage.setItem('loom_active_model_tier', tier);
    }
  }, []);

  const setStyleSample = useCallback(
    async (sample: string) => {
      setStyleSampleState(sample);
      saveLocalStyleSample(sample);

      if (userId && isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({ style_sample: sample, updated_at: new Date().toISOString() })
          .eq('id', userId);
      }
    },
    [userId]
  );

  const setActiveTone = useCallback((tone: EmailTone | null) => {
    setActiveToneState(tone);
    saveLocalActiveTone(tone);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  async function createConversation(): Promise<string> {
    const tempId = generateId();
    const newTitle = 'New Conversation';

    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: inserted, error } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            title: newTitle,
            tone: activeTone,
          })
          .select()
          .single();

        if (!error && inserted) {
          const newConv: Conversation = {
            id: inserted.id,
            title: inserted.title,
            messages: [],
            createdAt: new Date(inserted.created_at).getTime(),
            updatedAt: new Date(inserted.updated_at).getTime(),
            tone: activeTone,
          };
          setConversations((prev) => [newConv, ...prev]);
          setActiveConversationId(inserted.id);
          return inserted.id;
        }
      } catch (err) {
        console.error('Supabase create conversation error:', err);
      }
    }

    // Fallback local creation
    const newConversation: Conversation = {
      id: tempId,
      title: newTitle,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tone: activeTone,
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(tempId);
    return tempId;
  }

  async function deleteConversation(id: string): Promise<void> {
    // 1. Mark permanently deleted in tombstone storage so it never reappears
    markConversationDeleted(id);

    // 2. Delete from Supabase if configured
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('conversations').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.error('Supabase delete error:', err);
      }
    }

    // 3. Update React state AND write directly to localStorage immediately
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveLocalConversations(next);
      return next;
    });

    // 4. If deleted chat was currently active, open fresh new chat with greeting
    if (activeConversationId === id) {
      setActiveConversationId(null);
      saveLocalActiveId(null);
    }
  }

  async function renameConversation(id: string, title: string): Promise<void> {
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase
          .from('conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);
      } catch (err) {
        console.error('Supabase rename error:', err);
      }
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  }

  function setActiveConversation(id: string): void {
    setActiveConversationId(id);
    const target = conversations.find((c) => c.id === id);
    if (target?.tone) {
      setActiveToneState(target.tone);
    }
  }

  async function sendMessage(content: string, overrideTone?: EmailTone | null): Promise<void> {
    const toneToUse = overrideTone !== undefined ? overrideTone : activeTone;
    let targetConversationId = activeConversationId;
    let currentConv = conversations.find((c) => c.id === targetConversationId);

    if (!targetConversationId || !currentConv) {
      targetConversationId = await createConversation();
      currentConv = {
        id: targetConversationId,
        title: 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tone: toneToUse,
      };
    }

    const modelCost = MODEL_CREDIT_COSTS[modelTier] || 3;
    if (credits < modelCost) {
      const topUpId = generateId();
      const topUpMsg: Message = {
        id: topUpId,
        role: 'assistant',
        content: `You need **${modelCost} credits** to draft with **${modelTier.toUpperCase()}**, but you currently have **${credits} credits** remaining.\n\nYour credits automatically refill to 250 in **${refillCountdown}**.`,
        timestamp: Date.now(),
        isError: true,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, topUpMsg], updatedAt: Date.now() }
            : c
        )
      );
      return;
    }

    const tempUserMsgId = generateId();
    const userMessage: Message = {
      id: tempUserMsgId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const existingMessages = currentConv.messages;
    const conversationMessages = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    conversationMessages.push({ role: 'user', content });

    const isFirstUserMessage = !existingMessages.some((m) => m.role === 'user');
    const updatedTitle = isFirstUserMessage
      ? content.slice(0, 42).trim() + (content.length > 42 ? '...' : '')
      : currentConv.title;

    // Optimistically update UI
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConversationId) {
          return {
            ...c,
            title: updatedTitle,
            tone: toneToUse,
            messages: [...c.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );

    // Persist user message in Supabase
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('messages').insert({
          conversation_id: targetConversationId,
          role: 'user',
          content,
          is_error: false,
        });

        if (isFirstUserMessage) {
          await supabase
            .from('conversations')
            .update({ title: updatedTitle, tone: toneToUse, updated_at: new Date().toISOString() })
            .eq('id', targetConversationId);
        }
      } catch (err) {
        console.error('Supabase user message persist error:', err);
      }
    }

    setIsLoading(true);

    try {
      const payload: ChatRequest = {
        messages: conversationMessages,
        styleSample: styleSample || profile?.style_sample || null,
        tone: toneToUse,
        modelTier,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // ignore parse error
        }
        throw new Error(errorMsg);
      }

      const data: ChatResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Deduct credits for the model tier used
      setCreditsState((prev) => {
        const next = Math.max(0, prev - modelCost);
        saveLocalCredits(next);
        return next;
      });

      const tempAssistantId = generateId();
      const assistantMessage: Message = {
        id: tempAssistantId,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: Date.now() }
            : c
        )
      );

      // Persist assistant message in Supabase
      if (userId && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.from('messages').insert({
            conversation_id: targetConversationId,
            role: 'assistant',
            content: data.content,
            is_error: false,
          });
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', targetConversationId);
        } catch (err) {
          console.error('Supabase assistant message persist error:', err);
        }
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${errMessage}`,
        timestamp: Date.now(),
        isError: true,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConversationId
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: Date.now() }
            : c
        )
      );

      // Persist error message in Supabase
      if (userId && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.from('messages').insert({
            conversation_id: targetConversationId,
            role: 'assistant',
            content: `Error: ${errMessage}`,
            is_error: true,
          });
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  function retryLastMessage(): void {
    if (!activeConversation) return;

    const messages = activeConversation.messages;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant' || !lastMessage.isError) return;

    let lastUserContent = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserContent = messages[i].content;
        break;
      }
    }

    if (!lastUserContent) return;

    // Remove the error message from local state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: c.messages.slice(0, -1), updatedAt: Date.now() }
          : c
      )
    );

    // Delete error message in Supabase
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        supabase.from('messages').delete().eq('id', lastMessage.id);
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      sendMessage(lastUserContent);
    }, 50);
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    styleSample,
    setStyleSample,
    activeTone,
    setActiveTone,
    profile,
    userId,
    isLoading,
    isInitialized,
    createConversation,
    startNewChat: () => {
      setActiveConversationId(null);
      saveLocalActiveId(null);
    },
    deleteConversation,
    renameConversation,
    setActiveConversation,
    modelTier,
    setModelTier,
    credits,
    refillCountdown,
    creditCost: MODEL_CREDIT_COSTS[modelTier] || 3,
    sendMessage,
    retryLastMessage,
  };
}
