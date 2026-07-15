import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Gunakan jose karena Next.js middleware berjalan di Edge runtime

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gantara-super-secret-default-key'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gantara_token')?.value;

  // Izinkan request untuk resource statis, login, dan api/auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Jika tidak ada token, paksa redirect ke /login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verifikasi token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // RBAC: Cek akses ke halaman pengaturan (hanya SUPER_ADMIN)
    if (pathname.startsWith('/pengaturan') && payload.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/', request.url)); // redirect ke home
    }

    // Teruskan request
    const response = NextResponse.next();
    return response;
  } catch (error) {
    // Token tidak valid atau kedaluwarsa
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('gantara_token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
