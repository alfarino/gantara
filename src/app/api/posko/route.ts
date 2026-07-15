import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const poskos = await prisma.posko.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { status: 'AKTIF' },
          select: {
            id: true,
            namaLengkap: true,
            fotoUrl: true,
            role: true,
          }
        }
      }
    });

    const mappedData = poskos.map(p => ({
      id: p.id,
      nama: p.nama,
      tipe: p.tipe,
      alamat: p.alamat,
      jumlah_pengungsi: p.jumlahPengungsi,
      status: p.status,
      eventBencanaId: p.eventBencanaId,
      users: p.users
    }));

    return NextResponse.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching poskos:', error);
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

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { nama, tipe, alamat, eventBencanaId, status } = body;

    if (!nama || !tipe || !alamat || !eventBencanaId || !status) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const newPosko = await prisma.posko.create({
      data: {
        nama,
        tipe,
        alamat,
        eventBencanaId,
        status,
        jumlahPengungsi: 0
      }
    });

    return NextResponse.json({ success: true, data: newPosko });
  } catch (error) {
    console.error('Error creating posko:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
