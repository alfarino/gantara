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

    const events = await prisma.eventBencana.findMany({
      orderBy: { tanggalMulai: 'desc' },
      include: {
        _count: {
          select: {
            keluarga: true,
          }
        },
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
        }
      }
    });

    const mappedData = events.map(event => {
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

      return {
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
        logistik_persen
      };
    });

    return NextResponse.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching events:', error);
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
    const { nama, tipe, status, lokasi, tanggal_mulai, deskripsi } = body;

    if (!nama || !tipe || !status || !lokasi || !tanggal_mulai) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const event = await prisma.eventBencana.create({
      data: {
        nama,
        tipe,
        status,
        lokasi,
        tanggalMulai: new Date(tanggal_mulai),
        deskripsi: deskripsi || null,
      }
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
