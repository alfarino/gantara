import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'gantara-super-secret-default-key';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: object, rememberMe: boolean = false): string {
  const expiresIn = rememberMe 
    ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d' 
    : process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export async function setAuthCookie(token: string, rememberMe: boolean = false) {
  const cookieStore = await cookies();
  const maxAge = rememberMe 
    ? 30 * 24 * 60 * 60 // 30 hari dalam detik
    : 24 * 60 * 60; // 1 hari dalam detik

  cookieStore.set('gantara_token', token, {
    httpOnly: true,
    secure: true, // Menggunakan secure: true agar kompatibel dengan HTTPS ngrok. Browser tetap mengizinkan secure cookie di localhost.
    sameSite: 'lax', // Menggunakan lax untuk mencegah issue redirect/CORS di beberapa browser
    path: '/',
    maxAge: maxAge,
  });
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('gantara_token')?.value;
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
