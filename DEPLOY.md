# Panduan Deploy GANTARA ke Ubuntu Server

Panduan ini menjelaskan cara men-deploy sistem GANTARA ke Ubuntu Server menggunakan Docker.

---

## Prasyarat

- Ubuntu Server 22.04 LTS atau lebih baru
- Koneksi internet
- Akses `sudo`

---

## 1. Instalasi Docker

Jalankan perintah berikut satu per satu:

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install dependensi
sudo apt install -y ca-certificates curl gnupg

# Tambah GPG key Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Tambah repository Docker
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Aktifkan Docker agar otomatis jalan saat boot
sudo systemctl enable docker
sudo systemctl start docker

# Izinkan user saat ini menggunakan Docker tanpa sudo (logout & login lagi setelah ini)
sudo usermod -aG docker $USER
```

> **Penting:** Setelah `usermod`, lakukan logout dan login ulang agar perubahan grup berlaku.

---

## 2. Clone Repository

```bash
# Buat direktori untuk aplikasi
sudo mkdir -p /opt/gantara
sudo chown $USER:$USER /opt/gantara

# Clone repository
git clone https://github.com/alfarino/gantara.git /opt/gantara

# Masuk ke direktori
cd /opt/gantara
```

---

## 3. Konfigurasi Environment

Buat file `.env` di folder `docker/` berdasarkan template yang sudah tersedia:

```bash
cp /opt/gantara/docker/.env.selfhosted.example /opt/gantara/docker/.env
```

Edit file tersebut dan ganti nilai-nilai penting:

```bash
nano /opt/gantara/docker/.env
```

Isi file `.env`:

```env
# Database
POSTGRES_USER=gantara_user
POSTGRES_PASSWORD=GANTI_DENGAN_PASSWORD_AMAN
POSTGRES_DB=gantara_prod

# Auth — WAJIB diganti dengan string acak yang panjang!
JWT_SECRET=GANTI_DENGAN_STRING_ACAK_MINIMAL_32_KARAKTER
JWT_EXPIRES_IN=24h
JWT_REMEMBER_EXPIRES_IN=30d
```

> **Tips membuat JWT_SECRET yang aman:**
> ```bash
> openssl rand -base64 48
> ```

---

## 4. Jalankan Sistem

```bash
cd /opt/gantara/docker

# Build image dan jalankan semua container
docker compose up -d --build
```

Proses ini akan:
1. Build image Next.js (memakan waktu ~3-5 menit pertama kali)
2. Menjalankan container PostgreSQL
3. Menunggu database siap (health check)
4. Menjalankan migrasi Prisma otomatis
5. Menjalankan aplikasi
6. Menjalankan Nginx di port 80

Cek status:
```bash
docker compose ps
docker compose logs -f
```

Sistem bisa diakses di: `http://<IP-SERVER-KAMU>`

---

## 5. Auto-Start saat Server Nyala (Systemd)

Agar sistem otomatis online setiap kali server dinyalakan:

```bash
# Copy file service ke systemd
sudo cp /opt/gantara/docker/gantara.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Aktifkan service (akan jalan otomatis saat boot)
sudo systemctl enable gantara

# Jalankan sekarang juga
sudo systemctl start gantara

# Cek status
sudo systemctl status gantara
```

Untuk verifikasi: coba restart server, lalu cek apakah sistem otomatis online.

```bash
sudo reboot
# Tunggu ~1-2 menit, lalu akses http://<IP-SERVER>
```

---

## 6. Perintah Berguna untuk Maintenance

```bash
# Lihat status semua container
cd /opt/gantara/docker && docker compose ps

# Lihat log real-time
docker compose logs -f

# Lihat log app saja
docker compose logs -f gantara-app

# Restart semua container
docker compose restart

# Hentikan semua container
docker compose down

# Update ke versi terbaru dari GitHub
cd /opt/gantara
git pull
cd docker
docker compose down
docker compose up -d --build

# Backup database
docker exec gantara-db-container pg_dump -U gantara_user gantara_prod > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_YYYYMMDD.sql | docker exec -i gantara-db-container psql -U gantara_user gantara_prod
```

---

## 7. Troubleshooting

### App tidak bisa konek ke database
```bash
# Cek apakah DB sudah healthy
docker compose ps gantara-db
# Harus menunjukkan status: healthy
```

### Port 80 sudah dipakai
```bash
# Cek proses yang menggunakan port 80
sudo ss -tlnp | grep :80
# Matikan proses tersebut atau ganti port di docker-compose.yml
```

### Cek log error
```bash
docker compose logs gantara-app --tail=50
docker compose logs gantara-db --tail=50
docker compose logs gantara-nginx --tail=50
```
