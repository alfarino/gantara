import { test } from 'node:test';
import assert from 'node:assert';
import { calculateStockStatus } from '../lib/stock';

test('calculateStockStatus - AMAN cases', () => {
  // kebutuhan harian is 0 or less
  assert.strictEqual(calculateStockStatus(100, 0), 'AMAN');
  assert.strictEqual(calculateStockStatus(100, -10), 'AMAN');

  // ratio is high (stokSaatIni / kebutuhanHarian > 5)
  assert.strictEqual(calculateStockStatus(60, 10), 'AMAN'); // ratio = 6
  assert.strictEqual(calculateStockStatus(51, 10), 'AMAN'); // ratio = 5.1
});

test('calculateStockStatus - MENIPIS cases', () => {
  // ratio is between 2 and 5 (inclusive of 5, exclusive of 2)
  assert.strictEqual(calculateStockStatus(50, 10), 'MENIPIS'); // ratio = 5
  assert.strictEqual(calculateStockStatus(30, 10), 'MENIPIS'); // ratio = 3
  assert.strictEqual(calculateStockStatus(20, 10), 'MENIPIS'); // ratio = 2
});

test('calculateStockStatus - KRITIS cases', () => {
  // ratio is less than 2
  assert.strictEqual(calculateStockStatus(19, 10), 'KRITIS'); // ratio = 1.9
  assert.strictEqual(calculateStockStatus(10, 10), 'KRITIS'); // ratio = 1.0
  assert.strictEqual(calculateStockStatus(0, 10), 'KRITIS');  // ratio = 0.0
});
