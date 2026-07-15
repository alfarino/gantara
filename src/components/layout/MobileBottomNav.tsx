'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const mobileNavItems = [
  { label: 'Home', icon: 'dashboard', route: '/', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'Keluarga', icon: 'group', route: '/keluarga', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'Scan QR', icon: 'qr_code_scanner', route: '/qr-scanner', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
  { label: 'Posko', icon: 'location_on', route: '/posko', roles: ['SUPER_ADMIN', 'KEPALA_POSKO'] },
  { label: 'Lainnya', icon: 'more_horiz', route: '/menu', roles: ['SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA'] },
];

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-around py-2">
      {mobileNavItems
        .filter(item => user && item.roles.includes(user.role))
        .map(item => {
          const isActive = pathname === item.route || (item.route !== '/' && pathname.startsWith(item.route));
          return (
            <Link key={item.route} href={item.route}
              className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-gray-500'
              }`}>
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="text-[10px] font-heading font-semibold">{item.label}</span>
            </Link>
          );
        })}
    </div>
  );
};
