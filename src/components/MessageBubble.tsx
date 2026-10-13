'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  FileText,
  CheckCheck,
  Mail,
  Pencil,
  Clock,
  ExternalLink,
  Sparkles,
  Send,
  Sliders,
  ChevronDown,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Message, EmailTone, DraftRevision } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
  onQuickPrompt?: (prompt: string) => void;
  onUpdateMessageDraft?: (messageId: string, subject: string, body: string) => void;
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

  const isUser = message.role === 'user';
  const content = message.content;

  // Detect Email Draft layout
  const subjectRegex = /^(?:#{1,3}\s*)?(?:\*{0,2}Subject:\*{0,2}\s*)(.+)$/im;
  const match = content.match(subjectRegex);

  // Initialize draft components
  const preamble = match && match.index !== undefined ? content.substring(0, match.index).trim() : '';
  const initialSubject = match && match.index !== undefined ? match[1].trim().replace(/^\*+|\*+$/g, '') : '';
  const initialBody = match && match.index !== undefined ? content.substring(match.index + match[0].length).trim() : '';

  // Local draft revision history stack
  const [revisions, setRevisions] = useState<DraftRevision[]>(() => [
    {
      id: 'rev-0',
      subject: initialSubject,
      body: initialBody,
      timestamp: message.timestamp,
      label: 'Original Draft',
    },
  ]);
  const [activeRevisionIdx, setActiveRevisionIdx] = useState(0);

  // Working text currently visible / edited
  const currentRevision = revisions[activeRevisionIdx] || revisions[0];
  const [editedSubject, setEditedSubject] = useState(currentRevision?.subject || initialSubject);
  const [editedBody, setEditedBody] = useState(currentRevision?.body || initialBody);

  // Synchronize when message content updates externally
  useEffect(() => {
    if (initialSubject || initialBody) {
      setRevisions([
        {
          id: 'rev-0',
          subject: initialSubject,
          body: initialBody,
          timestamp: message.timestamp,
          label: 'Original Draft',
        },
      ]);
      setActiveRevisionIdx(0);
      setEditedSubject(initialSubject);
      setEditedBody(initialBody);
    }
  }, [content, initialSubject, initialBody, message.timestamp]);

  // Click outside to close tone dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toneDropdownRef.current && !toneDropdownRef.current.contains(e.target as Node)) {
        setToneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Error Message rendering
  if (message.isError) {
    return (
      <div className="flex justify-start w-full animate-in fade-in duration-150">
        <div className="bg-[#241715] border border-red-900/40 text-red-200 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {message.content}
            </div>
          </div>
          {onRetry && (
            <div className="mt-3 pt-2.5 border-t border-red-900/40 flex justify-end">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-mono font-medium text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-red-800/40"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry Generation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User Message rendering (Obsidian bubble)
  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-150">
        <div className="bg-[#121520] border border-white/[0.08] text-[#f8fafc] rounded-2xl rounded-tr-xs px-4 py-3 max-w-[85%] sm:max-w-[72%] shadow-md text-sm whitespace-pre-wrap leading-relaxed font-sans">
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
      await navigator.clipboard.writeText(rawSubject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    };

    const handleCopyBody = async () => {
      await navigator.clipboard.writeText(emailBody);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    };

    const handleCopyFull = async () => {
      const full = `Subject: ${rawSubject}\n\n${emailBody}`;
      await navigator.clipboard.writeText(full);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    };

    // Save manual edits & push revision
    const handleSaveEdit = () => {
      setIsEditing(false);
      const hasChanged = rawSubject !== currentRevision.subject || emailBody !== currentRevision.body;
      if (hasChanged) {
        const newRev: DraftRevision = {
          id: `rev-${revisions.length}`,
          subject: rawSubject,
          body: emailBody,
          timestamp: Date.now(),
          label: `Edit v${revisions.length + 1}`,
        };
        const updated = [...revisions, newRev];
        setRevisions(updated);
        setActiveRevisionIdx(updated.length - 1);
        onUpdateMessageDraft?.(message.id, rawSubject, emailBody);
      }
    };

    // Undo / restore previous version
    const handleUndo = () => {
      if (activeRevisionIdx > 0) {
        const prevIdx = activeRevisionIdx - 1;
        setActiveRevisionIdx(prevIdx);
        setEditedSubject(revisions[prevIdx].subject);
        setEditedBody(revisions[prevIdx].body);
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
      Math.max(160, Math.round((message.content.length / 3.8) * (message.modelTier === 'tapestry' ? 2.0 : message.modelTier === 'weave' ? 1.4 : 1.0) + 120));

    // Open in Gmail using latest edited draft
    const handleOpenInGmail = () => {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <div className="flex flex-col items-start w-full gap-2.5 animate-in fade-in duration-150">
        {/* Preamble commentary if present */}
        {preamble && (
          <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
            <div className="w-6 h-6 rounded-lg bg-[#0d0f17] border border-white/[0.08] flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 select-none">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="bg-[#0d0f17] border border-white/[0.08] text-zinc-300 rounded-2xl rounded-tl-xs px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed font-sans shadow-xs">
              {preamble}
            </div>
          </div>
        )}

        {/* Executive Email Draft Card */}
        <div className="w-full max-w-[96%] sm:max-w-[92%] rounded-2xl border border-white/[0.08] bg-[#0d0f17] shadow-xl overflow-hidden transition-all">
          {/* Header Bar */}
          <div className="bg-[#090a0f] border-b border-white/[0.08] px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <div className="w-6 h-6 rounded-md bg-[#121520] border border-white/[0.08] flex items-center justify-center text-cyan-400">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-wider text-[#f8fafc] uppercase font-semibold">
                  Email Draft
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              </div>

              {/* Version History Indicator / Undo */}
              {revisions.length > 1 && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/[0.08]">
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                    v{activeRevisionIdx + 1}/{revisions.length}
                  </span>
                  {activeRevisionIdx > 0 && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      title="Undo to previous revision"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Stats pill */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500 font-mono ml-2 pl-2 border-l border-white/[0.08]">
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  ~{readSeconds}s read
                </span>
              </div>

              {/* Token usage pill (Shows tokens used for this response) */}
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/[0.08]">
                <span
                  className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs"
                  title="Tokens consumed for this draft response"
                >
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{effectiveTokens.toLocaleString()} tokens used</span>
                  {message.timeTakenSec && (
                    <span className="text-zinc-400 font-normal hidden md:inline">• {message.timeTakenSec}s</span>
                  )}
                </span>
              </div>
            </div>

            {/* Actions: Edit, Copy, Send on Mail & Open in Gmail */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit();
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-1 text-[11px] font-mono rounded-lg px-2.5 py-1 transition-colors cursor-pointer border ${
                  isEditing
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium'
                    : 'text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border-white/[0.08]'
                }`}
                title="Edit draft directly"
              >
                {isEditing ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-3 h-3 text-zinc-400" />
                    <span>Edit</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopySubject}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy subject line"
              >
                {copiedSubject ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
                <span>Subject</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBody}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy email body"
              >
                {copiedBody ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
                <span>Body</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1 text-[11px] font-mono font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                title="Copy full email"
              >
                {copiedFull ? (
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FileText className="w-3 h-3 text-cyan-400" />
                )}
                <span>Copy All</span>
              </button>

              {/* Native Send on Mail (mailto:) */}
              <button
                type="button"
                onClick={handleSendOnMail}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Open in your default Mail app with Subject and Body"
              >
                <Send className="w-3 h-3 text-zinc-400" />
                <span className="hidden sm:inline">Mail</span>
              </button>

              {/* Direct 1-Click Gmail Action */}
              <button
                type="button"
                onClick={handleOpenInGmail}
                className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-200 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                title="Open this draft directly in Gmail with Subject and Body pre-filled"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.691 2.28 24 3.434 24 5.457z"
                  />
                </svg>
                <span>Gmail</span>
                <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Subject Row */}
          <div className="px-5 py-2.5 border-b border-white/[0.08] bg-[#090a0f] flex items-center gap-3">
            <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider shrink-0 select-none">
              SUBJECT:
            </span>
            {isEditing ? (
              <input
                type="text"
                value={rawSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="flex-1 bg-[#121520] border border-cyan-500/50 rounded-lg px-2.5 py-1 text-sm font-semibold text-[#f8fafc] focus:outline-none focus:border-cyan-400 font-sans"
              />
            ) : (
              <span className="text-sm font-semibold text-[#f8fafc] leading-snug font-sans">
                {rawSubject}
              </span>
            )}
          </div>

          {/* Email Body */}
          <div className="p-5 text-sm text-[#cbd5e1] font-sans leading-relaxed selection:bg-cyan-500/30 selection:text-white">
            {isEditing ? (
              <textarea
                value={emailBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={8}
                className="w-full bg-[#121520] border border-cyan-500/50 rounded-xl p-3 text-sm text-[#f8fafc] font-sans leading-relaxed focus:outline-none focus:border-cyan-400 resize-y"
              />
            ) : (
              <div className="whitespace-pre-wrap">{emailBody}</div>
            )}
          </div>

          {/* Comprehensive Refinement Toolbar */}
          {onQuickPrompt && (
            <div className="px-4 py-2 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 shrink-0 mr-1">
                  Refine:
                </span>
                {REFINEMENT_PRESETS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onQuickPrompt(item.prompt)}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Change Tone Dropdown & Regenerate Action */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative" ref={toneDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
                    className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                    title="Change Tone of this draft"
                  >
                    <Sliders className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Tone</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>

                  {toneDropdownOpen && (
                    <div className="absolute bottom-full right-0 mb-1.5 w-36 rounded-xl border border-white/[0.1] bg-[#121520] p-1 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1">
                        Change Tone
                      </div>
                      {TONES.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => {
                            setToneDropdownOpen(false);
                            onQuickPrompt(`Rewrite this email draft adopting a ${tone.toLowerCase()} tone.`);
                          }}
                          className="w-full text-left rounded-lg px-2 py-1 text-xs font-mono text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer"
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
                  className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-[#121520] hover:bg-[#181d2d] border border-white/[0.08] rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                  title="Regenerate alternative draft"
                >
                  <RefreshCw className="w-2.5 h-2.5 text-cyan-400" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard Conversational Assistant Message
  const effectiveTokens =
    message.tokensUsed ||
    Math.max(120, Math.round((message.content.length / 3.8) * (message.modelTier === 'tapestry' ? 2.0 : message.modelTier === 'weave' ? 1.4 : 1.0) + 80));

  return (
    <div className="flex justify-start w-full animate-in fade-in duration-150">
      <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
        <div className="w-6 h-6 rounded-lg bg-[#0d0f17] border border-white/[0.08] flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 select-none">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="bg-[#0d0f17] border border-white/[0.08] text-[#f8fafc] rounded-2xl rounded-tl-xs px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed font-sans shadow-md">
          <div>{message.content}</div>
          <div className="flex items-center gap-1 text-[10px] text-cyan-400/90 font-mono mt-2 pt-1.5 border-t border-white/[0.06]">
            <Zap className="w-2.5 h-2.5 text-cyan-400" />
            <span>{effectiveTokens.toLocaleString()} tokens used</span>
            {message.timeTakenSec && (
              <span className="text-zinc-500">• {message.timeTakenSec}s</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
