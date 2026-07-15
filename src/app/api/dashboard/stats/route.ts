import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    let kkWhere: any = {};
    let relawanWhere: any = { role: 'RELAWAN_DATA', status: 'AKTIF' };
    let distributionWhere: any = {};

    if (user.role !== 'SUPER_ADMIN') {
      if (!user.poskoId) {
        return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
      }
      kkWhere.poskoId = user.poskoId;
      relawanWhere.poskoId = user.poskoId;
      distributionWhere.poskoId = user.poskoId;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    distributionWhere.tanggalDistribusi = { gte: todayStart };

    const totalKkTerdampak = await prisma.kartuKeluarga.count({ where: kkWhere });
    const distribusiHariIni = await prisma.distribusiBantuan.count({ where: distributionWhere });
    const relawanAktif = await prisma.user.count({ where: relawanWhere });

    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let logWhere: any = {
      tipe: 'SCAN_QR',
      createdAt: { gte: past24Hours }
    };
    if (user.role !== 'SUPER_ADMIN') {
      logWhere.user = { poskoId: user.poskoId };
    }
    const qrScan24Jam = await prisma.logAktivitas.count({ where: logWhere });

    return NextResponse.json({
      success: true,
      data: {
        totalKkTerdampak,
        distribusiHariIni,
        relawanAktif,
        qrScan24Jam
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
