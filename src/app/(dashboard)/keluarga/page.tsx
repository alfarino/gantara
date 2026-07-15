'use client';
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function KeluargaPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [statusVerifikasi, setStatusVerifikasi] = useState('');
  const [zonaRisiko, setZonaRisiko] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    search,
    kelurahan,
    statusVerifikasi,
    zonaRisiko
  });

  const { data: resData, error, isLoading } = useSWR(`/api/keluarga?${queryParams.toString()}`, fetcher);
  const items = resData?.success ? resData.data : [];
  const pagination = resData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((item: any) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdatingStatus(id);
    try {
      const res = await fetch(`/api/keluarga/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusVerifikasi: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        mutate(`/api/keluarga?${queryParams.toString()}`);
      } else {
        alert(data.error || 'Gagal mengubah status verifikasi');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const executeDelete = async () => {
    if (!targetDeleteId) return;
    setDeletingId(targetDeleteId);
    try {
      const res = await fetch(`/api/keluarga/${targetDeleteId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        mutate(`/api/keluarga?${queryParams.toString()}`);
        setSelectedIds(prev => prev.filter(item => item !== targetDeleteId));
        setIsDeleteOpen(false);
        setTargetDeleteId(null);
      } else {
        alert(data.error || 'Gagal menghapus data');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setDeletingId(null);
    }
  };

  const executeBulkDelete = async () => {
    try {
      const deletePromises = selectedIds.map(id =>
        fetch(`/api/keluarga/${id}`, { method: 'DELETE' }).then(res => res.json())
      );
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        alert(`Berhasil menghapus beberapa data, namun ${failed.length} data gagal dihapus.`);
      } else {
        alert('Seluruh data keluarga terpilih berhasil dihapus.');
      }
      mutate(`/api/keluarga?${queryParams.toString()}`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan sistem saat menghapus masal.');
    }
  };

  const showImportAndAdd = user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Data Pengungsi Keluarga</h1>
          <p className="text-sm text-gray-500">Kelola dan verifikasi data penduduk terdampak bencana.</p>
        </div>
        <div className="flex gap-3">
          {showImportAndAdd && (
            <>
              <Link href="/keluarga/import">
                <Button variant="secondary">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Import Data
                </Button>
              </Link>
              <Link href="/keluarga/tambah">
                <Button variant="primary">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Tambah KK Baru
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Cari NIK / Nama KK..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            icon="search"
          />
          <Select
            placeholder="Filter Kelurahan"
            options={[
              { value: 'Gurun Laweh Nan XX', label: 'Gurun Laweh Nan XX' },
              { value: 'Lubuk Begalung Nan XX', label: 'Lubuk Begalung Nan XX' },
              { value: 'Banuaran Nan XX', label: 'Banuaran Nan XX' },
              { value: 'Cengkeh Nan XX', label: 'Cengkeh Nan XX' },
              { value: 'Parak Laweh Nan XX', label: 'Parak Laweh Nan XX' },
              { value: 'Koto Lalang', label: 'Koto Lalang' }
            ]}
            value={kelurahan}
            onChange={(e) => { setKelurahan(e.target.value); setPage(1); }}
          />
          <Select
            placeholder="Status Verifikasi"
            options={[
              { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
              { value: 'MENUNGGU', label: 'Menunggu' },
              { value: 'DITOLAK', label: 'Ditolak' }
            ]}
            value={statusVerifikasi}
            onChange={(e) => { setStatusVerifikasi(e.target.value); setPage(1); }}
          />
          <Select
            placeholder="Zona Risiko"
            options={[
              { value: 'MERAH', label: 'Zona Merah (Tinggi)' },
              { value: 'KUNING', label: 'Zona Kuning (Sedang)' },
              { value: 'HIJAU', label: 'Zona Hijau (Rendah)' }
            ]}
            value={zonaRisiko}
            onChange={(e) => { setZonaRisiko(e.target.value); setPage(1); }}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="py-4 px-6">Nama Kepala Keluarga</th>
                <th className="py-4 px-6">NIK</th>
                <th className="py-4 px-6">Kelurahan</th>
                <th className="py-4 px-6">Anggota</th>
                <th className="py-4 px-6">Zona Risiko</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 w-4 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                      <div className="h-4 bg-gray-100 rounded w-24"></div>
                    </td>
                    <td className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-12"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-8 bg-gray-100 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : items.length > 0 ? (
                items.map((item: any) => {
                  const badgeColor = 
                    item.status_verifikasi === 'TERVERIFIKASI' ? 'success' :
                    item.status_verifikasi === 'DITOLAK' ? 'danger' : 'neutral';
                  const riskColor = 
                    item.zona_risiko === 'MERAH' ? 'danger' :
                    item.zona_risiko === 'KUNING' ? 'warning' : 'success';
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {item.nama_kepala_keluarga.slice(0, 2)}
                          </div>
                          <span>{item.nama_kepala_keluarga}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-600">{item.nik_kepala_keluarga}</td>
                      <td className="py-4 px-6 text-gray-600">{item.kelurahan}</td>
                      <td className="py-4 px-6 text-gray-900 font-semibold">{item.jumlah_anggota} Jiwa</td>
                      <td className="py-4 px-6">
                        <Badge variant={riskColor}>{item.zona_risiko}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={badgeColor}>{item.status_verifikasi}</Badge>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/keluarga/${item.id}`}>
                            <Button variant="secondary" className="h-8 min-h-0 px-3 text-xs">
                              Detail
                            </Button>
                          </Link>
                          
                          {(user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO') && (
                            <div className="relative group">
                              <Button variant="secondary" className="h-8 min-h-0 px-3 text-xs group">
                                Status
                                <span className="material-symbols-outlined text-xs leading-none">arrow_drop_down</span>
                              </Button>
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 rounded-card shadow-lg hidden group-hover:block z-10 py-1 text-left">
                                <button
                                  onClick={() => handleUpdateStatus(item.id, 'TERVERIFIKASI')}
                                  className="w-full text-left px-4 py-2 text-xs text-success hover:bg-gray-50 font-semibold"
                                  disabled={isUpdatingStatus === item.id}
                                >
                                  Terverifikasi
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, 'MENUNGGU')}
                                  className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 font-semibold"
                                  disabled={isUpdatingStatus === item.id}
                                >
                                  Menunggu
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, 'DITOLAK')}
                                  className="w-full text-left px-4 py-2 text-xs text-danger hover:bg-gray-50 font-semibold"
                                  disabled={isUpdatingStatus === item.id}
                                >
                                  Ditolak
                                </button>
                              </div>
                            </div>
                          )}

                          {user?.role !== 'RELAWAN_DATA' && (
                            <Button
                              variant="secondary"
                              className="h-8 min-h-0 px-3 text-xs text-danger hover:bg-danger/10 border-transparent"
                              onClick={() => {
                                setTargetDeleteId(item.id);
                                setIsDeleteOpen(true);
                              }}
                              disabled={deletingId === item.id}
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center py-6">
                      <span className="material-symbols-outlined text-gray-400 text-5xl mb-3">folder_open</span>
                      <h3 className="font-heading font-semibold text-base text-gray-900">Data Tidak Ditemukan</h3>
                      <p className="text-xs text-gray-500 max-w-xs mt-1">Silakan sesuaikan filter pencarian Anda atau tambahkan data baru.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Menampilkan Halaman {pagination.page} dari {pagination.totalPages} (Total: {pagination.total} Data)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={page === pagination.totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white py-3 px-6 rounded-full shadow-2xl flex items-center gap-6 z-50">
          <span className="text-xs font-semibold">
            {selectedIds.length} KK dipilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 border-transparent text-white px-3 py-1 text-xs font-bold"
              onClick={() => setSelectedIds([])}
            >
              Batalkan
            </Button>
            {user?.role !== 'RELAWAN_DATA' && (
              <Button
                variant="primary"
                className="bg-danger hover:bg-danger/90 border-transparent text-white px-3 py-1 text-xs font-bold"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                Hapus Masal
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRM SINGLE DELETE ===== */}
      <Modal
        title="Konfirmasi Hapus Keluarga"
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setTargetDeleteId(null);
        }}
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus data Kartu Keluarga ini secara permanen dari sistem?
          </p>
          <p className="text-xs text-gray-400">
            Tindakan ini bersifat destruktif dan akan menghapus seluruh data anggota keluarga serta riwayat penerimaan bantuan logistik yang terkait secara permanen.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => {
              setIsDeleteOpen(false);
              setTargetDeleteId(null);
            }}>
              Batal
            </Button>
            <Button variant="danger" disabled={!!deletingId} onClick={executeDelete}>
              {deletingId ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: CONFIRM BULK DELETE ===== */}
      <Modal
        title="Konfirmasi Hapus Masal Keluarga"
        open={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus secara permanen <span className="font-bold text-danger">{selectedIds.length}</span> data Kartu Keluarga yang Anda pilih?
          </p>
          <p className="text-xs text-gray-400">
            Seluruh data anggota keluarga dan seluruh riwayat transaksi logistik yang terikat pada Kartu Keluarga terpilih akan ikut terhapus dari basis data GANTARA secara permanen.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsBulkDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={executeBulkDelete}>
              Ya, Hapus Masal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
