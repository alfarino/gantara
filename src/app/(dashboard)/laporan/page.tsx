'use client';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { exportToExcel, exportToPdf } from '@/lib/export';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface EventOption {
  id: string;
  nama: string;
}

interface PoskoOption {
  id: string;
  nama: string;
}

function LaporanContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect RELAWAN_DATA
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'RELAWAN_DATA') {
        alert('Akses ditolak. Anda tidak berwenang untuk mengakses halaman laporan.');
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Date Range Defaults
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter States
  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [eventBencanaId, setEventBencanaId] = useState('');
  const [poskoId, setPoskoId] = useState('');
  const [tipeLaporan, setTipeLaporan] = useState<'DISTRIBUSI' | 'STOK' | 'PENGUNGSI' | 'RELAWAN'>('DISTRIBUSI');

  // Pre-fill event from URL if present
  useEffect(() => {
    const urlEvent = searchParams.get('event');
    if (urlEvent) {
      setEventBencanaId(urlEvent);
    }
  }, [searchParams]);

  // Fetch dropdowns
  const { data: eventsRes } = useSWR('/api/event', fetcher);
  const events: EventOption[] = eventsRes?.success ? eventsRes.data : [];

  const { data: poskoRes } = useSWR('/api/posko', fetcher);
  const poskos: PoskoOption[] = poskoRes?.success ? poskoRes.data : [];

  // Lock posko if user is KEPALA_POSKO
  useEffect(() => {
    if (user && user.role === 'KEPALA_POSKO' && user.poskoId) {
      setPoskoId(user.poskoId);
    }
  }, [user]);

  const isPoskoFilterDisabled = user?.role === 'KEPALA_POSKO';

  // Fetch Report Data
  const reportQueryString = useMemo(() => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      tipeLaporan,
      poskoId,
      eventBencanaId,
    });
    return params.toString();
  }, [startDate, endDate, tipeLaporan, poskoId, eventBencanaId]);

  const { data: reportRes, isLoading: isReportLoading } = useSWR(
    `/api/laporan?${reportQueryString}`,
    fetcher
  );
  const reportData = reportRes?.success ? reportRes.data : [];

  // Format Helper for Dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Setup headers and rows mapping for UI table & Exports
  const tableConfig = useMemo(() => {
    switch (tipeLaporan) {
      case 'DISTRIBUSI':
        return {
          headers: ['No', 'Tanggal', 'Nomor KK', 'Nama Penerima', 'Jenis Bantuan', 'Kuantitas', 'Petugas', 'Posko', 'Status'],
          pdfHeaders: [['No', 'Tanggal', 'Nomor KK', 'Nama Penerima', 'Jenis Bantuan', 'Qty', 'Petugas', 'Posko', 'Status']],
          rowMapper: (item: any) => [
            item.no,
            formatDate(item.tanggal),
            item.nomor_kk,
            item.nama_penerima,
            item.jenis_bantuan,
            item.kuantitas,
            item.petugas,
            item.posko,
            item.status,
          ],
        };
      case 'STOK':
        return {
          headers: ['No', 'Posko', 'Nama Barang', 'Satuan', 'Stok Saat Ini', 'Stok Maksimum', 'Kebutuhan Harian', 'Status'],
          pdfHeaders: [['No', 'Posko', 'Nama Barang', 'Satuan', 'Stok', 'Stok Max', 'Kebutuhan', 'Status']],
          rowMapper: (item: any) => [
            item.no,
            item.posko,
            item.nama_barang,
            item.satuan,
            item.stok_saat_ini,
            item.stok_maksimum,
            item.kebutuhan_harian,
            item.status,
          ],
        };
      case 'PENGUNGSI':
        return {
          headers: ['No', 'Nomor KK', 'Nama KK', 'NIK KK', 'Alamat', 'Zona Risiko', 'Hunian', 'Status Verifikasi', 'Posko', 'Tanggal Daftar'],
          pdfHeaders: [['No', 'Nomor KK', 'Nama KK', 'NIK KK', 'Alamat', 'Risiko', 'Hunian', 'Status', 'Posko', 'Tgl Daftar']],
          rowMapper: (item: any) => [
            item.no,
            item.nomor_kk,
            item.nama_kepala_keluarga,
            item.nik_kepala_keluarga,
            item.alamat,
            item.zona_risiko,
            item.status_hunian.replace(/_/g, ' '),
            item.status_verifikasi,
            item.posko,
            formatDate(item.tanggal_pendaftaran).split(',')[0],
          ],
        };
      case 'RELAWAN':
        return {
          headers: ['No', 'Nama Lengkap', 'ID Relawan', 'Role', 'Posko', 'Scan QR', 'Bagi Bantuan', 'Verifikasi', 'Total Aksi'],
          pdfHeaders: [['No', 'Nama Lengkap', 'ID Relawan', 'Role', 'Posko', 'Scan', 'Bagi', 'Verifikasi', 'Total']],
          rowMapper: (item: any) => [
            item.no,
            item.nama_lengkap,
            item.id_relawan,
            item.role.replace(/_/g, ' '),
            item.posko,
            item.jumlah_scan,
            item.jumlah_distribusi,
            item.jumlah_verifikasi,
            item.total_aktivitas,
          ],
        };
    }
  }, [tipeLaporan]);

  // Export Trigger Actions
  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const formatted = reportData.map((item: any) => {
      // Map properties to clean sheet row
      const mapped = tableConfig.rowMapper(item);
      const rowObj: any = {};
      tableConfig.headers.forEach((h, idx) => {
        rowObj[h] = mapped[idx];
      });
      return rowObj;
    });
    exportToExcel(formatted, `Laporan_${tipeLaporan}_Gantara_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    if (reportData.length === 0) return;
    const rows = reportData.map((item: any) => tableConfig.rowMapper(item));
    const titleText = `${tipeLaporan.replace(/_/g, ' ')} LOGISTIK & PENGUNGSI`;
    exportToPdf(tableConfig.pdfHeaders, rows, titleText, `Laporan_${tipeLaporan}_Gantara`);
  };

  if (user?.role === 'RELAWAN_DATA') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-gray-900">Laporan & Ekspor Data</h1>
        <p className="text-sm text-gray-500">Filter data operasional tanggap darurat posko pengungsian untuk diekspor ke Excel atau PDF.</p>
      </div>

      {/* FILTER PANEL */}
      <Card className="p-5 space-y-4">
        <h3 className="font-heading font-bold text-sm text-gray-900 border-b border-gray-50 pb-2">Filter Data Laporan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Select
            label="Kejadian Bencana"
            placeholder="Semua Bencana"
            options={events.map(e => ({ value: e.id, label: e.nama }))}
            value={eventBencanaId}
            onChange={(e) => setEventBencanaId(e.target.value)}
          />
          <Select
            label="Posko Tugas"
            placeholder="Semua Posko"
            options={poskos.map(p => ({ value: p.id, label: p.nama }))}
            value={poskoId}
            onChange={(e) => setPoskoId(e.target.value)}
            disabled={isPoskoFilterDisabled}
          />
        </div>
      </Card>

      {/* TIPE LAPORAN RADIO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Distribusi Logistik */}
        <label className="cursor-pointer group block">
          <input
            type="radio"
            name="reportType"
            value="DISTRIBUSI"
            checked={tipeLaporan === 'DISTRIBUSI'}
            onChange={() => setTipeLaporan('DISTRIBUSI')}
            className="sr-only"
          />
          <Card
            className={`h-full flex flex-col justify-between p-5 border-2 transition-all duration-200 ${
              tipeLaporan === 'DISTRIBUSI'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="space-y-2">
              <span className={`material-symbols-outlined text-3xl ${tipeLaporan === 'DISTRIBUSI' ? 'text-primary' : 'text-gray-400'}`}>
                inventory_2
              </span>
              <h4 className="font-bold font-heading text-sm text-gray-900">Distribus Logistik</h4>
              <p className="text-xs text-gray-500">Menganalisis log bantuan logistik keluar ke masyarakat.</p>
            </div>
          </Card>
        </label>

        {/* Stok Gudang */}
        <label className="cursor-pointer group block">
          <input
            type="radio"
            name="reportType"
            value="STOK"
            checked={tipeLaporan === 'STOK'}
            onChange={() => setTipeLaporan('STOK')}
            className="sr-only"
          />
          <Card
            className={`h-full flex flex-col justify-between p-5 border-2 transition-all duration-200 ${
              tipeLaporan === 'STOK'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="space-y-2">
              <span className={`material-symbols-outlined text-3xl ${tipeLaporan === 'STOK' ? 'text-primary' : 'text-gray-400'}`}>
                warehouse
              </span>
              <h4 className="font-bold font-heading text-sm text-gray-900">Stok Gudang</h4>
              <p className="text-xs text-gray-500">Menganalisis sediaan level logistik di gudang posko.</p>
            </div>
          </Card>
        </label>

        {/* Data KK Pengungsi */}
        <label className="cursor-pointer group block">
          <input
            type="radio"
            name="reportType"
            value="PENGUNGSI"
            checked={tipeLaporan === 'PENGUNGSI'}
            onChange={() => setTipeLaporan('PENGUNGSI')}
            className="sr-only"
          />
          <Card
            className={`h-full flex flex-col justify-between p-5 border-2 transition-all duration-200 ${
              tipeLaporan === 'PENGUNGSI'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="space-y-2">
              <span className={`material-symbols-outlined text-3xl ${tipeLaporan === 'PENGUNGSI' ? 'text-primary' : 'text-gray-400'}`}>
                groups
              </span>
              <h4 className="font-bold font-heading text-sm text-gray-900">Data KK Pengungsi</h4>
              <p className="text-xs text-gray-500">Daftar kartu keluarga terdaftar di area posko bencana.</p>
            </div>
          </Card>
        </label>

        {/* Kinerja Relawan */}
        <label className="cursor-pointer group block">
          <input
            type="radio"
            name="reportType"
            value="RELAWAN"
            checked={tipeLaporan === 'RELAWAN'}
            onChange={() => setTipeLaporan('RELAWAN')}
            className="sr-only"
          />
          <Card
            className={`h-full flex flex-col justify-between p-5 border-2 transition-all duration-200 ${
              tipeLaporan === 'RELAWAN'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="space-y-2">
              <span className={`material-symbols-outlined text-3xl ${tipeLaporan === 'RELAWAN' ? 'text-primary' : 'text-gray-400'}`}>
                volunteer_activism
              </span>
              <h4 className="font-bold font-heading text-sm text-gray-900">Kinerja Relawan</h4>
              <p className="text-xs text-gray-500">Statistik jumlah scan QR & input bantuan per relawan.</p>
            </div>
          </Card>
        </label>
      </div>

      {/* PREVIEW TABLE CARD */}
      <Card className="p-5 space-y-4">
        {/* Table Toolbar Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-gray-900">Pratinjau Data Laporan</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ditemukan {reportData.length} data record laporan.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-10 min-h-0 text-xs px-4 bg-success/10 border-success/20 text-success hover:bg-success/25"
              onClick={handleExportExcel}
              disabled={reportData.length === 0}
            >
              <span className="material-symbols-outlined text-sm">grid_on</span>
              Ekspor Excel
            </Button>
            <Button
              variant="primary"
              className="h-10 min-h-0 text-xs px-4 bg-danger hover:bg-danger/90"
              onClick={handleExportPdf}
              disabled={reportData.length === 0}
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Ekspor PDF
            </Button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isReportLoading && (
          <div className="text-center py-12 text-gray-500">
            <span className="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
            <p className="text-sm mt-2">Menyusun pratinjau data...</p>
          </div>
        )}

        {/* Data Table */}
        {!isReportLoading && reportData.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12 italic">Tidak ada data pratinjau tersedia untuk filter ini.</p>
        )}

        {!isReportLoading && reportData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {tableConfig.headers.map((h, idx) => (
                    <th key={idx} className="p-3 text-gray-400 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {reportData.map((item: any, rowIdx: number) => {
                  const mappedRow = tableConfig.rowMapper(item);
                  return (
                    <tr key={rowIdx} className="hover:bg-gray-50/50 transition-all">
                      {mappedRow.map((val: any, colIdx: number) => (
                        <td key={colIdx} className="p-3 font-medium whitespace-nowrap">
                          {colIdx === 8 && tipeLaporan === 'DISTRIBUSI' ? (
                            <Badge variant={val === 'TERSALURKAN' ? 'success' : val === 'DIBATALKAN' ? 'danger' : 'warning'}>
                              {val}
                            </Badge>
                          ) : colIdx === 7 && tipeLaporan === 'STOK' ? (
                            <Badge variant={val === 'AMAN' ? 'success' : val === 'MENIPIS' ? 'warning' : 'danger'}>
                              {val}
                            </Badge>
                          ) : colIdx === 7 && tipeLaporan === 'PENGUNGSI' ? (
                            <Badge variant={val === 'TERVERIFIKASI' ? 'success' : val === 'DITOLAK' ? 'danger' : 'neutral'}>
                              {val}
                            </Badge>
                          ) : (
                            val
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function LaporanPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12 text-gray-500">
        <span className="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
        <p className="text-sm mt-2">Memuat halaman laporan...</p>
      </div>
    }>
      <LaporanContent />
    </Suspense>
  );
}
