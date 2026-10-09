'use client';

import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { StyleModal } from '@/components/StyleModal';

export default function Home() {
  const {
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
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);

  // Initial loader while reading localStorage safely
  if (!isInitialized) {
    return (
      <div className="h-dvh flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-stone-400">Loading LOOM AI...</p>
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

  const hasStyleSample = styleSample.trim().length > 0;

  return (
    <div className="h-dvh flex overflow-hidden bg-stone-50 font-sans antialiased">
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
        styleSample={styleSample}
        onOpenStyleModal={() => setStyleModalOpen(true)}
      />

      {/* Personal Writing Style Modal */}
      <StyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        styleSample={styleSample}
        onSaveStyle={setStyleSample}
      />
    </div>
  );
}
