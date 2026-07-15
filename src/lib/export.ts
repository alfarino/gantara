import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gantara");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
