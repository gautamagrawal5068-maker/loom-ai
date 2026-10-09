'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, MessageSquare, Pencil, Trash2, X, Check, Sparkles } from 'lucide-react';
import { Conversation } from '@/types';

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
}: SidebarProps) {
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-stone-200 bg-stone-50 transition-transform duration-300 ease-in-out md:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header & New Chat */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-stone-200/60 bg-white md:bg-stone-50">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-stone-900">
              LOOM <span className="text-emerald-600">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200/70 hover:text-stone-900 transition-colors cursor-pointer border border-stone-200/80 md:border-stone-200"
              aria-label="New Chat"
              title="Start a new email conversation"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              <span>New</span>
            </button>
            <button
              onClick={onClose}
              className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder:text-stone-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none">
          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-stone-400">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onNewChat}
                  className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-block cursor-pointer"
                >
                  Start your first email
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
                        ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-600 rounded-l-xs font-medium'
                        : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-2 overflow-hidden mr-1">
                      <MessageSquare
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isActive ? 'text-emerald-600' : 'text-stone-400'
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
                            className="w-full bg-white px-1.5 py-0.5 text-xs outline-none border border-emerald-600 rounded text-stone-900"
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
                              className="p-1 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Confirm Delete"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="p-1 text-stone-400 hover:bg-stone-200 rounded-md transition-colors"
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
                              className="p-1 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors"
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
                              className="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
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

        {/* Sidebar Footer */}
        {onOpenStyleModal && (
          <div className="p-2.5 border-t border-stone-200/60 bg-stone-50/80">
            <button
              onClick={onOpenStyleModal}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-stone-700 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-medium">Writing Style Sample</span>
              </div>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {hasStyleSample ? 'Active' : 'Add'}
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
