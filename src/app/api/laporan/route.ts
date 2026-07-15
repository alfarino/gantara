import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { calculateStockStatus } from '@/lib/stock';

export async function GET(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Relawan Data is forbidden to access reports
    if (user.role === 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const tipeLaporan = searchParams.get('tipeLaporan') || 'DISTRIBUSI';
    let poskoId = searchParams.get('poskoId') || '';
    const eventBencanaId = searchParams.get('eventBencanaId') || '';

    // Enforce Kepala Posko scope
    if (user.role === 'KEPALA_POSKO') {
      poskoId = user.poskoId || 'none'; // Lock to their posko, if they don't have one, query returns empty
    }

    // Date bounds
    const fromDate = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(0);
    const toDate = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

    if (tipeLaporan === 'DISTRIBUSI') {
      const whereClause: any = {
        tanggalDistribusi: {
          gte: fromDate,
          lte: toDate,
        },
      };

      if (poskoId && poskoId !== 'none') {
        whereClause.poskoId = poskoId;
      }

      if (eventBencanaId) {
        whereClause.kartuKeluarga = {
          eventBencanaId: eventBencanaId,
        };
      }

      const items = await prisma.distribusiBantuan.findMany({
        where: whereClause,
        include: {
          kartuKeluarga: {
            select: { nomorKk: true, namaKepalaKeluarga: true },
          },
          petugas: { select: { namaLengkap: true } },
          posko: { select: { nama: true } },
        },
        orderBy: { tanggalDistribusi: 'desc' },
      });

      const mapped = items.map((item, idx) => ({
        no: idx + 1,
        tanggal: item.tanggalDistribusi.toISOString(),
        nomor_kk: item.kartuKeluarga.nomorKk,
        nama_penerima: item.kartuKeluarga.namaKepalaKeluarga,
        jenis_bantuan: item.jenisBantuan,
        kuantitas: item.kuantitas,
        petugas: item.petugas.namaLengkap,
        posko: item.posko.nama,
        status: item.status,
      }));

      return NextResponse.json({ success: true, data: mapped });
    } 

    if (tipeLaporan === 'STOK') {
      const whereClause: any = {};

      if (poskoId && poskoId !== 'none') {
        whereClause.poskoId = poskoId;
      }

      if (eventBencanaId) {
        whereClause.posko = {
          eventBencanaId: eventBencanaId,
        };
      }

      const items = await prisma.inventoriLogistik.findMany({
        where: whereClause,
        include: {
          posko: { select: { nama: true } },
        },
        orderBy: { namaBarang: 'asc' },
      });

      const mapped = items.map((item, idx) => {
        const calculatedStatus = calculateStockStatus(item.stokSaatIni, item.kebutuhanHarian);

        return {
          no: idx + 1,
          posko: item.posko.nama,
          nama_barang: item.namaBarang,
          satuan: item.satuan,
          stok_saat_ini: item.stokSaatIni,
          stok_maksimum: item.stokMaksimum,
          kebutuhan_harian: item.kebutuhanHarian,
          status: calculatedStatus,
        };
      });

      return NextResponse.json({ success: true, data: mapped });
    }

    if (tipeLaporan === 'PENGUNGSI') {
      const whereClause: any = {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      };

      if (poskoId && poskoId !== 'none') {
        whereClause.poskoId = poskoId;
      }

      if (eventBencanaId) {
        whereClause.eventBencanaId = eventBencanaId;
      }

      const items = await prisma.kartuKeluarga.findMany({
        where: whereClause,
        include: {
          posko: { select: { nama: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = items.map((item, idx) => ({
        no: idx + 1,
        nomor_kk: item.nomorKk,
        nama_kepala_keluarga: item.namaKepalaKeluarga,
        nik_kepala_keluarga: item.nikKepalaKeluarga,
        alamat: item.alamat,
        zona_risiko: item.zonaRisiko,
        status_hunian: item.statusHunian,
        status_verifikasi: item.statusVerifikasi,
        posko: item.posko ? item.posko.nama : 'Belum Ditugaskan',
        tanggal_pendaftaran: item.createdAt.toISOString(),
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    if (tipeLaporan === 'RELAWAN') {
      const userWhereClause: any = {
        role: { in: ['KEPALA_POSKO', 'RELAWAN_DATA'] },
      };

      if (poskoId && poskoId !== 'none') {
        userWhereClause.poskoId = poskoId;
      }

      if (eventBencanaId) {
        userWhereClause.posko = {
          eventBencanaId: eventBencanaId,
        };
      }

      const volunteers = await prisma.user.findMany({
        where: userWhereClause,
        include: {
          posko: { select: { nama: true } },
          logAktivitas: {
            where: {
              createdAt: {
                gte: fromDate,
                lte: toDate,
              },
            },
            select: {
              tipe: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const mapped = volunteers.map((v, idx) => {
        const scans = v.logAktivitas.filter(log => log.tipe === 'SCAN_QR').length;
        const distribusis = v.logAktivitas.filter(log => log.tipe === 'DISTRIBUSI').length;
        const verifikasis = v.logAktivitas.filter(log => log.tipe === 'VERIFIKASI').length;
        const totalAktivitas = v.logAktivitas.length;

        return {
          no: idx + 1,
          nama_lengkap: v.namaLengkap,
          id_relawan: v.idRelawan || '—',
          role: v.role,
          posko: v.posko ? v.posko.nama : 'Standby / Pool',
          jumlah_scan: scans,
          jumlah_distribusi: distribusis,
          jumlah_verifikasi: verifikasis,
          total_aktivitas: totalAktivitas,
        };
      });

      return NextResponse.json({ success: true, data: mapped });
    }

    return NextResponse.json({ success: false, error: 'Tipe laporan tidak didukung' }, { status: 400 });
  } catch (error) {
    console.error('Error generating report data:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
