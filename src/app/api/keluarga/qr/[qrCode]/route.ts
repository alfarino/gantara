import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ qrCode: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { qrCode } = await params;

    if (!qrCode) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'QR Code parameter wajib diisi' } },
        { status: 400 }
      );
    }

    const kk = await prisma.kartuKeluarga.findUnique({
      where: { qrCodeData: qrCode },
      include: {
        posko: { select: { id: true, nama: true, tipe: true } },
        anggota: {
          select: {
            id: true,
            nik: true,
            nama: true,
            hubungan: true,
            jenisKelamin: true,
            tanggalLahir: true,
            kategoriRentan: true,
            statusKesehatan: true,
            kondisiKesehatan: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        distribusi: {
          select: {
            id: true,
            jenisBantuan: true,
            kuantitas: true,
            status: true,
            tanggalDistribusi: true,
            catatan: true,
            petugas: { select: { namaLengkap: true } },
            posko: { select: { nama: true } },
          },
          orderBy: { tanggalDistribusi: 'desc' },
          take: 10,
        },
      },
    });

    if (!kk) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'QR Code tidak ditemukan dalam sistem' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: kk.id,
        nomorKk: kk.nomorKk,
        namaKepalaKeluarga: kk.namaKepalaKeluarga,
        nikKepalaKeluarga: kk.nikKepalaKeluarga,
        alamat: kk.alamat,
        rt: kk.rt,
        rw: kk.rw,
        kelurahan: kk.kelurahan,
        kecamatan: kk.kecamatan,
        kabupaten: kk.kabupaten,
        zonaRisiko: kk.zonaRisiko,
        statusHunian: kk.statusHunian,
        statusVerifikasi: kk.statusVerifikasi,
        qrCodeData: kk.qrCodeData,
        posko: kk.posko,
        anggota: kk.anggota,
        distribusi: kk.distribusi.map((d) => ({
          id: d.id,
          jenisBantuan: d.jenisBantuan,
          kuantitas: d.kuantitas,
          status: d.status,
          tanggalDistribusi: d.tanggalDistribusi,
          catatan: d.catatan,
          petugas: d.petugas.namaLengkap,
          posko: d.posko.nama,
        })),
      },
    });
  } catch (error) {
    console.error('Error looking up QR code:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
