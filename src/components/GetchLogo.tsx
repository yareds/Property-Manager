import React from 'react';

interface GetchLogoProps {
  variant?: 'full' | 'sidebar' | 'compact';
  className?: string;
}

export const GetchLogo: React.FC<GetchLogoProps> = ({ variant = 'sidebar', className = '' }) => {
  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center space-y-4 ${className}`}>
        {/* Emblem / Badge */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative p-4 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12"
            >
              <defs>
                <linearGradient id="getchGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="50%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
                <linearGradient id="getchGoldFull" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              {/* Outer Geometric Frame */}
              <rect x="3" y="3" width="42" height="42" rx="10" stroke="url(#getchGradFull)" strokeWidth="2.5" fill="#0F172A" />
              
              {/* Stylized 'G' Building Pillar 1 */}
              <path
                d="M14 15C14 13.8954 14.8954 13 16 13H28C29.1046 13 30 13.8954 30 15V19H20V29H28V24H23V20H32V31C32 32.1046 31.1046 33 30 33H16C14.8954 33 14 32.1046 14 31V15Z"
                fill="url(#getchGradFull)"
              />
              
              {/* High-Rise Towers Accent */}
              <rect x="34" y="16" width="4" height="17" rx="1" fill="url(#getchGoldFull)" opacity="0.9" />
              <rect x="22" y="16" width="3" height="4" rx="0.5" fill="#F8FAFC" />
              <rect x="17" y="16" width="3" height="4" rx="0.5" fill="#93C5FD" />
              <rect x="17" y="23" width="3" height="4" rx="0.5" fill="#93C5FD" />

              {/* Roof Arch Accent */}
              <path d="M12 11L24 5L36 11" stroke="url(#getchGoldFull)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Text Brand */}
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-1.5">
            <span className="text-3xl font-black tracking-tight text-white font-sans">
              GETCH
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <div className="text-[11px] font-bold tracking-[0.25em] uppercase text-indigo-300">
            Property Manager
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2.5 ${className}`}>
        {/* Compact Emblem */}
        <div className="relative shrink-0">
          <div className="w-8 h-8 bg-slate-950 border border-indigo-500/40 rounded-lg flex items-center justify-center shadow-md">
            <svg
              width="22"
              height="22"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="getchGradCompact" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="40" height="40" rx="8" fill="#0F172A" stroke="url(#getchGradCompact)" strokeWidth="3" />
              <path
                d="M14 15H28V19H20V29H28V24H23V20H32V31H16C14.8954 31 14 30.1046 14 29V15Z"
                fill="url(#getchGradCompact)"
              />
              <path d="M12 11L24 5L36 11" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Compact Typography */}
        <div className="flex flex-col leading-tight">
          <span className="font-black text-sm tracking-tight text-white font-sans">
            GETCH
          </span>
          <span className="text-[9px] font-bold tracking-widest text-indigo-300 uppercase">
            Property Manager
          </span>
        </div>
      </div>
    );
  }

  // Default: Sidebar variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Sidebar Emblem */}
      <div className="relative shrink-0 group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-amber-500 rounded-xl blur-[2px] opacity-40 group-hover:opacity-80 transition duration-300"></div>
        <div className="relative w-9 h-9 bg-[#0b1329] border border-slate-700/80 rounded-xl flex items-center justify-center shadow-lg">
          <svg
            width="24"
            height="24"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="getchGradSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="60%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <path
              d="M14 15C14 13.8954 14.8954 13 16 13H28C29.1046 13 30 13.8954 30 15V19H20V29H28V24H23V20H32V31C32 32.1046 31.1046 33 30 33H16C14.8954 33 14 32.1046 14 31V15Z"
              fill="url(#getchGradSidebar)"
            />
            <rect x="34" y="16" width="3.5" height="17" rx="1" fill="#F59E0B" />
            <path d="M12 11L24 5L36 11" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Sidebar Typography */}
      <div className="flex flex-col space-y-0.5">
        <div className="flex items-center space-x-1">
          <span className="font-extrabold text-[15px] tracking-tight text-white font-sans leading-none">
            GETCH
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
        </div>
        <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-400 leading-none">
          Property Manager
        </span>
      </div>
    </div>
  );
};
