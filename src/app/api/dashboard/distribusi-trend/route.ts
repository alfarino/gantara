import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const daysData = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      let whereClause: any = {
        tanggalDistribusi: {
          gte: d,
          lte: dayEnd
        }
      };

      if (user.role !== 'SUPER_ADMIN') {
        if (!user.poskoId) {
          return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
        }
        whereClause.poskoId = user.poskoId;
      }

      const count = await prisma.distribusiBantuan.count({
        where: whereClause
      });

      daysData.push({
        hari: dayNames[d.getDay()],
        jumlah: count
      });
    }

    return NextResponse.json({
      success: true,
      data: daysData
    });
  } catch (error) {
    console.error('Error fetching distribution trend:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
