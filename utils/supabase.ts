import 'react-native-url-polyfill/auto';
import * as ExpoCrypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Polyfill crypto.subtle so Supabase uses S256 PKCE instead of falling back to
// 'plain', which causes "code challenge does not match" errors on Android/Hermes.
if (!(globalThis as any).crypto) (globalThis as any).crypto = {};
if (!(globalThis as any).crypto.subtle) {
  (globalThis as any).crypto.subtle = {
    digest: (_algo: string, data: ArrayBuffer) =>
      ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(data)),
  };
}

const supabaseUrl = 'https://knwpleyvrfdqnxqnejyh.supabase.co';
const supabaseAnonKey = 'sb_publishable_XB_BaNugDNVKTMD5guHsKg_HKJ163eH';

// On web, AsyncStorage touches `window` at module load time which crashes
// during SSR. Use a localStorage wrapper that guards against SSR instead.
const webStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined'
      ? Promise.resolve(window.localStorage.getItem(key))
      : Promise.resolve(null),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
