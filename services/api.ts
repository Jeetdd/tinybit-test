import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import { Logger } from '../utils/logger';

const TAG = 'API';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── AUTH ──────────────────────────────────────────────
export const apiRegister = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  password: string;
  role: string;
}) => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiLogin = async (data: { email: string; password: string }) => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const apiGetMe = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers });
  return res.json();
};

// ─── USER ──────────────────────────────────────────────
export const apiGetProfile = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/users/profile`, { headers });
  return res.json();
};

export const apiUpdateProfile = async (data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: string;
}) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
};

// ─── GUARDIAN API ──────────────────────────────────────
export const apiFetch = async (
  path: string,
  options: { method?: string; body?: object } = {}
): Promise<any> => {
  const method = options.method ?? 'GET';
  const url = `${API_BASE_URL}${path}`;
  const start = Date.now();

  Logger.network(TAG, `→ ${method} ${path}`);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) Logger.warn(TAG, `No auth token for ${method} ${path}`);

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const json = await res.json();
    const ms = Date.now() - start;

    if (!res.ok || json?.success === false) {
      Logger.warn(TAG, `← ${method} ${path} ${res.status} (${ms}ms)`, json?.message ?? json);
    } else {
      Logger.network(TAG, `← ${method} ${path} ${res.status} (${ms}ms)`);
    }

    return json;
  } catch (err: any) {
    Logger.error(TAG, `✗ ${method} ${path} failed (${Date.now() - start}ms): ${err?.message ?? err}`);
    throw err;
  }
};
