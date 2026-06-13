import 'react-native-url-polyfill/auto';
import * as ExpoCrypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Full WebCrypto polyfill for Hermes/React Native.
// Supabase PKCE needs both crypto.getRandomValues (verifier generation) and
// crypto.subtle.digest (S256 challenge). Hermes ships neither.
if (!(globalThis as any).crypto) (globalThis as any).crypto = {};

if (typeof (globalThis as any).crypto.getRandomValues !== 'function') {
  (globalThis as any).crypto.getRandomValues = <T extends ArrayBufferView>(array: T): T =>
    ExpoCrypto.getRandomValues(array as any) as unknown as T;
}

if (!(globalThis as any).crypto.subtle) {
  const ALGO_MAP: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
    'SHA-1':   ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
    'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
  };
  (globalThis as any).crypto.subtle = {
    digest: (algo: string | { name: string }, data: ArrayBuffer) => {
      const name = typeof algo === 'string' ? algo : algo.name;
      const expoAlgo = ALGO_MAP[name] ?? ExpoCrypto.CryptoDigestAlgorithm.SHA256;
      return ExpoCrypto.digest(expoAlgo, new Uint8Array(data));
    },
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
