import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();

    // Query user from database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email atau kata sandi salah' 
      }, { status: 400 });
    }

    if (user.status === 'NONAKTIF') {
      return NextResponse.json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan'
      }, { status: 400 });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email atau kata sandi salah' 
      }, { status: 400 });
    }

    // Prepare token payload
    const tokenPayload = {
      id: user.id,
      email: user.email,
      namaLengkap: user.namaLengkap,
      role: user.role,
      poskoId: user.poskoId || undefined,
    };

    const token = generateToken(tokenPayload, rememberMe);
    await setAuthCookie(token, rememberMe);

    return NextResponse.json({ 
      success: true, 
      data: {
        id: user.id,
        email: user.email,
        namaLengkap: user.namaLengkap,
        role: user.role,
        poskoId: user.poskoId || undefined,
      },
      message: 'Login berhasil'
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ 
      success: false, 
      message: 'Terjadi kesalahan sistem' 
    }, { status: 500 });
  }
}
