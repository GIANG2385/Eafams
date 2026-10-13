interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  iconOnly?: boolean;
}

export function LogoIcon({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Glow / Shadow */}
      <defs>
        <linearGradient id="shieldGrad" x1="50" y1="4" x2="50" y2="116" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A81D2E" />
          <stop offset="100%" stopColor="#7E111F" />
        </linearGradient>
        <filter id="shieldShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Main Shield Body */}
      <path
        d="M50 5 C80 5, 96 20, 96 46 C96 84, 68 108, 50 117 C32 108, 4 84, 4 46 C4 20, 20 5, 50 5 Z"
        fill="url(#shieldGrad)"
        stroke="#670C17"
        strokeWidth="3.5"
      />

      {/* Inner Subtle Rim */}
      <path
        d="M50 9 C76 9, 91 22, 91 46 C91 80, 66 103, 50 111 C34 103, 9 80, 9 46 C9 22, 24 9, 50 9 Z"
        stroke="#C03345"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="none"
      />

      {/* Gold Circular Star Badge at Top */}
      <circle cx="50" cy="27" r="9.5" fill="#ECA214" stroke="#D18707" strokeWidth="1" />
      {/* 5-pointed white star */}
      <polygon
        points="50,21 52.2,25.4 57,26 53.5,29.3 54.4,34 50,31.6 45.6,34 46.5,29.3 43,26 47.8,25.4"
        fill="#FFFFFF"
      />

      {/* Open Book in Center */}
      {/* Left Page */}
      <path
        d="M48 40 C34 38, 20 40, 16 43 C15 44, 15 72, 16 73 C20 70, 34 68, 48 71 Z"
        fill="#FFFFFF"
      />
      {/* Right Page */}
      <path
        d="M52 40 C66 38, 80 40, 84 43 C85 44, 85 72, 84 73 C80 70, 66 68, 52 71 Z"
        fill="#FFFFFF"
      />
      {/* Book Spine Center Gap */}
      <line x1="50" y1="39" x2="50" y2="72" stroke="#670C17" strokeWidth="1.5" />

      {/* Gold Bar at Bottom */}
      <polygon points="24,87 76,87 70,91 30,91" fill="#ECA214" stroke="#D18707" strokeWidth="0.8" />

      {/* Three White Blocks */}
      <rect x="29" y="74" width="8" height="9" rx="1.5" fill="#FFFFFF" />
      <rect x="46" y="74" width="8" height="9" rx="1.5" fill="#FFFFFF" />
      <rect x="63" y="74" width="8" height="9" rx="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({ size = 'md', showSubtitle = true, className = '', iconOnly = false }: LogoProps) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-5xl',
  };

  if (iconOnly) {
    return <LogoIcon className={`${iconSizes[size]} ${className}`} />;
  }

  return (
    <div className={`inline-flex items-center gap-3 sm:gap-3.5 ${className}`}>
      <LogoIcon className={`${iconSizes[size]} shrink-0`} />
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-black tracking-tight leading-none`}>
          <span className="text-[#0F172A]">ea</span>
          <span className="text-[#A01C2B]">fams</span>
        </span>
        {showSubtitle && (
          <>
            <span className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#334155] leading-tight">
              Education Account Financial &amp; Administrative System
            </span>
            <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-[#64748B] leading-tight">
              Ministry of Education Singapore
            </span>
          </>
        )}
      </div>
    </div>
  );
}
