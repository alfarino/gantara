'use client';
import React, { useState, useMemo, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/ProgressBar';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface EventBencana {
  id: string;
  nama: string;
  tipe: string;
  status: string;
  lokasi: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  deskripsi: string | null;
  kk_terdampak: number;
  posko_aktif: number;
  relawan_aktif: number;
  logistik_persen: number;
}

interface PoskoInfo {
  id: string;
  nama: string;
  tipe: string;
  status: string;
  jumlah_pengungsi: number;
}

interface TimelineItem {
  tanggal: string;
  tipe: string;
  deskripsi: string;
}

interface EventDetail {
  id: string;
  nama: string;
  tipe: string;
  status: string;
  lokasi: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  deskripsi: string | null;
  kk_terdampak: number;
  posko_aktif: number;
  relawan_aktif: number;
  logistik_persen: number;
  posko: PoskoInfo[];
  timeline: TimelineItem[];
}

const TIPE_BENCANA_OPTIONS = [
  { value: 'GEMPA_BUMI', label: 'Gempa Bumi' },
  { value: 'BANJIR', label: 'Banjir' },
  { value: 'LONGSOR', label: 'Tanah Longsor' },
  { value: 'ERUPSI', label: 'Erupsi Gunung Api' },
  { value: 'KEBAKARAN', label: 'Kebakaran' },
  { value: 'TSUNAMI', label: 'Tsunami' },
  { value: 'ANGIN_TOPAN', label: 'Angin Topan' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

const STATUS_BENCANA_OPTIONS = [
  { value: 'KRITIS', label: 'Kritis' },
  { value: 'SIAGA', label: 'Siaga' },
  { value: 'WASPADA', label: 'Waspada' },
  { value: 'SELESAI', label: 'Selesai' },
];

export default function EventBencanaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'RELAWAN_DATA') {
        alert('Akses ditolak. Anda tidak berwenang untuk mengakses halaman manajemen bencana.');
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // State for Lists & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // SWR for events list
  const { data: eventsRes, error: eventsErr, isLoading: listLoading } = useSWR('/api/event', fetcher);
  const events: EventBencana[] = eventsRes?.success ? eventsRes.data : [];

  // Active & Completed Events Filtering
  const activeEvents = useMemo(() => {
    return events.filter(e => e.tanggal_selesai === null);
  }, [events]);

  const completedEvents = useMemo(() => {
    return events.filter(e => {
      if (e.tanggal_selesai === null) return false;

      // Filter by search query
      if (searchQuery && !e.nama.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by year
      if (filterYear) {
        const year = new Date(e.tanggal_mulai).getFullYear().toString();
        if (year !== filterYear) return false;
      }

      return true;
    });
  }, [events, searchQuery, filterYear]);

  // Year options for filter dropdown (based on completed events years)
  const yearOptions = useMemo(() => {
    const years = events
      .filter(e => e.tanggal_selesai !== null)
      .map(e => new Date(e.tanggal_mulai).getFullYear().toString());
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
    return uniqueYears.map(yr => ({ value: yr, label: yr }));
  }, [events]);

  // Details Modal State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { data: detailRes, isLoading: detailLoading } = useSWR(
    selectedEventId ? `/api/event/${selectedEventId}` : null,
    fetcher
  );
  const eventDetail: EventDetail | null = detailRes?.success ? detailRes.data : null;

  // Modals Open/Close State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Form State
  const [addNama, setAddNama] = useState('');
  const [addTipe, setAddTipe] = useState('GEMPA_BUMI');
  const [addStatus, setAddStatus] = useState('SIAGA');
  const [addLokasi, setAddLokasi] = useState('');
  const [addTanggalMulai, setAddTanggalMulai] = useState('');
  const [addDeskripsi, setAddDeskripsi] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Form State
  const [editId, setEditId] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editTipe, setEditTipe] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editLokasi, setEditLokasi] = useState('');
  const [editTanggalMulai, setEditTanggalMulai] = useState('');
  const [editTanggalSelesai, setEditTanggalSelesai] = useState('');
  const [editDeskripsi, setEditDeskripsi] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  const resetAddForm = () => {
    setAddNama('');
    setAddTipe('GEMPA_BUMI');
    setAddStatus('SIAGA');
    setAddLokasi('');
    setAddTanggalMulai('');
    setAddDeskripsi('');
    setAddError('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNama || !addTipe || !addStatus || !addLokasi || !addTanggalMulai) {
      setAddError('Semua field wajib wajib diisi kecuali deskripsi.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const res = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: addNama,
          tipe: addTipe,
          status: addStatus,
          lokasi: addLokasi,
          tanggal_mulai: new Date(addTanggalMulai).toISOString(),
          deskripsi: addDeskripsi || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        resetAddForm();
        mutate('/api/event');
      } else {
        setAddError(data.error || 'Gagal menambahkan event.');
      }
    } catch {
      setAddError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (evt: EventBencana) => {
    setEditId(evt.id);
    setEditNama(evt.nama);
    setEditTipe(evt.tipe);
    setEditStatus(evt.status);
    setEditLokasi(evt.lokasi);
    setEditTanggalMulai(evt.tanggal_mulai.substring(0, 16)); // Format for datetime-local input
    setEditTanggalSelesai(evt.tanggal_selesai ? evt.tanggal_selesai.substring(0, 16) : '');
    setEditDeskripsi(evt.deskripsi || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNama || !editTipe || !editStatus || !editLokasi || !editTanggalMulai) {
      setEditError('Semua field wajib wajib diisi.');
      return;
    }

    setIsEditing(true);
    setEditError('');

    // If status is set to SELESAI, make sure a tanggalSelesai is provided or set it to now
    let finalTanggalSelesai = editTanggalSelesai ? new Date(editTanggalSelesai).toISOString() : null;
    if (editStatus === 'SELESAI' && !finalTanggalSelesai) {
      finalTanggalSelesai = new Date().toISOString();
    } else if (editStatus !== 'SELESAI') {
      finalTanggalSelesai = null;
    }

    try {
      const res = await fetch(`/api/event/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: editNama,
          tipe: editTipe,
          status: editStatus,
          lokasi: editLokasi,
          tanggal_mulai: new Date(editTanggalMulai).toISOString(),
          tanggal_selesai: finalTanggalSelesai,
          deskripsi: editDeskripsi || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        mutate('/api/event');
        if (selectedEventId === editId) {
          mutate(`/api/event/${editId}`);
        }
      } else {
        setEditError(data.error || 'Gagal memperbarui event.');
      }
    } catch {
      setEditError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setIsEditing(false);
    }
  };

  const friendlyTipe = (tipe: string) => {
    const matched = TIPE_BENCANA_OPTIONS.find(opt => opt.value === tipe);
    return matched ? matched.label : tipe;
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case 'KRITIS': return 'border-t-4 border-danger';
      case 'SIAGA': return 'border-t-4 border-warning';
      case 'WASPADA': return 'border-t-4 border-[#F59E0B]';
      default: return 'border-t border-gray-100';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manajemen Kejadian Bencana</h1>
          <p className="text-sm text-gray-500">Kendalikan data bencana aktif, tingkat keparahan, dan logistik posko.</p>
        </div>
        {isSuperAdmin && (
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Tambah Event Baru
          </Button>
        )}
      </div>

      {listLoading && (
        <div className="text-center py-12 text-gray-500">
          <span className="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
          <p className="text-sm mt-2">Memuat daftar kejadian...</p>
        </div>
      )}

      {/* Grid Kejadian Aktif */}
      {!listLoading && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-heading text-gray-900">Kejadian Aktif</h2>
          {activeEvents.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl text-gray-300">verified_user</span>
              <p className="text-sm mt-2 font-semibold">Tidak ada kejadian bencana aktif saat ini.</p>
              <p className="text-xs text-gray-400">Semua keadaan terpantau aman dan terkendali.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeEvents.map((evt) => (
                <Card key={evt.id} className={`flex flex-col justify-between overflow-hidden relative ${getBorderColor(evt.status)}`}>
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      {evt.status === 'KRITIS' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/25 animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                          </span>
                          Status: Kritis
                        </span>
                      ) : evt.status === 'SIAGA' ? (
                        <Badge variant="warning">Status: Siaga</Badge>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-heading font-semibold bg-[#F59E0B]/10 text-[#F59E0B]">
                          Status: Waspada
                        </span>
                      )}
                      <span className="text-xs font-bold text-primary font-heading px-2 py-0.5 rounded bg-primary/5 uppercase">{friendlyTipe(evt.tipe)}</span>
                    </div>

                    {/* Title & Info */}
                    <div>
                      <h3 className="text-base font-bold font-heading text-gray-900 line-clamp-1">{evt.nama}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span> {evt.lokasi}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span> Mulai: {formatDate(evt.tanggal_mulai)}
                      </p>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-btn text-center">
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Terdampak</p>
                        <p className="text-sm font-bold text-gray-800">{evt.kk_terdampak} KK</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Posko</p>
                        <p className="text-sm font-bold text-gray-800">{evt.posko_aktif} Aktif</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Relawan</p>
                        <p className="text-sm font-bold text-gray-800">{evt.relawan_aktif} Jiwa</p>
                      </div>
                    </div>

                    {/* Logistik Progress Bar */}
                    <div className="space-y-1">
                      <ProgressBar
                        value={evt.logistik_persen}
                        color={evt.logistik_persen < 30 ? 'danger' : evt.logistik_persen < 60 ? 'warning' : 'success'}
                        label="Kecukupan Logistik Posko"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-5 pt-4 border-t border-gray-50">
                    <Button variant="secondary" className="flex-1 h-10 min-h-0 text-xs py-0" onClick={() => setSelectedEventId(evt.id)}>
                      <span className="material-symbols-outlined text-xs">info</span> Detail
                    </Button>
                    {isSuperAdmin && (
                      <Button variant="primary" className="flex-1 h-10 min-h-0 text-xs py-0" onClick={() => handleOpenEdit(evt)}>
                        <span className="material-symbols-outlined text-xs">edit</span> Update
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section Riwayat Event Selesai */}
      {!listLoading && (
        <Card className="p-5 space-y-6">
          <div>
            <h2 className="text-lg font-bold font-heading text-gray-900">Riwayat Event Selesai</h2>
            <p className="text-xs text-gray-400 mt-0.5">Arsip data kejadian bencana lama yang sudah selesai ditangani.</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input
                placeholder="Cari nama bencana..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                placeholder="Semua Tahun"
                options={yearOptions}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              />
            </div>
          </div>

          {/* Table / List Items */}
          {completedEvents.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6 italic">Tidak ada riwayat bencana selesai yang cocok.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {completedEvents.map((evt) => (
                <div key={evt.id} className="py-4 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                      <span className="material-symbols-outlined text-xl">history</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{evt.nama}</h4>
                        <Badge variant="neutral">Selesai</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {evt.lokasi} • Periode: {formatDate(evt.tanggal_mulai).split(',')[0]} - {evt.tanggal_selesai ? formatDate(evt.tanggal_selesai).split(',')[0] : 'Selesai'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Statistik: {evt.kk_terdampak} KK • {evt.posko_aktif} Posko • {evt.relawan_aktif} Relawan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="h-9 min-h-0 px-4 text-xs" onClick={() => setSelectedEventId(evt.id)}>
                      Detail
                    </Button>
                    <a href={`/laporan?event=${evt.id}`}>
                      <Button variant="primary" className="h-9 min-h-0 px-4 text-xs bg-success hover:bg-success/90">
                        <span className="material-symbols-outlined text-sm">download</span> Laporan Akhir
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ===== MODAL: TAMBAH EVENT ===== */}
      <Modal title="Tambah Event Bencana Baru" open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Nama Bencana *"
            placeholder="Contoh: Gempa M 6.2 Padang"
            value={addNama}
            onChange={(e) => setAddNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipe Bencana *"
              options={TIPE_BENCANA_OPTIONS}
              value={addTipe}
              onChange={(e) => setAddTipe(e.target.value)}
            />
            <Select
              label="Status Tingkat Keparahan *"
              options={STATUS_BENCANA_OPTIONS.filter(opt => opt.value !== 'SELESAI')}
              value={addStatus}
              onChange={(e) => setAddStatus(e.target.value)}
            />
          </div>
          <Input
            label="Lokasi Kejadian *"
            placeholder="Contoh: Kota Padang, Sumatra Barat"
            value={addLokasi}
            onChange={(e) => setAddLokasi(e.target.value)}
            required
          />
          <Input
            label="Tanggal & Waktu Mulai *"
            type="datetime-local"
            value={addTanggalMulai}
            onChange={(e) => setAddTanggalMulai(e.target.value)}
            required
          />
          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Deskripsi Bencana</label>
            <textarea
              className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detail deskripsi bencana..."
              value={addDeskripsi}
              onChange={(e) => setAddDeskripsi(e.target.value)}
            />
          </div>

          {addError && (
            <p className="text-xs text-danger font-semibold">{addError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isAdding}>
              {isAdding ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: EDIT/UPDATE EVENT ===== */}
      <Modal title="Update Data Bencana" open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Nama Bencana *"
            value={editNama}
            onChange={(e) => setEditNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipe Bencana *"
              options={TIPE_BENCANA_OPTIONS}
              value={editTipe}
              onChange={(e) => setEditTipe(e.target.value)}
            />
            <Select
              label="Status Tingkat Keparahan *"
              options={STATUS_BENCANA_OPTIONS}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            />
          </div>
          <Input
            label="Lokasi Kejadian *"
            value={editLokasi}
            onChange={(e) => setEditLokasi(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tanggal Mulai *"
              type="datetime-local"
              value={editTanggalMulai}
              onChange={(e) => setEditTanggalMulai(e.target.value)}
              required
            />
            <Input
              label="Tanggal Selesai"
              type="datetime-local"
              value={editTanggalSelesai}
              onChange={(e) => setEditTanggalSelesai(e.target.value)}
              disabled={editStatus !== 'SELESAI'}
            />
          </div>
          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Deskripsi Bencana</label>
            <textarea
              className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              placeholder="Detail deskripsi..."
              value={editDeskripsi}
              onChange={(e) => setEditDeskripsi(e.target.value)}
            />
          </div>

          {editError && (
            <p className="text-xs text-danger font-semibold">{editError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isEditing}>
              {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: DETAIL BENCANA ===== */}
      <Modal
        title={eventDetail ? `Detail Bencana: ${eventDetail.nama}` : 'Detail Bencana'}
        open={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
      >
        {detailLoading && (
          <div className="text-center py-8 text-gray-500">
            <span className="animate-spin material-symbols-outlined text-2xl">progress_activity</span>
            <p className="text-xs mt-2">Memuat detail...</p>
          </div>
        )}

        {!detailLoading && eventDetail && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* General Info */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={eventDetail.status === 'KRITIS' ? 'danger' : eventDetail.status === 'SIAGA' ? 'warning' : 'primary'}>
                  Status: {eventDetail.status}
                </Badge>
                <span className="text-xs font-bold text-primary font-heading px-2 py-0.5 rounded bg-primary/5 uppercase">
                  {friendlyTipe(eventDetail.tipe)}
                </span>
              </div>
              <p className="text-sm text-gray-600"><span className="font-bold">Lokasi:</span> {eventDetail.lokasi}</p>
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Mulai:</span> {formatDate(eventDetail.tanggal_mulai)}
                {eventDetail.tanggal_selesai && (
                  <> • <span className="font-semibold">Selesai:</span> {formatDate(eventDetail.tanggal_selesai)}</>
                )}
              </p>
              {eventDetail.deskripsi && (
                <div className="bg-gray-50 p-3 rounded-btn text-xs text-gray-600 italic mt-2">
                  {eventDetail.deskripsi}
                </div>
              )}
            </div>

            {/* Aggregated Stats */}
            <div className="grid grid-cols-3 gap-3 text-center border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">KK Terdampak</p>
                <p className="text-lg font-bold text-gray-900">{eventDetail.kk_terdampak}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Posko Aktif</p>
                <p className="text-lg font-bold text-gray-900">{eventDetail.posko_aktif}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Relawan Aktif</p>
                <p className="text-lg font-bold text-gray-900">{eventDetail.relawan_aktif}</p>
              </div>
            </div>

            {/* Posko list */}
            <div className="space-y-3">
              <h4 className="font-heading font-bold text-sm text-gray-900">Daftar Posko Terkait</h4>
              {eventDetail.posko.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada posko terdaftar untuk bencana ini.</p>
              ) : (
                <div className="space-y-2">
                  {eventDetail.posko.map(p => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded-btn flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-gray-900">{p.nama}</p>
                        <p className="text-gray-500">Tipe: {p.tipe.replace(/_/g, ' ')} • Pengungsi: {p.jumlah_pengungsi} Jiwa</p>
                      </div>
                      <Badge variant={p.status === 'OPERASIONAL' ? 'success' : p.status === 'PENUH' ? 'warning' : 'neutral'}>
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4 pt-2">
              <h4 className="font-heading font-bold text-sm text-gray-900">Timeline Perkembangan</h4>
              <div className="relative border-l border-gray-200 ml-2.5 pl-4 space-y-5">
                {eventDetail.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle marker */}
                    <span className={`absolute -left-[21px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                      item.tipe === 'MULAI' ? 'bg-primary' : item.tipe === 'SELESAI' ? 'bg-success' : 'bg-tertiary'
                    }`} />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400">{formatDate(item.tanggal)}</p>
                      <p className="text-xs text-gray-700 mt-0.5">{item.deskripsi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setSelectedEventId(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
