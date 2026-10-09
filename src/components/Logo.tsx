'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showWordmark = true, className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  // Dimensions
  const dimensions = {
    sm: { img: 24, font: 'text-sm', badge: 'text-[9px]' },
    md: { img: 32, font: 'text-base', badge: 'text-[10px]' },
    lg: { img: 48, font: 'text-2xl', badge: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Logo Orb / Image */}
      <div className="relative flex items-center justify-center shrink-0">
        {!imgError ? (
          <div className="relative overflow-hidden rounded-lg">
            <Image
              src="/loom-logo.png"
              alt="LOOM AI Logo"
              width={dimensions.img}
              height={dimensions.img}
              className="object-contain"
              onError={() => setImgError(true)}
              priority
            />
          </div>
        ) : (
          /* Pixel-styled Glowing Orb Fallback if asset is missing before user copies it */
          <div
            className="relative flex items-center justify-center rounded-lg border border-fuchsia-500/40 bg-zinc-950 shadow-[0_0_15px_rgba(217,70,239,0.35)]"
            style={{ width: dimensions.img, height: dimensions.img }}
          >
            {/* Glowing Orb Gradient */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 blur-[2px] opacity-80" />
            <div className="relative font-mono font-black text-white text-[11px] tracking-tighter">
              L
            </div>
          </div>
        )}
      </div>

      {/* Typography with Pixel Styling */}
      {showWordmark && (
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className={`font-bold tracking-tight text-white ${dimensions.font}`}>
            LOOM<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">.AI</span>
          </span>
          <span
            className={`hidden sm:inline-block rounded px-1 py-0.2 font-mono font-semibold uppercase tracking-wider text-cyan-400/90 bg-cyan-950/40 border border-cyan-800/50 ${dimensions.badge}`}
          >
            v1.0
          </span>
        </div>
      )}
    </div>
  );
}
