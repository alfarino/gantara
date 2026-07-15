'use client';
import React, { useState, useEffect, use } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DetailKeluargaPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'anggota' | 'distribusi' | 'logs'>('anggota');
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberNama, setMemberNama] = useState('');
  const [memberNik, setMemberNik] = useState('');
  const [memberHubungan, setMemberHubungan] = useState('ANAK');
  const [memberGender, setMemberGender] = useState('LAKI_LAKI');
  const [memberDob, setMemberDob] = useState('');
  const [memberRentan, setMemberRentan] = useState('TIDAK_ADA');
  const [memberHealth, setMemberHealth] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Edit Profile modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editKk, setEditKk] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editZona, setEditZona] = useState<'MERAH' | 'KUNING' | 'HIJAU'>('MERAH');
  const [editHunian, setEditHunian] = useState<'RUSAK_BERAT' | 'RUSAK_SEDANG' | 'RUSAK_RINGAN' | 'AMAN'>('AMAN');
  const [editVerifikasi, setEditVerifikasi] = useState<'TERVERIFIKASI' | 'MENUNGGU' | 'DITOLAK'>('MENUNGGU');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { data: kkRes, error, isLoading } = useSWR(`/api/keluarga/${id}`, fetcher);
  const kk = kkRes?.success ? kkRes.data : null;

  // Generate QR Code base64 data
  useEffect(() => {
    if (kk?.qrCodeData) {
      QRCode.toDataURL(kk.qrCodeData, { width: 300, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [kk?.qrCodeData]);

  const openEditProfile = () => {
    if (kk) {
      setEditNama(kk.namaKepalaKeluarga);
      setEditNik(kk.nikKepalaKeluarga);
      setEditKk(kk.nomorKk);
      setEditAlamat(kk.alamat);
      setEditRt(kk.rt);
      setEditRw(kk.rw);
      setEditKelurahan(kk.kelurahan);
      setEditZona(kk.zonaRisiko);
      setEditHunian(kk.statusHunian);
      setEditVerifikasi(kk.statusVerifikasi);
      setIsEditProfileOpen(true);
    }
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNama || !editNik || !editKk || !editAlamat || !editRt || !editRw || !editKelurahan) {
      alert('Mohon lengkapi seluruh field wajib (*)');
      return;
    }
    if (!/^\d{16}$/.test(editNik) || !/^\d{16}$/.test(editKk)) {
      alert('NIK dan Nomor KK harus berupa 16 digit angka.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/keluarga/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomorKk: editKk,
          namaKepalaKeluarga: editNama,
          nikKepalaKeluarga: editNik,
          alamat: editAlamat,
          rt: editRt,
          rw: editRw,
          kelurahan: editKelurahan,
          zonaRisiko: editZona,
          statusHunian: editHunian,
          statusVerifikasi: editVerifikasi
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Profil keluarga berhasil diperbarui!');
        mutate(`/api/keluarga/${id}`);
        setIsEditProfileOpen(false);
      } else {
        alert(data.error || 'Gagal memperbarui profil.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrintCard = () => {
    if (!kk) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54] // Standard ID card size (Credit card size)
    });

    // Outer Border / Background
    doc.setFillColor(250, 250, 250);
    doc.rect(0, 0, 85.6, 54, 'F');
    
    // Top Bar Header
    doc.setFillColor(0, 86, 201); // Primary Gantara Blue
    doc.rect(0, 0, 85.6, 12, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('KARTU PENERIMA MANFAAT GANTARA', 42.8, 7, { align: 'center' });

    // Details Text
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(kk.namaKepalaKeluarga, 4, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`NIK: ${kk.nikKepalaKeluarga}`, 4, 22.5);
    doc.text(`No. KK: ${kk.nomorKk}`, 4, 26);
    doc.text(`Kelurahan: ${kk.kelurahan}`, 4, 29.5);
    doc.text(`Zona Risiko: ${kk.zonaRisiko}`, 4, 33);
    doc.text(`Status Hunian: ${kk.statusHunian.replace(/_/g, ' ')}`, 4, 36.5);
    doc.text(`Posko: ${kk.posko?.nama || '-'}`, 4, 40);

    // QR Code Image placement
    if (qrDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.rect(56, 16, 25, 25, 'F');
      doc.addImage(qrDataUrl, 'PNG', 56, 16, 25, 25);
    }

    // QR Code Identifier Text Below QR Code
    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(kk.qrCodeData, 68.5, 43, { align: 'center' });

    // Bottom banner guide line
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 47, 85.6, 7, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(0, 86, 201);
    doc.text('PINDAI QR UNTUK VERIFIKASI & PENERIMAAN BANTUAN LOGISTIK', 42.8, 51.5, { align: 'center' });

    doc.save(`KARTU_GANTARA_${kk.namaKepalaKeluarga.replace(/\s+/g, '_')}.pdf`);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNama || !memberNik || !memberDob) {
      alert('Nama, NIK, dan Tanggal Lahir wajib diisi.');
      return;
    }
    if (!/^\d{16}$/.test(memberNik)) {
      alert('NIK harus 16 digit angka.');
      return;
    }

    setIsSavingMember(true);
    try {
      const res = await fetch(`/api/keluarga/${id}/anggota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: memberNik,
          nama: memberNama,
          hubungan: memberHubungan,
          jenis_kelamin: memberGender,
          tanggal_lahir: memberDob,
          kategori_rentan: memberRentan !== 'TIDAK_ADA' ? memberRentan : null,
          kondisi_kesehatan: memberHealth || null
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Anggota keluarga berhasil ditambahkan!');
        mutate(`/api/keluarga/${id}`);
        setIsAddMemberOpen(false);
        // Clear fields
        setMemberNama('');
        setMemberNik('');
        setMemberHubungan('ANAK');
        setMemberGender('LAKI_LAKI');
        setMemberDob('');
        setMemberRentan('TIDAK_ADA');
        setMemberHealth('');
      } else {
        alert(data.error || 'Gagal menyimpan anggota keluarga.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsSavingMember(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500">Memuat profil keluarga...</div>;
  }

  if (error || !kk) {
    return (
      <div className="text-center py-10 text-danger">
        <p className="font-bold">Galat!</p>
        <p className="text-sm">Data keluarga tidak dapat ditemukan atau Anda tidak memiliki akses.</p>
        <Link href="/keluarga" className="text-primary hover:underline text-xs mt-4 inline-block">
          Kembali ke Daftar Keluarga
        </Link>
      </div>
    );
  }

  const rentanCount = kk.anggota.filter((a: any) => a.kategoriRentan && a.kategoriRentan !== 'TIDAK_ADA').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs / Back button */}
      <div>
        <Link href="/keluarga" className="text-xs text-primary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-xs leading-none">arrow_back</span>
          Kembali ke Daftar Pengungsi
        </Link>
      </div>

      {/* Grid Profil Atas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri: Profil Card */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg uppercase shrink-0">
                  {kk.namaKepalaKeluarga.slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading text-gray-900">{kk.namaKepalaKeluarga}</h2>
                  <p className="text-xs text-gray-500">Kepala Keluarga • NIK: {kk.nikKepalaKeluarga}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={kk.statusVerifikasi === 'TERVERIFIKASI' ? 'success' : kk.statusVerifikasi === 'DITOLAK' ? 'danger' : 'neutral'}>
                  {kk.statusVerifikasi}
                </Badge>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO') && (
                  <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={openEditProfile}>
                    <span className="material-symbols-outlined text-xs leading-none">edit</span>
                    Edit Profil
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-b border-gray-100 py-4">
              <div>
                <p className="text-xs text-gray-400">Nomor Kartu Keluarga</p>
                <p className="font-semibold font-mono text-gray-900">{kk.nomorKk}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Kelurahan / Desa</p>
                <p className="font-semibold text-gray-900">{kk.kelurahan}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">RT / RW</p>
                <p className="font-semibold text-gray-900">RT {kk.rt} / RW {kk.rw}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Kondisi Bangunan Hunian</p>
                <p className="font-semibold text-gray-900">{kk.statusHunian.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Posko Pengungsian</p>
                <p className="font-semibold text-gray-900">{kk.posko?.nama || 'Belum Terkait'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Zona Risiko Tempat Tinggal</p>
                <p className="font-semibold text-gray-900">
                  <Badge variant={kk.zonaRisiko === 'MERAH' ? 'danger' : kk.zonaRisiko === 'KUNING' ? 'warning' : 'success'}>
                    {kk.zonaRisiko}
                  </Badge>
                </p>
              </div>
            </div>

            {rentanCount > 0 && (
              <div className="border-l-4 border-orange-500 bg-orange-50/50 p-3 rounded-r-card flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-orange-800">Perhatian Kelompok Rentan</h4>
                  <p className="text-[10px] text-orange-600 mt-0.5">Terdapat {rentanCount} anggota keluarga berkategori rentan (Lansia/Balita/Difabel/Hamil).</p>
                </div>
                <span className="material-symbols-outlined text-orange-500">warning</span>
              </div>
            )}
          </div>
        </Card>

        {/* Kanan: QR Code Card */}
        <Card className="p-6 flex flex-col items-center justify-between text-center">
          <div className="space-y-4 w-full">
            <h3 className="font-heading font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              QR Code Terenkripsi Warga
            </h3>
            <div className="w-48 h-48 bg-white border border-gray-100 rounded-card flex items-center justify-center p-2 mx-auto shadow-sm">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code GANTARA" className="w-full h-full" />
              ) : (
                <span className="text-xs text-gray-400">Memuat QR...</span>
              )}
            </div>
            <p className="font-mono text-xs font-bold text-gray-500">{kk.qrCodeData}</p>
          </div>
          <Button variant="primary" className="w-full mt-6" onClick={handlePrintCard}>
            <span className="material-symbols-outlined text-sm">print</span>
            Cetak Kartu Penerima
          </Button>
        </Card>
      </div>

      {/* Tab Panel Konten Bawah */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 gap-6 text-sm">
          {[
            { id: 'anggota', label: 'Anggota Keluarga', icon: 'diversity_3' },
            { id: 'distribusi', label: 'Riwayat Bantuan', icon: 'history' },
            { id: 'logs', label: 'Log Perubahan Data', icon: 'timeline' }
          ].map(t => (
            <button
              key={t.id}
              className={`flex items-center gap-2 pb-3 font-semibold transition-colors focus:outline-none border-b-2 -mb-[2px] ${
                activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
              onClick={() => setActiveTab(t.id as any)}
            >
              <span className="material-symbols-outlined text-sm leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <Card className="p-6">
          {/* Tab 1: Anggota Keluarga */}
          {activeTab === 'anggota' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-base text-gray-900">Daftar Jiwa Keluarga</h3>
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO') && (
                  <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={() => setIsAddMemberOpen(true)}>
                    <span className="material-symbols-outlined text-xs">add</span>
                    Tambah Anggota
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kk.anggota.length > 0 ? (
                  kk.anggota.map((member: any) => {
                    const age = calculateAge(member.tanggalLahir);
                    const isLansia = age > 60;
                    const isBalita = age < 5;
                    
                    return (
                      <div key={member.id} className="border border-gray-100 rounded-card p-4 flex items-center justify-between bg-white hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-400">
                            {isLansia ? 'elderly' : isBalita ? 'child_care' : 'person'}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.nama} <span className="text-xs text-gray-400 font-normal">({member.hubungan})</span>
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                              <span>NIK: {member.nik}</span>
                              <span>•</span>
                              <span>{age} Tahun</span>
                              {isLansia && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">LANSIA</span>}
                              {isBalita && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">BALITA</span>}
                              {member.kategoriRentan === 'DIFABEL' && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">DIFABEL</span>}
                              {member.kategoriRentan === 'IBU_HAMIL' && <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">IBU HAMIL</span>}
                            </div>
                            {member.kondisiKesehatan && (
                              <p className="text-xs text-danger mt-1">Kesehatan: {member.kondisiKesehatan}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-2 text-sm text-gray-400 text-center py-6">
                    Tidak ada anggota keluarga tercatat selain Kepala Keluarga.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Riwayat Bantuan */}
          {activeTab === 'distribusi' && (
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-base text-gray-900 mb-2">Riwayat Penerimaan Bantuan</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Jenis Bantuan</th>
                      <th className="py-3 px-4">Kuantitas</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Petugas</th>
                      <th className="py-3 px-4">Tanggal Penyaluran</th>
                      <th className="py-3 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {kk.distribusi.length > 0 ? (
                      kk.distribusi.map((dist: any) => (
                        <tr key={dist.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-semibold text-gray-900">{dist.jenisBantuan}</td>
                          <td className="py-3 px-4 text-gray-700">{dist.kuantitas}</td>
                          <td className="py-3 px-4">
                            <Badge variant={dist.status === 'TERSALURKAN' ? 'success' : 'danger'}>
                              {dist.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{dist.petugas?.namaLengkap || '-'}</td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(dist.tanggalDistribusi).toLocaleString('id-ID', {
                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-400">{dist.catatan || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Keluarga ini belum pernah menerima penyaluran bantuan logistik.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Log Perubahan Data */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-base text-gray-900 mb-4">Audit Trail Perubahan Profil</h3>
              <div className="relative border-l border-gray-100 pl-6 space-y-6">
                {kk.logs && kk.logs.length > 0 ? (
                  kk.logs.map((log: any) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-primary shadow-sm" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{log.deskripsi}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{new Date(log.createdAt).toLocaleString('id-ID')}</span>
                          <span>•</span>
                          <span>Petugas: {log.petugas}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 py-2">Belum ada riwayat perubahan tercatat untuk keluarga ini.</p>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Tambah Anggota */}
      <Modal
        title="Tambahkan Anggota Keluarga Baru"
        open={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap *"
            type="text"
            placeholder="Masukkan nama lengkap anggota"
            value={memberNama}
            onChange={(e) => setMemberNama(e.target.value)}
            required
          />
          <Input
            label="Nomor Induk Kependudukan (NIK) *"
            type="text"
            placeholder="Masukkan 16 digit NIK"
            value={memberNik}
            onChange={(e) => setMemberNik(e.target.value.replace(/\D/g, ''))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Hubungan Keluarga *"
              options={[
                { value: 'ISTRI', label: 'Istri' },
                { value: 'ANAK', label: 'Anak' },
                { value: 'ORANG_TUA', label: 'Orang Tua' },
                { value: 'LAINNYA', label: 'Lainnya' }
              ]}
              value={memberHubungan}
              onChange={(e) => setMemberHubungan(e.target.value)}
            />
            <Select
              label="Jenis Kelamin *"
              options={[
                { value: 'LAKI_LAKI', label: 'Laki-laki' },
                { value: 'PEREMPUAN', label: 'Perempuan' }
              ]}
              value={memberGender}
              onChange={(e) => setMemberGender(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tanggal Lahir *"
              type="date"
              value={memberDob}
              onChange={(e) => setMemberDob(e.target.value)}
              required
            />
            <Select
              label="Kategori Khusus"
              options={[
                { value: 'TIDAK_ADA', label: 'Tidak ada' },
                { value: 'DIFABEL', label: 'Difabel / Disabilitas' },
                { value: 'IBU_HAMIL', label: 'Ibu Hamil' }
              ]}
              value={memberRentan}
              onChange={(e) => setMemberRentan(e.target.value)}
            />
          </div>
          <Input
            label="Catatan Kondisi Kesehatan Khusus (Opsional)"
            type="text"
            placeholder="Contoh: Diabetes, cedera kaki, asma"
            value={memberHealth}
            onChange={(e) => setMemberHealth(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddMemberOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isSavingMember}>
              {isSavingMember ? 'Menyimpan...' : 'Simpan Anggota'}
            </Button>
          </div>
          </form>
        </Modal>

        {/* Modal Edit Profil */}
        <Modal
          title="Edit Profil Kartu Keluarga"
          open={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
        >
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nomor KK *"
                type="text"
                value={editKk}
                onChange={(e) => setEditKk(e.target.value.replace(/\D/g, ''))}
                required
              />
              <Input
                label="NIK Kepala Keluarga *"
                type="text"
                value={editNik}
                onChange={(e) => setEditNik(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nama Kepala Keluarga *"
                type="text"
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                required
              />
              <Select
                label="Kelurahan *"
                options={[
                  { value: 'Gurun Laweh Nan XX', label: 'Gurun Laweh Nan XX' },
                  { value: 'Lubuk Begalung Nan XX', label: 'Lubuk Begalung Nan XX' },
                  { value: 'Banuaran Nan XX', label: 'Banuaran Nan XX' },
                  { value: 'Cengkeh Nan XX', label: 'Cengkeh Nan XX' },
                  { value: 'Parak Laweh Nan XX', label: 'Parak Laweh Nan XX' },
                  { value: 'Koto Lalang', label: 'Koto Lalang' }
                ]}
                value={editKelurahan}
                onChange={(e) => setEditKelurahan(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="RT *"
                type="text"
                value={editRt}
                onChange={(e) => setEditRt(e.target.value)}
                required
              />
              <Input
                label="RW *"
                type="text"
                value={editRw}
                onChange={(e) => setEditRw(e.target.value)}
                required
              />
              <Select
                label="Status Verifikasi *"
                options={[
                  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
                  { value: 'MENUNGGU', label: 'Menunggu' },
                  { value: 'DITOLAK', label: 'Ditolak' }
                ]}
                value={editVerifikasi}
                onChange={(e) => setEditVerifikasi(e.target.value as any)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Zona Risiko Bencana *"
                options={[
                  { value: 'MERAH', label: 'Zona Merah (Tinggi)' },
                  { value: 'KUNING', label: 'Zona Kuning (Sedang)' },
                  { value: 'HIJAU', label: 'Zona Hijau (Rendah)' }
                ]}
                value={editZona}
                onChange={(e) => setEditZona(e.target.value as any)}
              />
              <Select
                label="Status Hunian *"
                options={[
                  { value: 'RUSAK_BERAT', label: 'Rusak Berat' },
                  { value: 'RUSAK_SEDANG', label: 'Rusak Sedang' },
                  { value: 'RUSAK_RINGAN', label: 'Rusak Ringan' },
                  { value: 'AMAN', label: 'Aman' }
                ]}
                value={editHunian}
                onChange={(e) => setEditHunian(e.target.value as any)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-heading font-semibold text-sm text-gray-900">Alamat Lengkap *</label>
              <textarea
                className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                value={editAlamat}
                onChange={(e) => setEditAlamat(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsEditProfileOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingProfile}>
                {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
  );
}
