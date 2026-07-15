import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const variants = {
    success: 'bg-success/10 text-success',
    warning: 'bg-tertiary/10 text-tertiary',
    danger: 'bg-danger text-white',
    neutral: 'bg-surface-variant text-gray-500',
    primary: 'bg-primary/10 text-primary',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-heading font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
};
