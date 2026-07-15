import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "h-12 min-h-[44px] px-6 rounded-btn font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-container active:scale-[0.98]",
    secondary: "bg-white border border-gray-100 text-gray-900 hover:bg-gray-50 active:scale-[0.98]",
    danger: "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
