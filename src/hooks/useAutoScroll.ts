'use client';

import { useEffect, useRef } from 'react';

function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Keeps the thread pinned to the bottom when `deps` change.
 *
 * Scrolls only the nearest scrollable ancestor of the sentinel element. Using
 * `scrollIntoView` here would also scroll every ancestor (including the
 * `overflow-hidden` page shell), shifting the header/sidebar out of view.
 */
export function useAutoScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    // No sentinel mounted, or it is display:none (empty state) — nothing to scroll to.
    if (!el || el.offsetParent === null) return;
    const container = findScrollContainer(el);
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scrollRef;
}
