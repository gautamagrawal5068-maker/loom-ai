'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, Message, ChatResponse, EmailTone, ChatRequest, UserProfile } from '@/types';
import {
  generateId,
  loadConversations as loadLocalConversations,
  saveConversations as saveLocalConversations,
  loadActiveConversationId as loadLocalActiveId,
  saveActiveConversationId as saveLocalActiveId,
  loadStyleSample as loadLocalStyleSample,
  saveStyleSample as saveLocalStyleSample,
  loadActiveTone as loadLocalActiveTone,
  saveActiveTone as saveLocalActiveTone,
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

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [styleSample, setStyleSampleState] = useState<string>('');
  const [activeTone, setActiveToneState] = useState<EmailTone | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const migratedRef = useRef(false);

  // Initialize from Supabase or localStorage
  useEffect(() => {
    async function initialize() {
      const supabaseConfigured = isSupabaseConfigured();

      if (supabaseConfigured) {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            setUserId(user.id);

            // 1. Fetch user profile
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (userProfile) {
              setProfile(userProfile);
              if (userProfile.style_sample) {
                setStyleSampleState(userProfile.style_sample);
              }
            }

            // 2. Fetch conversations and nested messages
            const { data: convData } = await supabase
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

            let loadedConvs: Conversation[] = [];

            if (convData && convData.length > 0) {
              const rows = convData as unknown as SupabaseConversationRow[];
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

            // 3. Migrate local conversations if present and not migrated yet
            if (!migratedRef.current) {
              migratedRef.current = true;
              const localConvs = loadLocalConversations();
              if (localConvs.length > 0 && loadedConvs.length === 0) {
                // Upload local conversations to Supabase
                for (const localC of localConvs) {
                  const { data: insertedConv } = await supabase
                    .from('conversations')
                    .insert({
                      user_id: user.id,
                      title: localC.title,
                      tone: localC.tone,
                    })
                    .select()
                    .single();

                  if (insertedConv && localC.messages.length > 0) {
                    const messagesToInsert = localC.messages.map((m) => ({
                      conversation_id: insertedConv.id,
                      role: m.role,
                      content: m.content,
                      is_error: m.isError || false,
                    }));
                    await supabase.from('messages').insert(messagesToInsert);
                  }
                }

                // Re-fetch conversations
                const { data: refreshedConvs } = await supabase
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

                if (refreshedConvs) {
                  const refreshedRows = refreshedConvs as unknown as SupabaseConversationRow[];
                  loadedConvs = refreshedRows.map((c) => ({
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
              }
            }

            setConversations(loadedConvs);
            const savedActiveId = loadLocalActiveId();
            if (savedActiveId && loadedConvs.some((c) => c.id === savedActiveId)) {
              setActiveConversationId(savedActiveId);
            } else if (loadedConvs.length > 0) {
              setActiveConversationId(loadedConvs[0].id);
            }

            setIsInitialized(true);
            return;
          }
        } catch (err) {
          console.error('Supabase initialization fallback to localStorage:', err);
        }
      }

      // Local storage fallback for unauthenticated or local usage
      const savedConvs = loadLocalConversations();
      const savedActiveId = loadLocalActiveId();
      const savedStyle = loadLocalStyleSample();
      const savedTone = loadLocalActiveTone();

      setConversations(savedConvs);
      setStyleSampleState(savedStyle);
      setActiveToneState(savedTone);

      if (savedActiveId && savedConvs.some((c) => c.id === savedActiveId)) {
        setActiveConversationId(savedActiveId);
      }
      setIsInitialized(true);
    }

    initialize();
  }, []);

  // Save active conversation id locally
  useEffect(() => {
    if (isInitialized) {
      saveLocalActiveId(activeConversationId);
    }
  }, [activeConversationId, isInitialized]);

  // Sync to local storage for backup
  useEffect(() => {
    if (isInitialized && !userId) {
      saveLocalConversations(conversations);
    }
  }, [conversations, isInitialized, userId]);

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
    if (userId && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('conversations').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.error('Supabase delete error:', err);
      }
    }

    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
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
    deleteConversation,
    renameConversation,
    setActiveConversation,
    sendMessage,
    retryLastMessage,
  };
}
