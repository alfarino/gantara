export interface User {
  id: string;
  email: string;
  namaLengkap: string;
  role: 'SUPER_ADMIN' | 'KEPALA_POSKO' | 'RELAWAN_DATA';
  poskoId?: string;
  idRelawan?: string;
  keahlian?: string;
  status: 'AKTIF' | 'NONAKTIF';
  fotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventBencana {
  id: string;
  nama: string;
  tipe: string;
  lokasi: string;
  tanggalMulai: Date;
  tanggalSelesai?: Date;
  tingkatKeparahan: 'KRITIS' | 'SIAGA' | 'WASPADA';
  deskripsi?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Posko {
  id: string;
  nama: string;
  lokasi: string;
  kapasitas: number;
  pjNama: string;
  pjKontak: string;
  eventBencanaId: string;
  createdAt: Date;
  updatedAt: Date;
}
