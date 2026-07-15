import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = resolvedParams.id;

    // Check if KK exists and user has access
    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && kk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const distributions = await prisma.distribusiBantuan.findMany({
      where: { kartuKeluargaId: id },
      include: {
        petugas: { select: { namaLengkap: true } }
      },
      orderBy: { tanggalDistribusi: 'desc' }
    });

    const mapped = distributions.map(d => ({
      id: d.id,
      jenis_bantuan: d.jenisBantuan,
      kuantitas: d.kuantitas,
      status: d.status,
      catatan: d.catatan,
      petugas: d.petugas.namaLengkap,
      tanggal_distribusi: d.tanggalDistribusi.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    console.error('Error fetching distributions for KK:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
