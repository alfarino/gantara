import { NextResponse } from 'next/server';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSession, deleteSession } from '@/lib/importSession';

export async function POST(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'KEPALA_POSKO')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { importSessionId, eventBencanaId, poskoId } = body;

    if (!importSessionId) {
      return NextResponse.json({ success: false, error: 'importSessionId wajib diisi.' }, { status: 400 });
    }

    // Retrieve the session
    const session = getSession(importSessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Sesi import tidak ditemukan atau sudah kedaluwarsa. Silakan unggah ulang file Anda.',
      }, { status: 404 });
    }

    const validRows = session.validRows;
    if (validRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tidak ada baris data valid untuk diimpor.',
      }, { status: 400 });
    }

    // Determine event and posko
    let targetEventId = eventBencanaId;
    let targetPoskoId = poskoId || user.poskoId || null;

    if (!targetEventId) {
      const latestEvent = await prisma.eventBencana.findFirst({
        where: { status: { in: ['KRITIS', 'SIAGA', 'WASPADA'] } },
        orderBy: { tanggalMulai: 'desc' },
        select: { id: true },
      });
      if (latestEvent) {
        targetEventId = latestEvent.id;
      } else {
        return NextResponse.json({
          success: false,
          error: 'Tidak ada event bencana aktif. Buat event bencana terlebih dahulu.',
        }, { status: 400 });
      }
    }

    // Group valid rows by nomor_kk
    const kkGroups = new Map<string, typeof validRows>();
    for (const r of validRows) {
      const existing = kkGroups.get(r.nomor_kk) || [];
      existing.push(r);
      kkGroups.set(r.nomor_kk, existing);
    }

    let insertedKkCount = 0;
    let insertedAnggotaCount = 0;

    // Run creation in a Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const [nomorKk, rows] of kkGroups.entries()) {
        // Find head of family row (or default to 1st row)
        const headRow = rows.find((r) => r.hubungan === 'KEPALA_KELUARGA') || rows[0];

        const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        const qrCodeData = `PG-2026-${randomSuffix}`;

        // Create KartuKeluarga
        const kk = await tx.kartuKeluarga.create({
          data: {
            nomorKk,
            namaKepalaKeluarga: headRow.nama,
            nikKepalaKeluarga: headRow.nik,
            alamat: headRow.alamat,
            rt: headRow.rt,
            rw: headRow.rw,
            kelurahan: headRow.kelurahan,
            kecamatan: headRow.kecamatan,
            kabupaten: headRow.kabupaten,
            zonaRisiko: headRow.zona_risiko as any,
            statusHunian: headRow.status_hunian as any,
            qrCodeData,
            eventBencanaId: targetEventId,
            poskoId: targetPoskoId,
            createdById: user.id,
          },
        });

        insertedKkCount++;

        // Create all AnggotaKeluarga rows linked to this KK
        const anggotaData = rows.map((r) => {
          let tglLahir: Date;
          if (r.tanggal_lahir && !isNaN(Date.parse(r.tanggal_lahir))) {
            tglLahir = new Date(r.tanggal_lahir);
          } else {
            tglLahir = new Date('1990-01-01');
          }

          return {
            kartuKeluargaId: kk.id,
            nik: r.nik,
            nama: r.nama,
            hubungan: r.hubungan as any,
            jenisKelamin: (r.jenis_kelamin || 'LAKI_LAKI') as any,
            tanggalLahir: tglLahir,
            kategoriRentan: (r.kategori_rentan || 'TIDAK_ADA') as any,
          };
        });

        const anggotaResult = await tx.anggotaKeluarga.createMany({
          data: anggotaData,
        });

        insertedAnggotaCount += anggotaResult.count;
      }

      // Increment jumlahPengungsi in Posko if assigned
      if (targetPoskoId) {
        await tx.posko.update({
          where: { id: targetPoskoId },
          data: { jumlahPengungsi: { increment: insertedAnggotaCount } },
        });
      }

      // Log activity
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'IMPORT',
          deskripsi: `Import massal ${insertedKkCount} KK (${insertedAnggotaCount} Anggota Keluarga) dari file Excel`,
          referensiTipe: 'KARTU_KELUARGA',
        },
      });
    });

    // Clean up session
    deleteSession(importSessionId);

    return NextResponse.json({
      success: true,
      data: {
        insertedKkCount,
        insertedAnggotaCount,
      },
      message: `Berhasil mengimpor ${insertedKkCount} Kartu Keluarga (${insertedAnggotaCount} Anggota Keluarga) dan membuat QR Code.`,
    });
  } catch (error: any) {
    console.error('Error confirming import:', error);

    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        error: 'Terdapat data duplikat (NIK/Nomor KK) yang sudah ada di sistem. Silakan unggah ulang file yang sudah diperbaiki.',
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
