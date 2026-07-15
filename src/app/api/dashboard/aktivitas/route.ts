import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return 'baru saja';
  } else if (diffMin < 60) {
    return `${diffMin} menit lalu`;
  } else if (diffHr < 24) {
    return `${diffHr} jam lalu`;
  } else {
    return `${diffDays} hari lalu`;
  }
}

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

    let whereClause: any = {};
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.poskoId) {
        return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
      }
      whereClause.user = { poskoId: user.poskoId };
    }

    const logs = await prisma.logAktivitas.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            namaLengkap: true,
            role: true
          }
        }
      }
    });

    const mappedLogs = logs.map(log => ({
      id: log.id,
      tipe: log.tipe,
      deskripsi: log.deskripsi,
      waktu: getRelativeTime(log.createdAt),
      petugas: log.user.namaLengkap
    }));

    return NextResponse.json({
      success: true,
      data: mappedLogs
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
