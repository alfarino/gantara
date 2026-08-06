import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string; anggotaId: string }>;
}

export async function PUT(request: Request, context: Context) {
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
    const { id: kartuKeluargaId, anggotaId } = resolvedParams;

    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id: kartuKeluargaId }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'KEPALA_POSKO' && user.role !== 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const existingMember = await prisma.anggotaKeluarga.findFirst({
      where: { id: anggotaId, kartuKeluargaId }
    });

    if (!existingMember) {
      return NextResponse.json({ success: false, error: "MEMBER_NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const {
      nik,
      nama,
      hubungan,
      jenisKelamin,
      tanggalLahir,
      kategoriRentan,
      statusKesehatan,
      status_kesehatan,
      kondisiKesehatan,
      kondisi_kesehatan
    } = body;

    const healthCategory = statusKesehatan || status_kesehatan;
    const healthNote = kondisiKesehatan !== undefined ? kondisiKesehatan : kondisi_kesehatan;

    const updatedMember = await prisma.$transaction(async (tx) => {
      const member = await tx.anggotaKeluarga.update({
        where: { id: anggotaId },
        data: {
          nik: nik !== undefined ? nik : undefined,
          nama: nama !== undefined ? nama : undefined,
          hubungan: hubungan !== undefined ? hubungan : undefined,
          jenisKelamin: jenisKelamin !== undefined ? jenisKelamin : undefined,
          tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : undefined,
          kategoriRentan: kategoriRentan !== undefined ? kategoriRentan : undefined,
          statusKesehatan: healthCategory ? (healthCategory as any) : undefined,
          kondisiKesehatan: healthNote !== undefined ? (healthNote || null) : undefined,
        }
      });

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Memperbarui kondisi kesehatan/data anggota keluarga: ${member.nama}`,
          referensiId: kartuKeluargaId,
          referensiTipe: 'KARTU_KELUARGA'
        }
      });

      return member;
    });

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: "Data anggota keluarga berhasil diperbarui"
    });
  } catch (error: any) {
    console.error("Error updating anggota keluarga:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR", message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
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
    const { id: kartuKeluargaId, anggotaId } = resolvedParams;

    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id: kartuKeluargaId }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'KEPALA_POSKO') {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.anggotaKeluarga.delete({
      where: { id: anggotaId }
    });

    return NextResponse.json({
      success: true,
      message: "Anggota keluarga berhasil dihapus"
    });
  } catch (error: any) {
    console.error("Error deleting anggota keluarga:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR", message: error.message }, { status: 500 });
  }
}
