'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  SquarePen,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Feather,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { Conversation, UserProfile } from '@/types';
import { Wordmark } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { clearUserDataOnLogout } from '@/lib/storage';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  isOpen: boolean;
  onClose: () => void;
  hasStyleSample?: boolean;
  onOpenStyleModal?: () => void;
  profile?: UserProfile | null;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
  hasStyleSample = false,
  onOpenStyleModal,
  profile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, searchQuery]);

  // Set once a rename is committed or cancelled, so the blur that follows the
  // input unmounting (Enter / Escape) can't commit a second time or undo a cancel.
  const renameSettledRef = useRef(false);

  const startRename = (id: string, title: string) => {
    renameSettledRef.current = false;
    setRenamingId(id);
    setRenameText(title);
  };

  const handleRenameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renameSettledRef.current) return;
    renameSettledRef.current = true;
    const original = conversations.find((c) => c.id === renamingId)?.title;
    const next = renameText.trim();
    if (renamingId && next && next !== original) {
      onRenameConversation(renamingId, next);
    }
    setRenamingId(null);
    setRenameText('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      renameSettledRef.current = true;
      setRenamingId(null);
      setRenameText('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      clearUserDataOnLogout();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex h-full w-[272px] shrink-0 flex-col bg-sidebar border-r border-line transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center justify-between pl-4 pr-2">
          <Link href="/" className="flex items-center rounded-lg hover:opacity-90 transition-opacity">
            <Wordmark size="sm" />
          </Link>
          <button onClick={onClose} className="icon-btn md:hidden" aria-label="Close sidebar">
            <X className="size-4" />
          </button>
        </div>

        {/* Primary actions */}
        <div className="px-2 space-y-0.5">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-2.5 h-9 rounded-lg px-2.5 text-sm text-fg hover:bg-hover transition-colors"
            aria-label="New Chat"
            title="Start a new email draft"
          >
            <SquarePen className="size-4 text-fg-muted" />
            <span>New draft</span>
          </button>

          <label className="relative flex items-center h-9 rounded-lg px-2.5 gap-2.5 text-sm text-fg-muted focus-within:bg-hover hover:bg-hover transition-colors cursor-text">
            <Search className="size-4 shrink-0" />
            <input
              type="text"
              placeholder="Search drafts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-base sm:text-sm text-fg placeholder:text-fg-muted outline-none"
              aria-label="Search drafts"
            />
          </label>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 pt-5 pb-2">
          <div className="eyebrow px-2.5 pb-1.5">Recents</div>
          {!mounted ? (
            <div className="space-y-1 px-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 rounded-lg bg-hover animate-pulse" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-2.5 py-2">
              <p className="text-sm text-fg-subtle">
                {searchQuery ? 'No matching drafts' : 'No drafts yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onNewChat}
                  className="mt-1 text-sm text-fg-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
                >
                  Draft your first email
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {filteredConversations.map((chat) => {
                const isActive = chat.id === activeConversationId;
                const isRenaming = chat.id === renamingId;
                const isDeleting = chat.id === deletingId;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isRenaming && !isDeleting && onSelectConversation(chat.id)}
                    className={`group relative flex h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-active text-fg'
                        : 'text-fg-muted hover:bg-hover hover:text-fg focus-within:bg-hover'
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex-1 -mx-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          onBlur={() => handleRenameSubmit()}
                          className="w-full h-7 rounded-md bg-bg px-1.5 text-base sm:text-sm text-fg outline-none ring-1 ring-accent-line"
                          aria-label="Rename conversation"
                        />
                      </div>
                    ) : (
                      <span className="flex-1 truncate">{chat.title}</span>
                    )}

                    {!isRenaming && (
                      <div
                        className={`absolute inset-y-0 right-1 flex items-center gap-0.5 pl-6 rounded-r-lg transition-opacity ${
                          isActive
                            ? 'bg-gradient-to-l from-[#0b162b] from-60% to-transparent'
                            : 'bg-gradient-to-l from-[#0a101b] from-60% to-transparent'
                        } ${
                          isDeleting
                            ? 'opacity-100'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                        }`}
                      >
                        {isDeleting ? (
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-fg-subtle mr-1">Delete?</span>
                            <button
                              onClick={(e) => handleDeleteConfirm(e, chat.id)}
                              className="icon-btn size-7 rounded-md text-danger hover:text-danger"
                              title="Confirm Delete"
                              aria-label="Confirm delete"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="icon-btn size-7 rounded-md"
                              title="Cancel"
                              aria-label="Cancel delete"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(chat.id, chat.title);
                              }}
                              className="icon-btn size-7 rounded-md"
                              aria-label="Rename"
                              title="Rename conversation"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(chat.id);
                              }}
                              className="icon-btn size-7 rounded-md hover:text-danger"
                              aria-label="Delete"
                              title="Delete conversation"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 space-y-0.5">
          {onOpenStyleModal && (
            <button
              onClick={onOpenStyleModal}
              className="flex w-full items-center justify-between h-9 rounded-lg px-2.5 text-sm text-fg-muted hover:bg-hover hover:text-fg transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Feather className="size-4" />
                <span>Writing voice</span>
              </span>
              {hasStyleSample ? (
                <span className="badge badge-accent">Active</span>
              ) : (
                <span className="text-xs text-fg-subtle">Set up</span>
              )}
            </button>
          )}

          <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid place-items-center size-8 shrink-0 rounded-full bg-accent-soft text-accent-strong text-sm font-medium">
                {profile?.preferred_name ? profile.preferred_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-medium text-fg truncate">
                  {profile?.preferred_name || 'My account'}
                </div>
                <div className="text-xs text-fg-subtle truncate capitalize">
                  {profile?.user_category || 'Workspace'}
                </div>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <Link
                href="/onboarding?edit=true"
                className="icon-btn size-8"
                title="Edit Profile & Onboarding Preferences"
                aria-label="Preferences"
              >
                <SlidersHorizontal className="size-4" />
              </Link>
              <button
                onClick={handleSignOut}
                className="icon-btn size-8 hover:text-danger"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
