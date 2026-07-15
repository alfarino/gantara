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
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        posko: { select: { nama: true } }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetUser.id,
        email: targetUser.email,
        namaLengkap: targetUser.namaLengkap,
        role: targetUser.role,
        status: targetUser.status,
        poskoId: targetUser.poskoId,
        poskoName: targetUser.posko ? targetUser.posko.nama : '—',
        idRelawan: targetUser.idRelawan,
        keahlian: targetUser.keahlian
      }
    });
  } catch (error) {
    console.error('Error fetching user detail:', error);
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
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { namaLengkap, email, role, poskoId, status } = body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {};
    if (namaLengkap !== undefined) updateData.namaLengkap = namaLengkap;
    if (email !== undefined) {
      // Check email uniqueness if email is changed
      if (email !== targetUser.email) {
        const check = await prisma.user.findUnique({ where: { email } });
        if (check) {
          return NextResponse.json({ success: false, error: 'Email sudah terdaftar.' }, { status: 400 });
        }
      }
      updateData.email = email;
    }
    if (role !== undefined) {
      updateData.role = role;
      if (role === 'SUPER_ADMIN') {
        updateData.poskoId = null;
        updateData.idRelawan = null;
      } else {
        updateData.poskoId = poskoId || null;
        // Generate idRelawan if it doesn't already have one
        if (!targetUser.idRelawan) {
          let isUnique = false;
          let newId = '';
          while (!isUnique) {
            const randDigits = Math.floor(1000 + Math.random() * 9000).toString();
            newId = `REL-${randDigits}`;
            const check = await prisma.user.findUnique({ where: { idRelawan: newId } });
            if (!check) isUnique = true;
          }
          updateData.idRelawan = newId;
        }
      }
    } else if (poskoId !== undefined) {
      updateData.poskoId = targetUser.role !== 'SUPER_ADMIN' ? (poskoId || null) : null;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: updateData
      });

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Memperbarui profil user: ${record.namaLengkap} (${record.email})`,
          referensiId: record.id,
          referensiTipe: 'USER'
        }
      });

      return record;
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }

    // Soft-delete user: Set status to NONAKTIF
    const deletedUser = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: { status: 'NONAKTIF', poskoId: null }
      });

      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Menonaktifkan akun user (soft-delete): ${record.namaLengkap} (${record.email})`,
          referensiId: record.id,
          referensiTipe: 'USER'
        }
      });

      return record;
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${deletedUser.namaLengkap} berhasil dinonaktifkan (soft-delete).`
    });
  } catch (error) {
    console.error('Error soft-deleting user:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
