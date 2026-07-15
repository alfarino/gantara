import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const poskoId = searchParams.get('poskoId') || '';
    const status = searchParams.get('status') || '';

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { namaLengkap: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { idRelawan: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (poskoId) {
      whereClause.poskoId = poskoId;
    }

    if (status) {
      whereClause.status = status;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        posko: { select: { nama: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = users.map(u => ({
      id: u.id,
      email: u.email,
      namaLengkap: u.namaLengkap,
      role: u.role,
      status: u.status,
      poskoId: u.poskoId,
      poskoName: u.posko ? u.posko.nama : '—',
      idRelawan: u.idRelawan,
      keahlian: u.keahlian,
      createdAt: u.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Error fetching users:', error);
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
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, namaLengkap, role, poskoId } = body;

    if (!email || !password || !namaLengkap || !role) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (role !== 'SUPER_ADMIN' && !poskoId) {
      return NextResponse.json({ success: false, error: 'Posko wajib ditentukan untuk peran relawan / kepala posko.' }, { status: 400 });
    }

    // Check unique email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar.' }, { status: 400 });
    }

    // Generate unique idRelawan: REL-xxxx
    let idRelawan = null;
    if (role !== 'SUPER_ADMIN') {
      let isUnique = false;
      while (!isUnique) {
        const randDigits = Math.floor(1000 + Math.random() * 9000).toString();
        idRelawan = `REL-${randDigits}`;
        const check = await prisma.user.findUnique({ where: { idRelawan } });
        if (!check) isUnique = true;
      }
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
        poskoId: role !== 'SUPER_ADMIN' ? poskoId : null,
        idRelawan,
        status: 'AKTIF'
      }
    });

    // Log action
    await prisma.logAktivitas.create({
      data: {
        userId: user.id,
        tipe: 'DATA_UPDATE',
        deskripsi: `Membuat akun baru: ${namaLengkap} (${email}, Role: ${role})`,
        referensiId: newUser.id,
        referensiTipe: 'USER'
      }
    });

    return NextResponse.json({ success: true, data: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
