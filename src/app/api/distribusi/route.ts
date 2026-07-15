import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

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

    const { searchParams } = new URL(request.url);
    const kartuKeluargaId = searchParams.get('kartuKeluargaId') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const whereClause: any = {};
    if (kartuKeluargaId) {
      whereClause.kartuKeluargaId = kartuKeluargaId;
    }
    if (user.role !== 'SUPER_ADMIN' && user.poskoId) {
      whereClause.poskoId = user.poskoId;
    }

    const items = await prisma.distribusiBantuan.findMany({
      where: whereClause,
      include: {
        kartuKeluarga: { select: { namaKepalaKeluarga: true, nomorKk: true } },
        petugas: { select: { namaLengkap: true } },
        posko: { select: { nama: true } },
      },
      orderBy: { tanggalDistribusi: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching distribusi:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { kartuKeluargaId, jenisBantuan, kuantitas, catatan } = body;

    if (!kartuKeluargaId || !jenisBantuan || !kuantitas) {
      return NextResponse.json(
        { success: false, error: 'kartuKeluargaId, jenisBantuan, dan kuantitas wajib diisi.' },
        { status: 400 }
      );
    }

    // Find the KK to get its poskoId
    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id: kartuKeluargaId },
      select: { poskoId: true, namaKepalaKeluarga: true },
    });

    if (!kk) {
      return NextResponse.json(
        { success: false, error: 'Kartu Keluarga tidak ditemukan.' },
        { status: 404 }
      );
    }

    const poskoId = kk.poskoId || user.poskoId;
    if (!poskoId) {
      return NextResponse.json(
        { success: false, error: 'Posko ID tidak tersedia. Pastikan KK atau user terhubung ke posko.' },
        { status: 400 }
      );
    }

    const distribusi = await prisma.$transaction(async (tx) => {
      const record = await tx.distribusiBantuan.create({
        data: {
          kartuKeluargaId,
          poskoId,
          jenisBantuan,
          kuantitas,
          catatan: catatan || null,
          petugasId: user.id,
          status: 'TERSALURKAN',
        },
      });

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DISTRIBUSI',
          deskripsi: `Distribusi ${jenisBantuan} (${kuantitas}) kepada KK ${kk.namaKepalaKeluarga}`,
          referensiId: record.id,
          referensiTipe: 'DISTRIBUSI_BANTUAN',
        },
      });

      return record;
    });

    return NextResponse.json({
      success: true,
      data: distribusi,
      message: `Distribusi ${jenisBantuan} berhasil dicatat untuk KK ${kk.namaKepalaKeluarga}.`,
    });
  } catch (error) {
    console.error('Error creating distribusi:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
