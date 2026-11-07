import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { AuthState } from '@/features/auth/AuthProvider';

import RootLayout from '@/app/_layout';

let mockAuth: AuthState;
let mockSegments: string[];
jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mockAuth,
}));
jest.mock('@/shared/query/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/features/auth/GateScreens', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LoadingScreen: () => <Text>loading gate</Text>,
    ProfileErrorScreen: () => <Text>profile error gate</Text>,
  };
});
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Stack = ({ children }: { children: ReactNode }) => children;
  Stack.Screen = ({ name }: { name: string }) => <Text>{name}</Text>;
  Stack.Protected = ({ guard, children }: { guard: boolean; children: ReactNode }) => guard ? children : null;
  return { Stack, useSegments: () => mockSegments };
});

describe('recovery route availability', () => {
  beforeEach(() => {
    mockAuth = { status: 'loading' };
    mockSegments = ['reset-password'];
  });

  it('allows the callback before session restoration completes', async () => {
    await render(<RootLayout />);
    expect(screen.getByText('reset-password')).toBeTruthy();
    expect(screen.queryByText('loading gate')).toBeNull();
    expect(screen.queryByText('patient')).toBeNull();
  });

  it('allows recovery when the existing profile cannot load', async () => {
    mockAuth = { status: 'profileError', retry: jest.fn() };
    await render(<RootLayout />);
    expect(screen.getByText('reset-password')).toBeTruthy();
    expect(screen.queryByText('profile error gate')).toBeNull();
  });

  it('retains the normal loading gate outside recovery', async () => {
    mockSegments = ['patient'];
    await render(<RootLayout />);
    expect(screen.getByText('loading gate')).toBeTruthy();
    expect(screen.queryByText('patient')).toBeNull();
  });

  it('keeps the invite callback mounted while the invited profile loads', async () => {
    mockSegments = ['accept-invite'];
    await render(<RootLayout />);
    expect(screen.getByText('accept-invite')).toBeTruthy();
    expect(screen.queryByText('loading gate')).toBeNull();
  });
});
