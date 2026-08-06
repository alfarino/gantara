'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const menuOptions = [
  { label: 'Event Bencana', icon: 'crisis_alert', route: '/event-bencana', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Relawan', icon: 'volunteer_activism', route: '/relawan', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Laporan', icon: 'assessment', route: '/laporan', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Pengaturan Akun', icon: 'settings', route: '/pengaturan', roles: ['SUPER_ADMIN'] },
];

export default function MobileMenuPage() {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  if (!user) return null;

  const visibleOptions = menuOptions.filter(opt => opt.roles.includes(user.role));

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Profile Card */}
      <Card className="p-5 flex items-center gap-4 bg-primary text-white shadow-md">
        <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-lg uppercase">
          {user.namaLengkap.slice(0, 2)}
        </div>
        <div>
          <h3 className="font-heading font-bold text-base">{user.namaLengkap}</h3>
          <p className="text-xs text-white/80">{user.email} • {user.role.replace(/_/g, ' ')}</p>
        </div>
      </Card>

      {/* Options List */}
      {visibleOptions.length > 0 ? (
        <Card className="p-2 divide-y divide-gray-100 shadow-sm">
          {visibleOptions.map(opt => (
            <Link key={opt.route} href={opt.route} className="flex items-center justify-between py-4 px-4 hover:bg-gray-50 active:scale-[0.98] transition-all rounded-btn">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-500">{opt.icon}</span>
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward_ios</span>
            </Link>
          ))}
        </Card>
      ) : (
        <Card className="p-5 text-center text-xs text-gray-500 italic">
          Tidak ada menu tambahan untuk peran Anda.
        </Card>
      )}

      {/* Logout Action */}
      <Button
        variant="danger"
        className="w-full h-12 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        onClick={() => setShowLogoutModal(true)}
      >
        <span className="material-symbols-outlined text-sm">logout</span>
        Keluar Aplikasi
      </Button>

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
    </div>
  );
}
