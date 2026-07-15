import test from 'node:test';
import assert from 'node:assert/strict';

import { apiRequest } from '../src/api.js';

test('falls back to the local backend when the relative API URL is unavailable', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url === '/api/auth/login') {
      throw new TypeError('Failed to fetch');
    }

    if (url === 'http://127.0.0.1:5000/api/auth/login') {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'ok' }),
      };
    }

    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const result = await apiRequest('/auth/login');
    assert.deepEqual(calls, ['/api/auth/login', 'http://127.0.0.1:5000/api/auth/login']);
    assert.deepEqual(result, { message: 'ok' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
