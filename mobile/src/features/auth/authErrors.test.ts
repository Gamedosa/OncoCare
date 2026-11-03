import { describe, expect, it } from '@jest/globals';

import {
  GENERIC_ERROR_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  isNetworkError,
  OFFLINE_MESSAGE,
  RATE_LIMIT_MESSAGE,
  signInErrorMessage,
} from './authErrors';

describe('signInErrorMessage', () => {
  it('uses the same message for wrong password and unconfirmed e-mail', () => {
    expect(signInErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(signInErrorMessage({ code: 'email_not_confirmed', status: 400 })).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it('detects network failures', () => {
    const fetchError = { name: 'AuthRetryableFetchError', status: 0 };
    expect(isNetworkError(fetchError)).toBe(true);
    expect(signInErrorMessage(fetchError)).toBe(OFFLINE_MESSAGE);
    expect(signInErrorMessage(new TypeError('Network request failed'))).toBe(OFFLINE_MESSAGE);
  });

  it('maps rate limits and unknown errors', () => {
    expect(signInErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(RATE_LIMIT_MESSAGE);
    expect(signInErrorMessage({ status: 500 })).toBe(GENERIC_ERROR_MESSAGE);
    expect(signInErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
