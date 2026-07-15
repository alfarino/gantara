'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

// Register ChartJS
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardHome() {
  const { user } = useAuth();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqItem, setReqItem] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  // SWR fetching
  const { data: statsRes, error: statsErr } = useSWR('/api/dashboard/stats', fetcher);
  const { data: trendRes } = useSWR('/api/dashboard/distribusi-trend', fetcher);
  const { data: stokRes } = useSWR('/api/dashboard/stok-logistik', fetcher);
  const { data: aktivitasRes } = useSWR('/api/dashboard/aktivitas', fetcher);
  const { data: eventsRes } = useSWR('/api/event', fetcher);

  const stats = statsRes?.success ? statsRes.data : null;
  const trendData = trendRes?.success ? trendRes.data : [];
  const stokItems = stokRes?.success ? stokRes.data : [];
  const aktivitas = aktivitasRes?.success ? aktivitasRes.data : [];
  const activeEvent = eventsRes?.success 
    ? eventsRes.data.find((e: any) => e.status === 'KRITIS') 
    : null;

  const handleRequestStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSuccessMsg('Permintaan pengiriman stok berhasil diajukan!');
    setReqItem('');
    setReqQty('');
    setReqNotes('');
    setTimeout(() => {
      setRequestSuccessMsg('');
      setIsRequestModalOpen(false);
    }, 2000);
  };

  // Chart setup
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#EEF1F5',
        },
        ticks: {
          color: '#6B7B8D',
          font: {
            family: 'Inter',
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7B8D',
          font: {
            family: 'Plus Jakarta Sans',
            weight: 600,
          },
        },
      },
    },
  };

  const chartData = {
    labels: trendData.map((d: any) => d.hari) || [],
    datasets: [
      {
        label: 'Distribusi',
        data: trendData.map((d: any) => d.jumlah) || [],
        backgroundColor: '#0056C9',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-gray-900">
          Selamat Datang, {user?.namaLengkap || 'User'}!
        </h1>
        <p className="text-sm text-gray-500">
          {user?.role === 'SUPER_ADMIN' 
            ? 'Panel Pemantauan Global tanggap darurat bencana GANTARA.' 
            : `Panel Pemantauan Posko: ${user?.role?.replace(/_/g, ' ')}.`}
        </p>
      </div>

      {/* 2. Banner Alert Peringatan Darurat */}
      {activeEvent && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-card flex items-center justify-between animate-pulse mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-danger text-2xl">error</span>
            <div>
              <h4 className="font-heading font-bold text-sm">
                Status Darurat Bencana Aktif: {activeEvent.nama}
              </h4>
              <p className="text-xs opacity-90">
                Lokasi: {activeEvent.lokasi}. Posko diinstruksikan mempercepat pendataan dan distribusi logistik darurat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Grid Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total KK Terdampak"
          value={stats ? `${stats.totalKkTerdampak} KK` : '...'}
          icon="group"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Distribusi Hari Ini"
          value={stats ? `${stats.distribusiHariIni} Transaksi` : '...'}
          icon="volunteer_activism"
          iconBg="bg-blueLight"
        />
        <StatCard
          title="Relawan Aktif"
          value={stats ? `${stats.relawanAktif} Jiwa` : '...'}
          icon="support_agent"
          iconBg="bg-success/10"
        />
        <StatCard
          title="QR Scan (24 Jam)"
          value={stats ? `${stats.qrScan24Jam} Scan` : '...'}
          icon="qr_code_scanner"
          iconBg="bg-tertiary/10"
        />
      </div>

      {/* 4. Layout Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Trend (Kiri) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-base text-gray-900">
                Tren Distribusi Bantuan (7 Hari)
              </h3>
              <span className="text-xs text-gray-500">Frekuensi penyaluran harian</span>
            </div>
            <div className="flex-1 min-h-[250px] relative">
              {trendData.length > 0 ? (
                <Bar options={chartOptions as any} data={chartData} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                  Memuat grafik...
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Level Stok Logistik (Kanan) */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-base text-gray-900">
                  Ketersediaan Stok Logistik
                </h3>
                <span className="text-xs font-semibold text-primary">Utama</span>
              </div>
              <div className="space-y-4">
                {stokItems.length > 0 ? (
                  stokItems.map((item: any) => {
                    const progressColor = 
                      item.status === 'KRITIS' ? 'danger' :
                      item.status === 'MENIPIS' ? 'warning' : 'success';
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-900">{item.barang}</span>
                          <span className={`text-${progressColor === 'warning' ? 'tertiary' : progressColor}`}>
                            {item.stok} ({item.status})
                          </span>
                        </div>
                        <ProgressBar value={item.persen} color={progressColor} />
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">Memuat stok...</p>
                )}
              </div>
            </div>
            <Button 
              variant="primary" 
              className="w-full mt-6"
              onClick={() => setIsRequestModalOpen(true)}
            >
              <span className="material-symbols-outlined text-sm">local_shipping</span>
              Ajukan Permintaan Stok
            </Button>
          </Card>
        </div>
      </div>

      {/* 5. Linimasa Aktivitas Terkini */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-base text-gray-900">
            Aktivitas Terkini Posko
          </h3>
          <span className="text-xs text-gray-500 font-semibold">Live logs</span>
        </div>
        <div className="relative border-l border-gray-100 pl-6 space-y-6">
          {aktivitas.length > 0 ? (
            aktivitas.map((log: any) => {
              const dotColor = 
                log.tipe === 'DARURAT' ? 'bg-danger' :
                log.tipe === 'VERIFIKASI' ? 'bg-success' : 'bg-primary';
              return (
                <div key={log.id} className="relative">
                  {/* Dot */}
                  <span className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${dotColor}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{log.deskripsi}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{log.waktu}</span>
                      <span>•</span>
                      <span>Petugas: {log.petugas}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-400 py-2">Belum ada aktivitas tercatat di posko ini.</p>
          )}
        </div>
      </Card>

      {/* Modal Ajukan Permintaan Stok */}
      <Modal 
        title="Ajukan Pengiriman Stok Logistik" 
        open={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)}
      >
        {requestSuccessMsg ? (
          <div className="py-8 text-center text-success flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl animate-bounce">check_circle</span>
            <p className="font-heading font-semibold">{requestSuccessMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleRequestStockSubmit} className="space-y-4">
            <Select 
              label="Nama Barang Logistik"
              options={[
                { value: 'Beras (Karung 10kg)', label: 'Beras (Karung 10kg)' },
                { value: 'Air Bersih (Galon)', label: 'Air Bersih (Galon)' },
                { value: 'Obat-obatan PPPK', label: 'Obat-obatan PPPK' },
                { value: 'Selimut & Matras', label: 'Selimut & Matras' },
                { value: 'Makanan Instan (Dus)', label: 'Makanan Instan (Dus)' }
              ]}
              value={reqItem}
              onChange={(e) => setReqItem(e.target.value)}
              placeholder="Pilih barang..."
              required
            />
            <Input 
              label="Kuantitas yang Dibutuhkan"
              type="text"
              placeholder="Contoh: 50 Karung, 20 Galon"
              value={reqQty}
              onChange={(e) => setReqQty(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="font-heading font-semibold text-sm text-gray-900">Catatan Tambahan</label>
              <textarea 
                className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                placeholder="Deskripsikan alasan atau urgensi barang..."
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsRequestModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Kirim Permintaan
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
