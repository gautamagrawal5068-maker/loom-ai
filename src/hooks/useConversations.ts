'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message, ChatResponse, EmailTone, ChatRequest } from '@/types';
import {
  generateId,
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  loadStyleSample,
  saveStyleSample,
  loadActiveTone,
  saveActiveTone,
} from '@/lib/storage';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [styleSample, setStyleSampleState] = useState<string>('');
  const [activeTone, setActiveToneState] = useState<EmailTone | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = loadConversations();
    const savedActiveId = loadActiveConversationId();
    const savedStyle = loadStyleSample();
    const savedTone = loadActiveTone();

    setConversations(saved);
    setStyleSampleState(savedStyle);
    setActiveToneState(savedTone);

    if (savedActiveId && saved.find((c) => c.id === savedActiveId)) {
      setActiveConversationId(savedActiveId);
    }
    setIsInitialized(true);
  }, []);

  // Sync conversations to localStorage
  useEffect(() => {
    if (isInitialized) {
      saveConversations(conversations);
    }
  }, [conversations, isInitialized]);

  // Sync activeConversationId to localStorage
  useEffect(() => {
    if (isInitialized) {
      saveActiveConversationId(activeConversationId);
    }
  }, [activeConversationId, isInitialized]);

  const setStyleSample = useCallback((sample: string) => {
    setStyleSampleState(sample);
    saveStyleSample(sample);
  }, []);

  const setActiveTone = useCallback((tone: EmailTone | null) => {
    setActiveToneState(tone);
    saveActiveTone(tone);
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  function createConversation(): string {
    const newId = generateId();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tone: activeTone,
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newId);
    return newId;
  }

  function deleteConversation(id: string): void {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }

  function renameConversation(id: string, title: string): void {
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
      targetConversationId = generateId();
      currentConv = {
        id: targetConversationId,
        title: 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tone: toneToUse,
      };
      setConversations((prev) => [currentConv!, ...prev]);
      setActiveConversationId(targetConversationId);
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Calculate updated messages list for the current conversation
    const existingMessages = currentConv.messages;
    const conversationMessages = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    conversationMessages.push({ role: 'user', content });

    // Update state with user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConversationId) {
          const isFirstUserMessage = !c.messages.some((m) => m.role === 'user');
          const title = isFirstUserMessage
            ? content.slice(0, 42).trim() + (content.length > 42 ? '...' : '')
            : c.title;
          return {
            ...c,
            title,
            tone: toneToUse,
            messages: [...c.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return c;
      })
    );

    setIsLoading(true);

    try {
      const payload: ChatRequest = {
        messages: conversationMessages,
        styleSample: styleSample || null,
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
          // ignore parse error and use status message
        }
        throw new Error(errorMsg);
      }

      const data: ChatResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: generateId(),
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

    // Find the last user message
    let lastUserContent = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserContent = messages[i].content;
        break;
      }
    }

    if (!lastUserContent) return;

    // Remove the error message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: c.messages.slice(0, -1), updatedAt: Date.now() }
          : c
      )
    );

    // Re-send user content
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
