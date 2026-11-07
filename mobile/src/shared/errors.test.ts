import { describe, expect, it } from '@jest/globals';

import { isNetworkError } from './errors';

describe('isNetworkError', () => {
  it('detects auth, PostgREST and fetch failures', () => {
    expect(isNetworkError({ name: 'AuthRetryableFetchError', status: 0 })).toBe(true);
    expect(isNetworkError({ message: 'TypeError: Network request failed', code: '' })).toBe(true);
    expect(isNetworkError({ message: 'TypeError: Failed to fetch' })).toBe(true);
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('ignores server and validation errors', () => {
    expect(isNetworkError({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false);
    expect(isNetworkError({ code: 'invalid_credentials', status: 400 })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
