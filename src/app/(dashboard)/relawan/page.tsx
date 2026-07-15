'use client';
import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PoskoShort {
  id: string;
  nama: string;
}

interface Volunteer {
  id: string;
  nama_lengkap: string;
  id_relawan: string | null;
  status: 'AKTIF' | 'STANDBY' | 'NONAKTIF';
  keahlian: string | null;
  posko: PoskoShort | null;
  foto_url: string | null;
}

export default function RelawanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect RELAWAN_DATA role immediately
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'RELAWAN_DATA') {
        alert('Akses ditolak. Anda tidak memiliki wewenang untuk membuka halaman manajemen relawan.');
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Lists & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPoskoId, setFilterPoskoId] = useState('');

  // SWR fetching
  const { data: relawanRes, error: relawanErr, isLoading: isListLoading } = useSWR('/api/relawan', fetcher);
  const volunteers: Volunteer[] = relawanRes?.success ? relawanRes.data : [];

  const { data: poskoRes } = useSWR('/api/posko', fetcher);
  const poskos: PoskoShort[] = poskoRes?.success ? poskoRes.data : [];

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isConfirmToggleOpen, setIsConfirmToggleOpen] = useState(false);
  const [targetVolunteer, setTargetVolunteer] = useState<Volunteer | null>(null);

  // Add Form State
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addNamaLengkap, setAddNamaLengkap] = useState('');
  const [addRole, setAddRole] = useState('RELAWAN_DATA');
  const [addPoskoId, setAddPoskoId] = useState('');
  const [addKeahlian, setAddKeahlian] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Reassign State
  const [reassignPoskoId, setReassignPoskoId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState('');

  // Statistics calculation
  const stats = useMemo(() => {
    let aktif = 0;
    let standby = 0;
    let selesai = 0;

    volunteers.forEach(v => {
      if (v.status === 'AKTIF') aktif++;
      else if (v.status === 'STANDBY') standby++;
      else if (v.status === 'NONAKTIF') selesai++;
    });

    return { aktif, standby, selesai };
  }, [volunteers]);

  // Filtered volunteers
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      // Filter by search text (name or REL-xxxx code)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = v.nama_lengkap.toLowerCase().includes(query);
        const matchesId = v.id_relawan ? v.id_relawan.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesId) return false;
      }

      // Filter by posko
      if (filterPoskoId) {
        // If filter is "standby" (represented by empty string or specific term)
        if (filterPoskoId === 'STANDBY') {
          if (v.posko !== null) return false;
        } else {
          if (!v.posko || v.posko.id !== filterPoskoId) return false;
        }
      }

      return true;
    });
  }, [volunteers, searchQuery, filterPoskoId]);

  // Year options for dropdown
  const poskoFilterOptions = useMemo(() => {
    const list = poskos.map(p => ({ value: p.id, label: p.nama }));
    return [{ value: 'STANDBY', label: 'Standby / Belum Ditugaskan' }, ...list];
  }, [poskos]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addPassword || !addNamaLengkap || !addRole) {
      setAddError('Email, password, nama lengkap, dan peran wajib diisi.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const res = await fetch('/api/relawan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail,
          password: addPassword,
          namaLengkap: addNamaLengkap,
          role: addRole,
          poskoId: addPoskoId || undefined,
          keahlian: addKeahlian || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setAddEmail('');
        setAddPassword('');
        setAddNamaLengkap('');
        setAddRole('RELAWAN_DATA');
        setAddPoskoId('');
        setAddKeahlian('');
        mutate('/api/relawan');
      } else {
        setAddError(data.error || 'Gagal mendaftarkan relawan.');
      }
    } catch {
      setAddError('Koneksi terganggu. Coba lagi.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenReassign = (v: Volunteer) => {
    setSelectedVolunteer(v);
    setReassignPoskoId(v.posko ? v.posko.id : '');
    setReassignError('');
    setIsReassignModalOpen(true);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolunteer) return;

    setIsReassigning(true);
    setReassignError('');

    try {
      const res = await fetch(`/api/relawan/${selectedVolunteer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poskoId: reassignPoskoId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsReassignModalOpen(false);
        setSelectedVolunteer(null);
        mutate('/api/relawan');
      } else {
        setReassignError(data.error || 'Gagal memindahkan relawan.');
      }
    } catch {
      setReassignError('Koneksi terganggu. Coba lagi.');
    } finally {
      setIsReassigning(false);
    }
  };

  // Quick Action for Kepala Posko: Assign Standby Relawan to his posko
  const handleAssignToMyPosko = async (v: Volunteer) => {
    if (!user?.poskoId) return;
    try {
      const res = await fetch(`/api/relawan/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poskoId: user.poskoId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        mutate('/api/relawan');
      } else {
        alert(data.error || 'Gagal menugaskan relawan.');
      }
    } catch {
      alert('Koneksi terganggu.');
    }
  };

  // Quick Action for Kepala Posko: Remove active relawan from his posko (back to standby)
  const handleRemoveFromMyPosko = async (v: Volunteer) => {
    try {
      const res = await fetch(`/api/relawan/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poskoId: null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        mutate('/api/relawan');
      } else {
        alert(data.error || 'Gagal melepaskan relawan.');
      }
    } catch {
      alert('Koneksi terganggu.');
    }
  };

  // Super Admin: Toggle keaktifan relawan (Aktif/Standby vs Nonaktif)
  const handleToggleStatus = (v: Volunteer) => {
    if (v.status !== 'NONAKTIF') {
      setTargetVolunteer(v);
      setIsConfirmToggleOpen(true);
    } else {
      executeToggleStatus(v, 'STANDBY');
    }
  };

  const executeToggleStatus = async (v: Volunteer, targetStatus: 'STANDBY' | 'NONAKTIF') => {
    try {
      const res = await fetch(`/api/relawan/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        mutate('/api/relawan');
        setIsConfirmToggleOpen(false);
        setTargetVolunteer(null);
      } else {
        alert(data.error || 'Gagal mengubah status relawan.');
      }
    } catch {
      alert('Koneksi terganggu.');
    }
  };

  if (user?.role === 'RELAWAN_DATA') {
    return null; // Don't render anything if redirected
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manajemen Relawan Bencana</h1>
          <p className="text-sm text-gray-500">Daftarkan relawan baru, atur penempatan tugas posko, dan pantau keaktifan petugas.</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <span className="material-symbols-outlined text-sm">person_add</span>
            Daftarkan Relawan Baru
          </Button>
        )}
      </div>

      {/* SECTION 1: STATISTIK RELAWAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Aktif di Lapangan */}
        <Card className="flex items-start gap-4 border-l-4 border-[#0056C9] hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-btn flex items-center justify-center bg-[#0056C9]/10 text-[#0056C9]">
            <span className="material-symbols-outlined text-xl">hail</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase font-heading">Aktif di Lapangan</p>
            <h3 className="text-2xl font-heading font-bold text-[#0056C9] mt-0.5">
              {isListLoading ? '...' : `${stats.aktif} Jiwa`}
            </h3>
          </div>
        </Card>

        {/* Standby di Posko */}
        <Card className="flex items-start gap-4 border-l-4 border-[#9F3E00] hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-btn flex items-center justify-center bg-[#9F3E00]/10 text-[#9F3E00]">
            <span className="material-symbols-outlined text-xl">support_agent</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase font-heading">Standby di Posko</p>
            <h3 className="text-2xl font-heading font-bold text-[#9F3E00] mt-0.5">
              {isListLoading ? '...' : `${stats.standby} Jiwa`}
            </h3>
          </div>
        </Card>

        {/* Selesai Tugas */}
        <Card className="flex items-start gap-4 border-l-4 border-[#10B981] hover:shadow-md transition-all duration-200">
          <div className="w-12 h-12 rounded-btn flex items-center justify-center bg-[#10B981]/10 text-[#10B981]">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase font-heading">Selesai Tugas</p>
            <h3 className="text-2xl font-heading font-bold text-[#10B981] mt-0.5">
              {isListLoading ? '...' : `${stats.selesai} Jiwa`}
            </h3>
          </div>
        </Card>
      </div>

      {/* SECTION 2: FILTER & SEARCH */}
      <Card className="p-5 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Input
            placeholder="Cari nama atau kode ID relawan (REL-xxxx)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            placeholder="Semua Lokasi / Status"
            options={poskoFilterOptions}
            value={filterPoskoId}
            onChange={(e) => setFilterPoskoId(e.target.value)}
          />
        </div>
      </Card>

      {/* SECTION 3: LIST RELAWAN GRID */}
      {isListLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="animate-pulse space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              <div className="h-10 bg-gray-100 rounded w-full mt-4"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVolunteers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6 italic">Tidak ada relawan yang cocok dengan kriteria pencarian.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVolunteers.map((v) => {
                const initial = v.nama_lengkap.slice(0, 2).toUpperCase();
                return (
                  <Card key={v.id} className="flex flex-col justify-between h-full relative overflow-hidden">
                    <div className="space-y-4">
                      {/* Top Header Card */}
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {v.foto_url ? (
                          <img src={v.foto_url} alt={v.nama_lengkap} className="w-12 h-12 rounded-full object-cover border border-gray-100 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                            {initial}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold font-heading text-gray-900 line-clamp-1">{v.nama_lengkap}</h3>
                          <p className="text-xs text-gray-400">{v.id_relawan || 'SUPER ADMIN'}</p>
                          <div className="mt-1">
                            {v.status === 'AKTIF' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0056C9]/10 text-[#0056C9]">
                                Aktif di Lapangan
                              </span>
                            ) : v.status === 'STANDBY' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9F3E00]/10 text-[#9F3E00]">
                                Standby di Posko
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981]">
                                Selesai Tugas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="text-xs space-y-1.5 border-t border-gray-50 pt-3">
                        <p className="text-gray-500">
                          <span className="font-semibold text-gray-400">Posko Penugasan:</span>{' '}
                          <span className="text-gray-800 font-medium">
                            {v.posko ? v.posko.nama : 'Standby / Pool Relawan'}
                          </span>
                        </p>
                        <p className="text-gray-500">
                          <span className="font-semibold text-gray-400">Keahlian:</span>{' '}
                          <span className="text-gray-800 font-medium">{v.keahlian || 'Umum'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action buttons based on Role */}
                    <div className="flex gap-2 mt-5 pt-3 border-t border-gray-50">
                      {user?.role === 'SUPER_ADMIN' && (
                        <>
                          <Button variant="secondary" className="flex-1 h-9 min-h-0 text-xs py-0" onClick={() => handleOpenReassign(v)}>
                            <span className="material-symbols-outlined text-xs">move_down</span> Reassign
                          </Button>
                          <Button
                            variant={v.status === 'NONAKTIF' ? 'primary' : 'danger'}
                            className="flex-1 h-9 min-h-0 text-xs py-0"
                            onClick={() => handleToggleStatus(v)}
                          >
                            {v.status === 'NONAKTIF' ? 'Aktifkan' : 'Nonaktifkan'}
                          </Button>
                        </>
                      )}

                      {user?.role === 'KEPALA_POSKO' && (
                        <>
                          {v.status === 'STANDBY' && (
                            <Button
                              variant="primary"
                              className="w-full h-9 min-h-0 text-xs py-0 bg-success hover:bg-success/90"
                              onClick={() => handleAssignToMyPosko(v)}
                            >
                              Tugaskan ke Posko Saya
                            </Button>
                          )}
                          {v.posko && v.posko.id === user.poskoId && (
                            <Button
                              variant="danger"
                              className="w-full h-9 min-h-0 text-xs py-0"
                              onClick={() => handleRemoveFromMyPosko(v)}
                            >
                              Keluarkan dari Posko
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL: DAFTAR RELAWAN BARU ===== */}
      <Modal title="Daftarkan Relawan Baru" open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Email Akun *"
            type="email"
            placeholder="Contoh: relawan@gantara.id"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
          />
          <Input
            label="Password Akun *"
            type="password"
            placeholder="Min. 6 Karakter"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
            required
          />
          <Input
            label="Nama Lengkap Relawan *"
            placeholder="Contoh: Ahmad Fauzi"
            value={addNamaLengkap}
            onChange={(e) => setAddNamaLengkap(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Peran Penugasan *"
              options={[
                { value: 'RELAWAN_DATA', label: 'Relawan Bagian Data' },
                { value: 'KEPALA_POSKO', label: 'Kepala Posko' },
              ]}
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
            />
            <Select
              label="Posko Awal (Opsional)"
              placeholder="Standby / Pool Relawan"
              options={poskos.map(p => ({ value: p.id, label: p.nama }))}
              value={addPoskoId}
              onChange={(e) => setAddPoskoId(e.target.value)}
            />
          </div>
          <Input
            label="Divisi / Keahlian Khusus (Opsional)"
            placeholder="Contoh: Medis & Logistik Darurat"
            value={addKeahlian}
            onChange={(e) => setAddKeahlian(e.target.value)}
          />

          {addError && (
            <p className="text-xs text-danger font-semibold">{addError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isAdding}>
              {isAdding ? 'Mendaftarkan...' : 'Daftarkan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: REASSIGN POSKO ===== */}
      <Modal
        title={selectedVolunteer ? `Reassign Relawan: ${selectedVolunteer.nama_lengkap}` : 'Reassign Relawan'}
        open={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">Pindahkan area tugas penempatan posko relawan.</p>

          <Select
            label="Posko Tugas Baru *"
            placeholder="Standby / Pool Relawan (Lepaskan Tugas)"
            options={poskos.map(p => ({ value: p.id, label: p.nama }))}
            value={reassignPoskoId}
            onChange={(e) => setReassignPoskoId(e.target.value)}
          />

          {reassignError && (
            <p className="text-xs text-danger font-semibold">{reassignError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsReassignModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isReassigning}>
              {isReassigning ? 'Memindahkan...' : 'Pindahkan Tugas'}
            </Button>
          </div>
        </form>
      </Modal>
      {/* ===== MODAL: CONFIRM DEACTIVATE VOLUNTEER ===== */}
      <Modal
        title="Konfirmasi Penonaktifan Relawan"
        open={isConfirmToggleOpen}
        onClose={() => {
          setIsConfirmToggleOpen(false);
          setTargetVolunteer(null);
        }}
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menonaktifkan akun relawan <span className="font-bold text-gray-900">{targetVolunteer?.nama_lengkap}</span>?
          </p>
          <p className="text-xs text-gray-400">
            Tindakan ini akan menonaktifkan status relawan sehingga mereka tidak dapat melakukan login, memindai QR code, atau mencatat logistik bantuan, namun seluruh riwayat aktivitasnya akan tetap tercatat di sistem demi transparansi audit data.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => {
              setIsConfirmToggleOpen(false);
              setTargetVolunteer(null);
            }}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => targetVolunteer && executeToggleStatus(targetVolunteer, 'NONAKTIF')}>
              Ya, Nonaktifkan Relawan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
