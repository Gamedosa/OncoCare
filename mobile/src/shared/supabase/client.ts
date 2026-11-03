import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { createChunkedStorage } from './chunkedStorage';
import type { Database } from './database.types';

// EXPO_PUBLIC_* vars are inlined at build time and must be referenced literally.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY em mobile/.env');
}

const isWeb = Platform.OS === 'web';

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // Native sessions go to the OS keychain/keystore; web uses the default localStorage.
    storage: isWeb ? undefined : createChunkedStorage(SecureStore),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isWeb,
  },
});

if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
