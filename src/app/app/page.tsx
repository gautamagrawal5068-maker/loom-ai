'use client';

import { useState, useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { StyleModal } from '@/components/StyleModal';
import { Loader2, Sparkles } from 'lucide-react';

export default function WorkspacePage() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    styleSample,
    setStyleSample,
    activeTone,
    setActiveTone,
    modelTier,
    setModelTier,
    credits,
    refillCountdown,
    creditCost,
    profile,
    isLoading,
    isInitialized,
    startNewChat,
    deleteConversation,
    renameConversation,
    setActiveConversation,
    sendMessage,
    retryLastMessage,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);

  // Safety fallback: ensure workspace loads within 1200ms even on slow networks
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Initial loader while reading Supabase / localStorage session
  if (!isInitialized && !forceReady) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[#191817]">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-[#242220] border border-white/[0.08] flex items-center justify-center text-[#cc785c] shadow-sm">
            <Sparkles className="w-5 h-5 text-[#cc785c]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#9f9d96]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#cc785c]" />
            <span>Initializing workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  function handleNewChat() {
    startNewChat();
    setSidebarOpen(false);
  }

  function handleSelectConversation(id: string) {
    setActiveConversation(id);
    setSidebarOpen(false);
  }

  const hasStyleSample = styleSample.trim().length > 0 || (profile?.style_sample?.trim().length ?? 0) > 0;

  return (
    <div className="h-dvh flex overflow-hidden bg-[#191817] font-sans antialiased text-[#ecebe6]">
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
        modelTier={modelTier}
        onSelectModelTier={setModelTier}
        credits={credits}
        refillCountdown={refillCountdown}
        userName={profile?.preferred_name || undefined}
        creditCost={creditCost}
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
