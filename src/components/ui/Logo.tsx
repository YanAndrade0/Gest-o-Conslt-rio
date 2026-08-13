import React from 'react';

export function Logo({ 
  className = "", 
  iconOnly = false,
  subtitle
}: { 
  className?: string; 
  iconOnly?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
        <svg 
          viewBox="0 0 200 160" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Soft Mint Light Cloud Fill */}
          <path 
            d="M 60 125 C 25 125 20 90 45 70 C 35 35 85 20 105 35 C 130 15 175 40 165 75 C 185 95 175 125 140 125 Z" 
            fill="#EAF1EC" 
          />

          {/* Cloud Dark Green Outline */}
          <path 
            d="M 62 124 C 28 123 23 88 47 68 C 38 32 88 18 108 34 C 132 14 177 38 167 74 C 186 94 176 123 138 124" 
            fill="none" 
            stroke="#2A4D36" 
            strokeWidth="9" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />

          {/* Center Capsule / Pill (Dark Green) */}
          <rect 
            x="80" 
            y="42" 
            width="40" 
            height="76" 
            rx="20" 
            ry="20" 
            fill="#2A4D36" 
          />

          {/* Inner Highlight Curve on Top Left of Capsule */}
          <path 
            d="M 88 58 C 88 50 93 47 98 47" 
            fill="none" 
            stroke="#88AC93" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
      
      {!iconOnly && (
        <div className="flex flex-col items-center md:items-start space-y-0.5">
          <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Oral<span className="text-[#2A4D36]">Cloud</span>
          </span>
          {subtitle && (
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

