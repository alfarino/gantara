import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, placeholder, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-heading font-semibold text-sm text-gray-900">{label}</label>}
      <select className={`w-full h-12 min-h-[44px] px-4 border border-gray-100 rounded-btn text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none ${className}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
};
