import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string; // Material Symbols name
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-heading font-semibold text-sm text-gray-900">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl">{icon}</span>
        )}
        <input
          className={`w-full h-12 min-h-[44px] px-4 ${icon ? 'pl-10' : ''} border border-gray-100 rounded-btn text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${error ? 'border-danger ring-1 ring-danger' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
};
