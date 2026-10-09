'use client';

import { useState } from 'react';
import { Mail, Copy, Check, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const isUser = message.role === 'user';

  // Error Message rendering
  if (message.isError) {
    return (
      <div className="flex justify-start w-full animate-in fade-in duration-200">
        <div className="bg-red-950/30 border border-red-500/40 text-red-300 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed font-sans">
              {message.content}
            </div>
          </div>
          {onRetry && (
            <div className="mt-2.5 pt-2 border-t border-red-900/40 flex justify-end">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-mono font-medium text-red-300 hover:text-white bg-red-900/40 hover:bg-red-900/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-red-800/50"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Draft
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // User Message rendering
  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-200">
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 text-zinc-100 rounded-2xl rounded-br-xs px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-xs text-sm whitespace-pre-wrap leading-relaxed font-sans">
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
    const rawSubject = match[1].trim().replace(/^\*+|\*+$/g, '');
    const bodyStartIndex = match.index + match[0].length;
    const emailBody = content.substring(bodyStartIndex).trim();

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
      <div className="flex flex-col items-start w-full gap-2.5 animate-in fade-in duration-200">
        {/* Preamble commentary if present */}
        {preamble && (
          <div className="bg-[#121217] border border-zinc-800 text-zinc-300 rounded-2xl rounded-bl-xs px-4 py-2.5 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap leading-relaxed shadow-xs font-sans">
            {preamble}
          </div>
        )}

        {/* Polished Email Draft Card */}
        <div className="w-full max-w-[92%] sm:max-w-[84%] rounded-2xl border border-zinc-800 bg-[#121217] shadow-xl overflow-hidden transition-all hover:border-zinc-700">
          {/* Header Bar */}
          <div className="bg-[#181820] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>EMAIL DRAFT</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopySubject}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                title="Copy subject line"
              >
                {copiedSubject ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-500" />
                )}
                <span>{copiedSubject ? 'Copied' : 'Copy Subject'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBody}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                title="Copy email body"
              >
                {copiedBody ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-500" />
                )}
                <span>{copiedBody ? 'Copied' : 'Copy Body'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1 text-[11px] font-mono font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 rounded-lg px-2.5 py-1 transition-all cursor-pointer shadow-xs"
                title="Copy subject and email body together"
              >
                {copiedFull ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <FileText className="w-3 h-3 text-purple-400" />
                )}
                <span>{copiedFull ? 'Copied' : 'Copy Full'}</span>
              </button>
            </div>
          </div>

          {/* Subject Row */}
          <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/30 flex items-baseline gap-2.5">
            <span className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider shrink-0 select-none">
              Subject:
            </span>
            <span className="text-sm font-semibold text-white leading-snug font-sans">
              {rawSubject}
            </span>
          </div>

          {/* Email Body */}
          <div className="p-4 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans selection:bg-purple-900/50">
            {emailBody}
          </div>
        </div>
      </div>
    );
  }

  // Standard Conversational Assistant Message
  return (
    <div className="flex justify-start w-full animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 text-zinc-200 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap leading-relaxed shadow-xs font-sans">
        {message.content}
      </div>
    </div>
  );
}
