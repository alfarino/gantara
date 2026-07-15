import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { resilientFetch } from '../lib/resilientFetch';

// Mock browser globals
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Setup minimal window and localStorage mocks
  globalThis.window = {
    dispatchEvent: () => true
  } as any;
  
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { for (const k in store) delete store[k]; }
  } as any;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  // @ts-ignore
  delete globalThis.window;
  // @ts-ignore
  delete globalThis.localStorage;
});

test('resilientFetch - returns response on first success', async () => {
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return { ok: true, status: 200 } as Response;
  };

  const response = await resilientFetch('/api/test');
  assert.ok(response.ok);
  assert.strictEqual(callCount, 1);
});

test('resilientFetch - retries up to 3 times then throws error', async () => {
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    throw new Error('Network error');
  };

  // Override setTimeout to run immediately for fast testing
  const originalSetTimeout = globalThis.setTimeout;
  // @ts-ignore
  globalThis.setTimeout = (cb: Function) => cb();

  try {
    await resilientFetch('/api/test', { method: 'GET' });
    assert.fail('Should have failed');
  } catch (error: any) {
    assert.strictEqual(callCount, 3);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('resilientFetch - queues write request in localStorage on failure', async () => {
  globalThis.fetch = async () => {
    throw new Error('Network error');
  };

  const originalSetTimeout = globalThis.setTimeout;
  // @ts-ignore
  globalThis.setTimeout = (cb: Function) => cb();

  try {
    await resilientFetch('/api/distribusi', { 
      method: 'POST', 
      body: JSON.stringify({ item: 'test' }) 
    });
    assert.fail('Should have failed');
  } catch (error: any) {
    // Assert queue is not empty
    const queue = JSON.parse(localStorage.getItem('gantara_offline_queue') || '[]');
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].url, '/api/distribusi');
    assert.strictEqual(queue[0].method, 'POST');
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
