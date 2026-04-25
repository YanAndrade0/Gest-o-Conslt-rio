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
      <div className="relative shrink-0 w-12 h-12">
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Cloud Base */}
          <path 
            d="M75 65C83.2843 65 90 58.2843 90 50C90 41.7157 83.2843 35 75 35C74.6568 35 74.3168 35.0115 73.9806 35.034C71.3934 23.3642 61.2144 15 49 15C34.6406 15 23 26.6406 23 41C23 41.3444 23.0067 41.6872 23.02 42.0282C15.5412 43.6841 10 50.3121 10 58.25C10 67.5008 17.4992 75 26.75 75H75V65Z" 
            fill="currentColor" 
            className="text-brand-primary/10"
          />
          
          {/* Tooth Integrated with Cloud */}
          <path 
            d="M49.5 25C43.5 25 39 29.5 39 35.5V55C39 63 42 68 49.5 68C57 68 60 63 60 55V35.5C60 29.5 55.5 25 49.5 25Z" 
            fill="currentColor" 
            className="text-brand-primary"
          />
          
          {/* Inner Tooth Detail */}
          <path 
            d="M50 35C50 32 48 30 45 30H44" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            className="opacity-50"
          />
          
          {/* Cloud Outline Accent */}
          <path 
            d="M75 75C84.3888 75 92 67.3888 92 58C92 48.6112 84.3888 41 75 41C74.8354 41 74.6719 41.0023 74.5095 41.0069C72.3995 28.9863 61.7618 20 49 20C36.2382 20 25.6005 28.9863 23.4905 41.0069C15.8202 42.2227 10 48.8351 10 56.8125C10 65.7526 17.2474 73 26.1875 73" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            className="text-brand-primary"
          />
        </svg>
      </div>
      
      {!iconOnly && (
        <div className="flex flex-col items-center md:items-start space-y-0.5">
          <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Oral<span className="text-brand-primary">Cloud</span>
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
