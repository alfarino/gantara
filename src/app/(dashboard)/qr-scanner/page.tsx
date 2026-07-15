'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { resilientFetch } from '@/lib/resilientFetch';

interface AnggotaKK {
  id: string;
  nama: string;
  hubungan: string;
  jenisKelamin: string;
  tanggalLahir: string;
  kategoriRentan: string | null;
}

interface Distribusi {
  id: string;
  jenisBantuan: string;
  kuantitas: string;
  tanggalDistribusi: string;
  petugas: string;
  posko: string;
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

  // Camera scanner
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'qr-scanner-container';

  const lookupQrCode = useCallback(async (code: string) => {
    setIsSearching(true);
    setErrorMsg('');
    setKkProfile(null);

    try {
      const res = await fetch(`/api/keluarga/qr/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.success) {
        setKkProfile(data.data);
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

  const startScanner = useCallback(async () => {
    try {
      // Dynamically import html5-qrcode only on client
      const { Html5Qrcode } = await import('html5-qrcode');

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch { /* ignore */ }
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // QR code detected
          scanner.stop().catch(() => {});
          setIsScanning(false);
          lookupQrCode(decodedText);
        },
        () => {
          // Scan error (no QR found in frame), ignore silently
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setErrorMsg('Kamera tidak dapat diakses. Gunakan pencarian manual di bawah.');
    }
  }, [lookupQrCode]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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
        // Re-fetch profile to update distribution history
        lookupQrCode(kkProfile.qrCodeData);
      } else {
        setErrorMsg(data.error || 'Gagal mencatat distribusi.');
      }
    } catch (err: any) {
      if (err.message.includes('antrean offline')) {
        setDistSuccess('Koneksi terputus. Transaksi disimpan dalam antrean offline dan akan dikirim otomatis saat koneksi pulih.');
      } else {
        setErrorMsg('Gagal mengirim data distribusi.');
      }
    } finally {
      setIsSavingDist(false);
    }
  };

  const handleScanAgain = () => {
    setMode('scanner');
    setKkProfile(null);
    setErrorMsg('');
    setDistSuccess('');
    setShowDistForm(false);
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
          Scan QR Code warga terdampak untuk memverifikasi profil dan menyalurkan bantuan.
        </p>
      </div>

      {mode === 'scanner' && (
        <>
          {/* Scanner Area */}
          <Card className="p-0 overflow-hidden">
            <div className="relative bg-gray-900 flex items-center justify-center" style={{ minHeight: 340 }}>
              {/* Camera viewfinder container */}
              <div id={scannerContainerId} className="w-full max-w-[340px]" />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80">
                  {/* Corner brackets decoration */}
                  <div className="relative w-[260px] h-[260px]">
                    {/* Top-left */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-success rounded-tl-lg" />
                    {/* Top-right */}
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-success rounded-tr-lg" />
                    {/* Bottom-left */}
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-success rounded-bl-lg" />
                    {/* Bottom-right */}
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-success rounded-br-lg" />

                    {/* Laser line */}
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

          {/* Error */}
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
          {/* Success Banner */}
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

          {/* Distribution Success */}
          {distSuccess && (
            <Card className="p-4 border-l-4 border-primary bg-primary/5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">check_circle</span>
                <p className="text-sm text-primary font-semibold">{distSuccess}</p>
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
                <p className="text-xs text-gray-400 font-semibold uppercase">Posko Terdaftar</p>
                <p className="text-gray-900">{kkProfile.posko?.nama || '—'}</p>
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

            {/* Anggota Keluarga */}
            {kkProfile.anggota.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-heading font-bold text-sm text-gray-900 mb-3">Anggota Keluarga</h3>
                <div className="space-y-2">
                  {kkProfile.anggota.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-btn text-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-base">
                          {a.jenisKelamin === 'LAKI_LAKI' ? 'man' : 'woman'}
                        </span>
                        <span className="font-semibold text-gray-900">{a.nama}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{a.hubungan.replace(/_/g, ' ')}</span>
                        {a.kategoriRentan && a.kategoriRentan !== 'TIDAK_ADA' && (
                          <Badge variant="warning">{a.kategoriRentan}</Badge>
                        )}
                      </div>
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

          {/* Error */}
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
