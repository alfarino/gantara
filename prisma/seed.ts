import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.logAktivitas.deleteMany({});
  await prisma.distribusiBantuan.deleteMany({});
  await prisma.inventoriLogistik.deleteMany({});
  await prisma.anggotaKeluarga.deleteMany({});
  await prisma.kartuKeluarga.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.posko.deleteMany({});
  await prisma.eventBencana.deleteMany({});

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminGantara123!', salt);
  const volunteerPasswordHash = await bcrypt.hash('RelawanGantara123!', salt);

  // 1. Create Event Bencana
  const event = await prisma.eventBencana.create({
    data: {
      nama: "Gempa M 6.2 Padang",
      tipe: "GEMPA_BUMI",
      status: "KRITIS",
      lokasi: "Kec. Padang Barat, Kota Padang",
      tanggalMulai: new Date(),
      deskripsi: "Gempa tektonik dangkal berkekuatan M 6.2 melanda pesisir barat Sumatra Barat, merusak pemukiman padat penduduk.",
    }
  });

  // 2. Create Posko
  const posko = await prisma.posko.create({
    data: {
      nama: "Posko Utama Gurun Laweh",
      tipe: "UTAMA",
      alamat: "Gedung Serbaguna Gurun Laweh, Padang",
      eventBencanaId: event.id,
      status: "OPERASIONAL",
      jumlahPengungsi: 4,
    }
  });

  // 3. Create Users
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@gantara.id",
      passwordHash: adminPasswordHash,
      namaLengkap: "Rian Hidayat (Super Admin)",
      role: "SUPER_ADMIN",
      status: "AKTIF",
      // Super Admin tidak memiliki id_relawan dan keahlian
    }
  });

  const kepalaPosko = await prisma.user.create({
    data: {
      email: "kepala.posko1@gantara.id",
      passwordHash: volunteerPasswordHash,
      namaLengkap: "Hendro Wibowo (Kepala Posko)",
      role: "KEPALA_POSKO",
      status: "AKTIF",
      poskoId: posko.id,
      idRelawan: "REL-0147",
      keahlian: "Koordinasi & Manajemen Posko",
    }
  });

  const relawanData = await prisma.user.create({
    data: {
      email: "relawan.data1@gantara.id",
      passwordHash: volunteerPasswordHash,
      namaLengkap: "Siti Rahma (Relawan Data)",
      role: "RELAWAN_DATA",
      status: "AKTIF",
      poskoId: posko.id,
      idRelawan: "REL-0892",
      keahlian: "Medis & Logistik",
    }
  });

  // 4. Create Inventori Logistik
  await prisma.inventoriLogistik.createMany({
    data: [
      {
        poskoId: posko.id,
        namaBarang: "Beras (Karung 10kg)",
        satuan: "Karung",
        stokSaatIni: 45,
        stokMaksimum: 200,
        kebutuhanHarian: 15,
        status: "MENIPIS", // 45/15 = 3 hari (antara 2-5 hari = Menipis)
      },
      {
        poskoId: posko.id,
        namaBarang: "Air Bersih (Galon)",
        satuan: "Galon",
        stokSaatIni: 8,
        stokMaksimum: 100,
        kebutuhanHarian: 20,
        status: "KRITIS", // 8/20 = 0.4 hari (< 2 hari = Kritis)
      },
      {
        poskoId: posko.id,
        namaBarang: "Obat-obatan PPPK",
        satuan: "Paket",
        stokSaatIni: 15,
        stokMaksimum: 50,
        kebutuhanHarian: 5,
        status: "AMAN", // 15/5 = 3 hari... sebenarnya ini Menipis, tapi set Aman untuk variasi data demo
      }
    ]
  });

  // 5. Create Kartu Keluarga & Anggota
  const kk = await prisma.kartuKeluarga.create({
    data: {
      nomorKk: "1371012345678901",
      namaKepalaKeluarga: "Joni Iskandar",
      nikKepalaKeluarga: "1371011212780001",
      alamat: "Jl. Gurun Laweh No. 12, RT 01/RW 03",
      rt: "01",
      rw: "03",
      kelurahan: "Gurun Laweh Nan XX",
      kecamatan: "Lubuk Begalung",
      kabupaten: "Kota Padang",
      zonaRisiko: "MERAH",
      statusHunian: "RUSAK_BERAT",
      statusVerifikasi: "TERVERIFIKASI",
      qrCodeData: "PG-2026-1029",
      poskoId: posko.id,
      eventBencanaId: event.id,
      createdById: relawanData.id,
    }
  });

  await prisma.anggotaKeluarga.createMany({
    data: [
      {
        kartuKeluargaId: kk.id,
        nik: "1371011212780001",
        nama: "Joni Iskandar",
        hubungan: "KEPALA_KELUARGA",
        jenisKelamin: "LAKI_LAKI",
        tanggalLahir: new Date("1978-12-12"),
        kategoriRentan: "TIDAK_ADA",
      },
      {
        kartuKeluargaId: kk.id,
        nik: "1371011405820002",
        nama: "Dewi Lestari",
        hubungan: "ISTRI",
        jenisKelamin: "PEREMPUAN",
        tanggalLahir: new Date("1982-05-14"),
        kategoriRentan: "TIDAK_ADA",
      },
      {
        kartuKeluargaId: kk.id,
        nik: "1371011508100003",
        nama: "Aditya Iskandar",
        hubungan: "ANAK",
        jenisKelamin: "LAKI_LAKI",
        tanggalLahir: new Date("2010-08-15"),
        kategoriRentan: "TIDAK_ADA",
      },
      {
        kartuKeluargaId: kk.id,
        nik: "1371012512220004",
        nama: "Balita Cantika",
        hubungan: "ANAK",
        jenisKelamin: "PEREMPUAN",
        tanggalLahir: new Date("2022-12-25"),
        kategoriRentan: "BALITA",
      }
    ]
  });

  console.log("Seeding database berhasil diselesaikan!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
