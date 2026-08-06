import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string; // Material Symbols name
}

export const Input: React.FC<InputProps> = ({ label, error, icon, type, className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-heading font-semibold text-sm text-gray-900">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 text-gray-500 text-xl pointer-events-none select-none">
            {icon}
          </span>
        )}
        <input
          type={currentType}
          className={`w-full h-12 min-h-[44px] px-4 ${icon ? 'pl-10' : ''} ${isPassword ? 'pr-11' : ''} border border-gray-100 rounded-btn text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${error ? 'border-danger ring-1 ring-danger' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3 p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl select-none">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
};
