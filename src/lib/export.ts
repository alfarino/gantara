import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gantara");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function generateImportTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Nomor KK',
    'NIK',
    'Nama Anggota',
    'Hubungan Keluarga (KEPALA_KELUARGA/ISTRI/ANAK/ORANG_TUA/LAINNYA)',
    'Jenis Kelamin (LAKI_LAKI/PEREMPUAN)',
    'Tanggal Lahir (YYYY-MM-DD)',
    'Kategori Rentan (LANSIA/BALITA/DIFABEL/IBU_HAMIL/TIDAK_ADA)',
    'Alamat',
    'RT',
    'RW',
    'Kelurahan',
    'Kecamatan',
    'Kabupaten',
    'Zona Risiko (MERAH/KUNING/HIJAU)',
    'Status Hunian (RUSAK_BERAT/RUSAK_SEDANG/RUSAK_RINGAN/AMAN)',
  ];

  const exampleRows = [
    // Contoh KK 1 - Budi Santoso (Kepala Keluarga & Anggota)
    [
      '1371019876543210',
      '1371011501900001',
      'Budi Santoso',
      'KEPALA_KELUARGA',
      'LAKI_LAKI',
      '1985-05-15',
      'TIDAK_ADA',
      'Jl. Gurun Laweh No. 10',
      '01',
      '02',
      'Gurun Laweh Nan XX',
      'Lubuk Begalung',
      'Kota Padang',
      'MERAH',
      'RUSAK_BERAT',
    ],
    [
      '1371019876543210',
      '1371015502910002',
      'Siti Aminah',
      'ISTRI',
      'PEREMPUAN',
      '1991-02-25',
      'TIDAK_ADA',
      'Jl. Gurun Laweh No. 10',
      '01',
      '02',
      'Gurun Laweh Nan XX',
      'Lubuk Begalung',
      'Kota Padang',
      'MERAH',
      'RUSAK_BERAT',
    ],
    [
      '1371019876543210',
      '1371012010150003',
      'Randi Santoso',
      'ANAK',
      'LAKI_LAKI',
      '2015-10-20',
      'TIDAK_ADA',
      'Jl. Gurun Laweh No. 10',
      '01',
      '02',
      'Gurun Laweh Nan XX',
      'Lubuk Begalung',
      'Kota Padang',
      'MERAH',
      'RUSAK_BERAT',
    ],
    [
      '1371019876543210',
      '1371012512230004',
      'Adelia Santoso',
      'ANAK',
      'PEREMPUAN',
      '2023-12-25',
      'BALITA',
      'Jl. Gurun Laweh No. 10',
      '01',
      '02',
      'Gurun Laweh Nan XX',
      'Lubuk Begalung',
      'Kota Padang',
      'MERAH',
      'RUSAK_BERAT',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  ws['!cols'] = [
    { wch: 20 }, // Nomor KK
    { wch: 20 }, // NIK
    { wch: 25 }, // Nama
    { wch: 25 }, // Hubungan
    { wch: 15 }, // Jenis Kelamin
    { wch: 15 }, // Tanggal Lahir
    { wch: 18 }, // Kategori Rentan
    { wch: 30 }, // Alamat
    { wch: 5 },  // RT
    { wch: 5 },  // RW
    { wch: 25 }, // Kelurahan
    { wch: 20 }, // Kecamatan
    { wch: 20 }, // Kabupaten
    { wch: 15 }, // Zona Risiko
    { wch: 20 }, // Status Hunian
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Import KK & Anggota');
  XLSX.writeFile(wb, 'template-import-kk-lengkap.xlsx');
}

export function exportToPdf(headers: string[][], rows: any[][], title: string, fileName: string) {
  const doc = new jsPDF();
  
  // Kop Laporan
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GANTARA - SISTEM PENDATAAN PASCABENCANA", 14, 15);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text(`Judul Laporan: ${title}`, 14, 22);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 27);
  doc.line(14, 30, 196, 30); // Garis pembatas
  
  // Render Tabel
  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [0, 86, 201] }, // Warna brand GANTARA
    styles: { fontSize: 8 },
  });
  
  doc.save(`${fileName}.pdf`);
}
