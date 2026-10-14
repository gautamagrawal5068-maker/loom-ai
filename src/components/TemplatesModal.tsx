'use client';

import { useState, useMemo } from 'react';
import { X, Search, ArrowRight, BookOpen } from 'lucide-react';
import { EMAIL_TEMPLATES } from '@/lib/templates';
import { EmailTemplate } from '@/types';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onSelectTemplate: (templatePrompt: string) => void;
}

const CATEGORIES = [
  'All',
  'School',
  'Workplace',
  'Internships',
  'Outreach',
  'Follow-ups',
  'Thank You',
  'Apologies',
  'Meetings',
];

export function TemplatesModal({
  isOpen,
  onClose,
  isLoading = false,
  onSelectTemplate,
}: TemplatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTemplates = useMemo(() => {
    return EMAIL_TEMPLATES.filter((tpl) => {
      const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
      const matchesSearch =
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleUseTemplate = (template: EmailTemplate) => {
    onSelectTemplate(template.promptTemplate);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0d0f17] shadow-2xl border border-white/[0.08] text-[#f8fafc] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#090a0f]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#121520] text-cyan-400 border border-white/[0.08]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f8fafc] font-mono">Email Templates</h2>
              <p className="text-xs text-zinc-400">Select a high-impact template to start drafting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.05] hover:text-[#f8fafc] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="p-4 border-b border-white/[0.08] bg-[#090a0f] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates (e.g. extension, follow-up, meeting)..."
              className="w-full bg-[#121520] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-[#f8fafc] placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-mono">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 border ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-[#121520] hover:bg-[#181d2d] text-zinc-400 hover:text-[#f8fafc] border-white/[0.08]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
          {filteredTemplates.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              No email templates found matching your search.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group p-3.5 rounded-xl bg-[#121520] border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#f8fafc] group-hover:text-cyan-300">
                      {template.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="p-2.5 rounded-lg bg-[#090a0f] border border-white/[0.06] text-[11px] font-mono text-zinc-400 line-clamp-2">
                    {template.promptTemplate}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d2d] hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#f8fafc] hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/40 text-xs font-sans font-medium transition-all cursor-pointer shadow-xs"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between text-xs font-mono text-zinc-500">
          <span>{filteredTemplates.length} templates available</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-zinc-400 hover:text-[#f8fafc] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
