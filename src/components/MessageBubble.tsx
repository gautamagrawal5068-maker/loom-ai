'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
  onQuickPrompt?: (prompt: string) => void;
}

const QUICK_REFINEMENTS = [
  { label: 'Make it shorter', prompt: 'Make this draft more concise and punchy without losing key context.' },
  { label: 'More assertive', prompt: 'Rewrite this with a more confident, assertive tone while staying polite.' },
  { label: 'Warmer & friendly', prompt: 'Add a warmer, more collaborative and friendly tone to this draft.' },
  { label: 'Add bullet points', prompt: 'Structure the key asks or timeline in this email as crisp bullet points.' },
  { label: 'Check flow & cadence', prompt: 'Review this draft to ensure the cadence and transitions sound completely authentic.' },
];

export function MessageBubble({ message, onRetry, onQuickPrompt }: MessageBubbleProps) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState<string | null>(null);
  const [editedBody, setEditedBody] = useState<string | null>(null);

  const isUser = message.role === 'user';

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

  // User Message rendering (Warm Claude stone bubble)
  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-150">
        <div className="bg-[#282623] border border-[#3a3834] text-[#edebe6] rounded-2xl rounded-tr-xs px-4 py-3 max-w-[85%] sm:max-w-[72%] shadow-xs text-sm whitespace-pre-wrap leading-relaxed font-sans">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant Message rendering: Detect Email Draft layout
  const content = message.content;
  const subjectRegex = /^(?:#{1,3}\s*)?(?:\*{0,2}Subject:\*{0,2}\s*)(.+)$/im;
  const match = content.match(subjectRegex);

  if (match && match.index !== undefined) {
    const preamble = content.substring(0, match.index).trim();
    const rawSubject = editedSubject !== null ? editedSubject : match[1].trim().replace(/^\*+|\*+$/g, '');
    const bodyStartIndex = match.index + match[0].length;
    const emailBody = editedBody !== null ? editedBody : content.substring(bodyStartIndex).trim();

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

    return (
      <div className="flex flex-col items-start w-full gap-2.5 animate-in fade-in duration-150">
        {/* Preamble commentary if present */}
        {preamble && (
          <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
            <div className="w-6 h-6 rounded-lg bg-[#242220] border border-[#383633] flex items-center justify-center text-[#cc785c] shrink-0 mt-0.5 select-none">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#21201e] border border-[#32302d] text-[#c8c5bc] rounded-2xl rounded-tl-xs px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed font-sans shadow-xs">
              {preamble}
            </div>
          </div>
        )}

        {/* Calm Executive Email Draft Card */}
        <div className="w-full max-w-[96%] sm:max-w-[92%] rounded-2xl border border-[#34322e] bg-[#21201e] shadow-sm overflow-hidden transition-all">
          {/* Header Bar */}
          <div className="bg-[#1b1a18] border-b border-[#2d2b28] px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <div className="w-6 h-6 rounded-md bg-[#282624] border border-[#3a3834] flex items-center justify-center text-[#cc785c]">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-wider text-[#edebe6] uppercase font-semibold">
                  Email Draft
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>

              {/* Stats pill */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#8a877e] font-mono ml-2 pl-2 border-l border-[#2e2c29]">
                <span>{wordCount} words</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8a877e]" />
                  ~{readSeconds}s read
                </span>
              </div>
            </div>

            {/* Actions: Edit, Copy & Open in Gmail */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    if (editedSubject === null) setEditedSubject(rawSubject);
                    if (editedBody === null) setEditedBody(emailBody);
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-1 text-[11px] font-mono rounded-lg px-2.5 py-1 transition-colors cursor-pointer border ${
                  isEditing
                    ? 'bg-[#cc785c]/15 text-[#cc785c] border-[#cc785c]/40 font-medium'
                    : 'text-[#a6a39b] hover:text-[#edebe6] bg-[#282624] hover:bg-[#302e2b] border-[#383633]'
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
                    <Pencil className="w-3 h-3 text-[#8a877e]" />
                    <span>Edit</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopySubject}
                className="flex items-center gap-1 text-[11px] font-mono text-[#a6a39b] hover:text-[#edebe6] bg-[#282624] hover:bg-[#302e2b] border border-[#383633] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy subject line"
              >
                {copiedSubject ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-[#8a877e]" />
                )}
                <span>Subject</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBody}
                className="flex items-center gap-1 text-[11px] font-mono text-[#a6a39b] hover:text-[#edebe6] bg-[#282624] hover:bg-[#302e2b] border border-[#383633] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy email body"
              >
                {copiedBody ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-[#8a877e]" />
                )}
                <span>Body</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1 text-[11px] font-mono font-medium text-[#edebe6] hover:text-white bg-[#2e2c29] hover:bg-[#383633] border border-[#403e39] rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                title="Copy full email"
              >
                {copiedFull ? (
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <FileText className="w-3 h-3 text-[#cc785c]" />
                )}
                <span>Copy All</span>
              </button>

              {/* Direct 1-Click Gmail Action */}
              <button
                type="button"
                onClick={() => {
                  const subjectToUse = isEditing ? (editedSubject ?? rawSubject) : rawSubject;
                  const bodyToUse = isEditing ? (editedBody ?? emailBody) : emailBody;
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subjectToUse)}&body=${encodeURIComponent(bodyToUse)}`;
                  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#edebe6] hover:text-white bg-[#282624] hover:bg-[#32302d] border border-[#3c3a36] rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                title="Open this draft directly in Gmail with Subject and Body pre-filled"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.691 2.28 24 3.434 24 5.457z"
                  />
                </svg>
                <span>Open in Gmail</span>
                <ExternalLink className="w-2.5 h-2.5 text-[#8a877e]" />
              </button>
            </div>
          </div>

          {/* Subject Row */}
          <div className="px-5 py-2.5 border-b border-[#2d2b28] bg-[#1d1c1a] flex items-center gap-3">
            <span className="text-[10px] font-mono font-semibold text-[#8a877e] uppercase tracking-wider shrink-0 select-none">
              SUBJECT:
            </span>
            {isEditing ? (
              <input
                type="text"
                value={rawSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="flex-1 bg-[#161514] border border-[#cc785c]/50 rounded-lg px-2.5 py-1 text-sm font-semibold text-[#edebe6] focus:outline-none focus:border-[#cc785c] font-sans"
              />
            ) : (
              <span className="text-sm font-semibold text-[#edebe6] leading-snug font-sans">
                {rawSubject}
              </span>
            )}
          </div>

          {/* Email Body */}
          <div className="p-5 text-sm text-[#dedcd5] font-sans leading-relaxed selection:bg-[#cc785c]/30 selection:text-white">
            {isEditing ? (
              <textarea
                value={emailBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={8}
                className="w-full bg-[#161514] border border-[#cc785c]/50 rounded-xl p-3 text-sm text-[#edebe6] font-sans leading-relaxed focus:outline-none focus:border-[#cc785c] resize-y"
              />
            ) : (
              <div className="whitespace-pre-wrap">{emailBody}</div>
            )}
          </div>

          {/* Interactive Refinement Toolbar */}
          {onQuickPrompt && (
            <div className="px-4 py-2 border-t border-[#2d2b28] bg-[#1a1918] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8a877e] shrink-0">
                Refine:
              </span>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {QUICK_REFINEMENTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onQuickPrompt(item.prompt)}
                    className="text-[11px] font-mono text-[#a6a39b] hover:text-[#edebe6] bg-[#242220] hover:bg-[#2c2a27] border border-[#34322e] rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard Conversational Assistant Message
  return (
    <div className="flex justify-start w-full animate-in fade-in duration-150">
      <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
        <div className="w-6 h-6 rounded-lg bg-[#242220] border border-[#383633] flex items-center justify-center text-[#cc785c] shrink-0 mt-0.5 select-none">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="bg-[#21201e] border border-[#34322e] text-[#dedcd5] rounded-2xl rounded-tl-xs px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed font-sans shadow-xs">
          {message.content}
        </div>
      </div>
    </div>
  );
}
