'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  /** Kept for API compatibility; the mark no longer uses a glow. */
  withGlow?: boolean;
}

// `zoom` crops the artwork's wide black padding so the orb stays legible at small sizes.
const SIZE_MAP = {
  sm: { px: 24, class: 'size-6 rounded-[7px]', zoom: 'scale-[1.6]' },
  md: { px: 28, class: 'size-7 rounded-lg', zoom: 'scale-[1.6]' },
  lg: { px: 48, class: 'size-12 rounded-xl', zoom: 'scale-125' },
  xl: { px: 64, class: 'size-16 rounded-2xl', zoom: 'scale-110' },
  hero: { px: 96, class: 'size-20 sm:size-24 rounded-[22px]', zoom: 'scale-110' },
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const config = SIZE_MAP[size];

  return (
    <span className={`relative inline-flex shrink-0 select-none ${className}`}>
      <span className={`relative overflow-hidden bg-black ring-1 ring-line ${config.class}`}>
        <Image
          src="/loom-logo.png"
          alt="LOOM"
          width={config.px}
          height={config.px}
          priority={size === 'hero' || size === 'xl' || size === 'lg'}
          loading="eager"
          className={`size-full object-cover ${config.zoom}`}
        />
      </span>
    </span>
  );
}

/** Logo mark + wordmark, used in headers. */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span className={`font-semibold tracking-[-0.01em] text-fg ${size === 'sm' ? 'text-[15px]' : 'text-base'}`}>
        Loom<span className="text-fg-subtle">.ai</span>
      </span>
    </span>
  );
}
