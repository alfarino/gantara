export interface OfflineTransaction {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
}

export async function resilientFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const maxRetries = 3;
  let delay = 1000; // 1 detik awal

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) {
        // Jika ini request write (POST/PUT/DELETE) dan koneksi putus, antre secara lokal
        if (options.method && options.method !== 'GET') {
          queueTransaction(url, options);
          throw new Error("Koneksi gagal. Transaksi disimpan dalam antrean offline.");
        }
        throw error;
      }
    }
    // Tunggu dengan exponential backoff sebelum retry berikutnya
    await new Promise(res => setTimeout(res, delay));
    delay *= 2;
  }
  throw new Error("Gagal terhubung setelah beberapa kali percobaan.");
}

function queueTransaction(url: string, options: RequestInit) {
  if (typeof window === 'undefined') return;
  
  const queue: OfflineTransaction[] = JSON.parse(localStorage.getItem('gantara_offline_queue') || '[]');
  const newTx: OfflineTransaction = {
    id: Math.random().toString(36).substring(7),
    url,
    method: options.method || 'POST',
    body: typeof options.body === 'string' ? options.body : '',
    timestamp: Date.now()
  };
  queue.push(newTx);
  localStorage.setItem('gantara_offline_queue', JSON.stringify(queue));
  
  // Trigger event custom agar UI banner tahu ada antrean baru
  window.dispatchEvent(new Event('offline-queue-updated'));
}
