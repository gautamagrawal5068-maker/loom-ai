'use client';

import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { StyleModal } from '@/components/StyleModal';
import { TemplatesModal } from '@/components/TemplatesModal';
import { ReplySummarizeModal } from '@/components/ReplySummarizeModal';


export default function WorkspacePage() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    styleSample,
    writingProfile,
    setWritingProfile,
    usageStats,
    updateMessageDraft,
    activeTone,
    setActiveTone,
    modelTier,
    setModelTier,
    profile,
    isLoading,
    startNewChat,
    deleteConversation,
    renameConversation,
    setActiveConversation,
    remainingTokens,
    tokensCountdown,
    sendMessage,
    retryLastMessage,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyModalInitialTab, setReplyModalInitialTab] = useState<'reply' | 'summarize'>('reply');
  const [activeInitialPrompt, setActiveInitialPrompt] = useState<string | undefined>(undefined);



  function handleNewChat() {
    startNewChat();
    setSidebarOpen(false);
    setActiveInitialPrompt(undefined);
  }

  function handleSelectConversation(id: string) {
    setActiveConversation(id);
    setSidebarOpen(false);
    setActiveInitialPrompt(undefined);
  }

  const hasStyleSample =
    (styleSample && styleSample.trim().length > 0) ||
    (writingProfile?.styleSample && writingProfile.styleSample.trim().length > 0) ||
    (profile?.style_sample?.trim().length ?? 0) > 0;

  return (
    <div className="h-dvh flex overflow-hidden bg-bg font-sans antialiased text-fg">
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
        onSendMessage={(content) => {
          sendMessage(content);
          setActiveInitialPrompt(undefined);
        }}
        onRetry={retryLastMessage}
        onOpenSidebar={() => setSidebarOpen(true)}
        activeTone={activeTone}
        onSelectTone={setActiveTone}
        modelTier={modelTier}
        onSelectModelTier={setModelTier}
        usageStats={usageStats}
        userName={profile?.preferred_name || undefined}
        hasStyleSample={hasStyleSample}
        onOpenStyleModal={() => setStyleModalOpen(true)}
        onOpenTemplatesModal={() => setTemplatesModalOpen(true)}
        onOpenReplyModal={() => {
          setReplyModalInitialTab('reply');
          setReplyModalOpen(true);
        }}
        onOpenSummarizeModal={() => {
          setReplyModalInitialTab('summarize');
          setReplyModalOpen(true);
        }}
        remainingTokens={remainingTokens}
        tokensCountdown={tokensCountdown}
        onUpdateMessageDraft={updateMessageDraft}
        activeInitialPrompt={activeInitialPrompt}
      />

      {/* Personal Writing Profile & Voice Modal */}
      <StyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        writingProfile={writingProfile}
        onSaveProfile={setWritingProfile}
      />

      {/* Email Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        isLoading={isLoading}
        onSelectTemplate={(templatePrompt) => {
          // Reset first so picking the same template again still refills the composer.
          setActiveInitialPrompt(undefined);
          setTimeout(() => setActiveInitialPrompt(templatePrompt), 0);
        }}
      />

      {/* Reply & Summarization Modal */}
      <ReplySummarizeModal
        isOpen={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        initialTab={replyModalInitialTab}
        isLoading={isLoading}
        onGenerateDraft={(prompt, context) => {
          sendMessage(prompt, context);
        }}
      />
    </div>
  );
}
