-- CreateEnum
CREATE TYPE "StatusKesehatan" AS ENUM ('SEHAT', 'DALAM_PENANGANAN', 'SAKIT', 'DARURAT');

-- AlterTable
ALTER TABLE "anggota_keluarga" ADD COLUMN     "status_kesehatan" "StatusKesehatan" NOT NULL DEFAULT 'SEHAT';

-- CreateIndex
CREATE INDEX "anggota_keluarga_kartu_keluarga_id_idx" ON "anggota_keluarga"("kartu_keluarga_id");

-- CreateIndex
CREATE INDEX "anggota_keluarga_status_kesehatan_idx" ON "anggota_keluarga"("status_kesehatan");

-- CreateIndex
CREATE INDEX "distribusi_bantuan_posko_id_idx" ON "distribusi_bantuan"("posko_id");

-- CreateIndex
CREATE INDEX "distribusi_bantuan_kartu_keluarga_id_idx" ON "distribusi_bantuan"("kartu_keluarga_id");

-- CreateIndex
CREATE INDEX "distribusi_bantuan_petugas_id_idx" ON "distribusi_bantuan"("petugas_id");

-- CreateIndex
CREATE INDEX "distribusi_bantuan_tanggal_distribusi_idx" ON "distribusi_bantuan"("tanggal_distribusi");

-- CreateIndex
CREATE INDEX "inventori_logistik_posko_id_idx" ON "inventori_logistik"("posko_id");

-- CreateIndex
CREATE INDEX "kartu_keluarga_posko_id_idx" ON "kartu_keluarga"("posko_id");

-- CreateIndex
CREATE INDEX "kartu_keluarga_event_bencana_id_idx" ON "kartu_keluarga"("event_bencana_id");

-- CreateIndex
CREATE INDEX "kartu_keluarga_kelurahan_idx" ON "kartu_keluarga"("kelurahan");

-- CreateIndex
CREATE INDEX "kartu_keluarga_status_verifikasi_idx" ON "kartu_keluarga"("status_verifikasi");

-- CreateIndex
CREATE INDEX "kartu_keluarga_created_at_idx" ON "kartu_keluarga"("created_at");

-- CreateIndex
CREATE INDEX "log_aktivitas_user_id_idx" ON "log_aktivitas"("user_id");

-- CreateIndex
CREATE INDEX "log_aktivitas_tipe_created_at_idx" ON "log_aktivitas"("tipe", "created_at");
