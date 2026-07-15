import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, limit, onPageChange }) => {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>Menampilkan {start}-{end} dari {total} data</span>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-btn hover:bg-gray-50 disabled:opacity-40">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-btn font-heading font-semibold text-sm ${
              p === page ? 'bg-primary text-white' : 'hover:bg-gray-50'
            }`}>{p}</button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-btn hover:bg-gray-50 disabled:opacity-40">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
