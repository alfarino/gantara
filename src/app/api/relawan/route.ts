import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    // Relawan Data is forbidden to view volunteers page / API
    if (user.role === 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const volunteers = await prisma.user.findMany({
      where: {
        role: { in: ['KEPALA_POSKO', 'RELAWAN_DATA'] }
      },
      include: {
        posko: {
          select: { id: true, nama: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedData = volunteers.map(v => {
      // Map database status to logical status (AKTIF, STANDBY, NONAKTIF)
      let logicalStatus = 'NONAKTIF';
      if (v.status === 'AKTIF') {
        logicalStatus = v.poskoId ? 'AKTIF' : 'STANDBY';
      }

      return {
        id: v.id,
        nama_lengkap: v.namaLengkap,
        id_relawan: v.idRelawan,
        status: logicalStatus,
        keahlian: v.keahlian,
        posko: v.posko ? { id: v.posko.id, nama: v.posko.nama } : null,
        foto_url: v.fotoUrl
      };
    });

    return NextResponse.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching volunteers:', error);
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

    // Only SUPER_ADMIN can register new volunteers
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, namaLengkap, role, poskoId, keahlian } = body;

    if (!email || !password || !namaLengkap || !role) {
      return NextResponse.json({ success: false, error: 'Email, password, nama lengkap, dan role wajib diisi.' }, { status: 400 });
    }

    if (role !== 'RELAWAN_DATA' && role !== 'KEPALA_POSKO') {
      return NextResponse.json({ success: false, error: 'Role tidak valid.' }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar.' }, { status: 400 });
    }

    // Generate unique idRelawan: REL-xxxx
    let idRelawan = '';
    let isUnique = false;
    while (!isUnique) {
      const randDigits = Math.floor(1000 + Math.random() * 9000).toString();
      idRelawan = `REL-${randDigits}`;
      const existing = await prisma.user.findUnique({ where: { idRelawan } });
      if (!existing) isUnique = true;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        namaLengkap,
        role,
        poskoId: poskoId || null,
        keahlian: keahlian || null,
        idRelawan,
        status: 'AKTIF' // Default to active status
      }
    });

    // Log this action
    await prisma.logAktivitas.create({
      data: {
        userId: user.id,
        tipe: 'DATA_UPDATE',
        deskripsi: `Mendaftarkan relawan baru: ${namaLengkap} (${idRelawan})`,
        referensiId: newUser.id,
        referensiTipe: 'USER'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        namaLengkap: newUser.namaLengkap,
        role: newUser.role,
        idRelawan: newUser.idRelawan
      }
    });
  } catch (error) {
    console.error('Error creating volunteer:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
