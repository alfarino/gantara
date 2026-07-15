'use client';
import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PreviewRow {
  row: number;
  nik: string;
  nomor_kk: string;
  nama: string;
  alamat: string;
  kelurahan: string;
  zona_risiko: string;
  status: 'VALID' | 'ERROR';
  error?: string;
}

interface ImportResult {
  importSessionId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: PreviewRow[];
}

export default function ImportKeluargaPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<{ insertedCount: number; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
        setConfirmSuccess(null);
        setErrorMessage('');
      } else {
        setErrorMessage('Format file tidak didukung. Gunakan file .xlsx atau .csv.');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
        setConfirmSuccess(null);
        setErrorMessage('');
      } else {
        setErrorMessage('Format file tidak didukung. Gunakan file .xlsx atau .csv.');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/keluarga/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setImportResult(data.data);
      } else {
        setErrorMessage(data.error || 'Terjadi kesalahan saat memproses file.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!importResult) return;

    setIsConfirming(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/keluarga/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importSessionId: importResult.importSessionId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setConfirmSuccess({
          insertedCount: data.data.insertedCount,
          message: data.message,
        });
        setImportResult(null);
        setSelectedFile(null);
      } else {
        setErrorMessage(data.error || 'Gagal mengonfirmasi import.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/keluarga/import/template', '_blank');
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    setConfirmSuccess(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Import Data Keluarga Massal</h1>
          <p className="text-sm text-gray-500">Unggah berkas Excel (.xlsx) untuk menambahkan data KK secara massal.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/keluarga">
            <Button variant="secondary">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Kembali
            </Button>
          </Link>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            <span className="material-symbols-outlined text-sm">download</span>
            Unduh Template Excel
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {confirmSuccess && (
        <Card className="p-6 border-l-4 border-success bg-success/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold font-heading text-gray-900">Import Berhasil!</h3>
              <p className="text-sm text-gray-600 mt-1">{confirmSuccess.message}</p>
              <div className="flex gap-3 mt-4">
                <Link href="/keluarga">
                  <Button variant="primary">
                    <span className="material-symbols-outlined text-sm">list</span>
                    Lihat Daftar KK
                  </Button>
                </Link>
                <Button variant="secondary" onClick={handleReset}>
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Import Lagi
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Card className="p-4 border-l-4 border-danger bg-danger/5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-danger">error</span>
            <p className="text-sm text-danger font-semibold">{errorMessage}</p>
          </div>
        </Card>
      )}

      {/* Dropzone */}
      {!confirmSuccess && (
        <Card className="p-0 overflow-hidden">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200
              border-2 border-dashed rounded-card
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : selectedFile
                  ? 'border-success/50 bg-success/5'
                  : 'border-gray-200 bg-gray-50/50 hover:border-primary/40 hover:bg-primary/5'
              }
            `}
          >
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
              ${isDragging ? 'bg-primary/10 text-primary' : selectedFile ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}
            `}>
              <span className="material-symbols-outlined text-3xl">
                {selectedFile ? 'description' : 'cloud_upload'}
              </span>
            </div>

            {selectedFile ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk mengganti file
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">
                  Seret dan lepaskan file Excel di sini
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  atau klik untuk memilih file (.xlsx / .csv)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFile && !importResult && (
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <Button variant="primary" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                    Memvalidasi Data...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">upload</span>
                    Unggah & Validasi
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Validation Summary */}
      {importResult && (
        <Card className={`p-4 border-l-4 ${importResult.errorRows > 0 ? 'border-warning bg-warning/5' : 'border-primary bg-primary/5'}`}>
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined ${importResult.errorRows > 0 ? 'text-warning' : 'text-primary'}`}>
              {importResult.errorRows > 0 ? 'warning' : 'info'}
            </span>
            <p className="text-sm font-semibold text-gray-900">
              {importResult.totalRows} Baris Data Ditemukan: {' '}
              <span className="text-success">{importResult.validRows} Data Valid</span>
              {importResult.errorRows > 0 && (
                <>, <span className="text-danger">{importResult.errorRows} Data Eror</span></>
              )}
            </p>
          </div>
        </Card>
      )}

      {/* Preview Table */}
      {importResult && importResult.preview.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-heading font-bold text-gray-900">Pratinjau Data Import</h2>
            <p className="text-xs text-gray-500 mt-1">Baris berstatus eror (merah) tidak akan dimasukkan ke database.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Baris</th>
                  <th className="py-3 px-4">NIK</th>
                  <th className="py-3 px-4">Nama Kepala Keluarga</th>
                  <th className="py-3 px-4">Alamat</th>
                  <th className="py-3 px-4">Kelurahan</th>
                  <th className="py-3 px-4">Zona</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {importResult.preview.map((row) => (
                  <tr
                    key={row.row}
                    className={`
                      transition-colors
                      ${row.status === 'ERROR'
                        ? 'bg-danger/5 border-l-4 border-danger'
                        : 'hover:bg-gray-50/50'
                      }
                    `}
                  >
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">{row.row}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">{row.nik}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{row.nama || '—'}</p>
                        {row.error && (
                          <p className="text-xs text-danger mt-0.5 font-medium">{row.error}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs max-w-[200px] truncate">{row.alamat || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{row.kelurahan || '—'}</td>
                    <td className="py-3 px-4">
                      {row.zona_risiko && (
                        <Badge variant={
                          row.zona_risiko === 'MERAH' ? 'danger' :
                          row.zona_risiko === 'KUNING' ? 'warning' : 'success'
                        }>
                          {row.zona_risiko}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={row.status === 'VALID' ? 'success' : 'danger'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirm Button */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4">
            <Button variant="secondary" onClick={handleReset}>
              <span className="material-symbols-outlined text-sm">refresh</span>
              Unggah Ulang
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isConfirming || importResult.validRows === 0}
            >
              {isConfirming ? (
                <>
                  <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                  Mengimpor Data...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">database</span>
                  Konfirmasi Import ({importResult.validRows} Data Valid)
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
