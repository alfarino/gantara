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

    // If no eventBencanaId provided, find the latest active event
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

    // Build batch insert payload
    const recordsToInsert = validRows.map((row) => {
      const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const qrCodeData = `PG-2026-${randomSuffix}`;

      return {
        nomorKk: row.nomor_kk,
        namaKepalaKeluarga: row.nama,
        nikKepalaKeluarga: row.nik,
        alamat: row.alamat,
        rt: row.rt,
        rw: row.rw,
        kelurahan: row.kelurahan,
        kecamatan: row.kecamatan,
        kabupaten: row.kabupaten,
        zonaRisiko: row.zona_risiko as any,
        statusHunian: row.status_hunian as any,
        qrCodeData,
        eventBencanaId: targetEventId,
        poskoId: targetPoskoId,
        createdById: user.id,
      };
    });

    // Use transaction to insert all valid rows in a single batch query
    const result = await prisma.$transaction(async (tx) => {
      const batchResult = await tx.kartuKeluarga.createMany({
        data: recordsToInsert,
      });

      // Log the import activity
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'VERIFIKASI',
          deskripsi: `Import massal ${batchResult.count} Kartu Keluarga dari file Excel`,
          referensiTipe: 'KARTU_KELUARGA',
        },
      });

      return batchResult.count;
    });

    // Clean up session after successful commit
    deleteSession(importSessionId);

    return NextResponse.json({
      success: true,
      data: {
        insertedCount: result,
      },
      message: `Berhasil mengimpor ${result} Kartu Keluarga dan membuat QR Code.`,
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
