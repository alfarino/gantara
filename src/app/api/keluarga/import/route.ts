import { NextResponse } from 'next/server';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSession, type ImportRow } from '@/lib/importSession';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

const VALID_ZONA = ['MERAH', 'KUNING', 'HIJAU'];
const VALID_HUNIAN = ['RUSAK_BERAT', 'RUSAK_SEDANG', 'RUSAK_RINGAN', 'AMAN'];

export async function POST(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'KEPALA_POSKO')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan.' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return NextResponse.json({ success: false, error: 'File tidak dapat dibaca. Pastikan file berformat .xlsx atau .csv yang valid.' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, error: 'File tidak memiliki sheet data.' }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // First row is header, skip it
    if (rows.length < 2) {
      return NextResponse.json({ success: false, error: 'File tidak memiliki data. Pastikan data dimulai dari baris ke-2.' }, { status: 400 });
    }

    const dataRows = rows.slice(1).filter((row) => {
      // Filter out completely empty rows
      return row.some((cell: any) => String(cell).trim() !== '');
    });

    if (dataRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada baris data yang ditemukan dalam file.' }, { status: 400 });
    }

    // Collect all NIKs from file for intra-file duplicate detection
    const nikCountInFile = new Map<string, number>();
    for (const row of dataRows) {
      const nik = String(row[1] || '').trim();
      if (nik) {
        nikCountInFile.set(nik, (nikCountInFile.get(nik) || 0) + 1);
      }
    }

    // Collect all NIKs to check against database
    const allNiks = Array.from(nikCountInFile.keys());
    const existingKks = await prisma.kartuKeluarga.findMany({
      where: { nikKepalaKeluarga: { in: allNiks } },
      select: { nikKepalaKeluarga: true },
    });
    const existingNikSet = new Set(existingKks.map((kk) => kk.nikKepalaKeluarga));

    // Also check Nomor KK duplicates
    const kkCountInFile = new Map<string, number>();
    for (const row of dataRows) {
      const nomorKk = String(row[0] || '').trim();
      if (nomorKk) {
        kkCountInFile.set(nomorKk, (kkCountInFile.get(nomorKk) || 0) + 1);
      }
    }
    const allNomorKks = Array.from(kkCountInFile.keys());
    const existingNomorKks = await prisma.kartuKeluarga.findMany({
      where: { nomorKk: { in: allNomorKks } },
      select: { nomorKk: true },
    });
    const existingNomorKkSet = new Set(existingNomorKks.map((kk) => kk.nomorKk));

    // Validate each row
    const preview: ImportRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-indexed, row 1 is header

      const nomorKk = String(row[0] || '').trim();
      const nik = String(row[1] || '').trim();
      const nama = String(row[2] || '').trim();
      const alamat = String(row[3] || '').trim();
      const rt = String(row[4] || '').trim();
      const rw = String(row[5] || '').trim();
      const kelurahan = String(row[6] || '').trim();
      const kecamatan = String(row[7] || '').trim();
      const kabupaten = String(row[8] || '').trim();
      const zonaRisiko = String(row[9] || '').trim().toUpperCase();
      const statusHunian = String(row[10] || '').trim().toUpperCase();

      const errors: string[] = [];

      // Validate required fields
      if (!nama) errors.push('Nama Kepala Keluarga wajib diisi');
      if (!alamat) errors.push('Alamat wajib diisi');
      if (!kelurahan) errors.push('Kelurahan wajib diisi');

      // Validate NIK format
      if (!nik) {
        errors.push('NIK wajib diisi');
      } else if (!/^\d{16}$/.test(nik)) {
        errors.push(`NIK harus 16 digit angka (ditemukan ${nik.length} karakter)`);
      }

      // Validate Nomor KK format
      if (!nomorKk) {
        errors.push('Nomor KK wajib diisi');
      } else if (!/^\d{16}$/.test(nomorKk)) {
        errors.push(`Nomor KK harus 16 digit angka (ditemukan ${nomorKk.length} karakter)`);
      }

      // Validate Zona Risiko
      if (zonaRisiko && !VALID_ZONA.includes(zonaRisiko)) {
        errors.push(`Zona Risiko tidak valid: "${zonaRisiko}". Pilih: MERAH, KUNING, atau HIJAU`);
      }

      // Validate Status Hunian
      if (statusHunian && !VALID_HUNIAN.includes(statusHunian)) {
        errors.push(`Status Hunian tidak valid: "${statusHunian}"`);
      }

      // Check duplicate NIK in file
      if (nik && (nikCountInFile.get(nik) || 0) > 1) {
        errors.push('NIK duplikat di dalam file Excel');
      }

      // Check duplicate NIK in database
      if (nik && existingNikSet.has(nik)) {
        errors.push('NIK sudah terdaftar di sistem');
      }

      // Check duplicate Nomor KK in file
      if (nomorKk && (kkCountInFile.get(nomorKk) || 0) > 1) {
        errors.push('Nomor KK duplikat di dalam file Excel');
      }

      // Check duplicate Nomor KK in database
      if (nomorKk && existingNomorKkSet.has(nomorKk)) {
        errors.push('Nomor KK sudah terdaftar di sistem');
      }

      const rowData: ImportRow = {
        row: rowNum,
        nomor_kk: nomorKk,
        nik,
        nama,
        alamat,
        rt: rt || '00',
        rw: rw || '00',
        kelurahan,
        kecamatan: kecamatan || 'Lubuk Begalung',
        kabupaten: kabupaten || 'Kota Padang',
        zona_risiko: zonaRisiko || 'KUNING',
        status_hunian: statusHunian || 'AMAN',
        status: errors.length > 0 ? 'ERROR' : 'VALID',
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };

      preview.push(rowData);
    }

    const validRows = preview.filter((r) => r.status === 'VALID');
    const errorRows = preview.filter((r) => r.status === 'ERROR');

    // Store session
    const sessionId = randomUUID();
    createSession(sessionId, validRows, preview);

    return NextResponse.json({
      success: true,
      data: {
        importSessionId: sessionId,
        totalRows: preview.length,
        validRows: validRows.length,
        errorRows: errorRows.length,
        preview,
      },
    });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
