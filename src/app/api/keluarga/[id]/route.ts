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

    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id },
      include: {
        posko: { select: { id: true, nama: true } },
        anggota: { orderBy: { hubungan: 'asc' } },
        distribusi: {
          include: {
            petugas: { select: { namaLengkap: true } }
          },
          orderBy: { tanggalDistribusi: 'desc' }
        }
      }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    // Role-based data isolation
    if (user.role !== 'SUPER_ADMIN' && kk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // Fetch related changes logs for audit trail
    const logs = await prisma.logAktivitas.findMany({
      where: {
        referensiId: id,
        referensiTipe: 'KARTU_KELUARGA'
      },
      include: {
        user: { select: { namaLengkap: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedLogs = logs.map(l => ({
      id: l.id,
      deskripsi: l.deskripsi,
      petugas: l.user.namaLengkap,
      createdAt: l.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...kk,
        logs: mappedLogs
      }
    });
  } catch (error) {
    console.error('Error fetching keluarga detail:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function PUT(
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

    // Check if record exists and user has access
    const existingKk = await prisma.kartuKeluarga.findUnique({
      where: { id }
    });

    if (!existingKk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && existingKk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      nomorKk,
      namaKepalaKeluarga,
      nikKepalaKeluarga,
      alamat,
      rt,
      rw,
      kelurahan,
      kecamatan,
      kabupaten,
      zonaRisiko,
      statusHunian,
      statusVerifikasi,
      poskoId
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      const kk = await tx.kartuKeluarga.update({
        where: { id },
        data: {
          nomorKk: nomorKk !== undefined ? nomorKk : undefined,
          namaKepalaKeluarga: namaKepalaKeluarga !== undefined ? namaKepalaKeluarga : undefined,
          nikKepalaKeluarga: nikKepalaKeluarga !== undefined ? nikKepalaKeluarga : undefined,
          alamat: alamat !== undefined ? alamat : undefined,
          rt: rt !== undefined ? rt : undefined,
          rw: rw !== undefined ? rw : undefined,
          kelurahan: kelurahan !== undefined ? kelurahan : undefined,
          kecamatan: kecamatan !== undefined ? kecamatan : undefined,
          kabupaten: kabupaten !== undefined ? kabupaten : undefined,
          zonaRisiko: zonaRisiko !== undefined ? zonaRisiko : undefined,
          statusHunian: statusHunian !== undefined ? statusHunian : undefined,
          statusVerifikasi: statusVerifikasi !== undefined ? statusVerifikasi : undefined,
          poskoId: poskoId !== undefined ? (poskoId || null) : undefined
        }
      });

      // Write change log
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Memperbarui data Kartu Keluarga: ${kk.namaKepalaKeluarga}`,
          referensiId: kk.id,
          referensiTipe: 'KARTU_KELUARGA'
        }
      });

      return kk;
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Data keluarga berhasil diperbarui"
    });
  } catch (error: any) {
    console.error('Error updating keluarga:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "Nomor KK atau NIK sudah terdaftar di sistem" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Only SUPER_ADMIN and KEPALA_POSKO can delete family records
    if (user.role === 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const resolvedParams = await context.params;
    const id = resolvedParams.id;

    const existingKk = await prisma.kartuKeluarga.findUnique({
      where: { id }
    });

    if (!existingKk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && existingKk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // Create log before deleting (so user relation and context remain valid)
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Menghapus Kartu Keluarga: ${existingKk.namaKepalaKeluarga} (No KK: ${existingKk.nomorKk})`,
          referensiId: id,
          referensiTipe: 'KARTU_KELUARGA'
        }
      });

      // Cascade deletion is handled by PostgreSQL due to schema annotations
      await tx.kartuKeluarga.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Data keluarga berhasil dihapus"
    });
  } catch (error) {
    console.error('Error deleting keluarga:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
