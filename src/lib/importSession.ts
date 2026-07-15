// In-memory store for import sessions
// Sessions auto-expire after 15 minutes

interface ImportRow {
  row: number;
  nomor_kk: string;
  nik: string;
  nama: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
  zona_risiko: string;
  status_hunian: string;
  status: 'VALID' | 'ERROR';
  error?: string;
}

interface ImportSession {
  id: string;
  createdAt: number;
  validRows: ImportRow[];
  allRows: ImportRow[];
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sessions = new Map<string, ImportSession>();

export function createSession(id: string, validRows: ImportRow[], allRows: ImportRow[]): ImportSession {
  // Clean up expired sessions on each create
  cleanExpired();

  const session: ImportSession = {
    id,
    createdAt: Date.now(),
    validRows,
    allRows,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): ImportSession | null {
  cleanExpired();
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

export type { ImportRow, ImportSession };
