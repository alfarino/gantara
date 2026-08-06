'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Member {
  nama: string;
  nik: string;
  hubungan: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  kategori_rentan: string;
  status_kesehatan?: string;
  kondisi_kesehatan: string;
}

export default function TambahKeluargaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  // Load events and posko lists for mapping IDs
  const { data: eventsRes } = useSWR('/api/event', fetcher);
  const { data: poskoRes } = useSWR('/api/posko', fetcher);

  const events = eventsRes?.success ? eventsRes.data : [];
  const poskos = poskoRes?.success ? poskoRes.data : [];

  // Form states - Step 1
  const [nomorKk, setNomorKk] = useState('');
  const [nikKepalaKeluarga, setNikKepalaKeluarga] = useState('');
  const [namaKepalaKeluarga, setNamaKepalaKeluarga] = useState('');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [zonaRisiko, setZonaRisiko] = useState<'MERAH' | 'KUNING' | 'HIJAU'>('MERAH');
  const [eventBencanaId, setEventBencanaId] = useState('');
  const [poskoId, setPoskoId] = useState('');

  // Form states - Step 2 (Anggota Keluarga)
  const [anggota, setAnggota] = useState<Member[]>([]);
  // Temp member inputs
  const [tempNama, setTempNama] = useState('');
  const [tempNik, setTempNik] = useState('');
  const [tempHubungan, setTempHubungan] = useState('ANAK');
  const [tempGender, setTempGender] = useState('LAKI_LAKI');
  const [tempDob, setTempDob] = useState('');
  const [tempRentan, setTempRentan] = useState('TIDAK_ADA');
  const [tempKesehatan, setTempKesehatan] = useState('');

  // Form states - Step 3
  const [statusHunian, setStatusHunian] = useState<'RUSAK_BERAT' | 'RUSAK_SEDANG' | 'RUSAK_RINGAN' | 'AMAN'>('AMAN');
  const [kondisiKesehatan, setKondisiKesehatan] = useState('');
  const [vulnerables, setVulnerables] = useState<string[]>([]); // DIFABEL, IBU_HAMIL, etc.

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (events.length > 0 && !eventBencanaId) {
      setEventBencanaId(events[0].id);
    }
  }, [events, eventBencanaId]);

  useEffect(() => {
    if (user?.poskoId) {
      setPoskoId(user.poskoId);
    } else if (poskos.length > 0 && !poskoId) {
      setPoskoId(poskos[0].id);
    }
  }, [user, poskos, poskoId]);

  // Real-time validations
  const isNikValid = (val: string) => /^\d{16}$/.test(val);
  const isKkValid = (val: string) => /^\d{16}$/.test(val);

  // Calculate age utility
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

  const handleAddMember = () => {
    if (!tempNama || !tempNik || !tempDob) {
      alert('Nama, NIK, dan Tanggal Lahir anggota keluarga wajib diisi.');
      return;
    }
    if (!isNikValid(tempNik)) {
      alert('NIK anggota keluarga harus berupa 16 digit angka.');
      return;
    }

    // Auto-detect age category
    const age = calculateAge(tempDob);
    let autoRentan = tempRentan;
    if (age > 60) {
      autoRentan = 'LANSIA';
    } else if (age < 5) {
      autoRentan = 'BALITA';
    }

    const newMember: Member = {
      nama: tempNama,
      nik: tempNik,
      hubungan: tempHubungan,
      jenis_kelamin: tempGender,
      tanggal_lahir: tempDob,
      kategori_rentan: autoRentan,
      kondisi_kesehatan: tempKesehatan
    };

    setAnggota(prev => [...prev, newMember]);

    // Reset temp values
    setTempNama('');
    setTempNik('');
    setTempHubungan('ANAK');
    setTempGender('LAKI_LAKI');
    setTempDob('');
    setTempRentan('TIDAK_ADA');
    setTempKesehatan('');
  };

  const handleRemoveMember = (idx: number) => {
    setAnggota(prev => prev.filter((_, i) => i !== idx));
  };

  const handleNextStep = () => {
    setValidationError('');
    if (step === 1) {
      if (!isKkValid(nomorKk)) {
        setValidationError('Nomor Kartu Keluarga wajib diisi dengan 16 digit angka.');
        return;
      }
      if (!isNikValid(nikKepalaKeluarga)) {
        setValidationError('NIK Kepala Keluarga wajib diisi dengan 16 digit angka.');
        return;
      }
      if (!namaKepalaKeluarga || !alamat || !rt || !rw || !kelurahan || !eventBencanaId) {
        setValidationError('Mohon lengkapi semua kolom bertanda bintang (*) di Step 1.');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setValidationError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setValidationError('');
    setIsSubmitting(true);

    // Collect all data
    const payload = {
      nomor_kk: nomorKk,
      nama_kepala_keluarga: namaKepalaKeluarga,
      nik_kepala_keluarga: nikKepalaKeluarga,
      alamat,
      rt,
      rw,
      kelurahan,
      kecamatan: 'Lubuk Begalung', // default kecamatan aktual
      kabupaten: 'Kota Padang',
      zona_risiko: zonaRisiko,
      status_hunian: statusHunian,
      event_bencana_id: eventBencanaId,
      posko_id: poskoId || null,
      // Pass family members + head of family health/rentan
      anggota: [
        // Include Kepala Keluarga as first member in database if desired, 
        // or just family members. Since Kepala Keluarga is already registered 
        // in KK profile, we only pass other members here.
        ...anggota
      ]
    };

    try {
      const res = await fetch('/api/keluarga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Data keluarga berhasil ditambahkan!');
        router.push('/keluarga');
      } else {
        setValidationError(data.error || 'Gagal menyimpan data keluarga.');
      }
    } catch (err) {
      console.error(err);
      setValidationError('Terjadi kesalahan koneksi sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-gray-900">Pendaftaran Keluarga Baru</h1>
        <p className="text-sm text-gray-500">Mendaftarkan data keluarga terdampak bencana menggunakan formulir multi-step.</p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white p-4 rounded-card border border-gray-100 shadow-sm flex items-center justify-around">
        {[
          { label: 'Kepala Keluarga', desc: 'Identitas utama' },
          { label: 'Anggota Keluarga', desc: 'Daftar jiwa' },
          { label: 'Kondisi & Kebutuhan', desc: 'Status hunian & bantuan' }
        ].map((s, idx) => {
          const num = idx + 1;
          const isActive = step === num;
          const isDone = step > num;
          
          return (
            <div key={idx} className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-heading transition-colors ${
                isActive ? 'bg-primary text-white ring-4 ring-primary/20' :
                isDone ? 'bg-success text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {isDone ? (
                  <span className="material-symbols-outlined text-sm">check</span>
                ) : num}
              </span>
              <div className="hidden sm:block">
                <p className={`text-xs font-bold leading-none ${isActive ? 'text-primary' : 'text-gray-900'}`}>{s.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {validationError && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-4 rounded-card">
          {validationError}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <Card className="p-6 space-y-6">
          <h3 className="font-heading font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
            Langkah 1: Profil Kepala Keluarga & Lokasi
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nomor Kartu Keluarga (KK) *"
              type="text"
              placeholder="Contoh: 1371012345678901 (16 digit)"
              value={nomorKk}
              onChange={(e) => setNomorKk(e.target.value.replace(/\D/g, ''))}
              error={nomorKk && !isKkValid(nomorKk) ? 'Nomor KK harus 16 digit.' : ''}
            />

            <div className="relative">
              <Input
                label="NIK Kepala Keluarga *"
                type="text"
                placeholder="Contoh: 1371011212780001 (16 digit)"
                value={nikKepalaKeluarga}
                onChange={(e) => setNikKepalaKeluarga(e.target.value.replace(/\D/g, ''))}
                error={nikKepalaKeluarga && !isNikValid(nikKepalaKeluarga) ? 'NIK harus 16 digit.' : ''}
              />
              {isNikValid(nikKepalaKeluarga) && (
                <span className="absolute right-3 top-[38px] text-success material-symbols-outlined text-sm font-bold">check_circle</span>
              )}
            </div>

            <Input
              label="Nama Lengkap Kepala Keluarga *"
              type="text"
              placeholder="Masukkan nama lengkap kepala keluarga"
              value={namaKepalaKeluarga}
              onChange={(e) => setNamaKepalaKeluarga(e.target.value)}
            />

            <Select
              label="Kelurahan / Desa *"
              placeholder="Pilih kelurahan..."
              options={[
                { value: 'Gurun Laweh Nan XX', label: 'Gurun Laweh Nan XX' },
                { value: 'Lubuk Begalung Nan XX', label: 'Lubuk Begalung Nan XX' },
                { value: 'Banuaran Nan XX', label: 'Banuaran Nan XX' },
                { value: 'Cengkeh Nan XX', label: 'Cengkeh Nan XX' },
                { value: 'Parak Laweh Nan XX', label: 'Parak Laweh Nan XX' },
                { value: 'Koto Lalang', label: 'Koto Lalang' }
              ]}
              value={kelurahan}
              onChange={(e) => setKelurahan(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="RT *"
                type="text"
                placeholder="01"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
              />
              <Input
                label="RW *"
                type="text"
                placeholder="03"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
              />
            </div>

            <Select
              label="Event Tanggap Darurat Bencana *"
              placeholder="Pilih event..."
              options={events.map((e: any) => ({ value: e.id, label: e.nama }))}
              value={eventBencanaId}
              onChange={(e) => setEventBencanaId(e.target.value)}
            />

            {user?.role === 'SUPER_ADMIN' && (
              <Select
                label="Kaitkan ke Posko *"
                placeholder="Pilih posko..."
                options={poskos.map((p: any) => ({ value: p.id, label: p.nama }))}
                value={poskoId}
                onChange={(e) => setPoskoId(e.target.value)}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-heading font-semibold text-sm text-gray-900">Alamat Lengkap (Kampung/Jalan) *</label>
            <textarea
              className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              placeholder="Masukkan alamat tinggal warga sebelum/setelah terdampak..."
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
            />
          </div>

          {/* Zona Risiko Bencana */}
          <div className="space-y-3">
            <label className="font-heading font-semibold text-sm text-gray-900 block">Zona Risiko Tempat Tinggal *</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'MERAH', label: 'Zona Merah (Tinggi)', desc: 'Area paling parah terdampak langsung', border: 'border-danger/20 hover:bg-danger/5', text: 'text-danger' },
                { type: 'KUNING', label: 'Zona Kuning (Sedang)', desc: 'Area berisiko menengah/potensi bahaya', border: 'border-tertiary/20 hover:bg-tertiary/5', text: 'text-tertiary' },
                { type: 'HIJAU', label: 'Zona Hijau (Rendah)', desc: 'Area aman terkendali/posko pengungsi', border: 'border-success/20 hover:bg-success/5', text: 'text-success' }
              ].map((z) => (
                <label
                  key={z.type}
                  className={`border p-4 rounded-card flex flex-col justify-between cursor-pointer transition-all ${z.border} ${
                    zonaRisiko === z.type ? 'ring-2 ring-primary border-transparent' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold font-heading ${z.text}`}>{z.label}</span>
                    <input
                      type="radio"
                      name="zona_risiko"
                      checked={zonaRisiko === z.type}
                      onChange={() => setZonaRisiko(z.type as any)}
                      className="text-primary focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{z.desc}</p>
                </label>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h3 className="font-heading font-bold text-base text-gray-900">
              Langkah 2: Daftar Anggota Keluarga
            </h3>
            <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded-full">
              {anggota.length} Terdaftar
            </span>
          </div>

          {/* Form Input Tambah Anggota */}
          <div className="bg-gray-50/50 border border-gray-100 rounded-card p-4 space-y-4">
            <p className="text-xs font-bold text-gray-700">Tambah Anggota Baru:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Nama Lengkap"
                type="text"
                placeholder="Nama anggota"
                value={tempNama}
                onChange={(e) => setTempNama(e.target.value)}
              />
              <Input
                label="NIK"
                type="text"
                placeholder="16 digit angka NIK"
                value={tempNik}
                onChange={(e) => setTempNik(e.target.value.replace(/\D/g, ''))}
              />
              <Select
                label="Hubungan Keluarga"
                placeholder="Pilih..."
                options={[
                  { value: 'ISTRI', label: 'Istri' },
                  { value: 'ANAK', label: 'Anak' },
                  { value: 'ORANG_TUA', label: 'Orang Tua' },
                  { value: 'LAINNYA', label: 'Lainnya' }
                ]}
                value={tempHubungan}
                onChange={(e) => setTempHubungan(e.target.value)}
              />
              <Select
                label="Jenis Kelamin"
                placeholder="Pilih..."
                options={[
                  { value: 'LAKI_LAKI', label: 'Laki-laki' },
                  { value: 'PEREMPUAN', label: 'Perempuan' }
                ]}
                value={tempGender}
                onChange={(e) => setTempGender(e.target.value)}
              />
              <Input
                label="Tanggal Lahir"
                type="date"
                value={tempDob}
                onChange={(e) => setTempDob(e.target.value)}
              />
              <Select
                label="Kategori Khusus"
                placeholder="Pilih..."
                options={[
                  { value: 'TIDAK_ADA', label: 'Tidak ada' },
                  { value: 'DIFABEL', label: 'Difabel / Disabilitas' },
                  { value: 'IBU_HAMIL', label: 'Ibu Hamil' }
                ]}
                value={tempRentan}
                onChange={(e) => setTempRentan(e.target.value)}
              />
            </div>
            <Input
              label="Catatan Kesehatan Khusus / Riwayat Penyakit"
              type="text"
              placeholder="Contoh: Asma kronis, alergi obat (Opsional)"
              value={tempKesehatan}
              onChange={(e) => setTempKesehatan(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={handleAddMember}>
                <span className="material-symbols-outlined text-sm">person_add</span>
                Tambahkan Anggota
              </Button>
            </div>
          </div>

          {/* List Anggota Terdaftar */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500">Anggota Keluarga Terinput:</p>
            {anggota.length > 0 ? (
              <div className="space-y-3">
                {anggota.map((member, idx) => {
                  const age = calculateAge(member.tanggal_lahir);
                  const isLansia = age > 60;
                  const isBalita = age < 5;
                  
                  return (
                    <div key={idx} className="flex justify-between items-center border border-gray-100 rounded-card p-4 hover:shadow-sm transition-shadow">
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
                            {member.kategori_rentan === 'DIFABEL' && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">DIFABEL</span>}
                            {member.kategori_rentan === 'IBU_HAMIL' && <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">IBU HAMIL</span>}
                          </div>
                          {member.kondisi_kesehatan && (
                            <p className="text-xs text-danger mt-1">Kesehatan: {member.kondisi_kesehatan}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2.5 py-1 border-transparent text-danger hover:bg-danger/10"
                        onClick={() => handleRemoveMember(idx)}
                      >
                        Hapus
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed border-gray-100 rounded-card">
                Belum ada anggota keluarga ditambahkan.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card className="p-6 space-y-6">
          <h3 className="font-heading font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
            Langkah 3: Status Kondisi & Bantuan Rentan
          </h3>

          {/* Status Hunian */}
          <div className="space-y-3">
            <label className="font-heading font-semibold text-sm text-gray-900 block">Kondisi Kerusakan Rumah Tinggal *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: 'RUSAK_BERAT', label: 'Rusak Berat', desc: 'Runtuh/tidak layak huni', bg: 'bg-red-50', text: 'text-red-700' },
                { type: 'RUSAK_SEDANG', label: 'Rusak Sedang', desc: 'Struktur retak/sebagian rusak', bg: 'bg-orange-50', text: 'text-orange-700' },
                { type: 'RUSAK_RINGAN', label: 'Rusak Ringan', desc: 'Dinding retak halus/aman', bg: 'bg-yellow-50', text: 'text-yellow-700' },
                { type: 'AMAN', label: 'Aman (Utuh)', desc: 'Bangunan tidak terpengaruh', bg: 'bg-green-50', text: 'text-green-700' }
              ].map((h) => (
                <label
                  key={h.type}
                  className={`border p-4 rounded-card flex flex-col justify-between cursor-pointer transition-all ${
                    statusHunian === h.type ? 'ring-2 ring-primary border-transparent' : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold font-heading ${h.text}`}>{h.label}</span>
                    <input
                      type="radio"
                      name="status_hunian"
                      checked={statusHunian === h.type}
                      onChange={() => setStatusHunian(h.type as any)}
                      className="text-primary focus:ring-primary"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{h.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Kondisi Kesehatan Kepala Keluarga */}
          <div className="flex flex-col gap-1.5">
            <label className="font-heading font-semibold text-sm text-gray-900">Catatan Kesehatan Kepala Keluarga (Opsional)</label>
            <textarea
              className="w-full min-h-[80px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              placeholder="Deskripsikan riwayat penyakit atau kondisi kesehatan kepala keluarga jika ada..."
              value={kondisiKesehatan}
              onChange={(e) => setKondisiKesehatan(e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="bg-white p-4 rounded-card border border-gray-100 shadow-lg flex justify-between items-center sticky bottom-6 z-40">
        <Button variant="secondary" onClick={() => router.push('/keluarga')}>
          Batal
        </Button>
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="secondary" onClick={handlePrevStep}>
              Kembali
            </Button>
          )}
          {step < 3 ? (
            <Button variant="primary" onClick={handleNextStep}>
              Selanjutnya
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pendaftaran'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
