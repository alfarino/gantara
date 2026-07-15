import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken, verifyToken } from '@/lib/auth';
import { calculateStockStatus } from '@/lib/stock';

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
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;

    const items = await prisma.inventoriLogistik.findMany({
      where: { poskoId: id },
      orderBy: { namaBarang: 'asc' }
    });

    const mappedData = items.map(item => {
      const calculatedStatus = calculateStockStatus(item.stokSaatIni, item.kebutuhanHarian);

      return {
        id: item.id,
        nama_barang: item.namaBarang,
        satuan: item.satuan,
        stok_saat_ini: item.stokSaatIni,
        stok_maksimum: item.stokMaksimum,
        kebutuhan_harian: item.kebutuhanHarian,
        status: calculatedStatus
      };
    });

    return NextResponse.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { id } = await params;

    // RBAC validation
    if (user.role === 'RELAWAN_DATA') {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    if (user.role === 'KEPALA_POSKO' && user.poskoId !== id) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const { nama_barang, tipe_mutasi, jumlah, catatan } = body;

    if (!nama_barang || !tipe_mutasi || !jumlah) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (tipe_mutasi !== 'IN' && tipe_mutasi !== 'OUT') {
      return NextResponse.json({ success: false, error: 'Tipe mutasi tidak valid' }, { status: 400 });
    }

    const changeAmount = parseInt(jumlah, 10);
    if (isNaN(changeAmount) || changeAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah harus bilangan positif' }, { status: 400 });
    }

    // Find the posko name for the logs
    const posko = await prisma.posko.findUnique({
      where: { id },
      select: { nama: true }
    });

    if (!posko) {
      return NextResponse.json({ success: false, error: 'Posko tidak ditemukan' }, { status: 404 });
    }

    // Perform inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      let item = await tx.inventoriLogistik.findFirst({
        where: { poskoId: id, namaBarang: nama_barang }
      });

      if (!item) {
        // Determine unit (satuan) based on nama_barang
        let satuan = 'Pcs';
        const nameLower = nama_barang.toLowerCase();
        if (nameLower.includes('beras')) satuan = 'Karung';
        else if (nameLower.includes('air')) satuan = 'Galon';
        else if (nameLower.includes('obat')) satuan = 'Paket';
        else if (nameLower.includes('selimut')) satuan = 'Pcs';
        else if (nameLower.includes('tenda')) satuan = 'Unit';
        else if (nameLower.includes('pakaian')) {
          satuan = nameLower.includes('koli') ? 'Koli' : 'Pcs';
        } else if (nameLower.includes('makanan') || nameLower.includes('susu')) {
          satuan = 'Kardus';
        }

        item = await tx.inventoriLogistik.create({
          data: {
            poskoId: id,
            namaBarang: nama_barang,
            satuan,
            stokSaatIni: 0,
            stokMaksimum: 200,
            kebutuhanHarian: 10,
            status: 'KRITIS'
          }
        });
      }

      let newStok = item.stokSaatIni;
      if (tipe_mutasi === 'IN') {
        newStok += changeAmount;
      } else {
        if (item.stokSaatIni < changeAmount) {
          throw new Error('STOK_TIDAK_MENCUKUPI');
        }
        newStok -= changeAmount;
      }

      // Re-calculate level status
      let newStatus = 'AMAN';
      if (item.kebutuhanHarian > 0) {
        const ratio = newStok / item.kebutuhanHarian;
        if (ratio < 2) {
          newStatus = 'KRITIS';
        } else if (ratio <= 5) {
          newStatus = 'MENIPIS';
        } else {
          newStatus = 'AMAN';
        }
      }

      // Update inventory item
      const updatedItem = await tx.inventoriLogistik.update({
        where: { id: item.id },
        data: {
          stokSaatIni: newStok,
          status: newStatus as any
        }
      });

      // Write activity log
      await tx.logAktivitas.create({
        data: {
          userId: user.id,
          tipe: 'DATA_UPDATE',
          deskripsi: `Mencatat mutasi ${tipe_mutasi} ${changeAmount} ${item.satuan} ${nama_barang} di ${posko.nama}. ${catatan ? `Catatan: ${catatan}` : ''}`,
          referensiId: updatedItem.id,
          referensiTipe: 'INVENTORI_LOGISTIK'
        }
      });

      return updatedItem;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'STOK_TIDAK_MENCUKUPI') {
      return NextResponse.json({ success: false, error: 'Stok logistik saat ini tidak mencukupi untuk mutasi barang keluar.' }, { status: 400 });
    }
    console.error('Error recording inventory transaction:', error);
    return NextResponse.json({ success: false, error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
