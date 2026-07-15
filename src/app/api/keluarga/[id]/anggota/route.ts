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
    const kartuKeluargaId = resolvedParams.id;

    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id: kartuKeluargaId }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && kk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const members = await prisma.anggotaKeluarga.findMany({
      where: { kartuKeluargaId },
      orderBy: { hubungan: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
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
    const kartuKeluargaId = resolvedParams.id;

    // Check if KK exists and user has access
    const kk = await prisma.kartuKeluarga.findUnique({
      where: { id: kartuKeluargaId }
    });

    if (!kk) {
      return NextResponse.json({ success: false, error: "DATA_NOT_FOUND" }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && kk.poskoId !== user.poskoId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      nik,
      nama,
      hubungan,
      jenis_kelamin,
      jenisKelamin,
      tanggal_lahir,
      tanggalLahir,
      kategori_rentan,
      kategoriRentan,
      kondisi_kesehatan,
      kondisiKesehatan
    } = body;

    const memberNik = nik;
    const memberNama = nama;
    const memberHubungan = hubungan;
    const memberGender = jenisKelamin || jenis_kelamin;
    const memberDob = tanggalLahir || tanggal_lahir;
    const memberRentan = kategoriRentan !== undefined ? kategoriRentan : kategori_rentan;
    const memberHealth = kondisiKesehatan !== undefined ? kondisiKesehatan : kondisi_kesehatan;

    const newMember = await prisma.$transaction(async (tx) => {
      const member = await tx.anggotaKeluarga.create({
        data: {
          kartuKeluargaId,
          nik: memberNik,
          nama: memberNama,
          hubungan: memberHubungan,
          jenisKelamin: memberGender,
          tanggalLahir: new Date(memberDob),
          kategoriRentan: memberRentan || null,
          kondisiKesehatan: memberHealth || null
        }
      });

      // Write log
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Menambahkan anggota keluarga baru (${memberNama}) ke KK ${kk.namaKepalaKeluarga}`,
          referensiId: kartuKeluargaId,
          referensiTipe: 'KARTU_KELUARGA'
        }
      });

      return member;
    });

    return NextResponse.json({
      success: true,
      data: newMember,
      message: "Anggota keluarga berhasil ditambahkan"
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
