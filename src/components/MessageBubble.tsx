'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCheck,
  Pencil,
  ExternalLink,
  Send,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Message, EmailTone, DraftRevision } from '@/types';
import { copyToClipboard } from '@/lib/clipboard';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
  onRetry?: () => void;
  onQuickPrompt?: (prompt: string) => void;
  onUpdateMessageDraft?: (
    messageId: string,
    subject: string,
    body: string,
    revisions?: DraftRevision[],
    revisionIdx?: number
  ) => void;
}

const REFINEMENT_PRESETS = [
  { label: 'Rewrite', prompt: 'Rewrite this entire email draft to make it fresh and engaging while keeping all key facts and dates.' },
  { label: 'Make shorter', prompt: 'Make this email draft more concise, crisp, and punchy without losing key context.' },
  { label: 'Expand', prompt: 'Expand this email draft to provide more thorough background and context while maintaining a natural tone.' },
  { label: 'Improve clarity', prompt: 'Improve the clarity of this email draft so the core ask and takeaway are crystal clear.' },
  { label: 'More professional', prompt: 'Elevate the professionalism of this draft while keeping it human and approachable.' },
  { label: 'Fix grammar', prompt: 'Review and polish grammar, punctuation, and sentence cadence without altering the core message.' },
];

const TONES: EmailTone[] = [
  'Formal',
  'Friendly',
  'Assertive',
  'Apologetic',
  'Concise',
  'Persuasive',
];

export function MessageBubble({
  message,
  isLoading = false,
  onRetry,
  onQuickPrompt,
  onUpdateMessageDraft,
}: MessageBubbleProps) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);
  const toneDropdownRef = useRef<HTMLDivElement>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const isUser = message.role === 'user';
  const content = message.content;

  // Detect Email Draft layout
  const subjectRegex = /^(?:#{1,3}\s*)?(?:\*{0,2}Subject:\*{0,2}\s*)(.+)$/im;
  const match = content.match(subjectRegex);

  // Initialize draft components
  const preamble = match && match.index !== undefined ? content.substring(0, match.index).trim() : '';
  const initialSubject = match && match.index !== undefined ? match[1].trim().replace(/^\*+|\*+$/g, '') : '';
  const initialBody = match && match.index !== undefined ? content.substring(match.index + match[0].length).trim() : '';

  // Local draft revision history stack preserved from message model
  const [revisions, setRevisions] = useState<DraftRevision[]>(() => {
    if (message.revisions && message.revisions.length > 0) {
      return message.revisions;
    }
    return [
      {
        id: 'rev-0',
        subject: initialSubject,
        body: initialBody,
        timestamp: message.timestamp,
        label: 'Original Draft',
      },
    ];
  });
  const [activeRevisionIdx, setActiveRevisionIdx] = useState(
    message.currentRevisionIndex !== undefined ? message.currentRevisionIndex : 0
  );

  // Working text currently visible / edited
  const currentRevision = revisions[activeRevisionIdx] || revisions[0];
  const [editedSubject, setEditedSubject] = useState(currentRevision?.subject || initialSubject);
  const [editedBody, setEditedBody] = useState(currentRevision?.body || initialBody);

  // Synchronize ONLY when message ID changes (switched to another message)
  const lastMessageIdRef = useRef(message.id);
  useEffect(() => {
    if (lastMessageIdRef.current !== message.id) {
      lastMessageIdRef.current = message.id;
      const initial =
        message.revisions && message.revisions.length > 0
          ? message.revisions
          : [
              {
                id: 'rev-0',
                subject: initialSubject,
                body: initialBody,
                timestamp: message.timestamp,
                label: 'Original Draft',
              },
            ];
      setRevisions(initial);
      const idx =
        message.currentRevisionIndex !== undefined
          ? message.currentRevisionIndex
          : initial.length - 1;
      setActiveRevisionIdx(idx);
      setEditedSubject(initial[idx]?.subject || initialSubject);
      setEditedBody(initial[idx]?.body || initialBody);
    }
  }, [
    message.id,
    message.revisions,
    message.currentRevisionIndex,
    initialSubject,
    initialBody,
    message.timestamp,
  ]);

  // Click outside to close tone dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toneDropdownRef.current && !toneDropdownRef.current.contains(e.target as Node)) {
        setToneDropdownOpen(false);
      }
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setToneDropdownOpen(false);
        setCopyMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Error message
  if (message.isError) {
    return (
      <div className="animate-in fade-in duration-150">
        <div className="rounded-2xl border border-danger-line bg-danger-soft px-4 py-3.5 max-w-[90%] sm:max-w-[80%]">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-4 text-danger shrink-0 mt-[3px]" />
            <div className="flex-1 text-sm text-fg-muted whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
          {onRetry && (
            <div className="mt-3 pl-7">
              <button onClick={onRetry} disabled={isLoading} className="btn btn-sm btn-secondary">
                <RotateCcw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Retrying…' : 'Try again'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User message
  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in duration-150">
        <div className="bg-bubble border border-accent/15 text-fg rounded-[22px] px-4 py-2.5 max-w-[85%] sm:max-w-[75%] text-[15px] whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant Message rendering: Check if formatted as email draft
  if (match && match.index !== undefined) {
    const rawSubject = editedSubject;
    const emailBody = editedBody;

    // Word count & read time metrics
    const wordCount = emailBody.split(/\s+/).filter(Boolean).length;
    const readSeconds = Math.max(10, Math.round((wordCount / 200) * 60));

    const handleCopySubject = async () => {
      if (!(await copyToClipboard(rawSubject))) return;
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    };

    const handleCopyBody = async () => {
      if (!(await copyToClipboard(emailBody))) return;
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    };

    const handleCopyFull = async () => {
      const full = `Subject: ${rawSubject}\n\n${emailBody}`;
      if (!(await copyToClipboard(full))) return;
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    };

    // Save manual edits & push revision
    const handleSaveEdit = () => {
      setIsEditing(false);
      const hasChanged = rawSubject !== currentRevision.subject || emailBody !== currentRevision.body;
      if (hasChanged) {
        const newRev: DraftRevision = {
          id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          subject: rawSubject,
          body: emailBody,
          timestamp: Date.now(),
          label: `Edit v${revisions.length + 1}`,
        };
        const updated = [...revisions, newRev];
        const newIdx = updated.length - 1;
        setRevisions(updated);
        setActiveRevisionIdx(newIdx);
        onUpdateMessageDraft?.(message.id, rawSubject, emailBody, updated, newIdx);
      }
    };

    // Undo / restore previous version
    const handleUndo = () => {
      if (activeRevisionIdx > 0 && !isLoading) {
        const prevIdx = activeRevisionIdx - 1;
        setActiveRevisionIdx(prevIdx);
        setEditedSubject(revisions[prevIdx].subject);
        setEditedBody(revisions[prevIdx].body);
        onUpdateMessageDraft?.(
          message.id,
          revisions[prevIdx].subject,
          revisions[prevIdx].body,
          revisions,
          prevIdx
        );
      }
    };

    // Send on Mail (native mailto:) using latest edited draft
    const handleSendOnMail = () => {
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoUrl;
    };

    // Calculate effective tokens used for this response
    const effectiveTokens =
      message.tokensUsed ||
      (message.modelTier === 'silk'
        ? Math.max(110, Math.round((message.content.length / 3.8) * 0.45 + 80))
        : message.modelTier === 'tapestry'
        ? Math.max(750, Math.round((message.content.length / 3.8) * 2.2 + 350))
        : Math.max(320, Math.round((message.content.length / 3.8) * 0.95 + 180)));

    // Open in Gmail using latest edited draft
    const handleOpenInGmail = () => {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="flex flex-col gap-4 w-full animate-in fade-in duration-200">
        {/* Commentary before the draft */}
        {preamble && <div className="prose-loom">{preamble}</div>}

        {/* Draft document */}
        <article className="card w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap pl-5 pr-2.5 py-2 border-b border-line">
            <div className="flex items-center gap-2 min-h-9 text-sm">
              <span className="font-medium text-fg">Email draft</span>
              {revisions.length > 1 && (
                <>
                  <span className="badge font-mono">
                    v{activeRevisionIdx + 1}/{revisions.length}
                  </span>
                  {activeRevisionIdx > 0 && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={isLoading}
                      className="btn btn-sm btn-ghost h-7 px-2"
                      title="Undo to previous revision"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Undo</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit();
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`btn btn-sm ${isEditing ? 'btn-primary' : 'btn-ghost'}`}
                title="Edit draft directly"
              >
                {isEditing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                <span>{isEditing ? 'Done' : 'Edit'}</span>
              </button>

              {/* Copy (all) + menu for subject / body */}
              <div className="relative flex items-center" ref={copyMenuRef}>
                <button
                  type="button"
                  onClick={handleCopyFull}
                  className="btn btn-sm btn-ghost pr-1.5"
                  title="Copy full email"
                >
                  {copiedFull ? <CheckCheck className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  <span>{copiedFull ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCopyMenuOpen((v) => !v)}
                  className="icon-btn size-8 rounded-full"
                  aria-label="More copy options"
                  aria-haspopup="menu"
                  aria-expanded={copyMenuOpen}
                >
                  <ChevronDown className="size-3.5" />
                </button>
                {copyMenuOpen && (
                  <div
                    role="menu"
                    className="menu absolute right-0 top-full mt-1 w-44 z-30 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleCopySubject();
                        setCopyMenuOpen(false);
                      }}
                      className="menu-item"
                      title="Copy subject line"
                    >
                      <span>Copy subject</span>
                      {copiedSubject && <Check className="size-3.5 text-success" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyBody();
                        setCopyMenuOpen(false);
                      }}
                      className="menu-item"
                      title="Copy email body"
                    >
                      <span>Copy body</span>
                      {copiedBody && <Check className="size-3.5 text-success" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendOnMail}
                className="btn btn-sm btn-ghost max-sm:w-8 max-sm:px-0"
                title="Open in your default Mail app with Subject and Body"
              >
                <Send className="size-3.5" />
                <span className="hidden sm:inline">Mail</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInGmail}
                className="btn btn-sm btn-secondary ml-1"
                title="Open this draft directly in Gmail with Subject and Body pre-filled"
              >
                <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.691 2.28 24 3.434 24 5.457z"
                  />
                </svg>
                <span>Gmail</span>
                <ExternalLink className="size-3 text-fg-subtle" />
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="px-5 pt-5">
            <div className="eyebrow mb-1">Subject</div>
            {isEditing ? (
              <input
                type="text"
                value={rawSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="field font-semibold"
                aria-label="Subject"
              />
            ) : (
              <h3 className="text-[17px] font-semibold text-fg leading-snug">{rawSubject}</h3>
            )}
          </div>

          {/* Body */}
          <div className="px-5 pt-4 pb-5">
            {isEditing ? (
              <textarea
                value={emailBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={10}
                className="field resize-y leading-relaxed"
                aria-label="Email body"
              />
            ) : (
              <div className="prose-loom text-fg/90">{emailBody}</div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-faint tabular-nums">
              <span>{wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span>~{readSeconds}s read</span>
              <span aria-hidden="true">·</span>
              <span title="Tokens consumed for this draft response">{effectiveTokens.toLocaleString()} tokens</span>
              {message.timeTakenSec && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{message.timeTakenSec}s</span>
                </>
              )}
            </div>
          </div>

          {/* Refine */}
          {onQuickPrompt && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 border-t border-line">
              {REFINEMENT_PRESETS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickPrompt(item.prompt)}
                  disabled={isLoading}
                  className="chip"
                >
                  {item.label}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <div className="relative" ref={toneDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
                    disabled={isLoading}
                    className="chip"
                    title="Change tone of this draft"
                    aria-haspopup="menu"
                    aria-expanded={toneDropdownOpen}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Tone</span>
                    <ChevronDown className="size-3.5" />
                  </button>

                  {toneDropdownOpen && (
                    <div
                      role="menu"
                      className="menu absolute bottom-full right-0 mb-2 w-44 z-30 animate-in fade-in zoom-in-95 duration-150 origin-bottom-right"
                    >
                      <div className="menu-label">Rewrite as</div>
                      {TONES.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setToneDropdownOpen(false);
                            onQuickPrompt(`Rewrite this email draft adopting a ${tone.toLowerCase()} tone.`);
                          }}
                          className="menu-item"
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onQuickPrompt('Regenerate an alternative version of this email draft.')}
                  disabled={isLoading}
                  className="chip"
                  title="Regenerate alternative draft"
                >
                  <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    );
  }

  // Standard Conversational Assistant Message
  const effectiveTokens =
    message.tokensUsed ||
    (message.modelTier === 'silk'
      ? Math.max(35, Math.round((message.content.length / 3.8) * 0.25 + 20))
      : message.modelTier === 'tapestry'
      ? Math.max(150, Math.round((message.content.length / 3.8) * 1.0 + 80))
      : Math.max(75, Math.round((message.content.length / 3.8) * 0.5 + 40)));

  return (
    <div className="animate-in fade-in duration-200">
      <div className="prose-loom">{message.content}</div>
      <div className="mt-2.5 flex items-center gap-2 text-xs text-fg-faint tabular-nums">
        <span>{effectiveTokens.toLocaleString()} tokens</span>
        {message.timeTakenSec && (
          <>
            <span aria-hidden="true">·</span>
            <span>{message.timeTakenSec}s</span>
          </>
        )}
      </div>
    </div>
  );
}
