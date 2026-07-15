import { NextResponse } from 'next/server';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ 
      success: false, 
      error: 'UNAUTHORIZED' 
    }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ 
      success: false, 
      error: 'INVALID_TOKEN' 
    }, { status: 401 });
  }

  return NextResponse.json({ 
    success: true, 
    data: user 
  });
}
