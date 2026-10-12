'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  withGlow?: boolean;
}

const SIZE_MAP = {
  sm: { px: 28, class: 'w-7 h-7 rounded-lg' },
  md: { px: 36, class: 'w-9 h-9 rounded-xl' },
  lg: { px: 56, class: 'w-14 h-14 rounded-2xl' },
  xl: { px: 80, class: 'w-20 h-20 rounded-2xl' },
  hero: { px: 128, class: 'w-24 h-24 sm:w-32 sm:h-32 rounded-3xl' },
};

export function Logo({ size = 'md', className = '', withGlow = false }: LogoProps) {
  const config = SIZE_MAP[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {withGlow && (
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/30 via-purple-600/30 to-cyan-400/30 rounded-full blur-2xl transform scale-125 pointer-events-none" />
      )}
      <Image
        src="/loom-logo.png"
        alt="LOOM.AI"
        width={config.px}
        height={config.px}
        priority={size === 'hero' || size === 'xl' || size === 'lg'}
        className={`relative object-contain border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:scale-[1.02] ${config.class}`}
      />
    </div>
  );
}
