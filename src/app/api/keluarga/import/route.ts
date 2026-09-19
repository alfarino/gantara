import { NextResponse } from 'next/server';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSession, type ImportRow } from '@/lib/importSession';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

const VALID_ZONA = ['MERAH', 'KUNING', 'HIJAU'];
const VALID_HUNIAN = ['RUSAK_BERAT', 'RUSAK_SEDANG', 'RUSAK_RINGAN', 'AMAN'];

function normalizeHubungan(input: string): string {
  const val = String(input || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (val.includes('KEPALA') || val === 'KEPALA_KELUARGA') return 'KEPALA_KELUARGA';
  if (val === 'ISTRI') return 'ISTRI';
  if (val === 'ANAK') return 'ANAK';
  if (val.includes('ORANG') || val.includes('TUA') || val === 'ORANG_TUA') return 'ORANG_TUA';
  return 'LAINNYA';
}

function normalizeJenisKelamin(input: string): string {
  const val = String(input || '').trim().toUpperCase();
  if (val.startsWith('L') || val.includes('LAKI')) return 'LAKI_LAKI';
  if (val.startsWith('P') || val.includes('PEREMPUAN')) return 'PEREMPUAN';
  return 'LAKI_LAKI';
}

function normalizeKategoriRentan(input: string): string {
  const val = String(input || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (val === 'LANSIA') return 'LANSIA';
  if (val === 'BALITA') return 'BALITA';
  if (val === 'DIFABEL') return 'DIFABEL';
  if (val.includes('HAMIL') || val === 'IBU_HAMIL') return 'IBU_HAMIL';
  return 'TIDAK_ADA';
}

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

    if (rows.length < 2) {
      return NextResponse.json({ success: false, error: 'File tidak memiliki data. Pastikan data dimulai dari baris ke-2.' }, { status: 400 });
    }

    const headerRow = rows[0].map((cell: any) => String(cell).trim());
    const isNewFormat = headerRow.some((h) => h.toLowerCase().includes('hubungan'));

    const dataRows = rows.slice(1).filter((row) => {
      return row.some((cell: any) => String(cell).trim() !== '');
    });

    if (dataRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada baris data yang ditemukan dalam file.' }, { status: 400 });
    }

    // Collect NIKs for intra-file duplicate check
    const nikCountInFile = new Map<string, number>();
    for (const row of dataRows) {
      const nik = String(row[1] || '').trim();
      if (nik) {
        nikCountInFile.set(nik, (nikCountInFile.get(nik) || 0) + 1);
      }
    }

    // Collect all NIKs to check against database (both KK and Anggota tables)
    const allNiks = Array.from(nikCountInFile.keys());
    const [existingKkHeadNiks, existingAnggotaNiks] = await Promise.all([
      prisma.kartuKeluarga.findMany({
        where: { nikKepalaKeluarga: { in: allNiks } },
        select: { nikKepalaKeluarga: true },
      }),
      prisma.anggotaKeluarga.findMany({
        where: { nik: { in: allNiks } },
        select: { nik: true },
      }),
    ]);

    const existingNikSet = new Set([
      ...existingKkHeadNiks.map((kk) => kk.nikKepalaKeluarga),
      ...existingAnggotaNiks.map((a) => a.nik),
    ]);

    // Collect unique Nomor KK to check against database
    const allNomorKks = Array.from(new Set(dataRows.map((r) => String(r[0] || '').trim()).filter(Boolean)));
    const existingNomorKks = await prisma.kartuKeluarga.findMany({
      where: { nomorKk: { in: allNomorKks } },
      select: { nomorKk: true },
    });
    const existingNomorKkSet = new Set(existingNomorKks.map((kk) => kk.nomorKk));

    // Validate each row
    const preview: ImportRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      let nomorKk = '';
      let nik = '';
      let nama = '';
      let hubungan = 'KEPALA_KELUARGA';
      let jenisKelamin = 'LAKI_LAKI';
      let tanggalLahir = '';
      let kategoriRentan = 'TIDAK_ADA';
      let alamat = '';
      let rt = '00';
      let rw = '00';
      let kelurahan = '';
      let kecamatan = 'Lubuk Begalung';
      let kabupaten = 'Kota Padang';
      let zonaRisiko = 'KUNING';
      let statusHunian = 'AMAN';

      if (isNewFormat) {
        nomorKk = String(row[0] || '').trim();
        nik = String(row[1] || '').trim();
        nama = String(row[2] || '').trim();
        hubungan = normalizeHubungan(String(row[3] || ''));
        jenisKelamin = normalizeJenisKelamin(String(row[4] || ''));
        tanggalLahir = String(row[5] || '').trim();
        kategoriRentan = normalizeKategoriRentan(String(row[6] || ''));
        alamat = String(row[7] || '').trim();
        rt = String(row[8] || '').trim() || '00';
        rw = String(row[9] || '').trim() || '00';
        kelurahan = String(row[10] || '').trim();
        kecamatan = String(row[11] || '').trim() || 'Lubuk Begalung';
        kabupaten = String(row[12] || '').trim() || 'Kota Padang';
        zonaRisiko = String(row[13] || '').trim().toUpperCase() || 'KUNING';
        statusHunian = String(row[14] || '').trim().toUpperCase() || 'AMAN';
      } else {
        // Legacy 11-column format
        nomorKk = String(row[0] || '').trim();
        nik = String(row[1] || '').trim();
        nama = String(row[2] || '').trim();
        alamat = String(row[3] || '').trim();
        rt = String(row[4] || '').trim() || '00';
        rw = String(row[5] || '').trim() || '00';
        kelurahan = String(row[6] || '').trim();
        kecamatan = String(row[7] || '').trim() || 'Lubuk Begalung';
        kabupaten = String(row[8] || '').trim() || 'Kota Padang';
        zonaRisiko = String(row[9] || '').trim().toUpperCase() || 'KUNING';
        statusHunian = String(row[10] || '').trim().toUpperCase() || 'AMAN';
      }

      const errors: string[] = [];

      if (!nama) errors.push('Nama wajib diisi');
      if (!alamat) errors.push('Alamat wajib diisi');
      if (!kelurahan) errors.push('Kelurahan wajib diisi');

      if (!nik) {
        errors.push('NIK wajib diisi');
      } else if (!/^\d{16}$/.test(nik)) {
        errors.push(`NIK harus 16 digit angka (ditemukan ${nik.length} karakter)`);
      }

      if (!nomorKk) {
        errors.push('Nomor KK wajib diisi');
      } else if (!/^\d{16}$/.test(nomorKk)) {
        errors.push(`Nomor KK harus 16 digit angka (ditemukan ${nomorKk.length} karakter)`);
      }

      if (zonaRisiko && !VALID_ZONA.includes(zonaRisiko)) {
        errors.push(`Zona Risiko tidak valid: "${zonaRisiko}". Pilih: MERAH, KUNING, atau HIJAU`);
      }

      if (statusHunian && !VALID_HUNIAN.includes(statusHunian)) {
        errors.push(`Status Hunian tidak valid: "${statusHunian}"`);
      }

      // Check intra-file duplicate NIK
      if (nik && (nikCountInFile.get(nik) || 0) > 1) {
        errors.push('NIK duplikat di dalam file Excel');
      }

      // Check database duplicate NIK
      if (nik && existingNikSet.has(nik)) {
        errors.push('NIK sudah terdaftar di sistem');
      }

      // Check database duplicate Nomor KK
      if (nomorKk && existingNomorKkSet.has(nomorKk)) {
        errors.push('Nomor KK sudah terdaftar di sistem');
      }

      const rowData: ImportRow = {
        row: rowNum,
        nomor_kk: nomorKk,
        nik,
        nama,
        hubungan,
        jenis_kelamin: jenisKelamin,
        tanggal_lahir: tanggalLahir,
        kategori_rentan: kategoriRentan,
        alamat,
        rt,
        rw,
        kelurahan,
        kecamatan,
        kabupaten,
        zona_risiko: zonaRisiko,
        status_hunian: statusHunian,
        status: errors.length > 0 ? 'ERROR' : 'VALID',
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };

      preview.push(rowData);
    }

    const validRows = preview.filter((r) => r.status === 'VALID');
    const errorRows = preview.filter((r) => r.status === 'ERROR');

    // Calculate unique KK count among valid rows
    const uniqueKkCount = new Set(validRows.map((r) => r.nomor_kk)).size;

    const sessionId = randomUUID();
    createSession(sessionId, validRows, preview);

    return NextResponse.json({
      success: true,
      data: {
        importSessionId: sessionId,
        totalRows: preview.length,
        validRows: validRows.length,
        errorRows: errorRows.length,
        totalKkCount: uniqueKkCount,
        preview,
      },
    });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
