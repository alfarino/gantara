'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <>
      <header className="sticky top-0 z-10 h-topbar bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="font-heading font-semibold text-lg text-gray-900 hidden md:block">Dashboard</h2>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-bold text-sm">
                {user.namaLengkap.charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-heading font-semibold text-gray-900">{user.namaLengkap}</p>
                <p className="text-xs text-gray-500">{user.role.replace(/_/g, ' ')}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-danger/10 hover:text-danger rounded-btn transition-colors"
            title="Keluar Aplikasi"
          >
            <span className="material-symbols-outlined text-gray-500 hover:text-danger">logout</span>
          </button>
        </div>
      </header>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Konfirmasi Keluar"
        description="Apakah Anda yakin ingin keluar dari sesi akun GANTARA ini?"
        confirmText="Ya, Keluar"
        cancelText="Batal"
        variant="danger"
        loading={loggingOut}
      />
    </>
  );
};
