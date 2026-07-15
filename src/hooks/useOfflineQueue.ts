'use client';
import { useState, useEffect, useCallback } from 'react';
import type { OfflineTransaction } from '@/lib/resilientFetch';

const QUEUE_KEY = 'gantara_offline_queue';

export function useOfflineQueue() {
  const [queueLength, setQueueLength] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    const queue: OfflineTransaction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || '[]'
    );
    setQueueLength(queue.length);
  }, []);

  const syncQueue = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const queue: OfflineTransaction[] = JSON.parse(
      localStorage.getItem(QUEUE_KEY) || '[]'
    );
    if (queue.length === 0) return;

    setIsSyncing(true);
    const remaining: OfflineTransaction[] = [];

    for (const tx of queue) {
      try {
        const response = await fetch(tx.url, {
          method: tx.method,
          headers: { 'Content-Type': 'application/json' },
          body: tx.body || undefined,
        });
        if (!response.ok) remaining.push(tx);
      } catch {
        remaining.push(tx);
        break; // Masih offline, hentikan sinkronisasi
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    setQueueLength(remaining.length);
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    refreshQueue();
    setIsOnline(navigator.onLine);

    const handleOnline = () => { setIsOnline(true); syncQueue(); };
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdate = () => refreshQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', handleQueueUpdate);
    };
  }, [refreshQueue, syncQueue]);

  return { queueLength, isOnline, isSyncing, syncQueue };
}
