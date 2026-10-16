'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Search, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUseTemplate = (template: EmailTemplate) => {
    onSelectTemplate(template.promptTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="modal-backdrop animate-in fade-in duration-150" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-modal-title"
        className="modal-panel relative z-10 w-full max-w-3xl max-h-[85dvh] flex flex-col overflow-hidden text-fg animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="templates-modal-title" className="text-lg font-semibold text-fg">
                Templates
              </h2>
              <p className="mt-0.5 text-sm text-fg-subtle">Pick a starting point for your next draft.</p>
            </div>
            <button onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates — extension, follow-up, meeting…"
              aria-label="Search templates"
              className="field max-sm:text-base pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="-mx-6 px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                data-active={selectedCategory === cat}
                className="chip shrink-0"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center text-sm text-fg-subtle">
              No templates match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col gap-3 rounded-xl border border-line p-4 transition-colors hover:border-line-strong hover:bg-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-fg">{template.title}</span>
                      <span className="badge shrink-0">{template.category}</span>
                    </div>
                    <p className="mt-1 text-sm text-fg-subtle leading-relaxed">{template.description}</p>
                    <p className="mt-2 text-xs text-fg-faint leading-relaxed line-clamp-2">
                      {template.promptTemplate}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template)}
                      disabled={isLoading}
                      className="btn btn-secondary btn-sm"
                    >
                      Use template
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between gap-2">
          <span className="text-sm text-fg-subtle">
            <span className="font-mono tabular-nums">{filteredTemplates.length}</span> templates
          </span>
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
