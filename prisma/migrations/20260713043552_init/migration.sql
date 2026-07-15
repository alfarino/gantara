-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'KEPALA_POSKO', 'RELAWAN_DATA');

-- CreateEnum
CREATE TYPE "StatusUser" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "TipeBencana" AS ENUM ('GEMPA_BUMI', 'BANJIR', 'LONGSOR', 'ERUPSI', 'KEBAKARAN', 'TSUNAMI', 'ANGIN_TOPAN', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusBencana" AS ENUM ('KRITIS', 'SIAGA', 'WASPADA', 'SELESAI');

-- CreateEnum
CREATE TYPE "TipePosko" AS ENUM ('UTAMA', 'BANTUAN', 'MEDIS', 'DAPUR_UMUM');

-- CreateEnum
CREATE TYPE "StatusPosko" AS ENUM ('OPERASIONAL', 'PENUH', 'DITUTUP');

-- CreateEnum
CREATE TYPE "ZonaRisiko" AS ENUM ('MERAH', 'KUNING', 'HIJAU');

-- CreateEnum
CREATE TYPE "StatusHunian" AS ENUM ('RUSAK_BERAT', 'RUSAK_SEDANG', 'RUSAK_RINGAN', 'AMAN');

-- CreateEnum
CREATE TYPE "StatusVerifikasi" AS ENUM ('TERVERIFIKASI', 'MENUNGGU', 'DITOLAK');

-- CreateEnum
CREATE TYPE "HubunganKeluarga" AS ENUM ('KEPALA_KELUARGA', 'ISTRI', 'ANAK', 'ORANG_TUA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "KategoriRentan" AS ENUM ('LANSIA', 'BALITA', 'DIFABEL', 'IBU_HAMIL', 'TIDAK_ADA');

-- CreateEnum
CREATE TYPE "StatusDistribusi" AS ENUM ('TERSALURKAN', 'PENDING_VERIFIKASI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "TipeAktivitas" AS ENUM ('DISTRIBUSI', 'DARURAT', 'VERIFIKASI', 'DATA_UPDATE', 'LOGIN', 'SCAN_QR', 'IMPORT');

-- CreateEnum
CREATE TYPE "StatusInventori" AS ENUM ('AMAN', 'MENIPIS', 'KRITIS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nama_lengkap" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "status" "StatusUser" NOT NULL DEFAULT 'AKTIF',
    "posko_id" TEXT,
    "foto_url" TEXT,
    "id_relawan" VARCHAR(20),
    "keahlian" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bencana" (
    "id" TEXT NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "tipe" "TipeBencana" NOT NULL,
    "status" "StatusBencana" NOT NULL,
    "lokasi" VARCHAR(500) NOT NULL,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3),
    "deskripsi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_bencana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posko" (
    "id" TEXT NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "tipe" "TipePosko" NOT NULL,
    "alamat" TEXT NOT NULL,
    "event_bencana_id" TEXT NOT NULL,
    "jumlah_pengungsi" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusPosko" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kartu_keluarga" (
    "id" TEXT NOT NULL,
    "nomor_kk" VARCHAR(16) NOT NULL,
    "nama_kepala_keluarga" VARCHAR(255) NOT NULL,
    "nik_kepala_keluarga" VARCHAR(16) NOT NULL,
    "alamat" TEXT NOT NULL,
    "rt" VARCHAR(5) NOT NULL,
    "rw" VARCHAR(5) NOT NULL,
    "kelurahan" VARCHAR(100) NOT NULL,
    "kecamatan" VARCHAR(100) NOT NULL,
    "kabupaten" VARCHAR(100) NOT NULL,
    "zona_risiko" "ZonaRisiko" NOT NULL,
    "status_hunian" "StatusHunian" NOT NULL,
    "status_verifikasi" "StatusVerifikasi" NOT NULL DEFAULT 'MENUNGGU',
    "qr_code_data" VARCHAR(50) NOT NULL,
    "posko_id" TEXT,
    "event_bencana_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kartu_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anggota_keluarga" (
    "id" TEXT NOT NULL,
    "kartu_keluarga_id" TEXT NOT NULL,
    "nik" VARCHAR(16) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "hubungan" "HubunganKeluarga" NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "tanggal_lahir" DATE NOT NULL,
    "kategori_rentan" "KategoriRentan",
    "kondisi_kesehatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anggota_keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribusi_bantuan" (
    "id" TEXT NOT NULL,
    "kartu_keluarga_id" TEXT NOT NULL,
    "posko_id" TEXT NOT NULL,
    "jenis_bantuan" VARCHAR(255) NOT NULL,
    "kuantitas" VARCHAR(50) NOT NULL,
    "status" "StatusDistribusi" NOT NULL DEFAULT 'TERSALURKAN',
    "petugas_id" TEXT NOT NULL,
    "catatan" TEXT,
    "tanggal_distribusi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribusi_bantuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventori_logistik" (
    "id" TEXT NOT NULL,
    "posko_id" TEXT NOT NULL,
    "nama_barang" VARCHAR(255) NOT NULL,
    "satuan" VARCHAR(50) NOT NULL,
    "stok_saat_ini" INTEGER NOT NULL,
    "stok_maksimum" INTEGER NOT NULL,
    "kebutuhan_harian" INTEGER NOT NULL,
    "status" "StatusInventori" NOT NULL DEFAULT 'AMAN',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventori_logistik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_aktivitas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tipe" "TipeAktivitas" NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "referensi_id" TEXT,
    "referensi_tipe" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_aktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_relawan_key" ON "users"("id_relawan");

-- CreateIndex
CREATE UNIQUE INDEX "kartu_keluarga_nomor_kk_key" ON "kartu_keluarga"("nomor_kk");

-- CreateIndex
CREATE UNIQUE INDEX "kartu_keluarga_nik_kepala_keluarga_key" ON "kartu_keluarga"("nik_kepala_keluarga");

-- CreateIndex
CREATE UNIQUE INDEX "kartu_keluarga_qr_code_data_key" ON "kartu_keluarga"("qr_code_data");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_posko_id_fkey" FOREIGN KEY ("posko_id") REFERENCES "posko"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posko" ADD CONSTRAINT "posko_event_bencana_id_fkey" FOREIGN KEY ("event_bencana_id") REFERENCES "event_bencana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kartu_keluarga" ADD CONSTRAINT "kartu_keluarga_posko_id_fkey" FOREIGN KEY ("posko_id") REFERENCES "posko"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kartu_keluarga" ADD CONSTRAINT "kartu_keluarga_event_bencana_id_fkey" FOREIGN KEY ("event_bencana_id") REFERENCES "event_bencana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kartu_keluarga" ADD CONSTRAINT "kartu_keluarga_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota_keluarga" ADD CONSTRAINT "anggota_keluarga_kartu_keluarga_id_fkey" FOREIGN KEY ("kartu_keluarga_id") REFERENCES "kartu_keluarga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribusi_bantuan" ADD CONSTRAINT "distribusi_bantuan_kartu_keluarga_id_fkey" FOREIGN KEY ("kartu_keluarga_id") REFERENCES "kartu_keluarga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribusi_bantuan" ADD CONSTRAINT "distribusi_bantuan_posko_id_fkey" FOREIGN KEY ("posko_id") REFERENCES "posko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribusi_bantuan" ADD CONSTRAINT "distribusi_bantuan_petugas_id_fkey" FOREIGN KEY ("petugas_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventori_logistik" ADD CONSTRAINT "inventori_logistik_posko_id_fkey" FOREIGN KEY ("posko_id") REFERENCES "posko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
