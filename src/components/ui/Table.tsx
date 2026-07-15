import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
}

export const Table: React.FC<TableProps> = ({ headers, children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-x-auto border border-gray-100 rounded-card bg-white shadow-sm">
      <table className={`w-full text-left border-collapse ${className}`} {...props}>
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-heading font-bold text-gray-500 uppercase">
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm text-gray-900">
          {children}
        </tbody>
      </table>
    </div>
  );
};
