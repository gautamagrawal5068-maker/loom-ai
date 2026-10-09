'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MessageSquare,
  Pencil,
  Trash2,
  X,
  Check,
  Sparkles,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { Conversation, UserProfile } from '@/types';
import { Logo } from '@/components/Logo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  const handleRenameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renamingId && renameText.trim()) {
      onRenameConversation(renamingId, renameText.trim());
    }
    setRenamingId(null);
    setRenameText('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setRenamingId(null);
      setRenameText('');
    } else if (e.key === 'Enter') {
      handleRenameSubmit();
    }
  };

  const handleDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.replace('/');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-zinc-800 bg-[#0c0c10] transition-transform duration-300 ease-in-out md:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Pixel Logo and New Chat */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3.5 border-b border-zinc-800/80 bg-[#0c0c10]">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-purple-500/50 transition-all cursor-pointer shadow-xs"
              aria-label="New Chat"
              title="Start a new email draft"
            >
              <Plus className="h-3.5 w-3.5 text-purple-400" />
              <span>New</span>
            </button>
            <button
              onClick={onClose}
              className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-xs text-zinc-500">
                {searchQuery ? 'No matching conversations' : 'No email drafts yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onNewChat}
                  className="mt-2 text-xs text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 hover:underline font-mono inline-block cursor-pointer"
                >
                  Draft your first email
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredConversations.map((chat) => {
                const isActive = chat.id === activeConversationId;
                const isRenaming = chat.id === renamingId;
                const isDeleting = chat.id === deletingId;

                return (
                  <div
                    key={chat.id}
                    onClick={() => !isRenaming && !isDeleting && onSelectConversation(chat.id)}
                    className={`group relative flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${
                      isActive
                        ? 'bg-zinc-900 text-white border-l-2 border-purple-500 rounded-l-xs font-medium shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-2 overflow-hidden mr-1">
                      <MessageSquare
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isActive ? 'text-purple-400' : 'text-zinc-500'
                        }`}
                      />

                      {isRenaming ? (
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={() => handleRenameSubmit()}
                            className="w-full bg-zinc-950 px-1.5 py-0.5 text-xs outline-none border border-purple-500 rounded text-white"
                          />
                        </div>
                      ) : (
                        <span className="truncate">{chat.title}</span>
                      )}
                    </div>

                    {!isRenaming && (
                      <div
                        className={`flex items-center gap-0.5 ${
                          isActive || isDeleting
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        } transition-opacity shrink-0`}
                      >
                        {isDeleting ? (
                          <div
                            className="flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleDeleteConfirm(e, chat.id)}
                              className="p-1 text-red-400 hover:bg-red-950/40 rounded transition-colors"
                              title="Confirm Delete"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(chat.id);
                                setRenameText(chat.title);
                              }}
                              className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
                              aria-label="Rename"
                              title="Rename conversation"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(chat.id);
                              }}
                              className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-950/30 transition-colors"
                              aria-label="Delete"
                              title="Delete conversation"
                            >
                              <Trash2 className="h-3 w-3" />
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

        {/* Writing Style Action */}
        {onOpenStyleModal && (
          <div className="px-2.5 py-2 border-t border-zinc-800/80 bg-[#0c0c10]">
            <button
              onClick={onOpenStyleModal}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/40 hover:bg-zinc-900 text-zinc-300 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs font-medium">Writing Style Sample</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  hasStyleSample
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {hasStyleSample ? 'Active' : 'Set'}
              </span>
            </button>
          </div>
        )}

        {/* User Profile & Sign Out Bar */}
        <div className="p-3 border-t border-zinc-800 bg-[#0a0a0d] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 shadow-2xs">
              {profile?.preferred_name
                ? profile.preferred_name.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {profile?.preferred_name || 'My Account'}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {profile?.user_category || 'Workspace'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Preferences button to re-run onboarding */}
            <Link
              href="/onboarding?edit=true"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Edit Profile & Onboarding Preferences"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
