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
        <div className="bg-red-50/90 border border-red-200 text-red-700 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
          {onRetry && (
            <div className="mt-2.5 pt-2 border-t border-red-200/60 flex justify-end">
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100/60 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Request
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
        <div className="bg-emerald-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-2xs text-sm whitespace-pre-wrap leading-relaxed font-sans">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant Message rendering: Check for email format
  const content = message.content;
  // Match Subject: or **Subject:** or ### Subject:
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
      <div className="flex flex-col items-start w-full gap-2 animate-in fade-in duration-200">
        {/* Optional preamble note from AI */}
        {preamble && (
          <div className="bg-white border border-stone-200 text-stone-700 rounded-2xl rounded-bl-xs px-4 py-2.5 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap leading-relaxed shadow-2xs">
            {preamble}
          </div>
        )}

        {/* Polished Email Draft Card */}
        <div className="w-full max-w-[90%] sm:max-w-[82%] rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden transition-all">
          {/* Email Draft Header */}
          <div className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Email Draft</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopySubject}
                className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy subject line"
              >
                {copiedSubject ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-stone-400" />
                )}
                <span>{copiedSubject ? 'Copied' : 'Copy Subject'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyBody}
                className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy email body"
              >
                {copiedBody ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-stone-400" />
                )}
                <span>{copiedBody ? 'Copied' : 'Copy Body'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                title="Copy subject and email body together"
              >
                {copiedFull ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <FileText className="w-3 h-3 text-emerald-600" />
                )}
                <span>{copiedFull ? 'Copied Full' : 'Copy Full'}</span>
              </button>
            </div>
          </div>

          {/* Email Subject Row */}
          <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/30 flex items-baseline gap-2">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider shrink-0 select-none">
              Subject:
            </span>
            <span className="text-sm font-medium text-stone-900 leading-snug">
              {rawSubject}
            </span>
          </div>

          {/* Email Body */}
          <div className="p-4 text-sm text-stone-800 whitespace-pre-wrap leading-relaxed font-sans selection:bg-emerald-100">
            {emailBody}
          </div>
        </div>
      </div>
    );
  }

  // Standard Conversational Assistant Message
  return (
    <div className="flex justify-start w-full animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] text-sm whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
        {message.content}
      </div>
    </div>
  );
}
