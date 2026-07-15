'use client';
import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/ProgressBar';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UserInPosko {
  id: string;
  namaLengkap: string;
  fotoUrl: string | null;
  role: string;
}

interface Posko {
  id: string;
  nama: string;
  tipe: string;
  alamat: string;
  jumlah_pengungsi: number;
  status: string;
  eventBencanaId: string;
  users: UserInPosko[];
}

interface InventoriItem {
  id: string;
  nama_barang: string;
  satuan: string;
  stok_saat_ini: number;
  stok_maksimum: number;
  kebutuhan_harian: number;
  status: 'KRITIS' | 'MENIPIS' | 'AMAN';
}

const NAMA_BARANG_OPTIONS = [
  { value: 'Beras (Karung 10kg)', label: 'Beras (Karung 10kg)' },
  { value: 'Air Bersih (Galon)', label: 'Air Bersih (Galon)' },
  { value: 'Obat-obatan PPPK', label: 'Obat-obatan PPPK' },
  { value: 'Selimut Hangat', label: 'Selimut Hangat' },
  { value: 'Tenda Darurat', label: 'Tenda Darurat' },
  { value: 'Pakaian Layak Pakai', label: 'Pakaian Layak Pakai' },
  { value: 'Susu & Makanan Bayi', label: 'Susu & Makanan Bayi' },
];

const TIPE_POSKO_OPTIONS = [
  { value: 'UTAMA', label: 'Posko Utama' },
  { value: 'BANTUAN', label: 'Posko Bantuan' },
  { value: 'MEDIS', label: 'Posko Medis' },
  { value: 'DAPUR_UMUM', label: 'Dapur Umum' },
];

const STATUS_POSKO_OPTIONS = [
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'PENUH', label: 'Penuh' },
  { value: 'DITUTUP', label: 'Ditutup' },
];

export default function PoskoPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // 1. Fetch Posko List
  const { data: poskoRes, error: poskoErr, isLoading: isPoskosLoading } = useSWR('/api/posko', fetcher);
  const poskos: Posko[] = poskoRes?.success ? poskoRes.data : [];

  // Selected Posko state
  const [selectedPoskoId, setSelectedPoskoId] = useState<string | null>(null);

  // Set default selected posko
  useEffect(() => {
    if (poskos.length > 0 && !selectedPoskoId) {
      if (user?.poskoId) {
        // If user is assigned to a posko, select it
        setSelectedPoskoId(user.poskoId);
      } else {
        // Default to first posko
        setSelectedPoskoId(poskos[0].id);
      }
    }
  }, [poskos, user, selectedPoskoId]);

  // Find currently selected posko object
  const activePosko = useMemo(() => {
    return poskos.find(p => p.id === selectedPoskoId) || null;
  }, [poskos, selectedPoskoId]);

  // 2. Fetch Selected Posko's Inventory
  const { data: inventoriRes, isLoading: isInventoriLoading } = useSWR(
    selectedPoskoId ? `/api/posko/${selectedPoskoId}/inventori` : null,
    fetcher
  );
  const inventori: InventoriItem[] = inventoriRes?.success ? inventoriRes.data : [];

  // Timestamp of last update
  const [lastUpdated, setLastUpdated] = useState<string>('');
  useEffect(() => {
    if (inventori.length > 0) {
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [inventori]);

  // 3. Search and filter for inventory
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const filteredInventori = useMemo(() => {
    if (!invSearchQuery) return inventori;
    return inventori.filter(item =>
      item.nama_barang.toLowerCase().includes(invSearchQuery.toLowerCase())
    );
  }, [inventori, invSearchQuery]);

  // Separate inventory by warning status
  const criticalItems = useMemo(() => {
    return filteredInventori.filter(item => item.status === 'KRITIS' || item.status === 'MENIPIS');
  }, [filteredInventori]);

  const safeItems = useMemo(() => {
    return filteredInventori.filter(item => item.status === 'AMAN');
  }, [filteredInventori]);

  // Modals state
  const [isAddPoskoOpen, setIsAddPoskoOpen] = useState(false);
  const [isMutasiOpen, setIsMutasiOpen] = useState(false);

  // Add Posko Form State
  const [addNama, setAddNama] = useState('');
  const [addTipe, setAddTipe] = useState('UTAMA');
  const [addAlamat, setAddAlamat] = useState('');
  const [addEventId, setAddEventId] = useState('');
  const [addStatus, setAddStatus] = useState('OPERASIONAL');
  const [addError, setAddError] = useState('');
  const [isAddingPosko, setIsAddingPosko] = useState(false);

  // Fetch active events for Add Posko modal
  const { data: eventsRes } = useSWR(isAddPoskoOpen ? '/api/event' : null, fetcher);
  const activeEvents = useMemo(() => {
    const list = eventsRes?.success ? eventsRes.data : [];
    return list.filter((e: any) => e.tanggal_selesai === null);
  }, [eventsRes]);

  // Mutasi Form State
  const [mutasiBarang, setMutasiBarang] = useState('Beras (Karung 10kg)');
  const [mutasiBarangCustom, setMutasiBarangCustom] = useState('');
  const [mutasiType, setMutasiType] = useState<'IN' | 'OUT'>('IN');
  const [mutasiJumlah, setMutasiJumlah] = useState('');
  const [mutasiCatatan, setMutasiCatatan] = useState('');
  const [mutasiError, setMutasiError] = useState('');
  const [isSubmittingMutasi, setIsSubmittingMutasi] = useState(false);

  // Check mutation access (RBAC)
  const canMutate = useMemo(() => {
    if (!user || !selectedPoskoId) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'KEPALA_POSKO' && user.poskoId === selectedPoskoId) return true;
    return false;
  }, [user, selectedPoskoId]);

  const handleAddPoskoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNama || !addTipe || !addAlamat || !addEventId || !addStatus) {
      setAddError('Semua field wajib diisi.');
      return;
    }

    setIsAddingPosko(true);
    setAddError('');

    try {
      const res = await fetch('/api/posko', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: addNama,
          tipe: addTipe,
          alamat: addAlamat,
          eventBencanaId: addEventId,
          status: addStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddPoskoOpen(false);
        setAddNama('');
        setAddAlamat('');
        setAddEventId('');
        mutate('/api/posko');
      } else {
        setAddError(data.error || 'Gagal menambahkan posko.');
      }
    } catch {
      setAddError('Koneksi terganggu. Coba lagi.');
    } finally {
      setIsAddingPosko(false);
    }
  };

  const handleMutasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItemName = mutasiBarang === 'LAINNYA' ? mutasiBarangCustom.trim() : mutasiBarang;
    const qty = parseInt(mutasiJumlah, 10);

    if (!finalItemName) {
      setMutasiError('Nama barang wajib ditentukan.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setMutasiError('Jumlah barang wajib berupa angka positif.');
      return;
    }

    setIsSubmittingMutasi(true);
    setMutasiError('');

    try {
      const res = await fetch(`/api/posko/${selectedPoskoId}/inventori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_barang: finalItemName,
          tipe_mutasi: mutasiType,
          jumlah: qty,
          catatan: mutasiCatatan || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsMutasiOpen(false);
        setMutasiJumlah('');
        setMutasiCatatan('');
        setMutasiBarang('Beras (Karung 10kg)');
        setMutasiBarangCustom('');
        // Refresh inventory data
        mutate(`/api/posko/${selectedPoskoId}/inventori`);
      } else {
        setMutasiError(data.error || 'Gagal menyimpan transaksi.');
      }
    } catch {
      setMutasiError('Koneksi terganggu. Coba lagi.');
    } finally {
      setIsSubmittingMutasi(false);
    }
  };

  const calculatePercent = (item: InventoriItem) => {
    if (item.stok_maksimum <= 0) return 0;
    return Math.round((item.stok_saat_ini / item.stok_maksimum) * 100);
  };

  const handlePlaceholderRequest = () => {
    alert('Fitur ini belum tersedia (Placeholder MVP untuk pengiriman logistik antar posko).');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Posko & Inventori Logistik</h1>
          <p className="text-sm text-gray-500">Pilih posko pengungsian untuk melihat dan mengelola sirkulasi logistik bantuan.</p>
        </div>
        {isSuperAdmin && (
          <Button variant="primary" onClick={() => setIsAddPoskoOpen(true)}>
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Tambah Posko Baru
          </Button>
        )}
      </div>

      {isPoskosLoading && (
        <div className="text-center py-12 text-gray-500">
          <span className="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
          <p className="text-sm mt-2">Memuat daftar posko...</p>
        </div>
      )}

      {/* SECTION 1: POSKO GRID SECTOR */}
      {!isPoskosLoading && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold font-heading text-gray-400 uppercase tracking-wider">Daftar Posko Aktif</h2>
          {poskos.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl text-gray-300">holiday_village</span>
              <p className="text-sm mt-2 font-semibold">Belum ada posko terdaftar.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {poskos.map((posko) => {
                const isUserPosko = user?.poskoId === posko.id;
                const isSelected = selectedPoskoId === posko.id;

                return (
                  <div
                    key={posko.id}
                    onClick={() => setSelectedPoskoId(posko.id)}
                    className={`cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                      isSelected ? 'opacity-100 scale-[1.01]' : 'opacity-85'
                    }`}
                  >
                    <Card
                      className={`relative flex flex-col justify-between h-full min-h-[160px] overflow-hidden ${
                        isUserPosko 
                          ? 'border-2 border-primary shadow-md' 
                          : isSelected 
                          ? 'border-2 border-gray-400 shadow-sm'
                          : 'border border-gray-100'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={posko.status === 'OPERASIONAL' ? 'success' : posko.status === 'PENUH' ? 'warning' : 'neutral'}>
                            {posko.status}
                          </Badge>
                          {isUserPosko && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-heading bg-primary text-white">
                              Posko Anda
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold font-heading text-gray-900 line-clamp-1">{posko.nama}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{posko.alamat}</p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-xs">group</span>
                            {posko.jumlah_pengungsi} Pengungsi Terdampak
                          </p>
                        </div>
                      </div>

                      {/* Avatar Stack for Volunteers */}
                      <div className="border-t border-gray-50 pt-3 mt-4 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Petugas Lapangan:</span>
                        {posko.users.length > 0 ? (
                          <div className="flex -space-x-2 overflow-hidden">
                            {posko.users.slice(0, 5).map((u) => (
                              <div
                                key={u.id}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0"
                                title={`${u.namaLengkap} (${u.role.replace(/_/g, ' ')})`}
                              >
                                {u.namaLengkap.slice(0, 2)}
                              </div>
                            ))}
                            {posko.users.length > 5 && (
                              <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                +{posko.users.length - 5}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Belum ada</span>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: INVENTORY DETAIL SECTION */}
      {activePosko && (
        <Card className="p-6 space-y-6">
          {/* Header detail */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Inventori Logistik Posko</span>
              <h2 className="text-xl font-bold font-heading text-gray-900 mt-0.5">{activePosko.nama}</h2>
              {lastUpdated && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Update terakhir: {lastUpdated} WIB • Alamat: {activePosko.alamat}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-48 sm:w-64">
                <Input
                  placeholder="Cari logistik..."
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                />
              </div>
              {canMutate && (
                <Button variant="primary" className="h-10 min-h-0 text-xs py-0" onClick={() => setIsMutasiOpen(true)}>
                  <span className="material-symbols-outlined text-sm">swap_horiz</span>
                  Catat Logistik
                </Button>
              )}
            </div>
          </div>

          {isInventoriLoading && (
            <div className="text-center py-8 text-gray-500">
              <span className="animate-spin material-symbols-outlined text-2xl">progress_activity</span>
              <p className="text-xs mt-1">Memuat sediaan logistik...</p>
            </div>
          )}

          {!isInventoriLoading && filteredInventori.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6 italic">Tidak ada sediaan logistik terdaftar atau cocok dengan pencarian.</p>
          )}

          {!isInventoriLoading && filteredInventori.length > 0 && (
            <div className="space-y-6">
              {/* Stok Kritis / Menipis (Barisan Teratas) */}
              {criticalItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <span className="material-symbols-outlined text-sm animate-pulse">warning</span>
                    Peringatan: Stok Menipis & Kritis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {criticalItems.map((item) => {
                      const pct = calculatePercent(item);
                      return (
                        <div key={item.id} className="p-4 border border-danger/25 bg-danger/5 rounded-card flex flex-col justify-between min-h-[120px]">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900">{item.nama_barang}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Ketersediaan: <span className="font-bold text-danger">{item.stok_saat_ini} {item.satuan}</span> / {item.stok_maksimum} {item.satuan}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-danger rounded-full uppercase tracking-wider animate-pulse">
                              Segera Isi Ulang
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            <ProgressBar value={pct} color="danger" />
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span>Sedia: {pct}%</span>
                              <button
                                onClick={handlePlaceholderRequest}
                                className="text-xs font-bold text-danger hover:underline flex items-center gap-0.5"
                              >
                                Minta Pengiriman Stok
                                <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stok Aman (Grid 2 Kolom) */}
              {safeItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-success uppercase tracking-wider font-heading">Stok Tersedia (Aman)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeItems.map((item) => {
                      const pct = calculatePercent(item);
                      return (
                        <div key={item.id} className="p-4 border border-success/15 bg-success/5 rounded-card flex flex-col justify-between min-h-[120px]">
                          <div>
                            <div className="flex items-start justify-between">
                              <h4 className="font-bold text-sm text-gray-900">{item.nama_barang}</h4>
                              <span className="px-2.5 py-0.5 text-[10px] font-bold text-success bg-success/10 rounded-full uppercase tracking-wider">
                                Aman
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Ketersediaan: <span className="font-bold text-success">{item.stok_saat_ini} {item.satuan}</span> / {item.stok_maksimum} {item.satuan}
                            </p>
                          </div>

                          <div className="mt-4 space-y-1">
                            <ProgressBar value={pct} color="success" />
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span>Sedia: {pct}%</span>
                              <span>Pake Harian: ~{item.kebutuhan_harian} {item.satuan}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ===== MODAL: TAMBAH POSKO ===== */}
      <Modal title="Tambah Posko Pengungsian Baru" open={isAddPoskoOpen} onClose={() => setIsAddPoskoOpen(false)}>
        <form onSubmit={handleAddPoskoSubmit} className="space-y-4">
          <Input
            label="Nama Posko *"
            placeholder="Contoh: Posko Utama Gurun Laweh"
            value={addNama}
            onChange={(e) => setAddNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipe Posko *"
              options={TIPE_POSKO_OPTIONS}
              value={addTipe}
              onChange={(e) => setAddTipe(e.target.value)}
            />
            <Select
              label="Status Operasional *"
              options={STATUS_POSKO_OPTIONS}
              value={addStatus}
              onChange={(e) => setAddStatus(e.target.value)}
            />
          </div>
          <Input
            label="Alamat Lengkap *"
            placeholder="Contoh: Gedung Serbaguna Gurun Laweh"
            value={addAlamat}
            onChange={(e) => setAddAlamat(e.target.value)}
            required
          />
          <Select
            label="Terhubung dengan Kejadian Bencana *"
            placeholder="Pilih Kejadian Bencana"
            options={activeEvents.map((e: any) => ({ value: e.id, label: e.nama }))}
            value={addEventId}
            onChange={(e) => setAddEventId(e.target.value)}
            required
          />

          {addError && (
            <p className="text-xs text-danger font-semibold">{addError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddPoskoOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isAddingPosko}>
              {isAddingPosko ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: MUTASI LOGISTIK (CATAT LOGISTIK) ===== */}
      <Modal title="Catat Mutasi Logistik Bantuan" open={isMutasiOpen} onClose={() => setIsMutasiOpen(false)}>
        <form onSubmit={handleMutasiSubmit} className="space-y-4">
          <Select
            label="Barang Logistik *"
            options={[...NAMA_BARANG_OPTIONS, { value: 'LAINNYA', label: 'Barang Lain (Kustom)' }]}
            value={mutasiBarang}
            onChange={(e) => setMutasiBarang(e.target.value)}
          />

          {mutasiBarang === 'LAINNYA' && (
            <Input
              label="Nama Barang Baru (Kustom) *"
              placeholder="Contoh: Tenda Keluarga, Lilin"
              value={mutasiBarangCustom}
              onChange={(e) => setMutasiBarangCustom(e.target.value)}
              required
            />
          )}

          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Tipe Transaksi Logistik *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="mutasiType"
                  value="IN"
                  checked={mutasiType === 'IN'}
                  onChange={() => setMutasiType('IN')}
                  className="h-4 w-4 text-primary"
                />
                Barang Masuk (IN)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="mutasiType"
                  value="OUT"
                  checked={mutasiType === 'OUT'}
                  onChange={() => setMutasiType('OUT')}
                  className="h-4 w-4 text-primary"
                />
                Barang Keluar (OUT)
              </label>
            </div>
          </div>

          <Input
            label="Kuantitas / Jumlah Unit *"
            placeholder="Contoh: 10"
            type="number"
            min="1"
            value={mutasiJumlah}
            onChange={(e) => setMutasiJumlah(e.target.value)}
            required
          />

          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Catatan / Asal Pengiriman (Opsional)</label>
            <textarea
              className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              placeholder="Contoh: Bantuan dari PMI Cabang Padang"
              value={mutasiCatatan}
              onChange={(e) => setMutasiCatatan(e.target.value)}
            />
          </div>

          {mutasiError && (
            <p className="text-xs text-danger font-semibold">{mutasiError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsMutasiOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmittingMutasi}>
              {isSubmittingMutasi ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
