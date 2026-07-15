import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'light', className = '', showText = true }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';
  const subtextColor = variant === 'light' ? 'text-white/60' : 'text-gray-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Container */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md border ${
        variant === 'light' 
          ? 'bg-primary-container border-white/10 text-white' 
          : 'bg-primary text-white border-transparent'
      } shrink-0 transition-all duration-200 hover:scale-105 hover:shadow-lg`}>
        <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer QR square anchor brackets */}
          <path d="M4 8V5C4 4.44772 4.44772 4 5 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 4H19C19.5523 4 20 4.44772 20 5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 16V19C20 19.5523 19.5523 20 19 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 20H5C4.44772 20 4 19.5523 4 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          
          {/* Central Protection Shield */}
          <path d="M12 7.5C12 7.5 15 9 15.5 10C15.5 12.5 14.5 15 12 16.5C9.5 15 8.5 12.5 8.5 10C9 9 12 7.5 12 7.5Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          
          {/* Scanner/Signal center dot */}
          <circle cx="12" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <h1 className={`font-heading font-bold text-xl tracking-wider leading-none ${textColor}`}>
            GANTARA
          </h1>
          <p className={`text-[9px] font-heading font-bold tracking-widest uppercase mt-0.5 ${subtextColor}`}>
            Sistem Pascabencana
          </p>
        </div>
      )}
    </div>
  );
};
