import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { OfflineQueueBanner } from '@/components/layout/OfflineQueueBanner';
import { AuthProvider } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-sidebar fixed h-screen z-20">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-sidebar min-h-screen pb-16 md:pb-0">
          <OfflineQueueBanner />
          <TopBar />
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="block md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100">
          <MobileBottomNav />
        </nav>
      </div>
    </AuthProvider>
  );
}
