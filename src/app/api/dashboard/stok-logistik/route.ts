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

    let whereClause: any = {};
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.poskoId) {
        return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
      }
      whereClause.poskoId = user.poskoId;
    }

    const inventoryItems = await prisma.inventoriLogistik.findMany({
      where: whereClause,
      orderBy: { namaBarang: 'asc' }
    });

    const mappedData = inventoryItems.map(item => {
      const persen = item.stokMaksimum > 0 
        ? Math.round((item.stokSaatIni / item.stokMaksimum) * 100) 
        : 0;

      let calculatedStatus = 'AMAN';
      if (item.kebutuhanHarian > 0) {
        const ratio = item.stokSaatIni / item.kebutuhanHarian;
        if (ratio < 2) {
          calculatedStatus = 'KRITIS';
        } else if (ratio <= 5) {
          calculatedStatus = 'MENIPIS';
        } else {
          calculatedStatus = 'AMAN';
        }
      }

      return {
        id: item.id,
        barang: item.namaBarang,
        persen,
        status: calculatedStatus,
        stok: `${item.stokSaatIni} ${item.satuan}`
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedData
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
