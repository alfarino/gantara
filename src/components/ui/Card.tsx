import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white border border-gray-100 rounded-card shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
};
