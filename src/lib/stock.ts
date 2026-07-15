export function calculateStockStatus(stokSaatIni: number, kebutuhanHarian: number): 'AMAN' | 'MENIPIS' | 'KRITIS' {
  if (kebutuhanHarian <= 0) {
    return 'AMAN';
  }
  const ratio = stokSaatIni / kebutuhanHarian;
  if (ratio < 2) {
    return 'KRITIS';
  } else if (ratio <= 5) {
    return 'MENIPIS';
  } else {
    return 'AMAN';
  }
}
