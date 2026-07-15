import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'success' | 'danger' | 'warning';
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = 'success', label }) => {
  const colors = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-tertiary' };
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span>{value}%</span></div>}
      <div className="h-2 rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all duration-500 ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
};
