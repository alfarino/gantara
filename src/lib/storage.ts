import fs from 'fs';
import path from 'path';

export const storage = {
  async uploadFile(buffer: Buffer, fileName: string, folder: string): Promise<string> {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    
    if (provider === 'local') {
      const localPath = process.env.STORAGE_LOCAL_PATH || './public/uploads';
      const uploadDir = path.join(process.cwd(), localPath, folder);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      // Mengembalikan URL publik lokal
      const relativePath = localPath.replace('./public', '');
      return `${relativePath}/${folder}/${fileName}`;
    }
    
    if (provider === 'supabase') {
      // Diimplementasikan pada deployment Jalur A
      // Menggunakan Supabase Storage JS Client
      return `https://${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gantara-media/${folder}/${fileName}`;
    }
    
    return '';
  }
};
export default storage;
