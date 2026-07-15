import { NextResponse } from 'next/server';
import { getAuthToken, verifyToken } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'KEPALA_POSKO')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    // Create workbook with template
    const wb = XLSX.utils.book_new();

    const headers = [
      'Nomor KK',
      'NIK Kepala Keluarga',
      'Nama Kepala Keluarga',
      'Alamat',
      'RT',
      'RW',
      'Kelurahan',
      'Kecamatan',
      'Kabupaten',
      'Zona Risiko (MERAH/KUNING/HIJAU)',
      'Status Hunian (RUSAK_BERAT/RUSAK_SEDANG/RUSAK_RINGAN/AMAN)',
    ];

    const exampleRow = [
      '1371019876543210',
      '1371011501900001',
      'Contoh: Budi Santoso',
      'Jl. Gurun Laweh No. 10',
      '01',
      '02',
      'Gurun Laweh Nan XX',
      'Lubuk Begalung',
      'Kota Padang',
      'MERAH',
      'RUSAK_BERAT',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Nomor KK
      { wch: 20 }, // NIK
      { wch: 30 }, // Nama
      { wch: 35 }, // Alamat
      { wch: 5 },  // RT
      { wch: 5 },  // RW
      { wch: 25 }, // Kelurahan
      { wch: 20 }, // Kecamatan
      { wch: 20 }, // Kabupaten
      { wch: 15 }, // Zona Risiko
      { wch: 20 }, // Status Hunian
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Import KK');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template-import-kk.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
