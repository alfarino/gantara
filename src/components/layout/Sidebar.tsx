'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

const menuItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'Data Keluarga', icon: 'group', route: '/keluarga', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'QR Code', icon: 'qr_code_scanner', route: '/qr-scanner', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'Event Bencana', icon: 'crisis_alert', route: '/event-bencana', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Posko', icon: 'location_on', route: '/posko', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Relawan', icon: 'volunteer_activism', route: '/relawan', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Laporan', icon: 'assessment', route: '/laporan', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Pengaturan', icon: 'settings', route: '/pengaturan', roles: ['SUPER_ADMIN'] },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="h-full bg-secondary flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <Logo variant="light" />
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems
          .filter(item => user && item.roles.includes(user.role))
          .map(item => {
            const isActive = pathname === item.route || (item.route !== '/' && pathname.startsWith(item.route));
            return (
              <Link key={item.route} href={item.route}
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-heading transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-container text-white font-semibold'
                    : 'text-white/70 hover:bg-white/10'
                }`}>
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
};
