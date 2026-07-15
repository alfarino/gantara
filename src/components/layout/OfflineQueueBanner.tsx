'use client';
import React from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export const OfflineQueueBanner: React.FC = () => {
  const { queueLength, isOnline, isSyncing, syncQueue } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <div className={`w-full py-2 px-4 flex items-center justify-between text-xs font-semibold text-white transition-all ${
      !isOnline ? 'bg-danger animate-pulse' : 'bg-success'
    }`}>
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">
          {!isOnline ? 'wifi_off' : 'sync'}
        </span>
        <span>
          {!isOnline 
            ? `Offline. Ada ${queueLength} antrian transaksi yang tersimpan lokal.` 
            : isSyncing 
            ? `Menyinkronkan ${queueLength} transaksi ke server...`
            : `Koneksi pulih. Terdapat ${queueLength} transaksi tertunda.`}
        </span>
      </div>
      {isOnline && queueLength > 0 && (
        <button 
          onClick={syncQueue} 
          disabled={isSyncing}
          className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50 min-h-[32px] flex items-center justify-center gap-1 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-xs">sync</span>
          Kirim Ulang
        </button>
      )}
    </div>
  );
};
