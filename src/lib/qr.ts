import QRCode from 'qrcode';

export async function generateQrBase64(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
  } catch (err) {
    console.error("Gagal membuat QR Code", err);
    throw err;
  }
}
