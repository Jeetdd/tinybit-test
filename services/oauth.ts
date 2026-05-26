import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: 'tinybittest',
  path: 'auth-callback',
});
console.log('[OAuth] Redirect URL:', GOOGLE_REDIRECT_URL);

// Opens the browser and returns the callback URL.
// On iOS, ASWebAuthenticationSession intercepts the redirect directly.
// On Android (Expo Go), the redirect arrives via Linking — we race both.
function openBrowserAndWaitForCallback(oauthUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      linkingSub.remove();
      resolve(url);
    };

    // Android fallback: Linking fires when the deep link arrives
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('code=') || url.includes('access_token=')) {
        console.log('[OAuth] Linking callback received');
        finish(url);
      }
    });

    WebBrowser.openAuthSessionAsync(oauthUrl, GOOGLE_REDIRECT_URL)
      .then((result) => {
        console.log('[OAuth] openAuthSessionAsync result:', result.type);
        if (result.type === 'success') {
          finish(result.url);
        } else if (!settled) {
          // Non-success (cancel/dismiss): give Linking 1.5s to fire before giving up
          setTimeout(() => finish(null), 1500);
        }
      })
      .catch(() => finish(null));
  });
}

export async function signInWithGoogle(): Promise<{ user: User } | null> {
  console.log('[OAuth] Starting Google sign-in...');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: GOOGLE_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) { console.error('[OAuth] signInWithOAuth error:', error.message); throw error; }
  if (!data.url) throw new Error('[OAuth] No URL returned from Supabase');
  console.log('[OAuth] Opening browser...');

  const callbackUrl = await openBrowserAndWaitForCallback(data.url);
  if (!callbackUrl) {
    console.log('[OAuth] No callback URL — user cancelled or timed out');
    return null;
  }

  console.log('[OAuth] Callback URL:', callbackUrl.substring(0, 200));

  const hasPKCECode    = callbackUrl.includes('code=');
  const hasAccessToken = callbackUrl.includes('access_token=');
  const hasError       = callbackUrl.includes('error=');
  console.log('[OAuth] hasPKCECode:', hasPKCECode, '| hasAccessToken:', hasAccessToken, '| hasError:', hasError);

  if (hasError) {
    const qs = callbackUrl.split('?')[1] ?? callbackUrl.split('#')[1] ?? '';
    throw new Error(new URLSearchParams(qs).get('error_description') ?? 'OAuth error');
  }

  let sessionUser: User | null = null;

  if (hasPKCECode) {
    const qs = (callbackUrl.split('?')[1] ?? '').split('#')[0];
    const code = new URLSearchParams(qs).get('code') ?? '';
    console.log('[OAuth] Exchanging PKCE code...');
    const { data: ex, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    console.log('[OAuth] Exchange result — user:', ex?.user?.email ?? 'null', '| error:', exErr?.message ?? 'none');
    if (exErr) throw exErr;
    sessionUser = ex?.user ?? null;

  } else if (hasAccessToken) {
    const sep = callbackUrl.includes('#') ? '#' : '?';
    const p = new URLSearchParams(callbackUrl.split(sep)[1] ?? '');
    console.log('[OAuth] Setting implicit session...');
    const { data: sd, error: sErr } = await supabase.auth.setSession({
      access_token: p.get('access_token') ?? '',
      refresh_token: p.get('refresh_token') ?? '',
    });
    console.log('[OAuth] setSession result — user:', sd?.user?.email ?? 'null', '| error:', sErr?.message ?? 'none');
    if (sErr) throw sErr;
    sessionUser = sd?.user ?? null;

  } else {
    throw new Error('Callback URL has neither code= nor access_token=');
  }

  if (!sessionUser) return null;

  console.log('[OAuth] Done. user:', sessionUser.email);
  return { user: sessionUser };
}
