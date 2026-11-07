import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, screen } from '@testing-library/react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Text } from 'react-native';

import { renderWithQuery } from '@/shared/query/testing';

import { AuthProvider, useAuth } from './AuthProvider';
import * as repository from './authRepository';

jest.mock('./authRepository', () => ({
  getSession: jest.fn(), fetchProfile: jest.fn(), onSessionChange: jest.fn(),
}));
const getSession = jest.mocked(repository.getSession);
const fetchProfile = jest.mocked(repository.fetchProfile);
const onSessionChange = jest.mocked(repository.onSessionChange);
let listener: (session: Session | null, event: AuthChangeEvent) => void;
const session: Session = {
  access_token: 'synthetic', refresh_token: 'synthetic', expires_in: 3600, token_type: 'bearer',
  user: { id: 'synthetic-user', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
};

function Status() {
  const auth = useAuth();
  return <Text>{auth.status}</Text>;
}

describe('AuthProvider recovery lifecycle', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getSession.mockResolvedValue(null);
    fetchProfile.mockResolvedValue({ id: session.user.id, role: 'patient', displayName: null });
    onSessionChange.mockImplementation((callback) => {
      listener = callback;
      return jest.fn();
    });
  });

  it('keeps recovery independent of profile loading and preserves it on refresh', async () => {
    const { client } = await renderWithQuery(<AuthProvider><Status /></AuthProvider>);
    await screen.findByText('signedOut');
    client.setQueryData(['diary', 'old-account'], ['synthetic private data']);
    await act(async () => listener(session, 'PASSWORD_RECOVERY'));
    expect(await screen.findByText('passwordRecovery')).toBeTruthy();
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(client.getQueryData(['diary', 'old-account'])).toBeUndefined();
    await act(async () => listener(session, 'TOKEN_REFRESHED'));
    expect(screen.getByText('passwordRecovery')).toBeTruthy();
    await act(async () => listener(null, 'SIGNED_OUT'));
    expect(await screen.findByText('signedOut')).toBeTruthy();
  });

  it('preserves ordinary login and clears recovery when another login arrives', async () => {
    await renderWithQuery(<AuthProvider><Status /></AuthProvider>);
    await screen.findByText('signedOut');
    await act(async () => listener(session, 'PASSWORD_RECOVERY'));
    await act(async () => listener(session, 'SIGNED_IN'));
    expect(await screen.findByText('signedIn')).toBeTruthy();
    expect(fetchProfile).toHaveBeenCalledWith(session.user.id);
  });

  it('does not overwrite recovery with a late initial session read', async () => {
    let restore: (session: Session | null) => void = () => { throw new Error('restore not initialized'); };
    getSession.mockReturnValue(new Promise((resolve) => { restore = resolve; }));
    await renderWithQuery(<AuthProvider><Status /></AuthProvider>);
    expect(screen.getByText('loading')).toBeTruthy();
    await act(async () => listener(session, 'PASSWORD_RECOVERY'));
    expect(screen.getByText('passwordRecovery')).toBeTruthy();
    await act(async () => restore(null));
    expect(screen.getByText('passwordRecovery')).toBeTruthy();
  });

  it('clears cached data when a link replaces the signed-in account', async () => {
    getSession.mockResolvedValue(session);
    const { client } = await renderWithQuery(<AuthProvider><Status /></AuthProvider>);
    await screen.findByText('signedIn');
    client.setQueryData(['diary', 'previous-account'], ['synthetic private data']);
    await act(async () => listener(session, 'TOKEN_REFRESHED'));
    expect(client.getQueryData(['diary', 'previous-account'])).toBeDefined();
    const invited = { ...session, user: { ...session.user, id: 'synthetic-invited-user' } };
    await act(async () => listener(invited, 'SIGNED_IN'));
    expect(client.getQueryData(['diary', 'previous-account'])).toBeUndefined();
  });
});
