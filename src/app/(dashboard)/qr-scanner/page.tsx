'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { resilientFetch } from '@/lib/resilientFetch';
import { useAuth } from '@/hooks/useAuth';

interface AnggotaKK {
  id: string;
  nama: string;
  hubungan: string;
  jenisKelamin: string;
  tanggalLahir: string;
  kategoriRentan: string | null;
  statusKesehatan: 'SEHAT' | 'DALAM_PENANGANAN' | 'SAKIT' | 'DARURAT';
  kondisiKesehatan: string | null;
}

interface Distribusi {
  id: string;
  jenisBantuan: string;
  kuantitas: string;
  tanggalDistribusi: string;
  petugas: string;
  posko: string;
}

interface PoskoOption {
  id: string;
  nama: string;
}

interface KKProfile {
  id: string;
  nomorKk: string;
  namaKepalaKeluarga: string;
  nikKepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  zonaRisiko: string;
  statusVerifikasi: string;
  statusHunian: string;
  qrCodeData: string;
  posko: { id: string; nama: string } | null;
  anggota: AnggotaKK[];
  distribusi: Distribusi[];
}

export default function QrScannerPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'scanner' | 'result'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [kkProfile, setKkProfile] = useState<KKProfile | null>(null);

  // Distribution form
  const [showDistForm, setShowDistForm] = useState(false);
  const [distJenis, setDistJenis] = useState('');
  const [distKuantitas, setDistKuantitas] = useState('');
  const [distCatatan, setDistCatatan] = useState('');
  const [isSavingDist, setIsSavingDist] = useState(false);
  const [distSuccess, setDistSuccess] = useState('');

  // Health Status inline update state
  const [editingHealthMemberId, setEditingHealthMemberId] = useState<string | null>(null);
  const [healthStatusSelect, setHealthStatusSelect] = useState<'SEHAT' | 'DALAM_PENANGANAN' | 'SAKIT' | 'DARURAT'>('SEHAT');
  const [healthNoteInput, setHealthNoteInput] = useState('');
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState('');

  // Posko change state
  const [poskoOptions, setPoskoOptions] = useState<PoskoOption[]>([]);
  const [isEditingPosko, setIsEditingPosko] = useState(false);
  const [selectedPoskoId, setSelectedPoskoId] = useState('');
  const [isSavingPosko, setIsSavingPosko] = useState(false);
  const [poskoMsg, setPoskoMsg] = useState('');

  // Camera scanner
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'qr-scanner-container';

  // Load Posko list for dropdown if user is SuperAdmin or Kepala Posko
  useEffect(() => {
    async function fetchPoskos() {
      try {
        const res = await fetch('/api/posko');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setPoskoOptions(data.data.map((p: any) => ({ id: p.id, nama: p.nama })));
        }
      } catch (err) {
        console.error('Failed to load posko list:', err);
      }
    }
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO') {
      fetchPoskos();
    }
  }, [user]);

  const lookupQrCode = useCallback(async (code: string) => {
    setIsSearching(true);
    setErrorMsg('');
    setHealthMsg('');
    setPoskoMsg('');
    setKkProfile(null);

    try {
      const res = await fetch(`/api/keluarga/qr/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.success) {
        setKkProfile(data.data);
        setSelectedPoskoId(data.data.posko?.id || '');
        setMode('result');
      } else {
        const msg = data.error?.message || data.error || 'QR Code tidak ditemukan.';
        setErrorMsg(msg);
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat mencari data. Periksa koneksi Anda.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Helper to safely stop and clear html5-qrcode scanner without throwing unmount errors
  const stopAndClearScanner = async (scanner: any) => {
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Ignore if scanner is already stopped or paused
    }
    try {
      if (typeof scanner.clear === 'function') {
        scanner.clear();
      }
    } catch {
      // Ignore clear error
    }
  };

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        const oldScanner = scannerRef.current;
        scannerRef.current = null;
        await stopAndClearScanner(oldScanner);
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          const currentScanner = scannerRef.current || scanner;
          scannerRef.current = null;
          setIsScanning(false);
          stopAndClearScanner(currentScanner);
          lookupQrCode(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setErrorMsg('Kamera tidak dapat diakses. Gunakan pencarian manual di bawah.');
    }
  }, [lookupQrCode]);

  const stopScanner = useCallback(async () => {
    const currentScanner = scannerRef.current;
    scannerRef.current = null;
    setIsScanning(false);
    if (currentScanner) {
      await stopAndClearScanner(currentScanner);
    }
  }, []);

  useEffect(() => {
    return () => {
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      if (currentScanner) {
        stopAndClearScanner(currentScanner);
      }
    };
  }, []);

  const handleManualSearch = () => {
    const code = manualCode.trim();
    if (!code) return;
    lookupQrCode(code);
  };

  const handleDistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kkProfile || !distJenis || !distKuantitas) return;

    setIsSavingDist(true);
    setDistSuccess('');

    try {
      const res = await resilientFetch('/api/distribusi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kartuKeluargaId: kkProfile.id,
          jenisBantuan: distJenis,
          kuantitas: distKuantitas,
          catatan: distCatatan || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDistSuccess(data.message || 'Distribusi berhasil dicatat!');
        setDistJenis('');
        setDistKuantitas('');
        setDistCatatan('');
        setShowDistForm(false);
        lookupQrCode(kkProfile.qrCodeData);
      } else {
        setErrorMsg(data.error || 'Gagal mencatat distribusi.');
      }
    } catch (err: any) {
      if (err.message?.includes('antrean offline')) {
        setDistSuccess('Koneksi terputus. Transaksi disimpan dalam antrean offline dan akan dikirim otomatis saat koneksi pulih.');
      } else {
        setErrorMsg('Gagal mengirim data distribusi.');
      }
    } finally {
      setIsSavingDist(false);
    }
  };

  // Handle member health status update
  const handleSaveHealth = async (memberId: string) => {
    if (!kkProfile) return;
    setIsSavingHealth(true);
    setHealthMsg('');
    try {
      const res = await fetch(`/api/keluarga/${kkProfile.id}/anggota/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusKesehatan: healthStatusSelect,
          kondisiKesehatan: healthNoteInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHealthMsg('Status kesehatan berhasil diperbarui!');
        setEditingHealthMemberId(null);
        lookupQrCode(kkProfile.qrCodeData);
      } else {
        setErrorMsg(data.message || 'Gagal memperbarui status kesehatan.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setIsSavingHealth(false);
    }
  };

  // Handle Posko assignment change by SuperAdmin / Kepala Posko
  const handleSavePosko = async () => {
    if (!kkProfile) return;
    setIsSavingPosko(true);
    setPoskoMsg('');
    try {
      const res = await fetch(`/api/keluarga/${kkProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poskoId: selectedPoskoId || null }),
      });
      const data = await res.json();
      if (data.success) {
        setPoskoMsg('Posisi Posko berhasil diperbarui!');
        setIsEditingPosko(false);
        lookupQrCode(kkProfile.qrCodeData);
      } else {
        setErrorMsg(data.error || 'Gagal memperbarui posisi posko.');
      }
    } catch {
      setErrorMsg('Gagal memperbarui posisi posko.');
    } finally {
      setIsSavingPosko(false);
    }
  };

  const handleScanAgain = () => {
    setMode('scanner');
    setKkProfile(null);
    setErrorMsg('');
    setDistSuccess('');
    setHealthMsg('');
    setPoskoMsg('');
    setShowDistForm(false);
    setIsEditingPosko(false);
    setEditingHealthMemberId(null);
  };

  const riskBadge = (zona: string) => {
    const v = zona === 'MERAH' ? 'danger' : zona === 'KUNING' ? 'warning' : 'success';
    return <Badge variant={v}>{zona}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-gray-900">QR Scanner Kamera</h1>
        <p className="text-sm text-gray-500">
          Scan QR Code warga terdampak untuk memverifikasi profil, memperbarui status kesehatan, dan menyalurkan bantuan.
        </p>
      </div>

      {mode === 'scanner' && (
        <>
          {/* Scanner Area */}
          <Card className="p-0 overflow-hidden">
            <div className="relative bg-gray-900 flex items-center justify-center" style={{ minHeight: 340 }}>
              <div id={scannerContainerId} className="w-full max-w-[340px]" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80">
                  <div className="relative w-[260px] h-[260px]">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-success rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-success rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-success rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-success rounded-br-lg" />

                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce" style={{ top: '50%' }} />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-white/30">qr_code_scanner</span>
                    </div>
                  </div>

                  <Button variant="primary" onClick={startScanner} className="mt-2">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Aktifkan Kamera
                  </Button>
                </div>
              )}

              {isScanning && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-10">
                  <Button variant="danger" onClick={stopScanner} className="h-10 min-h-0 text-xs">
                    <span className="material-symbols-outlined text-sm">stop</span>
                    Hentikan Scan
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Manual Fallback */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="material-symbols-outlined text-lg">keyboard</span>
              <h3 className="font-heading font-bold text-sm">Pencarian Manual (Fallback)</h3>
            </div>
            <p className="text-xs text-gray-400">Jika kamera tidak tersedia, masukkan kode ID warga secara manual.</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Contoh: PG-2026-1029"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                />
              </div>
              <Button variant="primary" onClick={handleManualSearch} disabled={isSearching || !manualCode.trim()}>
                {isSearching ? (
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">search</span>
                )}
                Cari
              </Button>
            </div>
          </Card>

          {errorMsg && (
            <Card className="p-4 border-l-4 border-danger bg-danger/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-danger">error</span>
                <p className="text-sm text-danger font-semibold">{errorMsg}</p>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ===== RESULT MODE ===== */}
      {mode === 'result' && kkProfile && (
        <>
          <Card className="p-4 border-l-4 border-success bg-success/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <p className="font-heading font-bold text-success">QR Code Terverifikasi</p>
                <p className="text-xs text-gray-500">Kode: {kkProfile.qrCodeData}</p>
              </div>
            </div>
          </Card>

          {distSuccess && (
            <Card className="p-4 border-l-4 border-primary bg-primary/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-sm text-primary font-semibold">{distSuccess}</p>
              </div>
            </Card>
          )}

          {healthMsg && (
            <Card className="p-4 border-l-4 border-success bg-success/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-success">medical_services</span>
                <p className="text-sm text-success font-semibold">{healthMsg}</p>
              </div>
            </Card>
          )}

          {poskoMsg && (
            <Card className="p-4 border-l-4 border-primary bg-primary/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <p className="text-sm text-primary font-semibold">{poskoMsg}</p>
              </div>
            </Card>
          )}

          {/* Profile Card */}
          <Card className="p-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase shrink-0">
                {kkProfile.namaKepalaKeluarga.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold font-heading text-gray-900">{kkProfile.namaKepalaKeluarga}</h2>
                  {riskBadge(kkProfile.zonaRisiko)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">NIK: {kkProfile.nikKepalaKeluarga} • KK: {kkProfile.nomorKk}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Alamat</p>
                <p className="text-gray-900">{kkProfile.alamat}, RT {kkProfile.rt}/RW {kkProfile.rw}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Kelurahan</p>
                <p className="text-gray-900">{kkProfile.kelurahan}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Posko Terdaftar</p>
                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'KEPALA_POSKO') && !isEditingPosko && (
                    <button
                      onClick={() => setIsEditingPosko(true)}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Ubah Posko
                    </button>
                  )}
                </div>
                {!isEditingPosko ? (
                  <p className="text-gray-900 font-semibold">{kkProfile.posko?.nama || '— (Belum Ditentukan)'}</p>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <select
                      className="w-full h-10 px-3 border border-gray-200 rounded-btn text-xs bg-white outline-none focus:ring-2 focus:ring-primary"
                      value={selectedPoskoId}
                      onChange={(e) => setSelectedPoskoId(e.target.value)}
                    >
                      <option value="">-- Tanpa Posko / Belum Ditentukan --</option>
                      {poskoOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.nama}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-8 min-h-0 text-xs py-1" onClick={() => setIsEditingPosko(false)}>
                        Batal
                      </Button>
                      <Button variant="primary" className="h-8 min-h-0 text-xs py-1" onClick={handleSavePosko} disabled={isSavingPosko}>
                        {isSavingPosko ? 'Menyimpan...' : 'Simpan Posko'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Jumlah Anggota</p>
                <p className="text-gray-900 font-bold">{kkProfile.anggota.length} Jiwa</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Status Hunian</p>
                <Badge variant={kkProfile.statusHunian.includes('BERAT') ? 'danger' : kkProfile.statusHunian === 'AMAN' ? 'success' : 'warning'}>
                  {kkProfile.statusHunian.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Status Verifikasi</p>
                <Badge variant={kkProfile.statusVerifikasi === 'TERVERIFIKASI' ? 'success' : kkProfile.statusVerifikasi === 'DITOLAK' ? 'danger' : 'neutral'}>
                  {kkProfile.statusVerifikasi}
                </Badge>
              </div>
            </div>

            {/* Anggota Keluarga & Status Kesehatan */}
            {kkProfile.anggota.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-gray-900">
                    Anggota Keluarga & Status Kesehatan
                  </h3>
                  <span className="text-xs text-gray-400">Klik pensil untuk update kesehatan</span>
                </div>
                <div className="space-y-2.5">
                  {kkProfile.anggota.map((a) => (
                    <div key={a.id} className="p-3 bg-gray-50 rounded-btn space-y-2 border border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-base">
                            {a.jenisKelamin === 'LAKI_LAKI' ? 'man' : 'woman'}
                          </span>
                          <span className="font-semibold text-gray-900">{a.nama}</span>
                          <span className="text-xs text-gray-500 font-normal">({a.hubungan.replace(/_/g, ' ')})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.kategoriRentan && a.kategoriRentan !== 'TIDAK_ADA' && (
                            <Badge variant="warning">{a.kategoriRentan}</Badge>
                          )}
                          {editingHealthMemberId !== a.id && (
                            <button
                              onClick={() => {
                                setEditingHealthMemberId(a.id);
                                setHealthStatusSelect(a.statusKesehatan || 'SEHAT');
                                setHealthNoteInput(a.kondisiKesehatan || '');
                              }}
                              className="text-gray-400 hover:text-primary transition-colors p-1"
                              title="Update Status Kesehatan"
                            >
                              <span className="material-symbols-outlined text-base">edit_note</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Display Status Kesehatan (4 Kategori + Catatan Detail) */}
                      {editingHealthMemberId !== a.id ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                          <Badge
                            variant={
                              a.statusKesehatan === 'SEHAT'
                                ? 'success'
                                : a.statusKesehatan === 'DALAM_PENANGANAN'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {a.statusKesehatan === 'SEHAT'
                              ? '💚 SEHAT'
                              : a.statusKesehatan === 'DALAM_PENANGANAN'
                              ? '🟡 DALAM PENANGANAN'
                              : a.statusKesehatan === 'SAKIT'
                              ? '🔴 SAKIT / LUKA-LUKA'
                              : '🚨 DARURAT'}
                          </Badge>
                          {a.kondisiKesehatan && (
                            <span className="text-gray-600 font-medium">
                              • {a.kondisiKesehatan}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Inline Health Editor (4 Status + Text Catatan) */
                        <div className="pt-2 border-t border-gray-200 space-y-3 bg-white p-2.5 rounded-btn">
                          <label className="text-xs font-bold text-gray-800 block">
                            Pilih Status Kesehatan ({a.nama}):
                          </label>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setHealthStatusSelect('SEHAT')}
                              className={`p-2 rounded-btn font-semibold border text-left flex items-center gap-1.5 transition-all ${
                                healthStatusSelect === 'SEHAT'
                                  ? 'border-success bg-success/10 text-success ring-2 ring-success/20'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>💚</span> Sehat
                            </button>
                            <button
                              type="button"
                              onClick={() => setHealthStatusSelect('DALAM_PENANGANAN')}
                              className={`p-2 rounded-btn font-semibold border text-left flex items-center gap-1.5 transition-all ${
                                healthStatusSelect === 'DALAM_PENANGANAN'
                                  ? 'border-warning bg-warning/10 text-warning ring-2 ring-warning/20'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>🟡</span> Dalam Penanganan
                            </button>
                            <button
                              type="button"
                              onClick={() => setHealthStatusSelect('SAKIT')}
                              className={`p-2 rounded-btn font-semibold border text-left flex items-center gap-1.5 transition-all ${
                                healthStatusSelect === 'SAKIT'
                                  ? 'border-danger bg-danger/10 text-danger ring-2 ring-danger/20'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>🔴</span> Sakit / Luka-Luka
                            </button>
                            <button
                              type="button"
                              onClick={() => setHealthStatusSelect('DARURAT')}
                              className={`p-2 rounded-btn font-semibold border text-left flex items-center gap-1.5 transition-all ${
                                healthStatusSelect === 'DARURAT'
                                  ? 'border-red-600 bg-red-600/10 text-red-600 ring-2 ring-red-600/20'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>🚨</span> Darurat
                            </button>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">
                              Catatan Detail Kesehatan (Opsional):
                            </label>
                            <textarea
                              className="w-full text-xs p-2 border border-gray-300 rounded-btn focus:ring-2 focus:ring-primary outline-none"
                              placeholder="Contoh: Pusing demam 38C, Butuh parasetamol, Luka memar di kaki..."
                              value={healthNoteInput}
                              onChange={(e) => setHealthNoteInput(e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              variant="secondary"
                              className="h-7 min-h-0 text-xs py-1"
                              onClick={() => setEditingHealthMemberId(null)}
                            >
                              Batal
                            </Button>
                            <Button
                              variant="primary"
                              className="h-7 min-h-0 text-xs py-1"
                              onClick={() => handleSaveHealth(a.id)}
                              disabled={isSavingHealth}
                            >
                              {isSavingHealth ? 'Menyimpan...' : 'Simpan Status Kesehatan'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Riwayat Bantuan */}
          <Card className="p-5 space-y-4">
            <h3 className="font-heading font-bold text-sm text-gray-900">Riwayat Bantuan Terakhir</h3>
            {kkProfile.distribusi.length > 0 ? (
              <div className="space-y-3">
                {kkProfile.distribusi.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-base">inventory_2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{d.jenisBantuan}</p>
                      <p className="text-xs text-gray-500">
                        {d.kuantitas} • {new Date(d.tanggalDistribusi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-400">Petugas: {d.petugas} • {d.posko}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Belum ada riwayat bantuan untuk KK ini.</p>
            )}
          </Card>

          {/* Distribution Form */}
          {!showDistForm ? (
            <Button variant="primary" className="w-full" onClick={() => setShowDistForm(true)}>
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Proses Distribusi Bantuan
            </Button>
          ) : (
            <Card className="p-5 space-y-4 border-2 border-primary/20">
              <h3 className="font-heading font-bold text-gray-900">Catat Distribusi Bantuan</h3>
              <form onSubmit={handleDistSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Jenis Bantuan *</label>
                    <select
                      className="w-full h-12 px-4 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={distJenis}
                      onChange={(e) => setDistJenis(e.target.value)}
                      required
                    >
                      <option value="">Pilih Jenis Bantuan</option>
                      <option value="Sembako">Sembako</option>
                      <option value="Selimut">Selimut</option>
                      <option value="Air Bersih (Galon)">Air Bersih (Galon)</option>
                      <option value="Paket Obat PPPK">Paket Obat PPPK</option>
                      <option value="Tenda Darurat">Tenda Darurat</option>
                      <option value="Pakaian Layak Pakai">Pakaian Layak Pakai</option>
                      <option value="Susu & Makanan Bayi">Susu & Makanan Bayi</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Input
                      label="Kuantitas *"
                      placeholder="Contoh: 2 Karung, 5 Galon"
                      value={distKuantitas}
                      onChange={(e) => setDistKuantitas(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="font-heading font-semibold text-sm text-gray-900 block mb-1.5">Catatan (Opsional)</label>
                  <textarea
                    className="w-full min-h-[70px] p-3 border border-gray-100 rounded-btn text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Catatan tambahan..."
                    value={distCatatan}
                    onChange={(e) => setDistCatatan(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="secondary" onClick={() => setShowDistForm(false)}>
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSavingDist || !distJenis || !distKuantitas}>
                    {isSavingDist ? (
                      <>
                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">check</span>
                        Simpan Distribusi
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {errorMsg && (
            <Card className="p-4 border-l-4 border-danger bg-danger/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-danger">error</span>
                <p className="text-sm text-danger font-semibold">{errorMsg}</p>
              </div>
            </Card>
          )}

          {/* Scan Again */}
          <Button variant="secondary" className="w-full" onClick={handleScanAgain}>
            <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            Scan QR Lain
          </Button>
        </>
      )}
    </div>
  );
}
