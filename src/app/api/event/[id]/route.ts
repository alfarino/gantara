import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    const { id } = await params;

    const event = await prisma.eventBencana.findUnique({
      where: { id },
      include: {
        posko: {
          include: {
            inventori: {
              select: {
                stokSaatIni: true,
                stokMaksimum: true,
              }
            },
            _count: {
              select: {
                users: {
                  where: {
                    status: 'AKTIF',
                    role: { in: ['KEPALA_POSKO', 'RELAWAN_DATA'] }
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            keluarga: true,
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const kk_terdampak = event._count.keluarga;
    const posko_aktif = event.posko.filter(p => p.status !== 'DITUTUP').length;
    const relawan_aktif = event.posko.reduce((sum, p) => sum + p._count.users, 0);

    // Calculate total logistik percentage
    let totalStokSaatIni = 0;
    let totalStokMaksimum = 0;
    event.posko.forEach(p => {
      p.inventori.forEach(inv => {
        totalStokSaatIni += inv.stokSaatIni;
        totalStokMaksimum += inv.stokMaksimum;
      });
    });
    const logistik_persen = totalStokMaksimum > 0 
      ? Math.round((totalStokSaatIni / totalStokMaksimum) * 100)
      : 0;

    // Get recent activity logs for this event's poskos
    const poskoIds = event.posko.map(p => p.id);
    const recentLogs = await prisma.logAktivitas.findMany({
      where: {
        user: {
          poskoId: { in: poskoIds }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { namaLengkap: true }
        }
      }
    });

    // Create the timeline
    const timeline = [
      {
        tanggal: event.tanggalMulai.toISOString(),
        tipe: 'MULAI',
        deskripsi: `Bencana ${event.nama} mulai terjadi di ${event.lokasi}.`
      }
    ];

    if (event.tanggalSelesai) {
      timeline.push({
        tanggal: event.tanggalSelesai.toISOString(),
        tipe: 'SELESAI',
        deskripsi: `Penanganan bencana ${event.nama} resmi dinyatakan selesai.`
      });
    }

    recentLogs.forEach(log => {
      timeline.push({
        tanggal: log.createdAt.toISOString(),
        tipe: log.tipe,
        deskripsi: `${log.user.namaLengkap}: ${log.deskripsi}`
      });
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        nama: event.nama,
        tipe: event.tipe,
        status: event.status,
        lokasi: event.lokasi,
        tanggal_mulai: event.tanggalMulai.toISOString(),
        tanggal_selesai: event.tanggalSelesai ? event.tanggalSelesai.toISOString() : null,
        deskripsi: event.deskripsi,
        kk_terdampak,
        posko_aktif,
        relawan_aktif,
        logistik_persen,
        posko: event.posko.map(p => ({
          id: p.id,
          nama: p.nama,
          tipe: p.tipe,
          status: p.status,
          jumlah_pengungsi: p.jumlahPengungsi
        })),
        timeline
      }
    });

  } catch (error) {
    console.error('Error fetching event detail:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const { nama, tipe, status, lokasi, tanggal_mulai, tanggal_selesai, deskripsi } = body;

    const dataToUpdate: any = {};
    if (nama !== undefined) dataToUpdate.nama = nama;
    if (tipe !== undefined) dataToUpdate.tipe = tipe;
    if (status !== undefined) dataToUpdate.status = status;
    if (lokasi !== undefined) dataToUpdate.lokasi = lokasi;
    if (tanggal_mulai !== undefined) dataToUpdate.tanggalMulai = new Date(tanggal_mulai);
    if (tanggal_selesai !== undefined) {
      dataToUpdate.tanggalSelesai = tanggal_selesai ? new Date(tanggal_selesai) : null;
    }
    if (deskripsi !== undefined) dataToUpdate.deskripsi = deskripsi;

    // Log the change
    const updatedEvent = await prisma.$transaction(async (tx) => {
      const record = await tx.eventBencana.update({
        where: { id },
        data: dataToUpdate
      });

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Memperbarui data bencana ${record.nama} (Status: ${record.status})`,
          referensiId: record.id,
          referensiTipe: 'EVENT_BENCANA'
        }
      });

      return record;
    });

    return NextResponse.json({ success: true, data: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
