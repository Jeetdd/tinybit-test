import { API_BASE_URL } from '../config/api';
import { supabase } from '../utils/supabase';
import { Logger } from '../utils/logger';

const TAG = 'API';

// ─── GUARDIAN / HEALTH-CARD / AI ───────────────────────────────────────────────
// Authenticated fetch using the Supabase session token.
// Use this for all calls to the custom backend (guardian, health-card, ai routes).
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
