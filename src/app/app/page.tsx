'use client';

import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { StyleModal } from '@/components/StyleModal';
import { Loader2 } from 'lucide-react';

export default function WorkspacePage() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    styleSample,
    setStyleSample,
    activeTone,
    setActiveTone,
    profile,
    isLoading,
    isInitialized,
    createConversation,
    deleteConversation,
    renameConversation,
    setActiveConversation,
    sendMessage,
    retryLastMessage,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);

  // Initial loader while reading Supabase / localStorage session
  if (!isInitialized) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin text-purple-400" />
          <p className="text-xs font-mono font-medium text-zinc-400">Loading LOOM AI Workspace...</p>
        </div>
      </div>
    );
  }

  function handleNewChat() {
    createConversation();
    setSidebarOpen(false);
  }

  function handleSelectConversation(id: string) {
    setActiveConversation(id);
    setSidebarOpen(false);
  }

  const hasStyleSample = styleSample.trim().length > 0 || (profile?.style_sample?.trim().length ?? 0) > 0;

  return (
    <div className="h-dvh flex overflow-hidden bg-[#09090b] font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hasStyleSample={hasStyleSample}
        onOpenStyleModal={() => setStyleModalOpen(true)}
        profile={profile}
      />

      {/* Main Chat Interface */}
      <ChatArea
        conversation={activeConversation}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        onRetry={retryLastMessage}
        onOpenSidebar={() => setSidebarOpen(true)}
        activeTone={activeTone}
        onSelectTone={setActiveTone}
        styleSample={styleSample || profile?.style_sample || ''}
        onOpenStyleModal={() => setStyleModalOpen(true)}
      />

      {/* Personal Writing Style Modal */}
      <StyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        styleSample={styleSample || profile?.style_sample || ''}
        onSaveStyle={setStyleSample}
      />
    </div>
  );
}
