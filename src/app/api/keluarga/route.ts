import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

function maskNik(nik: string, role: string) {
  if (role === 'SUPER_ADMIN' || role === 'KEPALA_POSKO') {
    return nik;
  }
  if (nik.length < 10) return nik;
  return nik.slice(0, 6) + '****' + nik.slice(-5);
}

export async function GET(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const kelurahan = searchParams.get('kelurahan') || '';
    const statusVerifikasi = searchParams.get('statusVerifikasi') || '';
    const zonaRisiko = searchParams.get('zonaRisiko') || '';
    const poskoId = searchParams.get('poskoId') || '';
    const eventBencanaId = searchParams.get('eventBencanaId') || '';

    let whereClause: any = {};

    if (user.role !== 'SUPER_ADMIN') {
      if (!user.poskoId) {
        return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
      }
      whereClause.poskoId = user.poskoId;
    } else if (poskoId) {
      whereClause.poskoId = poskoId;
    }

    if (search) {
      whereClause.OR = [
        { namaKepalaKeluarga: { contains: search, mode: 'insensitive' } },
        { nomorKk: { contains: search, mode: 'insensitive' } },
        { nikKepalaKeluarga: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (kelurahan) {
      whereClause.kelurahan = kelurahan;
    }

    if (statusVerifikasi) {
      whereClause.statusVerifikasi = statusVerifikasi;
    }

    if (zonaRisiko) {
      whereClause.zonaRisiko = zonaRisiko;
    }

    if (eventBencanaId) {
      whereClause.eventBencanaId = eventBencanaId;
    }

    const skip = (page - 1) * limit;

    const total = await prisma.kartuKeluarga.count({ where: whereClause });
    const items = await prisma.kartuKeluarga.findMany({
      where: whereClause,
      include: {
        posko: { select: { id: true, nama: true } },
        anggota: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const mappedItems = items.map(item => ({
      id: item.id,
      nomor_kk: item.nomorKk,
      nama_kepala_keluarga: item.namaKepalaKeluarga,
      nik_kepala_keluarga: maskNik(item.nikKepalaKeluarga, user.role),
      kelurahan: item.kelurahan,
      jumlah_anggota: item.anggota.length,
      zona_risiko: item.zonaRisiko,
      status_verifikasi: item.statusVerifikasi,
      posko: item.posko ? { id: item.posko.id, nama: item.posko.nama } : null,
      created_at: item.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: mappedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching keluarga list:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const {
      nomor_kk,
      nama_kepala_keluarga,
      nik_kepala_keluarga,
      alamat,
      rt,
      rw,
      kelurahan,
      kecamatan,
      kabupaten,
      zona_risiko,
      status_hunian,
      event_bencana_id,
      posko_id,
      anggota
    } = body;

    const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
    const qrCodeData = `PG-2026-${randomSuffix}`;

    const newKk = await prisma.$transaction(async (tx) => {
      const kk = await tx.kartuKeluarga.create({
        data: {
          nomorKk: nomor_kk,
          namaKepalaKeluarga: nama_kepala_keluarga,
          nikKepalaKeluarga: nik_kepala_keluarga,
          alamat,
          rt,
          rw,
          kelurahan,
          kecamatan,
          kabupaten,
          zonaRisiko: zona_risiko,
          statusHunian: status_hunian,
          qrCodeData,
          eventBencanaId: event_bencana_id,
          poskoId: posko_id || user.poskoId || null,
          createdById: user.id
        }
      });

      if (anggota && Array.isArray(anggota) && anggota.length > 0) {
        await tx.anggotaKeluarga.createMany({
          data: anggota.map((member: any) => ({
            kartuKeluargaId: kk.id,
            nik: member.nik,
            nama: member.nama,
            hubungan: member.hubungan,
            jenisKelamin: member.jenis_kelamin,
            tanggalLahir: new Date(member.tanggal_lahir),
            kategoriRentan: member.kategori_rentan || null,
            kondisiKesehatan: member.kondisi_kesehatan || null
          }))
        });
      }

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'VERIFIKASI',
          deskripsi: `Mendaftarkan Kartu Keluarga Baru: ${nama_kepala_keluarga}`,
          referensiId: kk.id,
          referensiTipe: 'KARTU_KELUARGA'
        }
      });

      return kk;
    });

    return NextResponse.json({
      success: true,
      data: newKk,
      message: 'Data keluarga berhasil ditambahkan'
    });
  } catch (error: any) {
    console.error('Error creating keluarga:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Nomor KK atau NIK sudah terdaftar di sistem" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
