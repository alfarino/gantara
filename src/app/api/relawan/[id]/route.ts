import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    // Relawan Data cannot edit volunteers
    if (user.role === 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { poskoId, status } = body;

    // Fetch target volunteer
    const targetVolunteer = await prisma.user.findUnique({
      where: { id },
      include: {
        posko: { select: { nama: true } }
      }
    });

    if (!targetVolunteer) {
      return NextResponse.json({ success: false, error: 'Relawan tidak ditemukan.' }, { status: 404 });
    }

    // RBAC validation for KEPALA_POSKO
    if (user.role === 'KEPALA_POSKO') {
      if (!user.poskoId) {
        return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
      }

      // Check if target relawan is currently assigned to this Kepala Posko's posko
      const isCurrentlyAssigned = targetVolunteer.poskoId === user.poskoId;
      // Check if target relawan is currently standby
      const isCurrentlyStandby = targetVolunteer.poskoId === null && targetVolunteer.status === 'AKTIF';

      if (poskoId !== undefined) {
        // If trying to assign to Kepala Posko's posko
        if (poskoId === user.poskoId) {
          // Can only do this if they are currently standby or already assigned
          if (!isCurrentlyStandby && !isCurrentlyAssigned) {
            return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
          }
        } 
        // If trying to remove from posko (setting to null/standby)
        else if (poskoId === null) {
          // Can only do this if the relawan is currently assigned to this posko
          if (!isCurrentlyAssigned) {
            return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
          }
        } 
        // Trying to assign to another posko
        else {
          return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
        }
      }

      if (status !== undefined) {
        // Kepala Posko can only modify status for their own relawans
        if (!isCurrentlyAssigned) {
          return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
        }
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (poskoId !== undefined) {
      updateData.poskoId = poskoId;
    }

    if (status !== undefined) {
      if (status === 'NONAKTIF') {
        updateData.status = 'NONAKTIF';
      } else if (status === 'STANDBY') {
        updateData.status = 'AKTIF';
        updateData.poskoId = null;
      } else if (status === 'AKTIF') {
        updateData.status = 'AKTIF';
      }
    }

    // Perform transaction to update and log activity
    const updatedUser = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: updateData
      });

      // Get posko name for the logs if poskoId changed
      let poskoLogText = '';
      if (poskoId !== undefined) {
        if (poskoId) {
          const p = await tx.posko.findUnique({ where: { id: poskoId }, select: { nama: true } });
          poskoLogText = ` ke ${p?.nama || 'Posko'}`;
        } else {
          poskoLogText = ` menjadi Standby`;
        }
      }

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Memperbarui tugas/status relawan ${record.namaLengkap} (${record.idRelawan})${poskoLogText}`,
          referensiId: record.id,
          referensiTipe: 'USER'
        }
      });

      return record;
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating volunteer:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
