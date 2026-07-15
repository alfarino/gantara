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

interface UserAccount {
  id: string;
  email: string;
  namaLengkap: string;
  role: string;
  status: string;
  poskoId: string | null;
  poskoName: string;
  idRelawan: string | null;
  keahlian: string | null;
}

interface PoskoOption {
  id: string;
  nama: string;
}

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'KEPALA_POSKO', label: 'Kepala Posko' },
  { value: 'RELAWAN_DATA', label: 'Relawan Bagian Data' },
];

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
];

export default function PengaturanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect non-Super Admin immediately
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'SUPER_ADMIN') {
        alert('Akses ditolak. Halaman pengaturan akun hanya dapat diakses oleh Super Admin.');
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Lists states & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPoskoId, setFilterPoskoId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch users & poskos
  const { data: usersRes, isLoading: isListLoading } = useSWR('/api/users', fetcher);
  const users: UserAccount[] = usersRes?.success ? usersRes.data : [];

  const { data: poskoRes } = useSWR('/api/posko', fetcher);
  const poskos: PoskoOption[] = poskoRes?.success ? poskoRes.data : [];

  // Filtered Users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.namaLengkap.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesId = u.idRelawan ? u.idRelawan.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }

      // Role
      if (filterRole && u.role !== filterRole) return false;

      // Posko
      if (filterPoskoId && u.poskoId !== filterPoskoId) return false;

      // Status
      if (filterStatus && u.status !== filterStatus) return false;

      return true;
    });
  }, [users, searchQuery, filterRole, filterPoskoId, filterStatus]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Add User Form State
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addNama, setAddNama] = useState('');
  const [addRole, setAddRole] = useState('RELAWAN_DATA');
  const [addPoskoId, setAddPoskoId] = useState('');
  const [addStatus, setAddStatus] = useState('AKTIF');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit User Form State
  const [editNama, setEditNama] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPoskoId, setEditPoskoId] = useState('');
  const [editStatus, setEditStatus] = useState('AKTIF');
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Reset Password State
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Soft Delete State
  const [isDeleting, setIsDeleting] = useState(false);

  const resetAddForm = () => {
    setAddEmail('');
    setAddPassword('');
    setAddNama('');
    setAddRole('RELAWAN_DATA');
    setAddPoskoId('');
    setAddStatus('AKTIF');
    setAddError('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail || !addPassword || !addNama || !addRole) {
      setAddError('Semua field bertanda * wajib diisi.');
      return;
    }
    if (addRole !== 'SUPER_ADMIN' && !addPoskoId) {
      setAddError('Posko wajib diisi untuk peran relawan atau kepala posko.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail,
          password: addPassword,
          namaLengkap: addNama,
          role: addRole,
          poskoId: addRole !== 'SUPER_ADMIN' ? addPoskoId : undefined,
          status: addStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddOpen(false);
        resetAddForm();
        mutate('/api/users');
      } else {
        setAddError(data.error || 'Gagal menambahkan user.');
      }
    } catch {
      setAddError('Koneksi terputus. Coba lagi.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenEdit = (u: UserAccount) => {
    setSelectedUser(u);
    setEditNama(u.namaLengkap);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPoskoId(u.poskoId || '');
    setEditStatus(u.status);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editNama || !editEmail || !editRole) {
      setEditError('Semua field wajib diisi.');
      return;
    }
    if (editRole !== 'SUPER_ADMIN' && !editPoskoId) {
      setEditError('Posko wajib ditentukan untuk relawan / kepala posko.');
      return;
    }

    setIsEditing(true);
    setEditError('');

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaLengkap: editNama,
          email: editEmail,
          role: editRole,
          poskoId: editRole !== 'SUPER_ADMIN' ? editPoskoId : null,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditOpen(false);
        setSelectedUser(null);
        mutate('/api/users');
      } else {
        setEditError(data.error || 'Gagal menyimpan perubahan.');
      }
    } catch {
      setEditError('Koneksi terputus. Coba lagi.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPassword) return;

    if (resetPassword.length < 6) {
      setResetError('Password minimal 6 karakter.');
      return;
    }

    setIsResetting(true);
    setResetError('');

    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      const data = await res.json();
      if (data.success) {
        setIsResetOpen(false);
        setResetPassword('');
        setSelectedUser(null);
        alert('Password berhasil direset secara manual.');
      } else {
        setResetError(data.error || 'Gagal mereset password.');
      }
    } catch {
      setResetError('Koneksi terputus.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setIsDeleteOpen(false);
        setSelectedUser(null);
        mutate('/api/users');
      } else {
        alert(data.error || 'Gagal menghapus user.');
      }
    } catch {
      alert('Koneksi terputus.');
    } finally {
      setIsDeleting(false);
    }
  };

  const friendlyRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'KEPALA_POSKO': return 'Kepala Posko';
      case 'RELAWAN_DATA': return 'Relawan Data';
      default: return role;
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Manajemen Pengguna & Akun</h1>
          <p className="text-sm text-gray-500">Kelola akun Super Admin, Kepala Posko, dan Relawan Data, serta reset password pengguna.</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddOpen(true)}>
          <span className="material-symbols-outlined text-sm">person_add</span>
          Tambah User Baru
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card className="p-5 flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[200px] w-full">
          <Input
            placeholder="Cari nama, email, atau ID relawan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-44">
          <Select
            placeholder="Semua Peran"
            options={ROLE_OPTIONS}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          />
        </div>
        <div className="w-full md:w-56">
          <Select
            placeholder="Semua Posko"
            options={poskos.map(p => ({ value: p.id, label: p.nama }))}
            value={filterPoskoId}
            onChange={(e) => setFilterPoskoId(e.target.value)}
          />
        </div>
        <div className="w-full md:w-40">
          <Select
            placeholder="Semua Status"
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
        </div>
      </Card>

      {/* USERS TABLE */}
      <Card className="overflow-hidden">
        {isListLoading ? (
          <div className="text-center py-12 text-gray-500">
            <span className="animate-spin material-symbols-outlined text-3xl">progress_activity</span>
            <p className="text-sm mt-2">Memuat daftar pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12 italic">Tidak ada pengguna terdaftar yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">Nama Lengkap</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">Email</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">ID Relawan</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">Peran</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">Posko Tugas</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider">Status</th>
                  <th className="p-3 text-gray-400 font-bold uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {filteredUsers.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-all">
                    <td className="p-3 font-semibold text-gray-900">{item.namaLengkap}</td>
                    <td className="p-3">{item.email}</td>
                    <td className="p-3 font-mono font-bold text-gray-400">{item.idRelawan || '—'}</td>
                    <td className="p-3">
                      <Badge variant={item.role === 'SUPER_ADMIN' ? 'danger' : item.role === 'KEPALA_POSKO' ? 'warning' : 'primary'}>
                        {friendlyRole(item.role)}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">{item.poskoName}</td>
                    <td className="p-3">
                      <Badge variant={item.status === 'AKTIF' ? 'success' : 'neutral'}>
                        {item.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-8 min-h-0 text-[10px] px-2 py-0"
                        onClick={() => {
                          setSelectedUser(item);
                          setIsResetOpen(true);
                        }}
                      >
                        Reset PW
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-8 min-h-0 text-[10px] px-2 py-0 text-primary border-primary/20 hover:bg-primary/5"
                        onClick={() => handleOpenEdit(item)}
                      >
                        Edit
                      </Button>
                      {item.status === 'AKTIF' && (
                        <Button
                          variant="danger"
                          className="h-8 min-h-0 text-[10px] px-2 py-0 bg-danger/10 border-danger/20 text-danger hover:bg-danger/20"
                          onClick={() => {
                            setSelectedUser(item);
                            setIsDeleteOpen(true);
                          }}
                        >
                          Hapus
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ===== MODAL: TAMBAH USER ===== */}
      <Modal title="Tambah Pengguna Baru" open={isAddOpen} onClose={() => setIsAddOpen(false)}>
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
            placeholder="Minimal 6 karakter"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
            required
          />
          <Input
            label="Nama Lengkap *"
            placeholder="Contoh: Siti Rahma"
            value={addNama}
            onChange={(e) => setAddNama(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Peran Akun *"
              options={ROLE_OPTIONS}
              value={addRole}
              onChange={(e) => setAddRole(e.target.value)}
            />
            {addRole !== 'SUPER_ADMIN' && (
              <Select
                label="Posko Penempatan *"
                placeholder="Pilih Posko"
                options={poskos.map(p => ({ value: p.id, label: p.nama }))}
                value={addPoskoId}
                onChange={(e) => setAddPoskoId(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Status Akun</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="addStatus"
                  value="AKTIF"
                  checked={addStatus === 'AKTIF'}
                  onChange={() => setAddStatus('AKTIF')}
                  className="h-4 w-4 text-primary"
                />
                Aktif (Dapat Login)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="addStatus"
                  value="NONAKTIF"
                  checked={addStatus === 'NONAKTIF'}
                  onChange={() => setAddStatus('NONAKTIF')}
                  className="h-4 w-4 text-primary"
                />
                Nonaktif (Di-suspend)
              </label>
            </div>
          </div>

          {addError && (
            <p className="text-xs text-danger font-semibold">{addError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isAdding}>
              {isAdding ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: EDIT USER ===== */}
      <Modal
        title={selectedUser ? `Edit Pengguna: ${selectedUser.namaLengkap}` : 'Edit Pengguna'}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap *"
            value={editNama}
            onChange={(e) => setEditNama(e.target.value)}
            required
          />
          <Input
            label="Email Akun *"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Peran Akun *"
              options={ROLE_OPTIONS}
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            />
            {editRole !== 'SUPER_ADMIN' && (
              <Select
                label="Posko Penempatan *"
                placeholder="Pilih Posko"
                options={poskos.map(p => ({ value: p.id, label: p.nama }))}
                value={editPoskoId}
                onChange={(e) => setEditPoskoId(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Status Akun</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  value="AKTIF"
                  checked={editStatus === 'AKTIF'}
                  onChange={() => setEditStatus('AKTIF')}
                  className="h-4 w-4 text-primary"
                />
                Aktif (Dapat Login)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="editStatus"
                  value="NONAKTIF"
                  checked={editStatus === 'NONAKTIF'}
                  onChange={() => setEditStatus('NONAKTIF')}
                  className="h-4 w-4 text-primary"
                />
                Nonaktif (Di-suspend)
              </label>
            </div>
          </div>

          {editError && (
            <p className="text-xs text-danger font-semibold">{editError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isEditing}>
              {isEditing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: RESET PASSWORD ===== */}
      <Modal
        title={selectedUser ? `Reset Password Manual: ${selectedUser.namaLengkap}` : 'Reset Password'}
        open={isResetOpen}
        onClose={() => setIsResetOpen(false)}
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">Tentukan kata sandi baru secara manual untuk pengguna ini.</p>
          <Input
            label="Password Baru *"
            type="password"
            placeholder="Minimal 6 karakter"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            required
          />

          {resetError && (
            <p className="text-xs text-danger font-semibold">{resetError}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsResetOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isResetting}>
              {isResetting ? 'Mereset...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===== MODAL: CONFIRM DELETE (SOFT-DELETE) ===== */}
      <Modal
        title="Konfirmasi Penonaktifan Akun"
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menonaktifkan akun <span className="font-bold text-gray-900">{selectedUser?.namaLengkap}</span>?
          </p>
          <p className="text-xs text-gray-400">
            Tindakan ini adalah <span className="font-semibold text-danger">soft-delete</span>. Akun akan dinonaktifkan sehingga tidak dapat login kembali, namun catatan kontribusi logistik dan scan QR historisnya akan tetap terjaga di dalam sistem.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={handleDeleteSubmit}>
              {isDeleting ? 'Menonaktifkan...' : 'Ya, Nonaktifkan Akun'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
