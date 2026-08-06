'use client';
import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      <div className="bg-white rounded-card shadow-lg max-w-sm w-full p-6 space-y-4 animate-scaleUp">
        <div className="flex items-center gap-3 text-gray-900">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
            <span className="material-symbols-outlined text-xl">
              {variant === 'danger' ? 'logout' : 'info'}
            </span>
          </div>
          <h3 className="font-heading font-bold text-lg leading-tight">{title}</h3>
        </div>

        {description && (
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Memproses...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
