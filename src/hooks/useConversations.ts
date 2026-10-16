'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

const VALID_MODEL_TIERS: ModelTier[] = ['silk', 'weave', 'tapestry'];

function isValidModelTier(value: unknown): value is ModelTier {
  return typeof value === 'string' && (VALID_MODEL_TIERS as string[]).includes(value);
}

/** Single-line, length-capped conversation title derived from the first prompt. */
function deriveTitle(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  if (!oneLine) return 'New Conversation';
  return oneLine.length > 42 ? `${oneLine.slice(0, 42).trimEnd()}...` : oneLine;
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

  // Refs used to guard async flows against unmount, double sends and stale requests
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

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
      const savedTier = localStorage.getItem('loom_active_model_tier');
      if (isValidModelTier(savedTier)) setModelTierState(savedTier);
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
    // Anything the user changes in state after this point must survive the async merge below
    const initStartedAt = Date.now();

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
              // A timed-out (fallback) or errored fetch tells us nothing about what exists
              // remotely, so it must not trigger a migration of every local conversation.
              const convFetchOk =
                !!convResult && !convResult.error && Array.isArray(convResult.data);

              if (convFetchOk && Array.isArray(convResult.data) && convResult.data.length > 0) {
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

              if (!isMounted) return;

              // 3. Merge local conversations with Supabase conversations
              const localConvs = loadLocalConversations();
              const deletedIds = loadDeletedConversationIds();
              const validLocalConvs = localConvs.filter((c) => !deletedIds.has(c.id));

              // Remote rows lack client-only fields (context, draft revisions, per-message
              // token/model metadata); carry them over from the local copy so they survive reloads.
              const localById = new Map(validLocalConvs.map((c) => [c.id, c]));
              loadedConvs = loadedConvs.map((rc) => {
                const lc = localById.get(rc.id);
                if (!lc) return rc;
                const localMsgs = new Map((lc.messages || []).map((m) => [m.id, m]));
                return {
                  ...rc,
                  context: lc.context ?? rc.context,
                  keepContext: lc.keepContext,
                  messages: rc.messages.map((m) => {
                    const lm = localMsgs.get(m.id);
                    if (!lm) return m;
                    return {
                      ...m,
                      revisions: lm.revisions,
                      currentRevisionIndex: lm.currentRevisionIndex,
                      tokensUsed: lm.tokensUsed,
                      modelTier: lm.modelTier,
                      timeTakenSec: lm.timeTakenSec,
                    };
                  }),
                };
              });

              const existingRemoteIds = new Set(loadedConvs.map((c) => c.id));
              const unsyncedLocalConvs = convFetchOk
                ? validLocalConvs.filter((c) => !existingRemoteIds.has(c.id))
                : [];
              // Local ids that were re-keyed during migration; the old copy must not be re-added
              const migratedLocalIds = new Set<string>();

              if (unsyncedLocalConvs.length > 0 && user?.id) {
                const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                for (const localC of unsyncedLocalConvs) {
                  if (!isMounted) return;
                  const targetConvId = UUID_REGEX.test(localC.id) ? localC.id : generateId();
                  try {
                    const { error: convInsertErr } = await supabase.from('conversations').insert({
                      id: targetConvId,
                      user_id: user.id,
                      title: localC.title || 'New Conversation',
                      tone: localC.tone || null,
                      created_at: new Date(localC.createdAt || Date.now()).toISOString(),
                      updated_at: new Date(localC.updatedAt || Date.now()).toISOString(),
                    });
                    if (convInsertErr) throw convInsertErr;

                    const localMessages = localC.messages || [];
                    const validMessages = localMessages.map((m) => ({
                      id: UUID_REGEX.test(m.id) ? m.id : generateId(),
                      conversation_id: targetConvId,
                      role: m.role,
                      content: m.content,
                      is_error: !!m.isError,
                      created_at: new Date(m.timestamp || Date.now()).toISOString(),
                    }));

                    if (validMessages.length > 0) {
                      const { error: msgInsertErr } = await supabase.from('messages').insert(validMessages);
                      if (msgInsertErr) {
                        console.error('Failed to migrate local messages to Supabase:', msgInsertErr);
                      }
                    }

                    if (targetConvId !== localC.id) migratedLocalIds.add(localC.id);
                    loadedConvs.push({
                      ...localC,
                      id: targetConvId,
                      messages: validMessages.map((vm, idx) => ({
                        ...localMessages[idx],
                        id: vm.id,
                      })),
                    });
                  } catch (migErr) {
                    console.error('Failed to migrate local conversation to Supabase:', migErr);
                    loadedConvs.push(localC);
                  }
                }
              }

              if (!isMounted) return;

              // Deduplicate and filter deleted
              const convMap = new Map<string, Conversation>();
              loadedConvs.forEach((c) => {
                if (!deletedIds.has(c.id)) {
                  convMap.set(c.id, c);
                }
              });
              validLocalConvs.forEach((c) => {
                if (!deletedIds.has(c.id) && !convMap.has(c.id) && !migratedLocalIds.has(c.id)) {
                  convMap.set(c.id, c);
                }
              });

              const allConvs = Array.from(convMap.values());

              // Merge into current state instead of replacing it: conversations created or
              // messages appended while this async init was running must not be clobbered,
              // and the user must not be kicked out of the chat they are in.
              setConversations((prev) => {
                const tombstones = loadDeletedConversationIds();
                const merged = new Map<string, Conversation>();
                allConvs.forEach((c) => {
                  if (!tombstones.has(c.id)) merged.set(c.id, c);
                });
                prev.forEach((p) => {
                  if (tombstones.has(p.id) || migratedLocalIds.has(p.id)) return;
                  if (!merged.has(p.id) || p.updatedAt >= initStartedAt) merged.set(p.id, p);
                });
                return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
              });
              return;
            }
          } catch (err) {
            console.error('Supabase initialization fallback to localStorage:', err);
          }
        }

        // Local storage fallback: the mount effect above already hydrated conversations,
        // style sample, tone and model tier from localStorage. Re-applying them here would
        // only overwrite changes the user made in the meantime.
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
      setProfile((prev) => (prev ? { ...prev, style_sample: sample } : prev));

      if (userId && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('profiles')
            .update({ style_sample: sample, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (error) console.error('Supabase style sample update error:', error);
        } catch (err) {
          console.error('Supabase style sample update error:', err);
        }
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

    // 2. Update React state AND write directly to localStorage immediately (optimistic)
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveLocalConversations(next);
      return next;
    });

    // 3. If deleted chat is currently active, open fresh new chat with greeting.
    //    Functional update so a selection change made meanwhile is respected.
    setActiveConversationId((prev) => (prev === id ? null : prev));

    // 4. Delete from Supabase if configured
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('conversations').delete().eq('id', id).eq('user_id', userId);
        if (error) console.error('Supabase delete error:', error);
      } catch (err) {
        console.error('Supabase delete error:', err);
      }
    }
  }

  async function renameConversation(id: string, title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
    );

    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('conversations')
          .update({ title: trimmed, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);
        if (error) console.error('Supabase rename error:', error);
      } catch (err) {
        console.error('Supabase rename error:', err);
      }
    }
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
      // Block double/concurrent sends. A second call while a request is in flight reads
      // stale state (e.g. activeConversationId still null) and would duplicate the
      // conversation or the user message.
      if (inFlightRef.current) return;
      if (!content || !content.trim()) return;
      inFlightRef.current = true;
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const toneToUse = overrideTone !== undefined ? overrideTone : activeTone;
      let targetConversationId: string | null = activeConversationId;

      try {
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
        if (!isMountedRef.current) return;
        const convId: string = targetConversationId;

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
              c.id === convId
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
        const updatedTitle = isFirstUserMessage ? deriveTitle(content) : currentConv.title;
        // Persist extra context (e.g. reply-modal constraints) on the conversation so
        // follow-up turns in the same thread keep using it.
        const effectiveContext = requestContext || currentConv.context || null;

        // Optimistically update UI
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const baseMessages = options?.messagesOverride || c.messages;
              return {
                ...c,
                title: isFirstUserMessage ? updatedTitle : c.title,
                tone: toneToUse,
                context: effectiveContext,
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
            const { error: userMsgErr } = await supabase.from('messages').insert({
              id: tempUserMsgId,
              conversation_id: convId,
              role: 'user',
              content,
              is_error: false,
            });
            if (userMsgErr) console.error('Supabase user message persist error:', userMsgErr);

            if (isFirstUserMessage) {
              const { error: titleErr } = await supabase
                .from('conversations')
                .update({ title: updatedTitle, tone: toneToUse, updated_at: new Date().toISOString() })
                .eq('id', convId);
              if (titleErr) console.error('Supabase conversation title update error:', titleErr);
            }
          } catch (err) {
            console.error('Supabase user message persist error:', err);
          }
        }

        if (controller.signal.aborted) return;

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
          signal: controller.signal,
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
            if (errData?.resetAt && typeof errData.resetAt === 'number' && errData.resetAt > Date.now()) {
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
        if (typeof data.content !== 'string' || !data.content.trim()) {
          throw new Error('The server returned an empty response. Please try again.');
        }
        if (!isMountedRef.current) return;

        // Record genuine token usage from server
        if (data.usage) {
          const updated = recordUsage(data.usage);
          setUsageStats(updated);
        }

        // Deduct or synchronize tokens from server response. The server's remainingTokens
        // is only authoritative for signed-in users (it is computed from usage_logs);
        // in local mode it is always 50k minus this request, which would reset the quota.
        const tokensConsumed = data.tokensUsed || data.usage?.totalTokens || MODEL_CREDIT_COSTS[modelTier] || 1000;
        if (userId && typeof data.remainingTokens === 'number') {
          const serverRemaining = Math.max(0, data.remainingTokens);
          setCreditsState(serverRemaining);
          saveLocalCredits(serverRemaining);
          if (serverRemaining === 0) {
            setTokensCountdown(getTokensCountdownFormatted() || '5h 00m');
          }
        } else {
          const next = Math.max(0, loadLocalCredits() - tokensConsumed);
          saveLocalCredits(next);
          setCreditsState(next);
          if (next === 0) {
            setTokensCountdown(getTokensCountdownFormatted() || '5h 00m');
          }
        }

        const tempAssistantId = generateId();
        const reportedTier = data.usage?.modelTier;
        const assistantMessage: Message = {
          id: tempAssistantId,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
          tokensUsed: tokensConsumed,
          modelTier: isValidModelTier(reportedTier) ? reportedTier : modelTier,
          timeTakenSec: data.usage?.timeTakenSec,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: Date.now() }
              : c
          )
        );

        // Persist assistant message in Supabase
        if (userId && isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            const { error: asstErr } = await supabase.from('messages').insert({
              id: tempAssistantId,
              conversation_id: convId,
              role: 'assistant',
              content: data.content,
              is_error: false,
            });
            if (asstErr) console.error('Supabase assistant message persist error:', asstErr);
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', convId);
          } catch (err) {
            console.error('Supabase assistant message persist error:', err);
          }
        }
      } catch (error: unknown) {
        // Aborted because the hook unmounted: nothing to report, nowhere to render it.
        if (controller.signal.aborted || !isMountedRef.current) return;
        if (!targetConversationId) return;
        const errorConvId: string = targetConversationId;

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
            c.id === errorConvId
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
              conversation_id: errorConvId,
              role: 'assistant',
              content: `Error: ${errMessage}`,
              is_error: true,
            });
          } catch {
            // ignore
          }
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        inFlightRef.current = false;
        if (isMountedRef.current) setIsLoading(false);
      }
    },
    [
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
    ]
  );

  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!activeConversation || inFlightRef.current) return;
    // Out of quota: retrying would delete the failed user message and then hit the
    // quota guard without re-adding it, silently losing the user's prompt.
    if (credits <= 0) return;

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
    const removedIds = messages
      .filter((m) => !cleanedMessages.some((cm) => cm.id === m.id))
      .map((m) => m.id);
    const retryConversationId = activeConversation.id;

    // Remove the error message(s) and the failed user message from local state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === retryConversationId
          ? {
              ...c,
              messages: cleanedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    // Delete the same messages in Supabase so they don't reappear on reload
    if (userId && isSupabaseConfigured() && removedIds.length > 0) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('messages').delete().in('id', removedIds);
        if (error) console.error('Supabase message deletion error:', error);
      } catch (err) {
        console.error('Supabase message deletion error:', err);
      }
    }

    // Pass `undefined` (not null) for tone so the retry uses the active tone, and let the
    // conversation's stored context apply.
    await sendMessage(lastUserContent, undefined, undefined, { messagesOverride: cleanedMessages });
  }, [activeConversation, credits, userId, sendMessage]);

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
    // Keep `profile` in sync: sendMessage and the page fall back to profile.style_sample,
    // so a stale profile would resurrect a style sample the user just cleared.
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            style_sample: newProf.styleSample ?? prev.style_sample,
            user_category: newProf.userCategory ?? prev.user_category,
            email_purpose: newProf.emailPurpose ?? prev.email_purpose,
            preferred_style: newProf.preferredStyle ?? prev.preferred_style,
          }
        : prev
    );
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('profiles').update({
          style_sample: newProf.styleSample || '',
          user_category: newProf.userCategory || null,
          email_purpose: newProf.emailPurpose || null,
          preferred_style: newProf.preferredStyle || null,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
        if (error) console.error('Supabase profile update error:', error);
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
          const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', messageId);
          if (error) console.error('Supabase message update error:', error);
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
