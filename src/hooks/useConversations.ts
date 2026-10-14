'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, ChatResponse, EmailTone, ChatRequest, UserProfile, ModelTier, MODEL_CREDIT_COSTS, UserCategory, EmailPurpose, PreferredStyle, WritingProfile, UsageStats, DraftRevision } from '@/types';
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
  getTokensCountdownFormatted,
  loadDeletedConversationIds,
  markConversationDeleted,
  loadWritingProfile,
  saveWritingProfile,
  DEFAULT_WRITING_PROFILE,
  loadUsageStats,
  DEFAULT_USAGE_STATS,
  recordUsage,
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
  const [credits, setCreditsState] = useState<number>(50000);
  const [tokensCountdown, setTokensCountdown] = useState<string | null>(null);
  const [refillCountdown, setRefillCountdown] = useState<string>('5h 00m');
  const [writingProfile, setWritingProfileState] = useState<WritingProfile>(DEFAULT_WRITING_PROFILE);
  const [usageStats, setUsageStats] = useState<UsageStats>(DEFAULT_USAGE_STATS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Load client local storage cleanly on mount to prevent SSR hydration mismatch
  useEffect(() => {
    try {
      const local = loadLocalConversations();
      const deletedIds = loadDeletedConversationIds();
      const valid = local.filter((c) => !deletedIds.has(c.id));
      setConversations(valid);
      setCreditsState(loadLocalCredits());
      setTokensCountdown(getTokensCountdownFormatted());
      setRefillCountdown(getTimeUntilRefillFormatted());
      setWritingProfileState(loadWritingProfile());
      setUsageStats(loadUsageStats());
      const localSample = loadLocalStyleSample();
      if (localSample) setStyleSampleState(localSample);
      const localTone = loadLocalActiveTone();
      if (localTone) setActiveToneState(localTone);
      const savedTier = localStorage.getItem('loom_active_model_tier') as ModelTier | null;
      if (savedTier) setModelTierState(savedTier);
    } catch (err) {
      console.error('Error loading local storage state:', err);
    } finally {
      setIsClientLoaded(true);
      setIsInitialized(true);
    }
  }, []);

  // Initialize from Supabase in background without blocking UI
  useEffect(() => {
    let isMounted = true;

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
                const pData = profileResult.data as UserProfile;
                setProfile(pData);
                if (pData.style_sample) {
                  setStyleSampleState(pData.style_sample);
                }
                setWritingProfileState((prev) => {
                  const merged: WritingProfile = {
                    ...prev,
                    userCategory: pData.user_category ?? prev.userCategory,
                    emailPurpose: pData.email_purpose ?? prev.emailPurpose,
                    preferredStyle: pData.preferred_style ?? prev.preferredStyle,
                    styleSample: pData.style_sample || prev.styleSample,
                  };
                  saveWritingProfile(merged);
                  return merged;
                });
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

                setWritingProfileState((prev) => {
                  const merged: WritingProfile = {
                    ...prev,
                    userCategory: metaCat ?? prev.userCategory,
                    emailPurpose: metaPurp ?? prev.emailPurpose,
                    preferredStyle: metaStyle ?? prev.preferredStyle,
                    styleSample: metaSample || prev.styleSample,
                  };
                  saveWritingProfile(merged);
                  return merged;
                });

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

              // 3. Merge local conversations with Supabase conversations
              const localConvs = loadLocalConversations();
              const deletedIds = loadDeletedConversationIds();
              const validLocalConvs = localConvs.filter((c) => !deletedIds.has(c.id));

              const existingRemoteIds = new Set(loadedConvs.map((c) => c.id));
              const unsyncedLocalConvs = validLocalConvs.filter((c) => !existingRemoteIds.has(c.id));

              if (unsyncedLocalConvs.length > 0 && user?.id) {
                const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                for (const localC of unsyncedLocalConvs) {
                  const targetConvId = UUID_REGEX.test(localC.id) ? localC.id : generateId();
                  try {
                    await supabase.from('conversations').insert({
                      id: targetConvId,
                      user_id: user.id,
                      title: localC.title || 'New Conversation',
                      tone: localC.tone || null,
                      created_at: new Date(localC.createdAt || Date.now()).toISOString(),
                      updated_at: new Date(localC.updatedAt || Date.now()).toISOString(),
                    });

                    const validMessages = (localC.messages || []).map((m) => ({
                      id: UUID_REGEX.test(m.id) ? m.id : generateId(),
                      conversation_id: targetConvId,
                      role: m.role,
                      content: m.content,
                      is_error: !!m.isError,
                      created_at: new Date(m.timestamp || Date.now()).toISOString(),
                    }));

                    if (validMessages.length > 0) {
                      await supabase.from('messages').insert(validMessages);
                    }

                    loadedConvs.push({
                      ...localC,
                      id: targetConvId,
                      messages: validMessages.map((vm, idx) => ({
                        ...localC.messages[idx],
                        id: vm.id,
                      })),
                    });
                  } catch (migErr) {
                    console.error('Failed to migrate local conversation to Supabase:', migErr);
                    loadedConvs.push(localC);
                  }
                }
              } else if (unsyncedLocalConvs.length > 0 && !user?.id) {
                // In guest mode, keep unsynced local conversations alongside loaded
                loadedConvs = [...loadedConvs, ...unsyncedLocalConvs];
              }

              // Deduplicate and filter deleted
              const convMap = new Map<string, Conversation>();
              loadedConvs.forEach((c) => {
                if (!deletedIds.has(c.id)) {
                  convMap.set(c.id, c);
                }
              });
              validLocalConvs.forEach((c) => {
                if (!deletedIds.has(c.id) && !convMap.has(c.id)) {
                  convMap.set(c.id, c);
                }
              });

              const allConvs = Array.from(convMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
              saveLocalConversations(allConvs);

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

  // Periodic 5-hour automatic refill checker & live 1-second countdown updater
  useEffect(() => {
    const updateCountdown = () => {
      const currentCredits = loadLocalCredits();
      setCreditsState(currentCredits);
      const countdown = getTokensCountdownFormatted();
      setTokensCountdown(countdown);
      setRefillCountdown(countdown || '5h 00m');
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
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

  const createConversation = useCallback(async (): Promise<string> => {
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
  }, [userId, activeTone]);

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
    setActiveToneState(target?.tone || null);
  }

  const sendMessage = useCallback(
    async (
      content: string,
      requestContext?: string | null,
      overrideTone?: EmailTone | null,
      options?: { messagesOverride?: Message[] }
    ): Promise<void> => {
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

      if (credits <= 0) {
        const activeCountdown = getTokensCountdownFormatted() || '5h 00m';
        setTokensCountdown(activeCountdown);
        const topUpId = generateId();
        const topUpMsg: Message = {
          id: topUpId,
          role: 'assistant',
          content: `You have consumed your **50,000 token limit** (50k tokens).\n\nUsage is paused for **5 hours**. Your messaging allowance will automatically refill in **${activeCountdown}**.`,
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

      const existingMessages = options?.messagesOverride || currentConv.messages;
      const cleanHistory = existingMessages.filter((m) => !m.isError);
      const conversationMessages = cleanHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      conversationMessages.push({ role: 'user', content });

      const isFirstUserMessage = !cleanHistory.some((m) => m.role === 'user');
      const updatedTitle = isFirstUserMessage
        ? content.slice(0, 42).trim() + (content.length > 42 ? '...' : '')
        : currentConv.title;

      // Optimistically update UI
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === targetConversationId) {
            const baseMessages = options?.messagesOverride || c.messages;
            return {
              ...c,
              title: updatedTitle,
              tone: toneToUse,
              messages: [...baseMessages, userMessage],
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
            id: tempUserMsgId,
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
        const effectiveContext = requestContext || currentConv.context || null;
        const effectiveCategory = writingProfile?.userCategory || profile?.user_category || null;
        const effectivePurpose = writingProfile?.emailPurpose || profile?.email_purpose || null;
        const effectiveStyle = writingProfile?.preferredStyle || profile?.preferred_style || null;

        const payload: ChatRequest = {
          messages: conversationMessages,
          styleSample: writingProfile?.styleSample || styleSample || profile?.style_sample || null,
          tone: toneToUse,
          modelTier,
          context: effectiveContext,
          writingProfile: writingProfile || null,
          userCategory: effectiveCategory,
          emailPurpose: effectivePurpose,
          preferredStyle: effectiveStyle,
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorMsg = `Server error (${response.status})`;
          let errData: Record<string, unknown> | null = null;
          try {
            errData = await response.json();
            if (errData?.error && typeof errData.error === 'string') errorMsg = errData.error;
          } catch {
            // ignore parse error
          }

          if (response.status === 429) {
            setCreditsState(0);
            saveLocalCredits(0);
            if (errData?.resetAt && typeof errData.resetAt === 'number') {
              localStorage.setItem('loom-ai-tokens-reset-at', errData.resetAt.toString());
            }
            setTokensCountdown(getTokensCountdownFormatted() || '5h 00m');
          }
          throw new Error(errorMsg);
        }

        const data: ChatResponse = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Record genuine token usage from server
        if (data.usage) {
          const updated = recordUsage(data.usage);
          setUsageStats(updated);
        }

        // Deduct or synchronize tokens from server response
        const tokensConsumed = data.tokensUsed || data.usage?.totalTokens || MODEL_CREDIT_COSTS[modelTier] || 1000;
        if (typeof data.remainingTokens === 'number') {
          setCreditsState(data.remainingTokens);
          saveLocalCredits(data.remainingTokens);
          if (data.remainingTokens === 0) {
            setTokensCountdown(getTokensCountdownFormatted() || '5h 00m');
          }
        } else {
          setCreditsState((prev) => {
            const next = Math.max(0, prev - tokensConsumed);
            saveLocalCredits(next);
            if (next === 0) {
              setTokensCountdown(getTokensCountdownFormatted() || '5h 00m');
            }
            return next;
          });
        }

      const tempAssistantId = generateId();
      const assistantMessage: Message = {
        id: tempAssistantId,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        tokensUsed: tokensConsumed,
        modelTier: (data.usage?.modelTier as ModelTier) || modelTier,
        timeTakenSec: data.usage?.timeTakenSec,
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
            id: tempAssistantId,
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
      const tempErrorId = generateId();
      const errorMessage: Message = {
        id: tempErrorId,
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
            id: tempErrorId,
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
  }, [
    activeConversationId,
    conversations,
    createConversation,
    credits,
    activeTone,
    userId,
    writingProfile,
    profile,
    styleSample,
    modelTier,
  ]);

  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!activeConversation) return;

    const messages = activeConversation.messages;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant' || !lastMessage.isError) return;

    let lastUserIndex = -1;
    let lastUserContent = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        lastUserContent = messages[i].content;
        break;
      }
    }

    if (!lastUserContent || lastUserIndex === -1) return;

    const userMessageToRetry = messages[lastUserIndex];
    const cleanedMessages = messages.filter(
      (m) => m.id !== lastMessage.id && m.id !== userMessageToRetry.id && !m.isError
    );

    // Remove BOTH the error message and the failed user message from local state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: cleanedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    // Delete error message and user message in Supabase
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('messages').delete().in('id', [lastMessage.id, userMessageToRetry.id]);
      } catch (err) {
        console.error('Supabase message deletion error:', err);
      }
    }

    await sendMessage(lastUserContent, null, null, { messagesOverride: cleanedMessages });
  }, [activeConversation, activeConversationId, userId, sendMessage]);

  const setWritingProfile = useCallback(async (newProf: WritingProfile): Promise<void> => {
    setWritingProfileState(newProf);
    saveWritingProfile(newProf);
    if (newProf.styleSample !== undefined) {
      setStyleSampleState(newProf.styleSample);
      saveLocalStyleSample(newProf.styleSample);
    }
    if (newProf.defaultTone) {
      setActiveToneState(newProf.defaultTone);
      saveLocalActiveTone(newProf.defaultTone);
    }
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('profiles').update({
          style_sample: newProf.styleSample || '',
          user_category: newProf.userCategory || null,
          email_purpose: newProf.emailPurpose || null,
          preferred_style: newProf.preferredStyle || null,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
      } catch (err) {
        console.error('Supabase profile update error:', err);
      }
    }
  }, [userId]);

  const updateActiveContext = useCallback((newContext: string) => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, context: newContext, updatedAt: Date.now() }
          : c
      )
    );
  }, [activeConversationId]);

  const updateMessageDraft = useCallback(
    async (
      messageId: string,
      subject: string,
      body: string,
      updatedRevisions?: DraftRevision[],
      activeRevIdx?: number
    ) => {
      const newContent = `Subject: ${subject}\n\n${body}`;
      setConversations((prev) =>
        prev.map((c) => {
          const hasMessage = c.messages.some((m) => m.id === messageId);
          if (!hasMessage) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== messageId) return m;
              return {
                ...m,
                content: newContent,
                revisions: updatedRevisions || m.revisions,
                currentRevisionIndex: activeRevIdx ?? m.currentRevisionIndex,
              };
            }),
            updatedAt: Date.now(),
          };
        })
      );

      if (userId && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.from('messages').update({ content: newContent }).eq('id', messageId);
        } catch (err) {
          console.error('Supabase message update error:', err);
        }
      }
    },
    [userId]
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    styleSample,
    setStyleSample,
    writingProfile,
    setWritingProfile,
    usageStats,
    updateActiveContext,
    updateMessageDraft,
    activeTone,
    setActiveTone,
    profile,
    userId,
    isLoading,
    isInitialized,
    isClientLoaded,
    createConversation,
    startNewChat: () => {
      setActiveConversationId(null);
      saveLocalActiveId(null);
      setActiveToneState(null);
    },
    deleteConversation,
    renameConversation,
    setActiveConversation,
    modelTier,
    setModelTier,
    credits,
    remainingTokens: credits,
    tokensCountdown,
    refillCountdown,
    creditCost: MODEL_CREDIT_COSTS[modelTier] || 1000,
    sendMessage,
    retryLastMessage,
  };
}
