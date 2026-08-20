import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/src/data';

const nativeFetch = globalThis.fetch.bind(globalThis);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isJwtFutureError(response: Response, body: string) {
  return response.status === 401 && (body.includes('PGRST303') || body.includes('JWT issued at future'));
}

const resilientFetch: typeof fetch = async (input, init) => {
  const delays = [0, 1200, 2400, 4200];
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await wait(delays[attempt]);
    const response = await nativeFetch(input as any, init as any);
    lastResponse = response;
    if (response.status !== 401) return response;
    const body = await response.clone().text().catch(() => '');
    if (!isJwtFutureError(response, body)) return response;
  }
  return lastResponse as Response;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: resilientFetch },
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      supabase.auth.refreshSession().catch(() => undefined);
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
